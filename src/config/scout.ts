import { THAI_HUB_CITIES } from "@/config/travel";

export const SCOUT_ALLOWLIST_DOMAINS = [
  "getyourguide.com",
  "viator.com",
  "klook.com",
  "tripadvisor.com",
  "tourismthailand.org",
  "timeout.com",
  "bangkok.com",
  "cntraveler.com",
  "theculturetrip.com",
  "lonelyplanet.com",
];

export const SCOUT_CATEGORIES = ["tours", "attractions"] as const;

export const SCOUT_QUERY_TEMPLATES = [
  "{city} {category}",
  "best {category} in {city}",
  "{city} {category} tickets",
];

export const SCOUT_CITIES = THAI_HUB_CITIES;

export const SCOUT_RESULTS_PER_DOMAIN = 2;
export const SCOUT_MAX_RESULTS_PER_QUERY = 4;
export const SCOUT_DOMAINS_PER_RUN = 3;
export const SCOUT_MAX_QUERIES = 6;
export const SCOUT_DEFAULT_LIMIT = 12;

export const SCOUT_CONFIDENCE_THRESHOLD = 0.55;

export type ScoutCategory = (typeof SCOUT_CATEGORIES)[number];
