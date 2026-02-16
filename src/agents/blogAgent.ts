import {
  BLOG_BRAVE_MAX_RETRIES,
  BLOG_BRAVE_MIN_INTERVAL_MS,
  BLOG_MAX_SEARCH_RESULTS,
  BLOG_MAX_SOURCES,
  BLOG_MIN_EXTERNAL_SOURCES,
  BLOG_MIN_NOVELTY_SCORE,
  BLOG_SOURCE_QUERIES,
  BLOG_TRUSTED_DOMAINS,
} from "@/config/blog";
import { PRIMARY_TRIP, THAI_HUB_CITIES } from "@/config/travel";
import {
  getLatestPublishedBlogPost,
  getRecentBlogTitles,
  saveBlogPost,
} from "@/data/blogPosts";
import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
import type { BlogSource } from "@/types/blog";
import { searchBrave } from "@/agents/adapters/braveSearch";
import { generateBlogDraft } from "@/agents/adapters/blogWriter";
import { env } from "@/lib/env";

export interface BlogAgentResult {
  status: "published" | "drafted" | "skipped" | "error";
  reason?: string;
  postSlug?: string;
  title?: string;
  sourceCount?: number;
  noveltyScore?: number;
  provider?: "anthropic" | "openai" | "fallback";
}

interface InternalSignalSnapshot {
  lines: string[];
  flightDeltaPct: number;
  maxHotelDeltaPct: number;
}

const getDomain = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const isTrustedDomain = (hostname: string) =>
  BLOG_TRUSTED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const searchBraveWithBackoff = async (query: string) => {
  let attempt = 0;
  while (attempt < BLOG_BRAVE_MAX_RETRIES) {
    try {
      return await searchBrave(query, BLOG_MAX_SEARCH_RESULTS);
    } catch (error) {
      attempt += 1;
      const isRateLimited =
        error instanceof Error && /\(429\)|rate limit|too many requests/i.test(error.message);
      if (!isRateLimited || attempt >= BLOG_BRAVE_MAX_RETRIES) {
        throw error;
      }
      await wait(BLOG_BRAVE_MIN_INTERVAL_MS * attempt);
    }
  }

  return [];
};

const collectExternalSources = async (): Promise<BlogSource[]> => {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return [];
  }

  const aggregated: Array<Awaited<ReturnType<typeof searchBrave>>> = [];
  let lastRequestAt = 0;

  for (const query of BLOG_SOURCE_QUERIES) {
    const elapsed = Date.now() - lastRequestAt;
    if (lastRequestAt > 0 && elapsed < BLOG_BRAVE_MIN_INTERVAL_MS) {
      await wait(BLOG_BRAVE_MIN_INTERVAL_MS - elapsed);
    }

    try {
      const results = await searchBraveWithBackoff(query);
      aggregated.push(results);
    } catch (error) {
      console.warn("[blogAgent] source search failed", query, error);
      aggregated.push([]);
    }

    lastRequestAt = Date.now();
  }

  const seen = new Set<string>();
  const filtered: BlogSource[] = [];

  for (const group of aggregated) {
    for (const item of group) {
      if (!item.url || seen.has(item.url)) {
        continue;
      }

      const domain = getDomain(item.url);
      if (!domain || !isTrustedDomain(domain)) {
        continue;
      }

      seen.add(item.url);
      filtered.push({
        title: item.title,
        url: item.url,
        snippet: item.description,
        domain,
      });

      if (filtered.length >= BLOG_MAX_SOURCES) {
        return filtered;
      }
    }
  }

  return filtered;
};

const pctChange = (current: number, baseline: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) {
    return 0;
  }
  return ((current - baseline) / baseline) * 100;
};

const buildInternalSignals = async (): Promise<InternalSignalSnapshot> => {
  const [flightHistory, hotelHistory] = await Promise.all([
    getRecentFlightPrices(14),
    getHotelHistoryByCity(THAI_HUB_CITIES, 14),
  ]);

  const latestFlight = flightHistory[flightHistory.length - 1];
  const recentFlightWindow = flightHistory.slice(-7);
  const flightBaseline =
    recentFlightWindow.reduce((sum, row) => sum + row.price, 0) /
    Math.max(1, recentFlightWindow.length);
  const flightDeltaPct = latestFlight ? pctChange(latestFlight.price, flightBaseline) : 0;

  const lines = [
    latestFlight
      ? `Route ${PRIMARY_TRIP.origin} to ${PRIMARY_TRIP.destination} is ${latestFlight.price.toFixed(
          0
        )} ${latestFlight.currency} for ${PRIMARY_TRIP.departDate} to ${PRIMARY_TRIP.returnDate}, ${flightDeltaPct.toFixed(
          1
        )}% versus the trailing 7-sample baseline.`
      : "Flight route baseline is still initializing.",
  ];

  let maxHotelDeltaPct = 0;

  for (const city of THAI_HUB_CITIES) {
    const rows = hotelHistory[city] ?? [];
    if (!rows.length) {
      continue;
    }

    const latest = rows[rows.length - 1];
    const recent = rows.slice(-7);
    const baseline =
      recent.reduce((sum, row) => sum + row.avg_price, 0) / Math.max(1, recent.length);
    const delta = pctChange(latest.avg_price, baseline);
    if (Math.abs(delta) > Math.abs(maxHotelDeltaPct)) {
      maxHotelDeltaPct = delta;
    }

    lines.push(
      `${city} average nightly rate is ${latest.avg_price.toFixed(0)} ${latest.currency}, ${delta.toFixed(
        1
      )}% versus its trailing 7-sample baseline.`
    );
  }

  return {
    lines,
    flightDeltaPct,
    maxHotelDeltaPct,
  };
};

