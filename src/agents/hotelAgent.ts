import { fetchHotelAverage } from "@/agents/adapters/hotelApi";
import { THAI_HUB_CITIES } from "@/config/travel";
import { saveHotelSample } from "@/data/hotelPrices";

export interface HotelAgentResult {
  inserted: number;
  cities: Array<{ city: string; avgPrice: number }>;
}

export const runHotelAgent = async (): Promise<HotelAgentResult> => {
  const entries = await Promise.all(
    THAI_HUB_CITIES.map(async (city) => {
      const average = await fetchHotelAverage(city);

      await saveHotelSample({
        city,
        avgPrice: average.avgPrice,
        currency: average.currency,
        metadata: average.metadata,
      });

      return { city, avgPrice: average.avgPrice };
    })
  );

  return {
    inserted: entries.length,
    cities: entries,
  };
};
