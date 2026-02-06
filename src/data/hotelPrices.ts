import { THAI_HUB_CITIES } from "@/config/travel";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { HotelSampleInput } from "@/types/pricing";

const SELECT_FIELDS = "id, city, avg_price, currency, checked_at";

export interface HotelPriceRow {
  id: string;
  city: string;
  avg_price: number;
  currency: string;
  checked_at: string;
}

export const saveHotelSample = async (sample: HotelSampleInput) => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    city: sample.city,
    avg_price: sample.avgPrice,
    currency: sample.currency,
    checked_at: sample.checkedAt ?? new Date().toISOString(),
  };

  const { data, error } = await client
    .from("hotel_prices")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert hotel sample: ${error.message}`);
  }

  return data;
};

const buildFallbackHotelHistory = (city: string, limit = 14): HotelPriceRow[] => {
  const base = 120 + city.length * 2;
  return Array.from({ length: limit }).map((_, index) => {
    const timestamp = new Date(Date.now() - (limit - index) * 24 * 60 * 60 * 1000);
    const noise = (Math.random() - 0.5) * 20;
    const seasonal = 10 * Math.sin(index / 2);
    const price = Math.max(75, base + noise + seasonal);
    return {
      id: `fallback-hotel-${city}-${index}`,
      city,
      avg_price: Math.round(price * 100) / 100,
      currency: "CAD",
      checked_at: timestamp.toISOString(),
    };
  });
};

export const getLatestHotelSnapshots = async (cities = THAI_HUB_CITIES) => {
  try {
    const client = getSupabaseServiceRoleClient();
    const results = await Promise.all(
      cities.map(async (city) => {
        const { data, error } = await client
          .from("hotel_prices")
          .select(SELECT_FIELDS)
          .eq("city", city)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return (data as HotelPriceRow | null) ?? null;
      })
    );

    return results.map((row, index) => row ?? buildFallbackHotelHistory(cities[index], 1)[0]);
  } catch (error) {
    console.warn("[hotel_prices] falling back to mocked snapshots", error);
    return cities.map((city) => buildFallbackHotelHistory(city, 1)[0]);
  }
};

export const getHotelHistoryByCity = async (
  cities = THAI_HUB_CITIES,
  limit = 20
): Promise<Record<string, HotelPriceRow[]>> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const entries = await Promise.all(
      cities.map(async (city) => {
        const { data, error } = await client
          .from("hotel_prices")
          .select(SELECT_FIELDS)
          .eq("city", city)
          .order("checked_at", { ascending: true })
          .limit(limit);

        if (error) {
          throw error;
        }

        return [city, (data as HotelPriceRow[]) ?? []] as const;
      })
    );

    const filled = entries.reduce<Record<string, HotelPriceRow[]>>((acc, [city, rows]) => {
      acc[city] = rows.length ? rows : buildFallbackHotelHistory(city, limit);
      return acc;
    }, {});

    return filled;
  } catch (error) {
    console.warn("[hotel_prices] falling back to mocked history", error);
    return cities.reduce<Record<string, HotelPriceRow[]>>((acc, city) => {
      acc[city] = buildFallbackHotelHistory(city, limit);
      return acc;
    }, {});
  }
};
