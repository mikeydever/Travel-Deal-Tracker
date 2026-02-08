export interface ExperienceDealRow {
  id: string;
  title: string;
  city?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  url: string;
  image_url?: string | null;
  summary?: string | null;
  source_domain?: string | null;
  scouted_date: string;
  confidence?: number | null;
  needs_review?: boolean | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface ExperienceDealInput {
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
  sourceDomain?: string | null;
  scoutedDate: string;
  confidence?: number | null;
  needsReview?: boolean | null;
  metadata?: Record<string, unknown>;
}
