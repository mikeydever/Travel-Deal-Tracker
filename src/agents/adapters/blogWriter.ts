import { env } from "@/lib/env";
import type { BlogSection, BlogSource } from "@/types/blog";

export interface BlogWriterInput {
  publishDate: string;
  tripWindow: string;
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

  return {
    title: `Thailand trip pricing update for ${input.publishDate}`,
    summary:
      "Daily update blending our route-level price tracker with current travel market signals from approved sources.",
    takeaway:
      "Keep booking options refundable until a sustained fare or nightly-rate drop confirms the new lower range.",
    sections: [
      {
        heading: "What changed today",
        paragraphs: [firstSignal, secondSignal],
      },
      {
        heading: "Why this matters for this trip",
        paragraphs: [
          `This tracker focuses on ${input.tripWindow}. We prioritize stable downward movement over one-off outliers.`,
          "Once affiliate approvals complete, we will compare the same itinerary quality across more booking brands to isolate true savings.",
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

  if (!title || !summary || !takeaway || sections.length < 2) {
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
    "Write a concise, source-backed travel pricing post in strict JSON.",
    "Use concrete numbers, dates, and route/city context from the input.",
    "Do not invent facts or URLs.",
    "Return fields: title, summary, takeaway, confidence, sections.",
    "sections must be an array of exactly 3 objects with keys: heading, paragraphs.",
    "Each paragraphs array should contain 2 short paragraphs.",
    "Avoid generic SEO filler and keep tone practical.",
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
