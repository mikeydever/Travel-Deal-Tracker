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

// PTO typically ends the day before you're back at work. Keep this configurable via PRIMARY_TRIP.
const PTO_FRIENDLY_DURATION = Math.max(3, PRIMARY_TRIP.tripLengthDays - 1);
const WEEKEND_BUFFER_DURATION = Math.max(3, PRIMARY_TRIP.tripLengthDays - 3);
const DURATIONS_BASE = [3, 5, 7, 10, 14, WEEKEND_BUFFER_DURATION, PTO_FRIENDLY_DURATION];
const DURATIONS = Array.from(new Set([...DURATIONS_BASE, PRIMARY_TRIP.tripLengthDays])).sort(
  (a, b) => a - b
);

interface DealSeed {
  id: string;
  title: string;
  city?: string | null;
  category?: string | null;
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

const daysBetweenInclusive = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00Z`).getTime();
  const endDate = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickFrom = (items: string[], seed: string) => {
  if (items.length === 0) return "";
  const index = hashString(seed) % items.length;
  return items[index] ?? items[0] ?? "";
};

const chooseCityCount = (duration: number) => {
  if (duration <= 5) return 1;
  if (duration <= 9) return 2;
  if (duration <= 16) return 3;
  return 4;
};

const pickCityRoute = (deals: DealSeed[], duration: number) => {
  const counts = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.city) continue;
    counts.set(deal.city, (counts.get(deal.city) ?? 0) + 1);
  }

  const startCity = "Bangkok";
  const endCity = "Bangkok";

  const ranked = [...THAI_HUB_CITIES]
    .filter((city) => city !== startCity)
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  if (duration <= 5) {
    return [startCity];
  }

  // For longer trips, prefer a coherent north + beach split instead of daily city hopping.
  const middle: string[] = [];
  const available = new Set(ranked.filter((city) => (counts.get(city) ?? 0) > 0));
  const addBest = (cities: string[]) => {
    const filtered = cities.filter((city) => city !== startCity && !middle.includes(city));
    if (filtered.length === 0) return;
    const best = filtered.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
    if (best) middle.push(best);
  };

  if (duration >= 17) {
    if (available.has("Chiang Mai")) middle.push("Chiang Mai");
    addBest(["Krabi", "Phuket"]);
    if (available.has("Koh Samui")) middle.push("Koh Samui");
  } else if (duration >= 10) {
    if (available.has("Chiang Mai")) middle.push("Chiang Mai");
    addBest(["Krabi", "Phuket", "Koh Samui"]);
  } else {
    addBest(ranked);
  }

  const desiredMiddle = Math.max(1, Math.min(chooseCityCount(duration) - 1, ranked.length));
  while (middle.length < desiredMiddle) {
    const next = ranked.find((city) => !middle.includes(city));
    if (!next) break;
    middle.push(next);
  }

  return [startCity, ...middle.slice(0, desiredMiddle), endCity];
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

const buildCitySegments = (seeds: DaySeed[]) => {
  const segments: Array<{ city: string; start: string; end: string }> = [];
  for (const seed of seeds) {
    const last = segments[segments.length - 1];
    if (!last || last.city !== seed.city) {
      segments.push({ city: seed.city, start: seed.date, end: seed.date });
    } else {
      last.end = seed.date;
    }
  }
  return segments;
};

const buildItineraryHeader = (seeds: DaySeed[], windowStart: string, windowEnd: string) => {
  const segments = buildCitySegments(seeds);
  const preview = segments
    .map((segment) => {
      const format = (value: string) =>
        new Date(`${value}T00:00:00Z`).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        });
      return `${segment.city} (${format(segment.start)}-${format(segment.end)})`;
    })
    .join(" · ");

  return {
    title: `Thailand loop: ${windowStart} to ${windowEnd}`,
    summary:
      segments.length > 1
        ? `City blocks with travel days baked in: ${preview}.`
        : "Single-city rhythm with one standout experience each day.",
  };
};

const buildDayTitle = (params: { seed: DaySeed; index: number; duration: number }) => {
  const { seed, index, duration } = params;
  const isFirst = seed.day === 1;
  const isLast = seed.day === duration;
  if (isFirst) return `Arrive in ${seed.city}`;
  if (isLast && seed.city === "Bangkok") return "Departure prep in Bangkok";
  if (isLast) return `Last day in ${seed.city}`;
  if (seed.travelFrom) return `Travel to ${seed.city}`;

  const themes = [
    "Markets + street food",
    "Temples + old town",
    "Waterfront + neighborhoods",
    "Nature + viewpoints",
    "Museums + cafes",
    "Wellness + slow afternoon",
  ];
  const theme = pickFrom(themes, `${seed.date}-${seed.city}-${index}`);
  return `${seed.city}: ${theme}`;
};

const buildFallbackItinerary = (
  seeds: DaySeed[],
  events: EventRow[] = []
): ItineraryDay[] => {
  const morningByCity: Record<string, string[]> = {
    Bangkok: [
      "Temple hop early, then breakfast near the river.",
      "Canal-side walk and a casual cafe start.",
      "Old town loop with a coffee stop and a slow pace.",
      "Neighborhood wander with a bakery break.",
      "Market breakfast and a short boat ride for orientation.",
    ],
    "Chiang Mai": [
      "Old city temple circuit and a slow breakfast.",
      "Cafe start, then a neighborhood walk inside the moat.",
      "Early viewpoint or park walk, then a light brunch.",
      "Local market stop and a relaxed morning in the old quarter.",
      "Craft shopping and a short stroll through side streets.",
    ],
    Krabi: [
      "Beach sunrise, then breakfast with a view.",
      "Slow morning on the sand, then coffee and a short walk.",
      "Viewpoint hike (easy pace), then brunch.",
      "Market stop and a lazy morning by the water.",
      "Cafe start, then a scenic coastal stroll.",
    ],
    Phuket: [
      "Old town stroll and a cafe breakfast.",
      "Beach morning, then a slow brunch.",
      "Viewpoint loop, then coffee and a reset.",
      "Neighborhood walk with a bakery stop.",
      "Market breakfast and a relaxed start.",
    ],
    "Koh Samui": [
      "Sunrise viewpoint and a relaxed cafe start.",
      "Beach morning, then brunch and a short walk.",
      "Slow breakfast, then a neighborhood wander.",
      "Coffee start, then a gentle viewpoint or temple stop.",
      "Market bite and an easy start by the water.",
    ],
  };

  const eveningByCity: Record<string, string[]> = {
    Bangkok: [
      "Riverside dinner and a low-key night view.",
      "Night market snack run and an early finish.",
      "Chinatown-style food crawl with a short stroll after.",
      "Rooftop or riverside drinks to cap the day.",
      "Casual dinner, then a walk through a lively neighborhood.",
    ],
    "Chiang Mai": [
      "Night market tasting and a relaxed walk back.",
      "Low-key dinner and a short lantern-lit stroll.",
      "Old town dinner, then a casual bar or dessert stop.",
      "Street food sampling and a quiet finish.",
      "Riverside dinner with a slow pace.",
    ],
    Krabi: [
      "Seafood dinner and a sunset view.",
      "Night market bites and a short waterfront walk.",
      "Casual dinner, then a calm beach stroll.",
      "Sunset drinks, then an early night.",
      "Food crawl focused on local specialties.",
    ],
    Phuket: [
      "Old town dinner and a late dessert stop.",
      "Night market sampling and a short walk.",
      "Sunset viewpoint, then a casual dinner.",
      "Food crawl with a focus on local specialties.",
      "Rooftop drinks, then a relaxed finish.",
    ],
    "Koh Samui": [
      "Riverside or beach dinner with a sunset view.",
      "Night market bites and a calm walk back.",
      "Casual dinner, then a short beach stroll.",
      "Food crawl focused on local specialties.",
      "Low-key drinks and an early finish.",
    ],
  };

  return seeds.map((seed, index) => {
    const deal = seed.deal;
    const price = formatDealPrice(deal);
    const rating = deal?.rating ? `${deal.rating.toFixed(1)}★` : null;
    const featured = deal
      ? `Featured experience: ${deal.title}${price ? ` (${price}` : ""}${
          price && rating ? ", " : ""
        }${rating ?? ""}${price || rating ? ")" : ""}.`
      : `Guided highlight focusing on ${seed.city}.`;

    const matchingEvent = events.find((event) => {
      const location = (event.location ?? "").toLowerCase();
      const city = seed.city.toLowerCase();
      if (location && !location.includes(city) && city !== "bangkok") return false;
      return event.start_date <= seed.date && event.end_date >= seed.date;
    });

    const morning = seed.travelFrom
      ? `Travel from ${seed.travelFrom} to ${seed.city}, check in, and reset with a coffee.`
      : pickFrom(morningByCity[seed.city] ?? morningByCity.Bangkok ?? [], `${seed.date}-${seed.city}-am`);

    const evening = matchingEvent
      ? `Catch ${matchingEvent.name} in the evening, then a late supper.`
      : seed.day === seeds.length && seed.city === "Bangkok"
        ? "Pack, grab a simple dinner, and get an early night for travel."
        : pickFrom(eveningByCity[seed.city] ?? eveningByCity.Bangkok ?? [], `${seed.date}-${seed.city}-pm`);

    return {
      day: seed.day,
      date: seed.date,
      city: seed.city,
      ...(seed.travelFrom ? { travelFrom: seed.travelFrom } : {}),
      title: buildDayTitle({ seed, index, duration: seeds.length }),
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

const isLowVariety = (days: ItineraryDay[]) => {
  const take = (value: string) => value.trim().toLowerCase();
  const morningUnique = new Set(days.map((row) => take(row.morning))).size;
  const eveningUnique = new Set(days.map((row) => take(row.evening))).size;
  const threshold = Math.max(3, Math.ceil(days.length * 0.6));
  return morningUnique < threshold || eveningUnique < threshold;
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

const buildDealPool = (deals: Awaited<ReturnType<typeof getExperienceDeals>>): DealSeed[] => {
  const byCity = new Map<string, DealSeed[]>();
  for (const deal of deals) {
    const city = deal.city ?? null;
    if (!city) continue;
    const row: DealSeed = {
      id: deal.id,
      title: deal.title,
      city,
      category: deal.category ?? null,
      price: deal.price ?? null,
      currency: deal.currency ?? null,
      rating: deal.rating ?? null,
      url: deal.url,
    };
    const list = byCity.get(city) ?? [];
    list.push(row);
    byCity.set(city, list);
  }

  const cities = THAI_HUB_CITIES.filter((city) => city !== "Bangkok");
  for (const city of cities) {
    const list = byCity.get(city) ?? [];
    list.sort((a, b) => {
      const aHas = a.price && a.rating ? 1 : 0;
      const bHas = b.price && b.rating ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
    });
    byCity.set(city, list.slice(0, 60));
  }

  const bangkok = byCity.get("Bangkok") ?? [];
  bangkok.sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
  });
  byCity.set("Bangkok", bangkok.slice(0, 60));

  const flattened: DealSeed[] = [];
  for (const city of THAI_HUB_CITIES) {
    flattened.push(...(byCity.get(city) ?? []));
  }
  return flattened;
};

export const runItineraryAgent = async (): Promise<ItineraryAgentResult> => {
  const [flightHistory, hotelHistoryByCity, deals] = await Promise.all([
    getRecentFlightPrices(30),
    getHotelHistoryByCity(undefined, 20),
    getExperienceDeals({ topOnly: true, limit: 160, preferBookable: true }),
  ]);

  const windows = getRecommendedWindows({
    flightHistory,
    hotelHistoryByCity,
    windowLength: 5,
    maxWindows: 3,
  });

  // Always include a start window for the actual trip start date so long itineraries map cleanly.
  const tripStart = PRIMARY_TRIP.departDate;
  if (!windows.some((row) => row.windowStart === tripStart)) {
    windows.push({
      windowStart: tripStart,
      windowEnd: addDaysIso(tripStart, 4),
      score: windows[0]?.score ?? 70,
      label: "Trip start",
    });
  }

  // In-country itinerary should end the day before PRIMARY_TRIP.returnDate so "return date" can be the flight home.
  const inCountryEnd = addDaysIso(PRIMARY_TRIP.returnDate, -1);

  let inserted = 0;
  let skipped = 0;

  const dealPoolAll = buildDealPool(deals);

  for (const window of windows) {
    const maxDuration = daysBetweenInclusive(window.windowStart, inCountryEnd);
    for (const duration of DURATIONS) {
      try {
        if (duration > maxDuration) {
          skipped += 1;
          continue;
        }

        const end = addDaysIso(window.windowStart, duration - 1);
        const events = await getEventsInRange({ start: window.windowStart, end }).catch(() => []);

        const daySeeds = buildDaySeeds(dealPoolAll, duration, window.windowStart);

        // For longer trips, deterministic output is more reliable (and avoids repetitive LLM patterns).
        const allowAI = duration <= 10;

        const ai = allowAI
          ? await generateItineraryWithOpenAI({
              windowStart: window.windowStart,
              windowEnd: end,
              duration,
              score: window.score,
              daySeeds,
              events,
            })
          : null;

        const aiDaysOk =
          ai?.days?.length === duration && Array.isArray(ai.days) && !isLowVariety(ai.days);
        const rawDays = aiDaysOk ? ai!.days! : buildFallbackItinerary(daySeeds, events);

        const days = rawDays.slice(0, duration).map((day, index) => {
          const seed = daySeeds[index];
          return {
            ...day,
            day: seed.day,
            date: seed.date,
            city: seed.city,
            ...(seed.travelFrom ? { travelFrom: seed.travelFrom } : {}),
            title: buildDayTitle({ seed, index, duration }),
            deal_ids: seed.deal ? [seed.deal.id] : [],
          };
        });

        const header = buildItineraryHeader(daySeeds, window.windowStart, end);

        await replaceItinerary({
          windowStart: window.windowStart,
          windowEnd: end,
          durationDays: duration,
          title: header.title,
          summary: header.summary,
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
