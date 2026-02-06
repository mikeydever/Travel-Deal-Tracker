import { PRIMARY_TRIP, THAI_HUB_CITIES } from "@/config/travel";
import { recordAlertLog, hasRecentAlert } from "@/data/alerts";
import { getRecentFlightPrices } from "@/data/flightPrices";
import { getHotelHistoryByCity } from "@/data/hotelPrices";
import { sendAlertEmail } from "@/services/email";

interface DealTrigger {
  type: string;
  message: string;
}

const ALERT_TYPES = {
  FLIGHT_DROP: "flight_drop",
  FLIGHT_LOW: "flight_low",
  HOTEL_DROP: (city: string) => `hotel_drop_${city.toLowerCase().replace(/\s+/g, "_")}`,
  HOTEL_LOW: (city: string) => `hotel_low_${city.toLowerCase().replace(/\s+/g, "_")}`,
};

export const evaluateDealTriggers = async () => {
  const triggers: DealTrigger[] = [];

  const flightHistory = await getRecentFlightPrices(30);
  if (flightHistory.length >= 2) {
    const latest = flightHistory[flightHistory.length - 1];
    const avg30 =
      flightHistory.reduce((sum, row) => sum + row.price, 0) / flightHistory.length;
    const minPrice = Math.min(...flightHistory.map((row) => row.price));

    if (latest.price <= avg30 * 0.85) {
      triggers.push({
        type: ALERT_TYPES.FLIGHT_DROP,
        message: `Flight fare ${PRIMARY_TRIP.origin}→${PRIMARY_TRIP.destination} is ${Math.round(
          ((avg30 - latest.price) / avg30) * 100
        )}% below 30-day avg (${avg30.toFixed(0)} CAD).`,
      });
    }

    if (latest.price <= minPrice) {
      triggers.push({
        type: ALERT_TYPES.FLIGHT_LOW,
        message: `Flight fare ${PRIMARY_TRIP.origin}→${PRIMARY_TRIP.destination} hit a new low at ${latest.price} CAD.`,
      });
    }
  }

  const hotelHistories = await getHotelHistoryByCity(THAI_HUB_CITIES, 30);
  for (const city of THAI_HUB_CITIES) {
    const rows = hotelHistories[city] ?? [];
    if (rows.length < 2) continue;
    const latest = rows[rows.length - 1];
    const avg30 = rows.reduce((sum, row) => sum + row.avg_price, 0) / rows.length;
    const minPrice = Math.min(...rows.map((row) => row.avg_price));
    const dropType = ALERT_TYPES.HOTEL_DROP(city);
    const lowType = ALERT_TYPES.HOTEL_LOW(city);

    if (latest.avg_price <= avg30 * 0.85) {
      triggers.push({
        type: dropType,
        message: `${city} hotels dropped ${Math.round(
          ((avg30 - latest.avg_price) / avg30) * 100
        )}% vs 30-day avg (${avg30.toFixed(0)} CAD).`,
      });
    }

    if (latest.avg_price <= minPrice) {
      triggers.push({
        type: lowType,
        message: `${city} hotels reached a new low at ${latest.avg_price} CAD.`,
      });
    }
  }

  const emitted: DealTrigger[] = [];
  for (const trigger of triggers) {
    const alreadySent = await hasRecentAlert(trigger.type, 24);
    if (alreadySent) {
      continue;
    }

    await recordAlertLog({ type: trigger.type, message: trigger.message });
    await sendAlertEmail({ subject: `Travel Deal Alert (${trigger.type})`, body: trigger.message });
    emitted.push(trigger);

    if (emitted.length >= 2) {
      break;
    }
  }

  return emitted;
};
