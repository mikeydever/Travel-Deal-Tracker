import { getExperienceDeals } from "@/data/experienceDeals";
import { getEventsInRange, type EventRow } from "@/data/events";
import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
import { PRIMARY_TRIP, THAI_HUB_CITIES } from "@/config/travel";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { getRecommendedWindows } from "@/services/itineraryScoring";
import type { ItineraryDay, ItinerarySuggestionInput } from "@/types/itinerary";

export interface ItineraryAgentResult {
  inserted: number;
  skipped: number;
  windows: number;
}

const PTO_FRIENDLY_DURATION = Math.max(3, PRIMARY_TRIP.tripLengthDays - 3);
const DURATIONS_BASE = [3, 5, 7, 10, 14, PTO_FRIENDLY_DURATION];
const DURATIONS = Array.from(new Set([...DURATIONS_BASE, PRIMARY_TRIP.tripLengthDays])).sort(
  (a, b) => a - b
);

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
  date: string;
  city: string;
  travelFrom?: string;
  deal?: DealSeed;
}

const addDaysIso = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const chooseCityCount = (duration: number) => {
  if (duration <= 5) return 1;
  if (duration <= 9) return 2;
  if (duration <= 21) return 3;
  return 4;
};

const pickCityRoute = (deals: DealSeed[], duration: number) => {
  const counts = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.city) continue;
    counts.set(deal.city, (counts.get(deal.city) ?? 0) + 1);
  }

  const desired = Math.min(chooseCityCount(duration), THAI_HUB_CITIES.length);
  const startCity = "Bangkok";
  const endCity = "Bangkok";

  const ranked = [...THAI_HUB_CITIES]
    .filter((city) => city !== startCity)
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  if (duration <= 5) {
    return [startCity];
  }

  const middleCount = Math.max(1, desired - 1);
  const middle = ranked.slice(0, middleCount);
  return [startCity, ...middle, endCity];
};

const allocateSegmentDays = (duration: number, route: string[]) => {
  if (route.length <= 1) return [duration];

  const segments = Math.min(route.length, duration);
  if (segments <= 1) return [duration];

  const startIndex = 0;
  const endIndex = segments - 1;
  const middleSegments = Math.max(0, segments - 2);

  let startDays = duration >= 14 ? 4 : duration >= 10 ? 3 : 2;
  let endDays = duration >= 14 ? 3 : duration >= 10 ? 2 : 1;

  // Ensure we can allocate at least 1 day per middle segment.
  const minRequired = startDays + endDays + middleSegments;
  if (minRequired > duration) {
    const overflow = minRequired - duration;
    const trimStart = Math.min(startDays - 1, Math.ceil(overflow / 2));
    startDays -= trimStart;
    endDays = Math.max(1, endDays - (overflow - trimStart));
  }

  let remaining = duration - startDays - endDays;
  if (middleSegments === 0) {
    return [duration];
  }

  if (remaining < middleSegments) {
    // Last resort: shrink start/end to make room.
    while (remaining < middleSegments && startDays > 1) {
      startDays -= 1;
      remaining += 1;
    }
    while (remaining < middleSegments && endDays > 1) {
      endDays -= 1;
      remaining += 1;
    }
  }

  const base = Math.floor(remaining / middleSegments);
  const remainder = remaining % middleSegments;
  const middle = Array.from({ length: middleSegments }).map(
    (_, index) => base + (index < remainder ? 1 : 0)
  );

  const segmentDays = Array(segments).fill(0);
  segmentDays[startIndex] = startDays;
  segmentDays[endIndex] = endDays;
  for (let i = 0; i < middleSegments; i += 1) {
    segmentDays[i + 1] = middle[i] ?? 1;
  }

  return segmentDays;
};

const formatDealPrice = (deal?: DealSeed) => {
  if (!deal?.price || !deal.currency) return null;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: deal.currency,
    currencyDisplay: deal.currency === "CAD" ? "code" : "symbol",
    maximumFractionDigits: 0,
  }).format(deal.price);
};

