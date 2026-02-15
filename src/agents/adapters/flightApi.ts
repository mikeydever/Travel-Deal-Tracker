import { env } from "@/lib/env";
import type { FlightLegMeta, FlightMetadata, FlightOffer, FlightQuote } from "@/types/pricing";

interface FlightQuery {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  cabin?: string;
}

const CARRIERS = ["CX", "JAL", "EVA", "ANA", "Korean Air"] as const;
const FARE_CLASSES = ["Economy", "Economy Flex", "Economy Light"] as const;
const FLIGHT_CURRENCY = "CAD";
const TRAVELPAYOUTS_CALENDAR_URL = "https://api.travelpayouts.com/v1/prices/calendar";

const RAPIDAPI_HOST = "flight-fare-search.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}/v2/flights/`;

const isFlightApiDisabled = () => {
  const until = env.FLIGHT_API_DISABLED_UNTIL;
  if (!until) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today <= until;
};

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
  const sorted = quotes.sort((a, b) => a.price - b.price);
  const toOffer = (quote: FlightQuote): FlightOffer => ({
    carrier: quote.carrier,
    fareClass: quote.fareClass,
    price: quote.price,
    currency: quote.currency,
    durationHours: quote.durationHours,
    stops: quote.stops,
    combinedStops: quote.stops,
    combinedDurationMinutes: Math.round(quote.durationHours * 60),
  });
  const topOverall = sorted.slice(0, 3).map(toOffer);
  const topDirect = sorted.filter((quote) => quote.stops === 0).slice(0, 3).map(toOffer);
  if (sorted[0]) {
    sorted[0].metadata = {
      ...(sorted[0].metadata ?? {}),
      offers: {
        topOverall,
        topDirect,
      },
    };
  }
  return sorted;
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

interface TravelpayoutsCalendarResult {
  origin?: string;
  destination?: string;
  airline?: string;
  departure_at?: string;
  return_at?: string;
  price?: number;
  flight_number?: string | number;
  transfers?: number;
  return_transfers?: number;
  duration?: number;
  duration_to?: number;
  duration_back?: number;
  link?: string;
}

interface TravelpayoutsCalendarResponse {
  data?: Record<string, TravelpayoutsCalendarResult> | TravelpayoutsCalendarResult[] | null;
  currency?: string;
  success?: boolean;
}

const toUtcDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const getTripLengthDays = (departDate: string, returnDate: string) => {
  const departMs = Date.parse(`${departDate}T00:00:00Z`);
  const returnMs = Date.parse(`${returnDate}T00:00:00Z`);
  if (!Number.isFinite(departMs) || !Number.isFinite(returnMs) || returnMs <= departMs) return 0;
  return Math.round((returnMs - departMs) / 86400000);
};

const normalizeTravelpayoutsRows = (payload: TravelpayoutsCalendarResponse) => {
  if (!payload?.data) return [];
  if (Array.isArray(payload.data)) return payload.data;
  return Object.values(payload.data);
};

const fetchTravelpayoutsCalendar = async (
  query: FlightQuery
): Promise<{ rows: TravelpayoutsCalendarResult[]; currency: string }> => {
  if (!env.TRAVELPAYOUTS_API_TOKEN) {
    throw new Error("Missing TRAVELPAYOUTS_API_TOKEN for Travelpayouts");
  }

  const url = new URL(TRAVELPAYOUTS_CALENDAR_URL);
  url.search = new URLSearchParams({
    origin: query.origin,
    destination: query.destination,
    depart_date: query.departDate,
    calendar_type: "departure_date",
    currency: FLIGHT_CURRENCY.toLowerCase(),
    token: env.TRAVELPAYOUTS_API_TOKEN,
  }).toString();

  const response = await fetch(url);
  const payload = (await response.json()) as TravelpayoutsCalendarResponse;
  if (!response.ok || payload?.success === false) {
    throw new Error("Travelpayouts calendar request failed");
  }

  return {
    rows: normalizeTravelpayoutsRows(payload),
    currency: (payload.currency ?? FLIGHT_CURRENCY).toUpperCase(),
  };
};

const getTravelpayoutsStops = (result: TravelpayoutsCalendarResult) => {
  const outboundStops = result.transfers ?? 0;
  const returnStops =
    typeof result.return_transfers === "number" ? result.return_transfers : result.transfers ?? 0;
  return { outboundStops, returnStops, combinedStops: outboundStops + returnStops };
};

