import type { HotelAverageResponse } from "@/types/pricing";

const BASELINE: Record<string, number> = {
  Bangkok: 150,
  "Chiang Mai": 105,
  Phuket: 190,
  Krabi: 165,
  "Koh Samui": 215,
};

const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const result = Math.abs(Math.cos(hash) * 1000) % 1;
  return result;
};

export const fetchMockHotelAverage = async (city: string): Promise<HotelAverageResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 25));
  const baseline = BASELINE[city] ?? 160;
  const swing = (pseudoRandom(`${city}-${new Date().toISOString().slice(0, 10)}`) - 0.5) * 20;
  const price = Math.round((baseline + swing) * 100) / 100;
  const sampleSize = 60 + Math.round(pseudoRandom(city) * 80);

  return {
    city,
    avgPrice: price,
    currency: "CAD",
    sampleSize,
  };
};
