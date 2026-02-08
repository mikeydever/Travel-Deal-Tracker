import { env } from "@/lib/env";

export interface BraveSearchResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export const searchBrave = async (query: string, count = 6): Promise<BraveSearchResult[]> => {
  if (!env.BRAVE_SEARCH_API_KEY) {
    throw new Error("Missing BRAVE_SEARCH_API_KEY");
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.search = new URLSearchParams({
    q: query,
    count: String(count),
    safesearch: "strict",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const payload = (await response.json()) as BraveResponse;
  const results = payload.web?.results ?? [];

  return results
    .map((result) => ({
      title: result.title ?? "",
      url: result.url ?? "",
      description: result.description ?? undefined,
    }))
    .filter((result) => Boolean(result.title && result.url));
};
