import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { DailyPhotoRow, DailyPhotoInput } from "@/types/media";

const SELECT_FIELDS =
  "id, date, source, query, alt, image_url, image_url_large, image_url_thumb, photographer, photographer_url, avg_color, metadata, created_at";

const todayString = () => new Date().toISOString().slice(0, 10);

export const getDailyPhoto = async (date = todayString()): Promise<DailyPhotoRow | null> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("daily_photos")
      .select(SELECT_FIELDS)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as DailyPhotoRow;
    }

    const { data: fallback, error: fallbackError } = await client
      .from("daily_photos")
      .select(SELECT_FIELDS)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      throw fallbackError;
    }

    return (fallback as DailyPhotoRow | null) ?? null;
  } catch (error) {
    console.warn("[daily_photos] falling back to no photo", error);
    return null;
  }
};

export const saveDailyPhoto = async (input: DailyPhotoInput) => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    date: input.date,
    source: input.source,
    query: input.query,
    alt: input.alt ?? null,
    image_url: input.imageUrl,
    image_url_large: input.imageUrlLarge ?? null,
    image_url_thumb: input.imageUrlThumb ?? null,
    photographer: input.photographer ?? null,
    photographer_url: input.photographerUrl ?? null,
    avg_color: input.avgColor ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await client
    .from("daily_photos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert daily photo: ${error.message}`);
  }

  return data;
};