const scoreTravelpayoutsResult = (
  result: TravelpayoutsCalendarResult,
  targetDepartDay: number,
  targetTripLengthDays: number
) => {
  const departureDay = result.departure_at ? toUtcDay(result.departure_at) : null;
  const returnDay = result.return_at ? toUtcDay(result.return_at) : null;
  if (departureDay === null) return Number.POSITIVE_INFINITY;

  const departDiff = Math.abs((departureDay - targetDepartDay) / 86400000);
  const tripLength = returnDay !== null ? Math.round((returnDay - departureDay) / 86400000) : 0;
  const tripLengthDiff = targetTripLengthDays > 0 ? Math.abs(tripLength - targetTripLengthDays) : 0;
  const stops = getTravelpayoutsStops(result).combinedStops;

  return departDiff * 15 + tripLengthDiff * 3 + stops;
};

const buildTravelpayoutsOffer = (
  result: TravelpayoutsCalendarResult,
  currency: string,
  cabin: string
): FlightOffer | null => {
  if (typeof result.price !== "number" || result.price <= 0) return null;

  const outboundDuration = result.duration_to ?? 0;
  const returnDuration = result.duration_back ?? 0;
  const combinedDuration = result.duration ?? outboundDuration + returnDuration;
  const stops = getTravelpayoutsStops(result);

  return {
    carrier: result.airline ?? "Carrier TBD",
    fareClass: cabin || "Economy",
    price: Math.round(result.price * 100) / 100,
    currency,
    durationHours: combinedDuration ? Math.round((combinedDuration / 60) * 10) / 10 : undefined,
    stops: stops.combinedStops,
    outbound: {
      carrierCode: result.airline,
      flightCode: result.flight_number ? String(result.flight_number) : undefined,
      stops: stops.outboundStops,
      durationMinutes: outboundDuration || undefined,
      currency,
    },
    returnLeg: {
      stops: stops.returnStops,
      durationMinutes: returnDuration || undefined,
      currency,
    },
    combinedStops: stops.combinedStops,
    combinedDurationMinutes: combinedDuration || undefined,
  };
};

export const fetchTravelpayoutsRoundTripQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  const { rows, currency } = await fetchTravelpayoutsCalendar(query);

  const normalized = rows.filter(
    (result) =>
      typeof result.price === "number" &&
      result.price > 0 &&
      (!result.origin || result.origin.toUpperCase() === query.origin.toUpperCase()) &&
      (!result.destination || result.destination.toUpperCase() === query.destination.toUpperCase())
  );

  if (!normalized.length) {
    return [];
  }

  const targetDepartDay = Date.parse(`${query.departDate}T00:00:00Z`);
  const targetTripLengthDays = getTripLengthDays(query.departDate, query.returnDate);
  const cabin = query.cabin ?? "Economy";

  const ranked = [...normalized].sort((a, b) => {
    const scoreA = scoreTravelpayoutsResult(a, targetDepartDay, targetTripLengthDays);
    const scoreB = scoreTravelpayoutsResult(b, targetDepartDay, targetTripLengthDays);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
  });

  const topOffers = ranked
    .map((result) => buildTravelpayoutsOffer(result, currency, cabin))
    .filter((offer): offer is FlightOffer => Boolean(offer))
    .slice(0, 3);

  const best = topOffers[0];
  if (!best) return [];

  const offers = {
    topOverall: topOffers,
    topDirect: topOffers.filter((offer) => offer.stops === 0).slice(0, 3),
  };

  return [
    {
      carrier: best.carrier,
      fareClass: best.fareClass,
      price: best.price,
      currency: best.currency,
      durationHours: best.durationHours ?? 0,
      stops: best.stops,
      metadata: {
        source: "travelpayouts",
        outbound: best.outbound,
        returnLeg: best.returnLeg,
        combinedStops: best.combinedStops,
        combinedDurationMinutes: best.combinedDurationMinutes,
        offers,
      },
    },
  ];
};

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

