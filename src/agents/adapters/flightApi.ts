import type { FlightQuote } from "@/types/pricing";

interface FlightQuery {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
}

const CARRIERS = ["CX", "JAL", "EVA", "ANA", "Korean Air"] as const;
const FARE_CLASSES = ["Economy", "Economy Flex", "Economy Light"] as const;

const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const result = Math.abs(Math.sin(hash) * 1000) % 1;
  return result;
};

const buildQuote = (query: FlightQuery, carrierIndex: number): FlightQuote => {
  const base = 1100;
  const volatility = 250 * pseudoRandom(`${query.departDate}-${carrierIndex}`);
  const duration = 20 + carrierIndex * 2 + Math.round(pseudoRandom(`${carrierIndex}-${query.returnDate}`) * 4);
  const stops = carrierIndex % 2;

  return {
    carrier: CARRIERS[carrierIndex % CARRIERS.length],
    fareClass: FARE_CLASSES[(carrierIndex + 1) % FARE_CLASSES.length],
    price: Math.round((base + volatility + stops * 45) * 100) / 100,
    currency: "CAD",
    durationHours: duration,
    stops,
  };
};

export const fetchMockFlightQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const quotes: FlightQuote[] = Array.from({ length: 4 }, (_, index) => buildQuote(query, index));
  return quotes.sort((a, b) => a.price - b.price);
};

export type { FlightQuery };
