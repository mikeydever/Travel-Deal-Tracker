import { env } from "@/lib/env";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import { saveDailyPhoto } from "@/data/dailyPhotos";

export interface PhotoAgentResult {
  inserted: boolean;
  date: string;
  query?: string;
  source?: string;
  photoId?: number | string;
}

const PHOTO_QUERIES = [
  "Thailand",
  "Bangkok",
  "Chiang Mai",
  "Phuket",
  "Krabi",
  "Koh Samui",
];

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickFrom = <T>(items: T[], seed: string) => {
  if (!items.length) return null;
  const index = hashSeed(seed) % items.length;
  return items[index];
};

interface PexelsPhoto {
  id: number;
  alt?: string | null;
  avg_color?: string | null;
  photographer?: string | null;
  photographer_url?: string | null;
  url?: string | null;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    tiny?: string;
  };
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

const fetchPexelsPhoto = async (query: string, dateSeed: string) => {
  if (!env.PEXELS_API_KEY) {
    throw new Error("Missing PEXELS_API_KEY");
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.search = new URLSearchParams({
    query,
    orientation: "landscape",
    per_page: "18",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Authorization: env.PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels request failed (${response.status})`);
  }

  const payload = (await response.json()) as PexelsResponse;
  const photo = pickFrom(payload.photos ?? [], dateSeed);
  if (!photo) {
    throw new Error("No Pexels photos returned");
  }

  return photo;
};

const hasPhotoForDate = async (date: string) => {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("daily_photos")
    .select("id")
    .eq("date", date)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data && data.length);
};

export const runPhotoAgent = async (): Promise<PhotoAgentResult> => {
  const date = new Date().toISOString().slice(0, 10);

  if (!env.PEXELS_API_KEY) {
    console.warn("[photoAgent] missing PEXELS_API_KEY; skipping");
    return { inserted: false, date };
  }

  try {
    const already = await hasPhotoForDate(date);
    if (already) {
      return { inserted: false, date };
    }

    const query = pickFrom(PHOTO_QUERIES, date) ?? PHOTO_QUERIES[0];
    const photo = await fetchPexelsPhoto(query, date);

    const imageUrl = photo.src?.large2x ?? photo.src?.large ?? photo.src?.original ?? null;
    if (!imageUrl) {
      throw new Error("Pexels response missing image url");
    }

    await saveDailyPhoto({
      date,
      source: "pexels",
      query,
      alt: photo.alt ?? null,
      imageUrl,
      imageUrlLarge: photo.src?.large ?? photo.src?.original ?? null,
      imageUrlThumb: photo.src?.small ?? photo.src?.tiny ?? null,
      photographer: photo.photographer ?? null,
      photographerUrl: photo.photographer_url ?? null,
      avgColor: photo.avg_color ?? null,
      metadata: {
        pexelsId: photo.id,
        pexelsUrl: photo.url,
      },
    });

    return {
      inserted: true,
      date,
      query,
      source: "pexels",
      photoId: photo.id,
    };
  } catch (error) {
    console.warn("[photoAgent] failed", error);
    return { inserted: false, date };
  }
};
