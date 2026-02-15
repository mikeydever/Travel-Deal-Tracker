import {
  HOTEL_GEOID_OVERRIDES,
  HOTEL_SEARCH_ADULTS,
  HOTEL_SEARCH_CURRENCY,
  HOTEL_SEARCH_DEFAULT_NIGHTS,
  HOTEL_SEARCH_ROOMS,
  PRIMARY_TRIP,
} from "@/config/travel";
import { env } from "@/lib/env";
import type { HotelAverageResponse, HotelMetadata } from "@/types/pricing";

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

const RAPIDAPI_HOST = "tripadvisor-com1.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;
const HOTEL_SEARCH_PATH = "/hotels/search";
const LOCATION_SEARCH_PATH = "/auto-complete";

const GEOID_CACHE = new Map<string, string>();

const addDays = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getDefaultHotelWindow = () => {
  const checkIn = PRIMARY_TRIP.departDate;
  const checkOut = addDays(checkIn, HOTEL_SEARCH_DEFAULT_NIGHTS);
  return { checkIn, checkOut };
};

const parsePrice = (value?: string | null) => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const getMedian = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const selectBudgetSlice = (prices: number[]) => {
  const sorted = [...prices].sort((a, b) => a - b);
  const floor = 5;
  const ceiling = 12;
  const dynamic = Math.ceil(sorted.length * 0.35);
  const size = Math.max(floor, Math.min(ceiling, dynamic, sorted.length));
  return sorted.slice(0, size);
};

const getPercentile = (sortedValues: number[], percentile: number) => {
  if (!sortedValues.length) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * percentile))
  );
  return sortedValues[index];
};

const deriveQualityFloor = (sortedValues: number[]) => {
  const median = getMedian(sortedValues);
  const q1 = getPercentile(sortedValues, 0.25);
  const relativeFloor = Math.max(median * 0.55, q1 * 0.75);
  const absoluteFloor = 45;
  return Math.round(Math.max(absoluteFloor, relativeFloor) * 100) / 100;
};

const extractCurrencyFromTrackingKey = (trackingKey?: string | null) => {
  if (!trackingKey) return undefined;
  try {
    const parsed = JSON.parse(trackingKey);
    if (typeof parsed?.cur === "string") return parsed.cur;
  } catch {
    // ignore parsing errors
  }
  const match = trackingKey.match(/"cur":"([A-Z]{3})"/);
  return match?.[1];
};

interface RapidApiHotelPriceDisplay {
  string?: string | null;
}

interface RapidApiHotelCommerceInfo {
  priceForDisplay?: RapidApiHotelPriceDisplay | null;
}

interface RapidApiHotelItem {
  commerceInfo?: RapidApiHotelCommerceInfo | null;
}

interface RapidApiFilterGroup {
  id?: string | null;
  name?: string | null;
  trackingKey?: string | null;
  filter?: { trackingKey?: string | null } | null;
}

interface RapidApiHotelsResponse {
  data?: {
    hotels?: RapidApiHotelItem[] | null;
    filters?: { filters?: { availableFilterGroups?: RapidApiFilterGroup[] | null } | null } | null;
  } | null;
}

interface RapidApiLocationResult {
  result_type?: string | null;
  result_object?: {
    location_id?: string | null;
    name?: string | null;
    long_name?: string | null;
    location_type?: string | null;
  } | null;
  location_id?: string | number | null;
  locationId?: string | number | null;
  geoId?: string | number | null;
  name?: string | null;
  title?: string | null;
  label?: string | null;
  heading?: { htmlString?: string | null } | null;
  secondaryTextLineOne?: { string?: string | null } | null;
  trackingItems?: {
    dataType?: string | null;
    placeType?: string | null;
    text?: string | null;
  } | null;
  type?: string | null;
}

interface RapidApiLocationResponse {
  data?: RapidApiLocationResult[] | { data?: RapidApiLocationResult[] } | { results?: RapidApiLocationResult[] };
  results?: RapidApiLocationResult[];
}

const normalizeLocationCandidates = (payload: RapidApiLocationResponse): RapidApiLocationResult[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray((payload?.data as { data?: RapidApiLocationResult[] })?.data)) {
    return (payload.data as { data?: RapidApiLocationResult[] }).data ?? [];
  }
  if (Array.isArray((payload?.data as { results?: RapidApiLocationResult[] })?.results)) {
    return (payload.data as { results?: RapidApiLocationResult[] }).results ?? [];
  }
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const extractGeoId = (candidate: RapidApiLocationResult) =>
  String(
    candidate?.result_object?.location_id ??
      candidate?.location_id ??
      candidate?.locationId ??
      candidate?.geoId ??
      ""
  ) || undefined;

const stripHtml = (value?: string | null) => {
  if (!value) return undefined;
  return value.replace(/<[^>]+>/g, "").trim() || undefined;
};

const extractLocationName = (candidate: RapidApiLocationResult) =>
  candidate?.result_object?.name ??
  candidate?.result_object?.long_name ??
  candidate?.name ??
  candidate?.title ??
  candidate?.label ??
  candidate?.trackingItems?.text ??
  stripHtml(candidate?.heading?.htmlString ?? null) ??
  candidate?.secondaryTextLineOne?.string ??
  undefined;

