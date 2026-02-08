import { SCOUT_CATEGORIES, SCOUT_CITIES } from "@/config/scout";
import { saveExperienceDeal } from "@/data/experienceDeals";
import { env } from "@/lib/env";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import {
  normalizeViatorProduct,
  viatorExchangeRates,
  viatorSearchFreetext,
  type ViatorSearchResult,
} from "@/agents/adapters/viatorApi";

export interface ViatorScoutResult {
  inserted: number;
  skipped: number;
  errors: number;
  date: string;
  queries: number;
}

const normalizeDomain = (value: string) => value.replace(/^www\./, "").toLowerCase();

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

const resolveExchangeRates = async (currency = "CAD") => {
  try {
    const response = await viatorExchangeRates(currency);
    return response.exchangeRates ?? response.rates ?? response.data?.exchangeRates ?? {};
  } catch (error) {
    console.warn("[viator] exchange rates unavailable", error);
    return {} as Record<string, number>;
  }
};

const convertPrice = (
  price: number | null,
  currency: string | null,
  rates: Record<string, number>
) => {
  if (!price || !currency) return { price, currency };
  if (currency === "CAD") return { price, currency };
  const rate = rates[currency];
  if (!rate) return { price, currency };
  return {
    price: Math.round(price * rate * 100) / 100,
    currency: "CAD",
  };
};

interface ViatorScoutOptions {
  maxDeals?: number;
  resultsPerQuery?: number;
  perComboLimit?: number;
}

export const runViatorExperienceAgent = async (
  options: ViatorScoutOptions = {}
): Promise<ViatorScoutResult> => {
  const date = new Date().toISOString().slice(0, 10);

  if (!env.VIATOR_API_KEY) {
    console.warn("[viator] VIATOR_API_KEY missing; skipping");
    return { inserted: 0, skipped: 0, errors: 0, date, queries: 0 };
  }

  const existing = await getExistingUrls(date);
  const seen = new Set<string>(existing);
  const perComboLimit = options.perComboLimit ?? 3;
  const maxDeals =
    options.maxDeals ?? perComboLimit * SCOUT_CITIES.length * SCOUT_CATEGORIES.length;
  const resultsPerQuery = options.resultsPerQuery ?? perComboLimit;
  const exchangeRates = await resolveExchangeRates("CAD");

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let queries = 0;

  for (const city of SCOUT_CITIES) {
    for (const category of SCOUT_CATEGORIES) {
      if (inserted >= maxDeals) break;
      const term = `${city} ${category}`;
      let comboInserted = 0;

      let searchResults: ViatorSearchResult[] = [];
      try {
        const searchResponse = await viatorSearchFreetext({
          searchTerm: term,
          currency: "CAD",
          topX: resultsPerQuery,
        });
        searchResults = searchResponse.products?.results ?? [];
        queries += 1;
      } catch (error) {
        console.warn("[viator] search failed", error);
        errors += 1;
        continue;
      }

      if (!searchResults.length) {
        skipped += 1;
        continue;
      }

      for (const product of searchResults) {
        if (inserted >= maxDeals || comboInserted >= perComboLimit) break;

        const normalized = normalizeViatorProduct(product);
        if (!normalized.productUrl) {
          skipped += 1;
          continue;
        }

        let sourceDomain = "viator.com";
        try {
          sourceDomain = normalizeDomain(new URL(normalized.productUrl).hostname);
        } catch (error) {
          console.warn("[viator] invalid product url", normalized.productUrl, error);
        }

        if (seen.has(normalized.productUrl)) {
          skipped += 1;
          continue;
        }

        const converted = convertPrice(
          normalized.price ?? null,
          normalized.currency ?? null,
          exchangeRates
        );

        try {
          await saveExperienceDeal({
            title: normalized.title ?? `${city} experience`,
            city,
            category,
            price: converted.price,
            currency: converted.currency ?? normalized.currency ?? null,
            rating: normalized.rating ?? null,
            reviewsCount: normalized.reviewsCount ?? null,
            url: normalized.productUrl,
            imageUrl: normalized.imageUrl ?? null,
            summary: normalized.summary ?? null,
            sourceDomain,
            scoutedDate: date,
            confidence: 0.9,
            needsReview: false,
            metadata: {
              provider: "viator",
              productCode: normalized.productCode,
              searchTerm: term,
            },
          });

          seen.add(normalized.productUrl);
          inserted += 1;
          comboInserted += 1;
        } catch (error) {
          console.warn("[viator] insert failed", error);
          errors += 1;
        }
      }
    }
  }

  return { inserted, skipped, errors, date, queries };
};