const scoreNovelty = (params: {
  sourceCount: number;
  flightDeltaPct: number;
  maxHotelDeltaPct: number;
}) => {
  const sourceScore = Math.min(1, params.sourceCount / 5);
  const flightScore = Math.min(1, Math.abs(params.flightDeltaPct) / 12);
  const hotelScore = Math.min(1, Math.abs(params.maxHotelDeltaPct) / 10);
  return Number((0.45 * sourceScore + 0.35 * flightScore + 0.2 * hotelScore).toFixed(3));
};

const normalizedTokens = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );

const jaccard = (a: Set<string>, b: Set<string>) => {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const hasConcreteNumber = (text: string) => /\b\d{2,}(?:\.\d+)?\b/.test(text);
const hasDateMention = (text: string) =>
  /\b(?:20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(
    text
  );

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);

export const runBlogAgent = async (): Promise<BlogAgentResult> => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const latestPost = await getLatestPublishedBlogPost();
    if (latestPost && !latestPost.id.startsWith("seed-") && latestPost.publishedAt.slice(0, 10) === today) {
      return { status: "skipped", reason: "already_published_today", postSlug: latestPost.slug };
    }

    const [internalSignals, externalSources, recentTitles] = await Promise.all([
      buildInternalSignals(),
      collectExternalSources(),
      getRecentBlogTitles(),
    ]);

    if (externalSources.length < BLOG_MIN_EXTERNAL_SOURCES) {
      return {
        status: "skipped",
        reason: "insufficient_sources",
        sourceCount: externalSources.length,
      };
    }

    const noveltyScore = scoreNovelty({
      sourceCount: externalSources.length,
      flightDeltaPct: internalSignals.flightDeltaPct,
      maxHotelDeltaPct: internalSignals.maxHotelDeltaPct,
    });

    if (noveltyScore < BLOG_MIN_NOVELTY_SCORE) {
      return {
        status: "skipped",
        reason: "low_novelty",
        noveltyScore,
        sourceCount: externalSources.length,
      };
    }

    const draft = await generateBlogDraft({
      publishDate: today,
      tripWindow: `${PRIMARY_TRIP.origin} to ${PRIMARY_TRIP.destination} (${PRIMARY_TRIP.departDate} to ${PRIMARY_TRIP.returnDate})`,
      internalSignals: internalSignals.lines,
      externalSources,
      recentTitles,
    });

    const qualityChecks: string[] = [];
    const qualityFailures: string[] = [];

    if (externalSources.length >= BLOG_MIN_EXTERNAL_SOURCES) {
      qualityChecks.push("source_count");
    } else {
      qualityFailures.push("source_count");
    }

    const bodyText = [
      draft.title,
      draft.summary,
      draft.takeaway,
      ...draft.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ].join(" ");

    if (hasConcreteNumber(bodyText)) {
      qualityChecks.push("concrete_numbers");
    } else {
      qualityFailures.push("concrete_numbers");
    }

    if (hasDateMention(`${bodyText} ${today}`)) {
      qualityChecks.push("date_mentions");
    } else {
      qualityFailures.push("date_mentions");
    }

    const candidateTokens = normalizedTokens(draft.title);
    const duplicateTitle = recentTitles.some((title) => jaccard(candidateTokens, normalizedTokens(title)) > 0.75);

    if (!duplicateTitle) {
      qualityChecks.push("title_novelty");
    } else {
      qualityFailures.push("title_novelty");
    }

    const slug = slugify(`${today} ${draft.title}`);

    const baseMetadata = {
      aiProvider: draft.aiProvider,
      confidence: draft.confidence,
      noveltyScore,
      qualityChecks,
      qualityFailures,
      flightDeltaPct: Number(internalSignals.flightDeltaPct.toFixed(2)),
      maxHotelDeltaPct: Number(internalSignals.maxHotelDeltaPct.toFixed(2)),
      generatedAt: new Date().toISOString(),
    };

    if (qualityFailures.length > 0) {
      const draftPost = await saveBlogPost({
        slug,
        title: draft.title,
        summary: draft.summary,
        status: "draft",
        content: {
          takeaway: draft.takeaway,
          sections: draft.sections,
        },
        sources: externalSources,
        metadata: baseMetadata,
      });

      return {
        status: "drafted",
        reason: `quality_failed:${qualityFailures.join(",")}`,
        postSlug: draftPost.slug,
        title: draftPost.title,
        noveltyScore,
        sourceCount: externalSources.length,
        provider: draft.aiProvider,
      };
    }

    const post = await saveBlogPost({
      slug,
      title: draft.title,
      summary: draft.summary,
      status: "published",
      publishedAt: new Date().toISOString(),
      content: {
        takeaway: draft.takeaway,
        sections: draft.sections,
      },
      sources: externalSources,
      metadata: baseMetadata,
    });

    return {
      status: "published",
      postSlug: post.slug,
      title: post.title,
      sourceCount: externalSources.length,
      noveltyScore,
      provider: draft.aiProvider,
    };
  } catch (error) {
    console.error("[blogAgent] failed", error);
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "unknown",
    };
  }
};
