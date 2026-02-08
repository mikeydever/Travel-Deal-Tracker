import {
  SCOUT_ALLOWLIST_DOMAINS,
  SCOUT_CATEGORIES,
  SCOUT_CITIES,
  SCOUT_DEFAULT_LIMIT,
  SCOUT_DOMAINS_PER_RUN,
  SCOUT_MAX_QUERIES,
  SCOUT_MAX_RESULTS_PER_QUERY,
  SCOUT_QUERY_TEMPLATES,
  SCOUT_RESULTS_PER_DOMAIN,
} from "@/config/scout";
import { searchBrave } from "@/agents/adapters/braveSearch";
import { extractDeal } from "@/agents/adapters/dealExtractor";
import { saveExperienceDeal } from "@/data/experienceDeals";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

export interface ExperienceScoutResult {
  inserted: number;
  skipped: number;
  errors: number;
  date: string;
  queries: number;
}

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickRotatingDomains = (date: string, count = SCOUT_DOMAINS_PER_RUN) => {
  const start = hashSeed(date) % SCOUT_ALLOWLIST_DOMAINS.length;
  const rotated = SCOUT_ALLOWLIST_DOMAINS.slice(start).concat(
    SCOUT_ALLOWLIST_DOMAINS.slice(0, start)
  );
  return rotated.slice(0, Math.min(count, rotated.length));
};

const extractMetaTag = (html: string, name: string) => {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1] ?? null;
};

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
};

const fetchPageMeta = async (url: string, timeoutMs = 6000) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TravelDealTrackerBot/1.0",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {};
    }

    const html = (await response.text()).slice(0, 100000);
    return {
      pageTitle: extractTitle(html) ?? undefined,
      pageDescription:
        extractMetaTag(html, "description") ?? extractMetaTag(html, "og:description") ?? undefined,
      ogImage: extractMetaTag(html, "og:image") ?? undefined,
    };
  } catch (error) {
    console.warn("[experienceScout] failed to fetch page meta", error);
    return {};
  }
};

const getExistingUrls = async (date: string) => {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("experience_deals")
    .select("url")
    .eq("scouted_date", date);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row: { url: string }) => row.url));
};

const normalizeDomain = (value: string) => value.replace(/^www\./, "").toLowerCase();

interface ExperienceScoutOptions {
  maxDeals?: number;
  maxQueries?: number;
  domainsPerRun?: number;
  resultsPerQuery?: number;
}

export const runExperienceScoutAgent = async (
  options: ExperienceScoutOptions = {}
): Promise<ExperienceScoutResult> => {
  const date = new Date().toISOString().slice(0, 10);

  if (!env.BRAVE_SEARCH_API_KEY || !env.OPENAI_API_KEY) {
    console.warn("[experienceScout] missing BRAVE_SEARCH_API_KEY or OPENAI_API_KEY; skipping");
    return { inserted: 0, skipped: 0, errors: 0, date, queries: 0 };
  }

  try {
    const existing = await getExistingUrls(date);
    const seen = new Set<string>(existing);
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let queries = 0;

    const maxDeals = options.maxDeals ?? SCOUT_DEFAULT_LIMIT;
    const maxQueries = options.maxQueries ?? SCOUT_MAX_QUERIES;
    const resultsPerQuery = options.resultsPerQuery ?? SCOUT_MAX_RESULTS_PER_QUERY;

    const domains = pickRotatingDomains(date, options.domainsPerRun ?? SCOUT_DOMAINS_PER_RUN);

    for (const city of SCOUT_CITIES) {
      for (const category of SCOUT_CATEGORIES) {
        for (const domain of domains) {
          if (queries >= maxQueries || inserted >= maxDeals) {
            break;
          }

          const template = SCOUT_QUERY_TEMPLATES[0];
          const query = `site:${domain} ${template}`
            .replace("{city}", city)
            .replace("{category}", category);

          let results = [];
          try {
            const count = Math.min(resultsPerQuery, SCOUT_RESULTS_PER_DOMAIN);
            results = await searchBrave(query, count);
            queries += 1;
          } catch (error) {
            console.warn("[experienceScout] search failed", error);
            errors += 1;
            continue;
          }

          for (const result of results) {
            if (!result.url || seen.has(result.url)) {
              skipped += 1;
              continue;
            }

            if (inserted >= maxDeals) {
              break;
            }

            seen.add(result.url);

            try {
              const meta = await fetchPageMeta(result.url);
              const extracted = await extractDeal({
                title: result.title,
                url: result.url,
                description: result.description,
                pageTitle: meta.pageTitle,
                pageDescription: meta.pageDescription,
                ogImage: meta.ogImage,
                cityHint: city,
                categoryHint: category,
              });

              let sourceDomain = domain;
              try {
                sourceDomain = normalizeDomain(new URL(result.url).hostname);
              } catch (error) {
                console.warn("[experienceScout] invalid URL", result.url, error);
              }

              await saveExperienceDeal({
                title: extracted.title,
                city: extracted.city ?? city,
                category: extracted.category ?? category,
                price: extracted.price ?? null,
                currency: extracted.currency ?? null,
                rating: extracted.rating ?? null,
                reviewsCount: extracted.reviewsCount ?? null,
                url: result.url,
                imageUrl: extracted.imageUrl ?? null,
                summary: extracted.summary ?? null,
                sourceDomain,
                scoutedDate: date,
                confidence: extracted.confidence,
                needsReview: extracted.needsReview,
                metadata: {
                  searchTitle: result.title,
                  searchSnippet: result.description,
                },
              });

              inserted += 1;
            } catch (error) {
              console.warn("[experienceScout] insert failed", error);
              errors += 1;
            }
          }
        }
      }
    }

    return { inserted, skipped, errors, date, queries };
  } catch (error) {
    console.warn("[experienceScout] failed", error);
    return { inserted: 0, skipped: 0, errors: 1, date, queries: 0 };
  }
};
