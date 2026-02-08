import { getExperienceDeals } from "@/data/experienceDeals";
import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
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

const buildFallbackItinerary = (duration: number): ItineraryDay[] =>
  Array.from({ length: duration }).map((_, index) => ({
    day: index + 1,
    title: index === 0 ? "Arrival + old town" : undefined,
    morning: "Slow breakfast and a neighborhood walk.",
    afternoon: "Main attraction focus with a guided experience.",
    evening: "Night market or riverside dinner.",
  }));

const hasItinerary = async (windowStart: string, windowEnd: string, duration: number) => {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("itinerary_suggestions")
    .select("id")
    .eq("window_start", windowStart)
    .eq("window_end", windowEnd)
    .eq("duration_days", duration)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data && data.length);
};

const saveItinerary = async (input: ItinerarySuggestionInput) => {
  const client = getSupabaseServiceRoleClient();
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
  deals: Array<{ title: string; city?: string | null; url: string }>;
}) => {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const system =
    "You are a travel planner. Output JSON only. Create a concise itinerary with day-by-day morning/afternoon/evening plans.";

  const user = {
    window: { start: params.windowStart, end: params.windowEnd, score: params.score },
    duration: params.duration,
    deals: params.deals,
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
            "Use deal_ids that correspond to the index of a deal (0-based) when you reference one.\nContext:\n" +
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

export const runItineraryAgent = async (): Promise<ItineraryAgentResult> => {
  const [flightHistory, hotelHistoryByCity, deals] = await Promise.all([
    getRecentFlightPrices(30),
    getHotelHistoryByCity(undefined, 20),
    getExperienceDeals({ topOnly: true, limit: 10 }),
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
        const exists = await hasItinerary(window.windowStart, window.windowEnd, duration);
        if (exists) {
          skipped += 1;
          continue;
        }

        const topDeals = deals.slice(0, 6).map((deal, index) => ({
          title: deal.title,
          city: deal.city,
          url: deal.url,
          index,
        }));

        const ai = await generateItineraryWithOpenAI({
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
          duration,
          score: window.score,
          deals: topDeals.map(({ title, city, url }) => ({ title, city, url })),
        });

        const days = ai?.days?.length ? ai.days : buildFallbackItinerary(duration);

        await saveItinerary({
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
