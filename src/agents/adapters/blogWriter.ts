import { env } from "@/lib/env";
import type { BlogSection, BlogSource } from "@/types/blog";

export interface BlogWriterInput {
  publishDate: string;
  tripWindow: string;
  planningDays: number;
  leaveDate: string;
  likelyArrivalDate: string;
  returnFlightDate: string;
  backToWorkDate: string;
  itineraryOptions: string[];
  internalSignals: string[];
  externalSources: BlogSource[];
  recentTitles: string[];
}

export interface BlogDraft {
  title: string;
  summary: string;
  takeaway: string;
  sections: BlogSection[];
  confidence: number;
  aiProvider: "anthropic" | "openai" | "fallback";
}

interface BlogDraftPayload {
  title?: unknown;
  summary?: unknown;
  takeaway?: unknown;
  sections?: unknown;
  confidence?: unknown;
}

const fallbackDraft = (input: BlogWriterInput): BlogDraft => {
  const firstSignal = input.internalSignals[0] ?? "Latest pricing checks are in progress.";
  const secondSignal = input.internalSignals[1] ?? "Hotel and flight trends remain under daily monitoring.";
  const itineraryA =
    input.itineraryOptions[0] ??
    "Option A (balanced): travel days at both ends, then Bangkok + Chiang Mai + one beach block.";
  const itineraryB =
    input.itineraryOptions[1] ??
    "Option B (north + beach): short Bangkok start, longer Chiang Mai and Andaman coast split.";
  const itineraryC =
    input.itineraryOptions[2] ??
    "Option C (slow pace): two-city plan with fewer transfers and longer stays.";

  return {
    title: `Thailand trip pricing update for ${input.publishDate}`,
    summary:
      `Daily update for an ${input.planningDays}-day usable trip window, blending route-level pricing with itinerary tradeoffs.`,
    takeaway:
      `Plan around ${input.leaveDate} departure and ${input.returnFlightDate} return, then optimize in-country pacing rather than chasing the absolute cheapest single quote.`,
    sections: [
      {
        heading: "Market snapshot for this exact window",
        paragraphs: [firstSignal, secondSignal],
      },
      {
        heading: `${input.planningDays}-day itinerary options (travel days included)`,
        paragraphs: [itineraryA, `${itineraryB} ${itineraryC}`],
      },
      {
        heading: "Date-line and work-return constraints",
        paragraphs: [
          `Departure target is ${input.leaveDate} from Vancouver, with likely Bangkok arrival around ${input.likelyArrivalDate}.`,
          `Return flight target is ${input.returnFlightDate} to be ready for work on ${input.backToWorkDate}.`,
        ],
      },
      {
        heading: "Booking moves this week",
        paragraphs: [
          `This tracker focuses on ${input.tripWindow}. Compare like-for-like itinerary quality before switching providers.`,
          "Use refundable holds and only lock non-refundable rates once a city split and transfer cadence are finalized.",
        ],
      },
    ],
    confidence: 0.45,
    aiProvider: "fallback",
  };
};

const parseNumber = (value: unknown, fallback = 0.5) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeSections = (value: unknown): BlogSection[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const entry = section as Record<string, unknown>;
      const heading = typeof entry.heading === "string" ? entry.heading.trim() : "";
      const rawParagraphs = Array.isArray(entry.paragraphs) ? entry.paragraphs : [];
      const paragraphs = rawParagraphs
        .filter((paragraph): paragraph is string => typeof paragraph === "string")
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      if (!heading || paragraphs.length === 0) {
        return null;
      }

      return { heading, paragraphs };
    })
    .filter((section): section is BlogSection => Boolean(section));
};

const parseDraftPayload = (payload: BlogDraftPayload, fallback: BlogDraft): BlogDraft => {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  const takeaway = typeof payload.takeaway === "string" ? payload.takeaway.trim() : "";
  const sections = normalizeSections(payload.sections);

  if (!title || !summary || !takeaway || sections.length < 4) {
    return fallback;
  }

  return {
    ...fallback,
    title,
    summary,
    takeaway,
    sections,
    confidence: Math.min(1, Math.max(0, parseNumber(payload.confidence, 0.6))),
  };
};

const buildPrompt = (input: BlogWriterInput) =>
  [
    "Write a source-backed travel pricing post in strict JSON.",
    "Use concrete numbers, dates, and route/city context from the input.",
    "Do not invent facts or URLs.",
    "Return fields: title, summary, takeaway, confidence, sections.",
    "sections must be an array of exactly 4 objects with keys: heading, paragraphs.",
    "Each paragraphs array should contain exactly 2 short paragraphs.",
    "Section 2 must present at least 3 itinerary options for an 18-day usable trip and include day-allocation tradeoffs.",
    "One section must explicitly mention the work-return timing and date-line reality.",
    "Avoid generic SEO filler and keep tone practical, specific, and decision-focused.",
    "Input:",
    JSON.stringify(input, null, 2),
  ].join("\n");

const extractJsonBlock = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "{}";
};

const writeWithAnthropic = async (prompt: string): Promise<BlogDraftPayload> => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
      temperature: 0.3,
      max_tokens: 1400,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`[blogWriter] anthropic failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const raw = payload.content?.find((item) => item.type === "text")?.text ?? "{}";
  return JSON.parse(extractJsonBlock(raw)) as BlogDraftPayload;
};

const writeWithOpenAI = async (prompt: string): Promise<BlogDraftPayload> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write travel pricing briefings in valid JSON only. Keep content factual, concrete, and source-grounded.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`[blogWriter] openai failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as BlogDraftPayload;
};

export const generateBlogDraft = async (input: BlogWriterInput): Promise<BlogDraft> => {
  const fallback = fallbackDraft(input);
  const prompt = buildPrompt(input);

  if (env.ANTHROPIC_API_KEY) {
    try {
      const payload = await writeWithAnthropic(prompt);
      return { ...parseDraftPayload(payload, fallback), aiProvider: "anthropic" };
    } catch (error) {
      console.warn("[blogWriter] anthropic failed, falling back", error);
    }
  }

  if (env.OPENAI_API_KEY) {
    try {
      const payload = await writeWithOpenAI(prompt);
      return { ...parseDraftPayload(payload, fallback), aiProvider: "openai" };
    } catch (error) {
      console.warn("[blogWriter] openai failed, using fallback", error);
    }
  }

  return fallback;
};
