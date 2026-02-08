import { env } from "@/lib/env";
import { SCOUT_CONFIDENCE_THRESHOLD } from "@/config/scout";

export interface ExtractedDeal {
  title: string;
  city?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  url: string;
  imageUrl?: string | null;
  summary?: string | null;
  confidence: number;
  needsReview: boolean;
}

interface DealExtractorInput {
  title: string;
  url: string;
  description?: string;
  pageTitle?: string;
  pageDescription?: string;
  ogImage?: string;
  cityHint?: string;
  categoryHint?: string;
}

const fallbackExtract = (input: DealExtractorInput): ExtractedDeal => {
  const title = input.title || input.pageTitle || "Experience";
  const summary = input.description || input.pageDescription || "";
  return {
    title,
    city: input.cityHint ?? null,
    category: input.categoryHint ?? null,
    price: null,
    currency: null,
    rating: null,
    reviewsCount: null,
    url: input.url,
    imageUrl: input.ogImage ?? null,
    summary,
    confidence: 0.35,
    needsReview: true,
  };
};

const normalizeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const extractDeal = async (input: DealExtractorInput): Promise<ExtractedDeal> => {
  if (!env.OPENAI_API_KEY) {
    return fallbackExtract(input);
  }

  const system =
    "You extract travel experience deals into strict JSON. Use only the provided context. " +
    "If a value is unknown, set it to null. Keep summaries under 24 words.";

  const user = {
    title: input.title,
    url: input.url,
    description: input.description,
    pageTitle: input.pageTitle,
    pageDescription: input.pageDescription,
    ogImage: input.ogImage,
    cityHint: input.cityHint,
    categoryHint: input.categoryHint,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            "Extract fields: title, city, category, price, currency, rating, reviewsCount, url, imageUrl, summary, confidence. " +
            "Return JSON only.\nContext:\n" +
            JSON.stringify(user, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn("[dealExtractor] OpenAI request failed", await response.text());
    return fallbackExtract(input);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.warn("[dealExtractor] Failed to parse JSON", error);
  }

  const confidence = normalizeNumber(parsed.confidence) ?? 0.4;
  const deal: ExtractedDeal = {
    title: normalizeString(parsed.title) ?? input.title,
    city: normalizeString(parsed.city),
    category: normalizeString(parsed.category),
    price: normalizeNumber(parsed.price),
    currency: normalizeString(parsed.currency),
    rating: normalizeNumber(parsed.rating),
    reviewsCount: normalizeNumber(parsed.reviewsCount),
    url: input.url,
    imageUrl: normalizeString(parsed.imageUrl) ?? input.ogImage ?? null,
    summary: normalizeString(parsed.summary) ?? input.description ?? input.pageDescription ?? null,
    confidence,
    needsReview: confidence < SCOUT_CONFIDENCE_THRESHOLD,
  };

  return deal;
};
