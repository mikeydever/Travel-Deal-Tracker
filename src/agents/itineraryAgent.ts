import { getExperienceDeals } from "@/data/experienceDeals";
import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
import { THAI_HUB_CITIES } from "@/config/travel";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { getRecommendedWindows } from "@/services/itineraryScoring";
import type { ItineraryDay, ItinerarySuggestionInput } from "@/types/itinerary";

export interface ItineraryAgentResult {
  inserted: number;
  skipped: number;
  windows: number;
}

const DURATIONS = [3, 5, 7, 10];

interface DealSeed {
  id: string;
  title: string;
  city?: string | null;
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  url: string;
}

interface DaySeed {
  day: number;
  city: string;
  deal?: DealSeed;
}

const formatDealPrice = (deal?: DealSeed) => {
  if (!deal?.price || !deal.currency) return null;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: deal.currency,
    currencyDisplay: deal.currency === "CAD" ? "code" : "symbol",
    maximumFractionDigits: 0,
  }).format(deal.price);
};

const buildFallbackItinerary = (seeds: DaySeed[]): ItineraryDay[] => {
  const morningIdeas = [
    "Temple circuit and a slow breakfast in the old quarter.",
    "Local market stroll with street coffee and people-watching.",
    "Sunrise viewpoint and a relaxed cafe start.",
    "Neighborhood walk with a stop at a favorite bakery.",
    "Riverside stroll and a light breakfast by the water.",
  ];

  const eveningIdeas = [
    "Night market tasting and a casual bar hop.",
    "Riverside dinner with a sunset view.",
    "Food crawl with a focus on local specialties.",
    "Rooftop or riverside drinks to wrap the day.",
    "Low-key dinner and a short stroll through the lantern-lit streets.",
  ];

  return seeds.map((seed, index) => {
    const deal = seed.deal;
    const price = formatDealPrice(deal);
    const rating = deal?.rating ? `${deal.rating.toFixed(1)}★` : null;
    const featured = deal
      ? `Featured experience: ${deal.title}${price ? ` (${price}` : ""}${
          price && rating ? ", " : ""
        }${rating ?? ""}${price || rating ? ")" : ""}.`
      : `Guided highlight focusing on ${seed.city}.`;

    const title =
      index === 0
        ? `Arrival + ${seed.city}`
        : index === seeds.length - 1
        ? `Last look at ${seed.city}`
        : `${seed.city} highlights`;

    return {
      day: seed.day,
      title,
      morning: morningIdeas[index % morningIdeas.length],
      afternoon: featured,
      evening: eveningIdeas[index % eveningIdeas.length],
      deal_ids: deal ? [deal.id] : [],
    };
  });
};

const replaceItinerary = async (input: ItinerarySuggestionInput) => {
  const client = getSupabaseServiceRoleClient();
  await client
    .from("itinerary_suggestions")
    .delete()
    .eq("window_start", input.windowStart)
    .eq("window_end", input.windowEnd)
    .eq("duration_days", input.durationDays);

  const payload = {
    window_start: input.windowStart,
    window_end: input.windowEnd,
    duration_days: input.durationDays,
    title: input.title ?? null,
    summary: input.summary ?? null,
    days: input.days,
    score: input.score ?? null,
  };

  const { data, error } = await client
    .from("itinerary_suggestions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert itinerary: ${error.message}`);
  }

  return data;
};

const generateItineraryWithOpenAI = async (params: {
  windowStart: string;
  windowEnd: string;
  duration: number;
  score: number;
  daySeeds: DaySeed[];
}) => {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const system =
    "You are a travel planner. Output JSON only. Create a concise itinerary with day-by-day morning/afternoon/evening plans. " +
    "Vary each day, avoid repeating phrases, and use the provided day seeds.";

  const user = {
    window: { start: params.windowStart, end: params.windowEnd, score: params.score },
    duration: params.duration,
    daySeeds: params.daySeeds,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            "Return JSON with keys: title, summary, days. days is an array of {day, morning, afternoon, evening, deal_ids}. " +
            "Use the provided daySeeds as anchors: keep the same city and include the deal title in afternoon when provided. " +
            "Set deal_ids to the deal id from daySeeds when used. Avoid repeating the same morning/afternoon/evening text.\nContext:\n" +
            JSON.stringify(user, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn("[itineraryAgent] OpenAI failed", await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as {
      title?: string;
      summary?: string;
      days?: ItineraryDay[];
    };
  } catch (error) {
    console.warn("[itineraryAgent] failed to parse JSON", error);
    return null;
  }
};

const buildDaySeeds = (deals: DealSeed[], duration: number): DaySeed[] => {
  const byCity = new Map<string, DealSeed[]>();
  for (const deal of deals) {
    if (!deal.city) continue;
    const city = deal.city;
    const list = byCity.get(city) ?? [];
    list.push(deal);
    byCity.set(city, list);
  }

  const cities = Array.from(new Set([...byCity.keys(), ...THAI_HUB_CITIES]));
  if (!cities.length) {
    cities.push("Thailand");
  }

  const seeds: DaySeed[] = [];
  const fallbackDeals = [...deals];

  for (let i = 0; i < duration; i += 1) {
    const city = cities[i % cities.length] ?? "Thailand";
    const cityDeals = byCity.get(city) ?? [];
    const deal = cityDeals.shift() ?? fallbackDeals.shift();
    if (deal && deal.city && deal.city !== city) {
      // keep deals aligned to city when possible
      fallbackDeals.unshift(deal);
    }
    seeds.push({
      day: i + 1,
      city,
      ...(deal ? { deal } : {}),
    });
  }

  return seeds;
};

export const runItineraryAgent = async (): Promise<ItineraryAgentResult> => {
  const [flightHistory, hotelHistoryByCity, deals] = await Promise.all([
    getRecentFlightPrices(30),
    getHotelHistoryByCity(undefined, 20),
    getExperienceDeals({ topOnly: true, limit: 60, preferBookable: true }),
  ]);

  const windows = getRecommendedWindows({
    flightHistory,
    hotelHistoryByCity,
    windowLength: 5,
    maxWindows: 3,
  });

  let inserted = 0;
  let skipped = 0;

  for (const window of windows) {
    for (const duration of DURATIONS) {
      try {
        const dealPool = deals
          .filter((deal) => deal.price && deal.rating)
          .sort((a, b) => {
            const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
            if (ratingDiff !== 0) return ratingDiff;
            return (a.price ?? 0) - (b.price ?? 0);
          })
          .slice(0, 24)
          .map((deal) => ({
            id: deal.id,
            title: deal.title,
            city: deal.city,
            price: deal.price,
            currency: deal.currency,
            rating: deal.rating,
            url: deal.url,
          }));

        const daySeeds = buildDaySeeds(dealPool, duration);

        const ai = await generateItineraryWithOpenAI({
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
          duration,
          score: window.score,
          daySeeds,
        });

        const days =
          ai?.days?.length === duration ? ai.days : buildFallbackItinerary(daySeeds);

        await replaceItinerary({
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
          durationDays: duration,
          title: ai?.title ?? `Thailand ${duration}-day rhythm`,
          summary:
            ai?.summary ??
            "Balanced days mixing culture, food, and a standout experience in each city.",
          days,
          score: window.score,
        });

        inserted += 1;
      } catch (error) {
        console.warn("[itineraryAgent] failed", error);
        skipped += 1;
      }
    }
  }

  return { inserted, skipped, windows: windows.length };
};