const buildFallbackItinerary = (
  seeds: DaySeed[],
  events: EventRow[] = []
): ItineraryDay[] => {
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

    const titleBase =
      index === 0 ? `Arrival + ${seed.city}` : `${seed.city} day ${seed.day}`;
    const title = index === seeds.length - 1 ? `Last look at ${seed.city}` : titleBase;

    const matchingEvent = events.find((event) => {
      const location = (event.location ?? "").toLowerCase();
      const city = seed.city.toLowerCase();
      if (location && !location.includes(city) && city !== "bangkok") return false;
      return event.start_date <= seed.date && event.end_date >= seed.date;
    });

    const morning = seed.travelFrom
      ? `Travel from ${seed.travelFrom} to ${seed.city}, check in, and reset with a coffee.`
      : morningIdeas[index % morningIdeas.length];

    const evening = matchingEvent
      ? `Catch ${matchingEvent.name} in the evening, then a late supper.`
      : eveningIdeas[index % eveningIdeas.length];

    return {
      day: seed.day,
      date: seed.date,
      city: seed.city,
      ...(seed.travelFrom ? { travelFrom: seed.travelFrom } : {}),
      title,
      afternoon: featured,
      morning,
      evening,
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
  events: EventRow[];
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
    events: params.events,
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
            "Use the provided daySeeds as anchors: keep the same city and date for each day and include the deal title in afternoon when provided. " +
            "If daySeeds has travelFrom, make morning about transit and check-in (do not add extra city hops). " +
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

const buildDaySeeds = (
  deals: DealSeed[],
  duration: number,
  windowStart: string
): DaySeed[] => {
  const byCity = new Map<string, DealSeed[]>();
  for (const deal of deals) {
    if (!deal.city) continue;
    const city = deal.city;
    const list = byCity.get(city) ?? [];
    list.push(deal);
    byCity.set(city, list);
  }

  const route = pickCityRoute(deals, duration);
  const segmentDays = allocateSegmentDays(duration, route);

  const seeds: DaySeed[] = [];
  let globalIndex = 0;

  for (let segmentIndex = 0; segmentIndex < route.length; segmentIndex += 1) {
    const city = route[segmentIndex] ?? "Bangkok";
    const daysHere = segmentDays[segmentIndex] ?? 0;
    const queue = byCity.get(city) ?? [];
    const prevCity = segmentIndex > 0 ? route[segmentIndex - 1] : undefined;

    for (let localDay = 0; localDay < daysHere; localDay += 1) {
      const deal = queue.shift();
      const travelFrom = localDay === 0 && prevCity && prevCity !== city ? prevCity : undefined;
      seeds.push({
        day: globalIndex + 1,
        date: addDaysIso(windowStart, globalIndex),
        city,
        ...(travelFrom ? { travelFrom } : {}),
        ...(deal ? { deal } : {}),
      });
      globalIndex += 1;
      if (globalIndex >= duration) break;
    }
    if (globalIndex >= duration) break;
  }

  return seeds.slice(0, duration);
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

        const end = addDaysIso(window.windowStart, duration - 1);
        const events = await getEventsInRange({ start: window.windowStart, end }).catch(() => []);

        const daySeeds = buildDaySeeds(dealPool, duration, window.windowStart);

        const ai = await generateItineraryWithOpenAI({
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
          duration,
          score: window.score,
          daySeeds,
          events,
        });

        const rawDays =
          ai?.days?.length === duration ? ai.days : buildFallbackItinerary(daySeeds, events);

        const days = rawDays.slice(0, duration).map((day, index) => {
          const seed = daySeeds[index];
          return {
            ...day,
            day: seed.day,
            date: seed.date,
            city: seed.city,
            ...(seed.travelFrom ? { travelFrom: seed.travelFrom } : {}),
            deal_ids: seed.deal ? [seed.deal.id] : [],
          };
        });

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
