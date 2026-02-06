export interface FlightQuote {
  carrier: string;
  fareClass: string;
  price: number;
  currency: string;
  durationHours: number;
  stops: number;
}

export interface FlightSampleInput {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  price: number;
  currency: string;
  checkedAt?: string;
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
