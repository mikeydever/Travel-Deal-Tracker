import { SCOUT_CITIES } from "@/config/scout";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { ExperienceDealInput, ExperienceDealRow } from "@/types/experiences";

const SELECT_FIELDS =
  "id, title, city, category, price, currency, rating, reviews_count, url, image_url, summary, source_domain, scouted_date, confidence, needs_review, metadata, created_at";

const buildFallbackDeals = (limit = 12): ExperienceDealRow[] => {
  const seedTitles = [
    "Sunrise temple walk",
    "Floating market cruise",
    "Island-hopping speedboat",
    "Night food safari",
    "Old town cycling loop",
    "Jungle canopy experience",
  ];

  return Array.from({ length: limit }).map((_, index) => {
    const city = SCOUT_CITIES[index % SCOUT_CITIES.length];
    const title = seedTitles[index % seedTitles.length];
    return {
      id: `fallback-deal-${index}`,
      title: `${city} ${title}`,
      city,
      category: index % 2 === 0 ? "tours" : "attractions",
      price: 65 + (index % 5) * 12,
      currency: "CAD",
      rating: 4.6,
      reviews_count: 120 + index * 7,
      url: "https://example.com",
      image_url: null,
      summary: "Curated highlight while live scout data loads.",
      source_domain: "curated",
      scouted_date: new Date().toISOString().slice(0, 10),
      confidence: 0.9,
      needs_review: false,
      metadata: { source: "mock" },
      created_at: new Date().toISOString(),
    };
  });
};

export const saveExperienceDeal = async (input: ExperienceDealInput) => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    title: input.title,
    city: input.city ?? null,
    category: input.category ?? null,
    price: input.price ?? null,
    currency: input.currency ?? null,
    rating: input.rating ?? null,
    reviews_count: input.reviewsCount ?? null,
    url: input.url,
    image_url: input.imageUrl ?? null,
    summary: input.summary ?? null,
    source_domain: input.sourceDomain ?? null,
    scouted_date: input.scoutedDate,
    confidence: input.confidence ?? null,
    needs_review: input.needsReview ?? false,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await client
    .from("experience_deals")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert experience deal: ${error.message}`);
  }

  return data;
};

export const getExperienceDeals = async (options?: {
  city?: string;
  category?: string;
  topOnly?: boolean;
  limit?: number;
}): Promise<ExperienceDealRow[]> => {
  const limit = options?.limit ?? 24;
  try {
    const client = getSupabaseServiceRoleClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffString = cutoff.toISOString().slice(0, 10);

    let query = client
      .from("experience_deals")
      .select(SELECT_FIELDS)
      .gte("scouted_date", cutoffString)
      .order("scouted_date", { ascending: false })
      .order("confidence", { ascending: false })
      .limit(limit);

    if (options?.city) {
      query = query.eq("city", options.city);
    }
    if (options?.category) {
      query = query.eq("category", options.category);
    }
    if (options?.topOnly) {
      query = query.eq("needs_review", false).gte("confidence", 0.7);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return buildFallbackDeals(limit);
    }

    return data as ExperienceDealRow[];
  } catch (error) {
    console.warn("[experience_deals] falling back to mocked data", error);
    return buildFallbackDeals(limit);
  }
};
