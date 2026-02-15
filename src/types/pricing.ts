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
  source?: "mock" | "rapidapi" | "travelpayouts";
  outbound?: FlightLegMeta;
  returnLeg?: FlightLegMeta;
  combinedStops?: number;
  combinedDurationMinutes?: number;
  offers?: {
    topOverall?: FlightOffer[];
    topDirect?: FlightOffer[];
  };
}

export interface FlightOffer {
  carrier: string;
  fareClass: string;
  price: number;
  currency: string;
  durationHours?: number;
  stops: number;
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

export interface HotelMetadata {
  source?: "mock" | "rapidapi";
  geoId?: string;
  locationName?: string;
  checkIn?: string;
  checkOut?: string;
  sampleSize?: number;
  totalHotels?: number;
  currencyRequested?: string;
  currencyDetected?: string;
  pricingModel?: string;
  priceMin?: number;
  priceMedian?: number;
  priceMax?: number;
}

export interface HotelAverageResponse {
  city: string;
  avgPrice: number;
  currency: string;
  sampleSize: number;
  metadata?: HotelMetadata;
}

export interface HotelSampleInput {
  city: string;
  avgPrice: number;
  currency: string;
  checkedAt?: string;
  metadata?: HotelMetadata;
}
