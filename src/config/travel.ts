export const PRIMARY_TRIP = {
  origin: "YVR",
  destination: "BKK",
  departDate: "2025-10-28",
  returnDate: "2025-11-18",
  tripLengthDays: 22,
  cabin: "Economy",
};

export const THAI_HUB_CITIES = [
  "Bangkok",
  "Chiang Mai",
  "Phuket",
  "Krabi",
  "Koh Samui",
];

export const DAILY_CRON_WINDOW = {
  hourPT: 7,
  minutePT: 0,
};

export const AGENT_PIPELINES = [
  {
    title: "Flight Agent",
    cadence: "Daily • 07:00 PT",
    summary: "Pulls the cheapest YVR ↔ Thailand economy fares and stores them in Supabase.",
  },
  {
    title: "Hotel Agent",
    cadence: "Daily • 07:05 PT",
    summary: "Captures the rolling average nightly rates for each Thai hub city.",
  },
  {
    title: "Events Agent",
    cadence: "Bi-weekly",
    summary: "Keeps the Thai festival calendar fresh so we can flag demand spikes early.",
  },
];
