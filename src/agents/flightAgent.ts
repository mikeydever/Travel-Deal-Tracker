import { fetchMockFlightQuotes } from "@/agents/adapters/flightApi";
import { PRIMARY_TRIP } from "@/config/travel";
import { saveFlightSample } from "@/data/flightPrices";

export interface FlightAgentResult {
  inserted: boolean;
  price?: number;
  carrier?: string;
  fareClass?: string;
}

export const runFlightAgent = async (): Promise<FlightAgentResult> => {
  const quotes = await fetchMockFlightQuotes({
    origin: PRIMARY_TRIP.origin,
    destination: PRIMARY_TRIP.destination,
    departDate: PRIMARY_TRIP.departDate,
    returnDate: PRIMARY_TRIP.returnDate,
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
  });

  return {
    inserted: true,
    price: cheapest.price,
    carrier: cheapest.carrier,
    fareClass: cheapest.fareClass,
  };
};