const buildOffer = (
  outboundMeta: FlightLegMeta,
  returnMeta: FlightLegMeta,
  currencyFallback: string
): FlightOffer => {
  const outboundPrice = outboundMeta.price ?? 0;
  const returnPrice = returnMeta.price ?? 0;
  const totalPrice = outboundPrice + returnPrice;
  const outboundStops = outboundMeta.stops ?? 0;
  const returnStops = returnMeta.stops ?? 0;
  const outboundDuration = outboundMeta.durationMinutes ?? 0;
  const returnDuration = returnMeta.durationMinutes ?? 0;
  const carriers = [outboundMeta.carrierName, returnMeta.carrierName].filter(Boolean) as string[];
  const uniqueCarriers = Array.from(new Set(carriers));
  const combinedStops = outboundStops + returnStops;
  const combinedDurationMinutes = outboundDuration + returnDuration;

  return {
    carrier: uniqueCarriers.join(" + ") || outboundMeta.carrierCode || "Carrier TBD",
    fareClass: outboundMeta.fareClass ?? "Economy",
    price: Math.round(totalPrice * 100) / 100,
    currency: outboundMeta.currency ?? currencyFallback,
    durationHours: Math.round((combinedDurationMinutes / 60) * 10) / 10,
    stops: combinedStops,
    outbound: outboundMeta,
    returnLeg: returnMeta,
    combinedStops,
    combinedDurationMinutes,
  };
};

const buildOfferList = (
  outboundResults: RapidApiResult[] = [],
  returnResults: RapidApiResult[] = [],
  currency: string
) => {
  const toLegMeta = (results: RapidApiResult[]) =>
    results
      .map((result) => buildLegMeta(result, currency))
      .filter((meta): meta is FlightLegMeta => Boolean(meta?.price));

  const outboundOptions = toLegMeta(outboundResults).sort(
    (a, b) => (a.price ?? 0) - (b.price ?? 0)
  );
  const returnOptions = toLegMeta(returnResults).sort(
    (a, b) => (a.price ?? 0) - (b.price ?? 0)
  );

  const outboundTop = outboundOptions.slice(0, 5);
  const returnTop = returnOptions.slice(0, 5);

  const offers: FlightOffer[] = [];
  for (const outboundMeta of outboundTop) {
    for (const returnMeta of returnTop) {
      const offer = buildOffer(outboundMeta, returnMeta, currency);
      if (offer.price > 0) {
        offers.push(offer);
      }
    }
  }

  const sorted = offers.sort((a, b) => a.price - b.price);
  const topOverall = sorted.slice(0, 3);
  const topDirect = sorted.filter((offer) => offer.stops === 0).slice(0, 3);

  return { topOverall, topDirect };
};

const quoteFromOffer = (offer: FlightOffer, offers: FlightMetadata["offers"]): FlightQuote => ({
  carrier: offer.carrier,
  fareClass: offer.fareClass,
  price: offer.price,
  currency: offer.currency,
  durationHours: offer.durationHours ?? 0,
  stops: offer.stops,
  metadata: {
    source: "rapidapi",
    outbound: offer.outbound,
    returnLeg: offer.returnLeg,
    combinedStops: offer.combinedStops,
    combinedDurationMinutes: offer.combinedDurationMinutes,
    offers,
  },
});

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

  const currency = FLIGHT_CURRENCY;
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
  const offers = buildOfferList(outboundResponse.results ?? [], returnResponse.results ?? [], currency);
  const cheapestOffer = offers.topOverall[0];

  if (cheapestOffer) {
    return [quoteFromOffer(cheapestOffer, offers)];
  }

  const quote = buildRoundTripQuote(outbound, returnLeg, currency);
  return quote ? [quote] : [];
};

export const fetchFlightQuotes = async (query: FlightQuery): Promise<FlightQuote[]> => {
  try {
    if (env.TRAVELPAYOUTS_API_TOKEN) {
      const travelpayouts = await fetchTravelpayoutsRoundTripQuotes(query);
      if (travelpayouts.length) return travelpayouts;
    }
  } catch (error) {
    console.warn("[flightApi] Travelpayouts unavailable; trying fallback", error);
  }

  try {
    if (env.FLIGHT_API_KEY && !isFlightApiDisabled()) {
      const live = await fetchRapidApiRoundTripQuotes(query);
      if (live.length) return live;
    }
    if (env.FLIGHT_API_KEY && isFlightApiDisabled()) {
      console.warn("[flightApi] live API disabled; using mock data");
    }
  } catch (error) {
    console.warn("[flightApi] falling back to mock data", error);
  }

  return fetchMockFlightQuotes(query);
};

export type { FlightQuery };
