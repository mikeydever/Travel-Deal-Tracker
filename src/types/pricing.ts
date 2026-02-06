export interface FlightLegMeta {
  carrierName?: string;
  carrierCode?: string;
  flightCode?: string;
  stops?: number;
  stopsText?: string;
  durationMinutes?: number;
  fareClass?: string;
  price?: number;
  currency?: string;
}

export interface FlightMetadata {
  source?: "mock" | "rapidapi";
  outbound?: FlightLegMeta;
  returnLeg?: FlightLegMeta;
  combinedStops?: number;
  combinedDurationMinutes?: number;
}

export interface FlightQuote {
  carrier: string;
  fareClass: string;
  price: number;
  currency: string;
  durationHours: number;
  stops: number;
  metadata?: FlightMetadata;
}

export interface FlightSampleInput {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  price: number;
  currency: string;
  checkedAt?: string;
  metadata?: FlightMetadata;
}

export interface HotelAverageResponse {
  city: string;
  avgPrice: number;
  currency: string;
  sampleSize: number;
}

export interface HotelSampleInput {
  city: string;
  avgPrice: number;
  currency: string;
  checkedAt?: string;
}
