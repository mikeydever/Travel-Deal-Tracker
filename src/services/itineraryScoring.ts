import { PRIMARY_TRIP } from "@/config/travel";
import type { FlightPriceRow } from "@/data/flightPrices";
import type { HotelPriceRow } from "@/data/hotelPrices";

export interface WindowScore {
  windowStart: string;
  windowEnd: string;
  score: number;
  label: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const addDays = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00Z`).getTime();
  const endDate = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
};

const computeFlightScore = (history: FlightPriceRow[]) => {
  if (!history.length) return 50;
  const prices = history.map((row) => row.price);
  const avg = mean(prices);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const latest = history[history.length - 1]?.price ?? avg;
  if (max === min) return 50;
  const relative = (avg - latest) / (max - min);
  return clamp(50 + relative * 35, 10, 90);
};

const computeHotelScore = (historyByCity: Record<string, HotelPriceRow[]>) => {
  const cityScores = Object.values(historyByCity).map((rows) => {
    if (!rows.length) return 50;
    const prices = rows.map((row) => row.avg_price);
    const avg = mean(prices);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const latest = rows[rows.length - 1]?.avg_price ?? avg;
    if (max === min) return 50;
    const relative = (avg - latest) / (max - min);
    return clamp(50 + relative * 30, 10, 90);
  });

  return cityScores.length ? mean(cityScores) : 50;
};

export const getRecommendedWindows = (params: {
  flightHistory: FlightPriceRow[];
  hotelHistoryByCity: Record<string, HotelPriceRow[]>;
  windowLength?: number;
  maxWindows?: number;
}): WindowScore[] => {
  const windowLength = params.windowLength ?? 5;
  const maxWindows = params.maxWindows ?? 3;
  const totalDays = daysBetween(PRIMARY_TRIP.departDate, PRIMARY_TRIP.returnDate);
  const steps = Math.max(1, totalDays - windowLength);
  const flightScore = computeFlightScore(params.flightHistory);
  const hotelScore = computeHotelScore(params.hotelHistoryByCity);

  const baseScore = clamp((flightScore + hotelScore) / 2, 20, 90);
  const windows: WindowScore[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const start = addDays(PRIMARY_TRIP.departDate, i);
    const end = addDays(start, windowLength - 1);
    const seasonal = Math.sin(i / 2.8) * 6 + Math.cos(i / 4.2) * 4;
    const score = clamp(baseScore + seasonal, 10, 98);
    windows.push({
      windowStart: start,
      windowEnd: end,
      score,
      label: score >= 80 ? "Prime value window" : score >= 70 ? "Solid value" : "Flexible option",
    });
  }

  return windows
    .sort((a, b) => b.score - a.score)
    .slice(0, maxWindows);
};
