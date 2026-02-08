import { env } from "@/lib/env";

const DEFAULT_BASE = "https://api.viator.com/partner";
const DEFAULT_LANGUAGE = "en-CA";

const getBaseUrl = () => (env.VIATOR_API_BASE || DEFAULT_BASE).replace(/\/$/, "");

const viatorFetch = async <T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
  } = {}
): Promise<T> => {
  if (!env.VIATOR_API_KEY) {
    throw new Error("VIATOR_API_KEY is missing");
  }

  const query = options.query
    ? `?${new URLSearchParams(
        Object.entries(options.query)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString()}`
    : "";

  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}${query}`;
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      "exp-api-key": env.VIATOR_API_KEY,
      Accept: "application/json;version=2.0",
      "Accept-Language": DEFAULT_LANGUAGE,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Viator API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
};

export interface ViatorSearchResult {
  productCode?: string;
  productUrl?: string;
  title?: string;
  description?: string;
  images?: Array<{ url?: string; variants?: Array<{ url?: string }> }>;
  pricing?: { summary?: { fromPrice?: number; fromPriceBeforeDiscount?: number }; currency?: string };
  reviews?: {
    sources?: Array<{ provider?: string; totalCount?: number; averageRating?: number }>;
    totalReviews?: number;
    combinedAverageRating?: number;
  };
  [key: string]: unknown;
}

export interface ViatorProduct {
  productCode?: string;
  productUrl?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  images?: Array<{ url?: string; variants?: Array<{ url?: string }> }>;
  [key: string]: unknown;
}

export const viatorSearchFreetext = async (input: {
  searchTerm: string;
  currency?: string;
  topX?: number;
  sortOrder?: string;
}) =>
  viatorFetch<{ products?: { totalCount?: number; results?: ViatorSearchResult[] } }>(
    "/search/freetext",
    {
      body: {
        searchTerm: input.searchTerm,
        currency: input.currency ?? "CAD",
        searchTypes: [
          {
            searchType: "PRODUCTS",
            pagination: {
              start: 1,
              count: input.topX ?? 12,
            },
          },
        ],
        sortOrder: input.sortOrder ?? "RATING",
      },
    }
  );

export const viatorProductsBulk = async (productCodes: string[]) =>
  viatorFetch<{ products?: ViatorProduct[]; data?: ViatorProduct[] }>("/products/bulk", {
    body: { productCodes },
  });

export const viatorExchangeRates = async (currencyCode = "CAD") =>
  viatorFetch<{
    exchangeRates?: Record<string, number>;
    rates?: Record<string, number>;
    data?: { exchangeRates?: Record<string, number> };
  }>("/exchange-rates", {
    method: "GET",
    query: { currencyCode },
  });

export const pickFirstDefined = <T>(...values: Array<T | undefined | null>) =>
  values.find((value) => value !== undefined && value !== null) ?? null;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toString = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

const get = (value: unknown, path: string) => {
  return path.split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value as unknown);
};

export const normalizeViatorProduct = (product: ViatorProduct) => {
  const price = pickFirstDefined(
    toNumber(get(product, "pricing.fromPrice")),
    toNumber(get(product, "pricing.summary.fromPrice")),
    toNumber(get(product, "pricing.summary.price")),
    toNumber(get(product, "priceFrom")),
    toNumber(product.price)
  );

  const currency = pickFirstDefined(
    toString(get(product, "pricing.currencyCode")),
    toString(get(product, "pricing.currency")),
    toString(get(product, "currency")),
    toString(get(product, "price.currency"))
  );

  const rating = pickFirstDefined(
    toNumber(get(product, "reviews.combinedAverageRating")),
    toNumber(get(product, "reviews.averageRating")),
    toNumber(product.rating)
  );

  const reviewsCount = pickFirstDefined(
    toNumber(get(product, "reviews.totalReviews")),
    toNumber(get(product, "reviews.count")),
    toNumber(product.reviewCount)
  );

  const imageUrl =
    toString(get(product, "images.0.variants.0.url")) ||
    toString(get(product, "images.0.url")) ||
    toString(get(product, "primaryImageUrl"));

  return {
    productCode: toString(product.productCode),
    title: toString(product.title),
    summary: toString(product.shortDescription) || toString(product.description),
    price,
    currency,
    rating,
    reviewsCount,
    productUrl: toString(product.productUrl),
    imageUrl,
  };
};
