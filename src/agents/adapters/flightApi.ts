import { env } from "@/lib/env";
import type { FlightLegMeta, FlightMetadata, FlightQuote } from "@/types/pricing";

interface FlightQuery {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  cabin?: string;
}

const CARRIERS = ["CX", "JAL", "EVA", "ANA", "Korean Air"] as const;
const FARE_CLASSES = ["Economy", "Economy Flex", "Economy Light"] as const;

const RAPIDAPI_HOST = "flight-fare-search.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}/v2/flights/`;

const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const result = Math.abs(Math.sin(hash) * 1000) % 1;
  return result;
};

const parseStops = (value?: string | number | null) => {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("direct") || normalized.includes("nonstop")) return 0;
  const match = normalized.match(/(\d+)/);
  if (!match) return undefined;
  return Number(match[1]);
};

const parseDurationMinutes = (value?: number | string | null, text?: string | null) => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (!text) return undefined;
  const hours = text.match(/(\d+)h/i);
  const minutes = text.match(/(\d+)m/i);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return total || undefined;
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
    metadata: { source: "mock" },
  };
};

export const fetchMockFlightQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const quotes: FlightQuote[] = Array.from({ length: 4 }, (_, index) => buildQuote(query, index));
  return quotes.sort((a, b) => a.price - b.price);
};

interface RapidApiResult {
  careerCode?: string;
  flight_code?: string;
  flight_name?: string;
  stops?: string | number | null;
  cabinType?: string;
  duration?: { text?: string | null; value?: number | null } | null;
  totals?: { total?: number | null; currency?: string | null } | null;
  currency?: string | null;
}

interface RapidApiResponse {
  status?: number;
  searchData?: { currency?: string } | null;
  results?: RapidApiResult[] | null;
}

const fetchRapidApiLeg = async (params: {
  from: string;
  to: string;
  date: string;
  cabin: string;
  currency: string;
  adult: number;
  child: number;
  infant: number;
}) => {
  const url = new URL(RAPIDAPI_BASE_URL);
  url.search = new URLSearchParams({
    from: params.from,
    to: params.to,
    date: params.date,
    adult: String(params.adult),
    child: String(params.child),
    infant: String(params.infant),
    type: params.cabin.toLowerCase(),
    currency: params.currency,
  }).toString();

  const response = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": env.FLIGHT_API_KEY,
    },
  });

  const payload = (await response.json()) as RapidApiResponse;
  if (!response.ok) {
    throw new Error(payload?.status ? `RapidAPI error ${payload.status}` : "RapidAPI request failed");
  }

  return payload;
};

const selectCheapest = (results: RapidApiResult[] = []) => {
  const sorted = [...results]
    .filter((item) => typeof item?.totals?.total === "number")
    .sort((a, b) => (a.totals?.total ?? 0) - (b.totals?.total ?? 0));
  return sorted[0] ?? null;
};

const buildLegMeta = (result: RapidApiResult | null, currencyFallback: string): FlightLegMeta | undefined => {
  if (!result) return undefined;
  const durationMinutes = parseDurationMinutes(result.duration?.value ?? null, result.duration?.text ?? null);
  return {
    carrierName: result.flight_name ?? undefined,
    carrierCode: result.careerCode ?? undefined,
    flightCode: result.flight_code ?? undefined,
    stops: parseStops(result.stops ?? undefined),
    stopsText: typeof result.stops === "string" ? result.stops : undefined,
    durationMinutes,
    fareClass: result.cabinType ?? undefined,
    price: typeof result.totals?.total === "number" ? result.totals.total : undefined,
    currency: result.totals?.currency ?? result.currency ?? currencyFallback,
  };
};

const buildRoundTripQuote = (
  outbound: RapidApiResult | null,
  returnLeg: RapidApiResult | null,
  currency: string
): FlightQuote | null => {
  if (!outbound || !returnLeg) return null;

  const outboundMeta = buildLegMeta(outbound, currency);
  const returnMeta = buildLegMeta(returnLeg, currency);
  const outboundPrice = outboundMeta?.price ?? 0;
  const returnPrice = returnMeta?.price ?? 0;
  const outboundStops = outboundMeta?.stops ?? 0;
  const returnStops = returnMeta?.stops ?? 0;
  const outboundDuration = outboundMeta?.durationMinutes ?? 0;
  const returnDuration = returnMeta?.durationMinutes ?? 0;

  const carriers = [outboundMeta?.carrierName, returnMeta?.carrierName].filter(Boolean) as string[];
  const uniqueCarriers = Array.from(new Set(carriers));

  const metadata: FlightMetadata = {
    source: "rapidapi",
    outbound: outboundMeta,
    returnLeg: returnMeta,
    combinedStops: outboundStops + returnStops,
    combinedDurationMinutes: outboundDuration + returnDuration,
  };

  const totalPrice = outboundPrice + returnPrice;
  const totalDurationHours = (metadata.combinedDurationMinutes ?? 0) / 60;

  return {
    carrier: uniqueCarriers.join(" + ") || outboundMeta?.carrierCode || "",
    fareClass: outboundMeta?.fareClass ?? "Economy",
    price: Math.round(totalPrice * 100) / 100,
    currency: outboundMeta?.currency ?? currency,
    durationHours: Math.round(totalDurationHours * 10) / 10,
    stops: metadata.combinedStops ?? 0,
    metadata,
  };
};

export const fetchRapidApiRoundTripQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  if (!env.FLIGHT_API_KEY) {
    throw new Error("Missing FLIGHT_API_KEY for RapidAPI");
  }

  const currency = "CAD";
  const cabin = query.cabin ?? "Economy";

  const [outboundResponse, returnResponse] = await Promise.all([
    fetchRapidApiLeg({
      from: query.origin,
      to: query.destination,
      date: query.departDate,
      cabin,
      currency,
      adult: 1,
      child: 0,
      infant: 0,
    }),
    fetchRapidApiLeg({
      from: query.destination,
      to: query.origin,
      date: query.returnDate,
      cabin,
      currency,
      adult: 1,
      child: 0,
      infant: 0,
    }),
  ]);

  const outbound = selectCheapest(outboundResponse.results ?? []);
  const returnLeg = selectCheapest(returnResponse.results ?? []);
  const quote = buildRoundTripQuote(outbound, returnLeg, currency);

  return quote ? [quote] : [];
};

export const fetchFlightQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  try {
    if (env.FLIGHT_API_KEY) {
      const live = await fetchRapidApiRoundTripQuotes(query);
      if (live.length) return live;
    }
  } catch (error) {
    console.warn("[flightApi] falling back to mock data", error);
  }

  return fetchMockFlightQuotes(query);
};

export type { FlightQuery };
