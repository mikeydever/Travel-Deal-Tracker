export interface DailyPhotoRow {
  id: string;
  date: string;
  source: string;
  query: string;
  alt?: string | null;
  image_url: string;
  image_url_large?: string | null;
  image_url_thumb?: string | null;
  photographer?: string | null;
  photographer_url?: string | null;
  avg_color?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface DailyPhotoInput {
  date: string;
  source: string;
  query: string;
  alt?: string | null;
  imageUrl: string;
  imageUrlLarge?: string | null;
  imageUrlThumb?: string | null;
  photographer?: string | null;
  photographerUrl?: string | null;
  avgColor?: string | null;
  metadata?: Record<string, unknown>;
}