const fetchRapidApiGeoId = async (city: string) => {
  const override = HOTEL_GEOID_OVERRIDES[city];
  if (override) {
    return { geoId: override, locationName: city };
  }

  const cached = GEOID_CACHE.get(city);
  if (cached) {
    return { geoId: cached, locationName: city };
  }

  if (!env.HOTEL_API_KEY) {
    throw new Error("Missing HOTEL_API_KEY for RapidAPI");
  }

  const url = new URL(`${RAPIDAPI_BASE_URL}${LOCATION_SEARCH_PATH}`);
  url.search = new URLSearchParams({
    query: city,
  }).toString();

  const response = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": env.HOTEL_API_KEY,
    },
  });

  const payload = (await response.json()) as RapidApiLocationResponse;
  if (!response.ok) {
    throw new Error("RapidAPI location search failed");
  }

  const candidates = normalizeLocationCandidates(payload);
  const normalizedCity = city.toLowerCase();
  const cityCandidates = candidates.filter(
    (candidate) => candidate?.trackingItems?.placeType?.toUpperCase() === "CITY"
  );
  const match =
    cityCandidates.find((candidate) =>
      extractLocationName(candidate)?.toLowerCase().includes(normalizedCity)
    ) ??
    cityCandidates.find((candidate) => Boolean(extractGeoId(candidate))) ??
    candidates.find((candidate) =>
      extractLocationName(candidate)?.toLowerCase().includes(normalizedCity)
    ) ??
    candidates.find((candidate) => Boolean(extractGeoId(candidate)));

  if (!match) {
    throw new Error(`No geoId found for ${city}`);
  }

  const geoId = extractGeoId(match);
  if (!geoId) {
    throw new Error(`No geoId found for ${city}`);
  }

  GEOID_CACHE.set(city, geoId);
  return { geoId, locationName: extractLocationName(match) ?? city };
};

const fetchRapidApiHotelSearch = async (params: {
  geoId: string;
  checkIn: string;
  checkOut: string;
  currency: string;
  adults: number;
  rooms: number;
}) => {
  if (!env.HOTEL_API_KEY) {
    throw new Error("Missing HOTEL_API_KEY for RapidAPI");
  }

  const url = new URL(`${RAPIDAPI_BASE_URL}${HOTEL_SEARCH_PATH}`);
  url.search = new URLSearchParams({
    geoId: params.geoId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    rooms: String(params.rooms),
    currency: params.currency,
  }).toString();

  const response = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": env.HOTEL_API_KEY,
    },
  });

  const payload = (await response.json()) as RapidApiHotelsResponse;
  if (!response.ok) {
    throw new Error("RapidAPI hotel search failed");
  }

  return payload;
};

const extractCurrency = (payload: RapidApiHotelsResponse, fallback: string) => {
  const groups = payload?.data?.filters?.filters?.availableFilterGroups ?? [];
  const priceGroup = groups.find((group) => group?.id === "price" || group?.name === "Price");
  const trackingKey = priceGroup?.filter?.trackingKey ?? priceGroup?.trackingKey ?? null;
  return extractCurrencyFromTrackingKey(trackingKey) ?? fallback;
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
    metadata: { source: "mock", sampleSize },
  };
};

const buildHotelAverage = (
  city: string,
  payload: RapidApiHotelsResponse,
  params: { geoId: string; checkIn: string; checkOut: string; currency: string; locationName?: string }
): HotelAverageResponse => {
  const hotels = payload?.data?.hotels ?? [];
  const prices = hotels
    .map((hotel) => parsePrice(hotel?.commerceInfo?.priceForDisplay?.string ?? null))
    .filter((value): value is number => typeof value === "number");

  if (!prices.length) {
    throw new Error(`No hotel prices found for ${city}`);
  }

  const sortedAll = [...prices].sort((a, b) => a - b);
  const median = getMedian(sortedAll);
  const qualityFloor = deriveQualityFloor(sortedAll);
  const eligiblePrices = sortedAll.filter((price) => price >= qualityFloor);
  const qualityPool = eligiblePrices.length >= 5 ? eligiblePrices : sortedAll;
  const budgetSlice = selectBudgetSlice(qualityPool);
  const budgetTotal = budgetSlice.reduce((sum, value) => sum + value, 0);
  const avgPrice = Math.round((budgetTotal / budgetSlice.length) * 100) / 100;
  const currencyDetected = extractCurrency(payload, params.currency);

  const metadata: HotelMetadata = {
    source: "rapidapi",
    geoId: params.geoId,
    locationName: params.locationName,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    sampleSize: prices.length,
    totalHotels: hotels.length,
    currencyRequested: params.currency,
    currencyDetected,
    pricingModel: "budget_avg_bottom_35pct_with_quality_floor",
    priceMin: sortedAll[0],
    priceMedian: Math.round(median * 100) / 100,
    priceMax: sortedAll[sortedAll.length - 1],
    qualityFloor,
    filteredOutCount: sortedAll.length - eligiblePrices.length,
  };

  return {
    city,
    avgPrice,
    currency: currencyDetected,
    sampleSize: prices.length,
    metadata,
  };
};

export const fetchRapidApiHotelAverage = async (city: string): Promise<HotelAverageResponse> => {
  const { checkIn, checkOut } = getDefaultHotelWindow();
  const location = await fetchRapidApiGeoId(city);
  const payload = await fetchRapidApiHotelSearch({
    geoId: location.geoId,
    checkIn,
    checkOut,
    currency: HOTEL_SEARCH_CURRENCY,
    adults: HOTEL_SEARCH_ADULTS,
    rooms: HOTEL_SEARCH_ROOMS,
  });

  return buildHotelAverage(city, payload, {
    geoId: location.geoId,
    locationName: location.locationName,
    checkIn,
    checkOut,
    currency: HOTEL_SEARCH_CURRENCY,
  });
};

export const fetchHotelAverage = async (city: string): Promise<HotelAverageResponse> => {
  try {
    if (env.HOTEL_API_KEY) {
      return await fetchRapidApiHotelAverage(city);
    }
  } catch (error) {
    console.warn("[hotelApi] falling back to mock data", error);
  }

  return fetchMockHotelAverage(city);
};
