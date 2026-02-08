export interface ItineraryDay {
  day: number;
  date?: string;
  city?: string;
  travelFrom?: string;
  title?: string;
  morning: string;
  afternoon: string;
  evening: string;
  deal_ids?: string[];
}

export interface ItinerarySuggestionRow {
  id: string;
  window_start: string;
  window_end: string;
  duration_days: number;
  title?: string | null;
  summary?: string | null;
  days: ItineraryDay[];
  score?: number | null;
  created_at?: string;
}

export interface ItinerarySuggestionInput {
  windowStart: string;
  windowEnd: string;
  durationDays: number;
  title?: string | null;
  summary?: string | null;
  days: ItineraryDay[];
  score?: number | null;
}
