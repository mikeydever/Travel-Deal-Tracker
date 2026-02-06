import { PRIMARY_TRIP } from "@/config/travel";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { FlightMetadata, FlightSampleInput } from "@/types/pricing";

const SELECT_FIELDS =
  "id, origin, destination, depart_date, return_date, price, currency, checked_at, metadata";

export interface FlightPriceRow {
  id: string;
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  price: number;
  currency: string;
  checked_at: string;
  metadata?: FlightMetadata;
}

export const saveFlightSample = async (sample: FlightSampleInput) => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    origin: sample.origin,
    destination: sample.destination,
    depart_date: sample.departDate,
    return_date: sample.returnDate,
    price: sample.price,
    currency: sample.currency,
    checked_at: sample.checkedAt ?? new Date().toISOString(),
    metadata: sample.metadata ?? {},
  };

  const { data, error } = await client
    .from("flight_prices")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert flight sample: ${error.message}`);
  }

  return data;
};

const buildFallbackFlightHistory = (limit = 14): FlightPriceRow[] => {
  const now = Date.now();
  return Array.from({ length: limit }).map((_, index) => {
    const timestamp = new Date(now - (limit - index) * 24 * 60 * 60 * 1000);
    const seasonalSwing = 80 * Math.sin(index / 3);
    const noise = (Math.random() - 0.5) * 40;
    const price = Math.max(950, 1250 + seasonalSwing + noise);
    return {
      id: `fallback-flight-${index}`,
      origin: PRIMARY_TRIP.origin,
      destination: PRIMARY_TRIP.destination,
      depart_date: PRIMARY_TRIP.departDate,
      return_date: PRIMARY_TRIP.returnDate,
      price: Math.round(price * 100) / 100,
      currency: "CAD",
      checked_at: timestamp.toISOString(),
      metadata: { source: "mock" },
    };
  });
};

export const getRecentFlightPrices = async (limit = 30): Promise<FlightPriceRow[]> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("flight_prices")
      .select(SELECT_FIELDS)
      .eq("origin", PRIMARY_TRIP.origin)
      .eq("destination", PRIMARY_TRIP.destination)
      .eq("depart_date", PRIMARY_TRIP.departDate)
      .eq("return_date", PRIMARY_TRIP.returnDate)
      .order("checked_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return buildFallbackFlightHistory(limit);
    }

    return data as FlightPriceRow[];
  } catch (error) {
    console.warn("[flight_prices] falling back to mocked data", error);
    return buildFallbackFlightHistory(limit);
  }
};

export const getLatestFlightSample = async (): Promise<FlightPriceRow | null> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("flight_prices")
      .select(SELECT_FIELDS)
      .eq("origin", PRIMARY_TRIP.origin)
      .eq("destination", PRIMARY_TRIP.destination)
      .eq("depart_date", PRIMARY_TRIP.departDate)
      .eq("return_date", PRIMARY_TRIP.returnDate)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const fallback = buildFallbackFlightHistory(1);
      return fallback[0];
    }

    return data as FlightPriceRow;
  } catch (error) {
    console.warn("[flight_prices] falling back to mocked latest sample", error);
    const fallback = buildFallbackFlightHistory(1);
    return fallback[0];
  }
};
