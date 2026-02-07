import { fetchFlightQuotes } from "@/agents/adapters/flightApi";
import { PRIMARY_TRIP } from "@/config/travel";
import { saveFlightSample } from "@/data/flightPrices";

export interface FlightAgentResult {
  inserted: boolean;
  price?: number;
  carrier?: string;
  fareClass?: string;
  source?: "mock" | "rapidapi";
}

export const runFlightAgent = async (): Promise<FlightAgentResult> => {
  const quotes = await fetchFlightQuotes({
    origin: PRIMARY_TRIP.origin,
    destination: PRIMARY_TRIP.destination,
    departDate: PRIMARY_TRIP.departDate,
    returnDate: PRIMARY_TRIP.returnDate,
    cabin: PRIMARY_TRIP.cabin,
  });

  if (!quotes.length) {
    return { inserted: false };
  }

  const cheapest = quotes[0];

  await saveFlightSample({
    origin: PRIMARY_TRIP.origin,
    destination: PRIMARY_TRIP.destination,
    departDate: PRIMARY_TRIP.departDate,
    returnDate: PRIMARY_TRIP.returnDate,
    price: cheapest.price,
    currency: cheapest.currency,
    metadata: cheapest.metadata,
  });

  return {
    inserted: true,
    price: cheapest.price,
    carrier: cheapest.carrier,
    fareClass: cheapest.fareClass,
    source: cheapest.metadata?.source,
  };
};
