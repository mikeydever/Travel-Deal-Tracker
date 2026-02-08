import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import { getRecommendedWindows } from "@/services/itineraryScoring";
import type { ItineraryDay, ItinerarySuggestionRow } from "@/types/itinerary";

const SELECT_FIELDS =
  "id, window_start, window_end, duration_days, title, summary, days, score, created_at";

const buildFallbackDays = (duration: number): ItineraryDay[] =>
  Array.from({ length: duration }).map((_, index) => ({
    day: index + 1,
    morning: "Slow breakfast and a neighborhood walk.",
    afternoon: "Iconic attraction with a guided experience.",
    evening: "Night market dinner or riverside drinks.",
  }));

const buildFallbackItineraries = async (): Promise<ItinerarySuggestionRow[]> => {
  const [flightHistory, hotelHistoryByCity] = await Promise.all([
    getRecentFlightPrices(30),
    getHotelHistoryByCity(undefined, 20),
  ]);

  const windows = getRecommendedWindows({
    flightHistory,
    hotelHistoryByCity,
    windowLength: 5,
    maxWindows: 3,
  });

  const durations = [3, 5, 7, 10];

  return windows.flatMap((window, index) =>
    durations.map((duration) => ({
      id: `fallback-${index}-${duration}`,
      window_start: window.windowStart,
      window_end: window.windowEnd,
      duration_days: duration,
      title: `Thailand ${duration}-day rhythm`,
      summary: "Balanced days mixing culture, food, and a standout experience in each city.",
      days: buildFallbackDays(duration),
      score: window.score,
      created_at: new Date().toISOString(),
    }))
  );
};

export const getItinerarySuggestions = async (): Promise<ItinerarySuggestionRow[]> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("itinerary_suggestions")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return buildFallbackItineraries();
    }

    return data as ItinerarySuggestionRow[];
  } catch (error) {
    console.warn("[itineraries] falling back to mocked data", error);
    return buildFallbackItineraries();
  }
};
