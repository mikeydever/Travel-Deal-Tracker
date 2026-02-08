import { NextResponse } from "next/server";

import { runFlightAgent } from "@/agents/flightAgent";
import { runHotelAgent } from "@/agents/hotelAgent";
import { runPhotoAgent } from "@/agents/photoAgent";
import { runExperienceScoutAgent } from "@/agents/experienceScoutAgent";
import { runItineraryAgent } from "@/agents/itineraryAgent";
import { env } from "@/lib/env";
import { evaluateDealTriggers } from "@/services/dealDetection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CronScope =
  | "all"
  | "hotels"
  | "flights"
  | "photo"
  | "experiences"
  | "itinerary";

const authorize = (request: Request) => {
  if (!env.CRON_SECRET) {
    console.warn("[cron] CRON_SECRET not set – allowing request in dev mode");
    return true;
  }

  const header = request.headers.get("authorization");
  if (!header) return false;
  const token = header.replace("Bearer ", "");
  return token === env.CRON_SECRET;
};

const resolveScope = (request: Request): CronScope => {
  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? url.searchParams.get("mode") ?? "all").toLowerCase();
  if (scope === "hotels" || scope === "hotel") return "hotels";
  if (scope === "flights" || scope === "flight") return "flights";
  if (scope === "photo" || scope === "photos") return "photo";
  if (scope === "experience" || scope === "experiences") return "experiences";
  if (scope === "itinerary" || scope === "itineraries") return "itinerary";
  return "all";
};

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = resolveScope(request);
    const url = new URL(request.url);
    const runFlights = scope === "all" || scope === "flights";
    const runHotels = scope === "all" || scope === "hotels";
    const runPhoto = scope === "all" || scope === "photo";
    const runExperiences = scope === "all" || scope === "experiences";
    const runItinerary = scope === "all" || scope === "itinerary";
    const parseLimit = (value: string | null) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return undefined;
      if (parsed <= 0) return undefined;
      return Math.floor(parsed);
    };
    const experienceLimit = parseLimit(url.searchParams.get("limit"));
    const experienceQueries = parseLimit(url.searchParams.get("queries"));

    const [flightResult, hotelResult, photoResult, experienceResult, itineraryResult] =
      await Promise.all([
        runFlights ? runFlightAgent() : null,
        runHotels ? runHotelAgent() : null,
        runPhoto ? runPhotoAgent() : null,
        runExperiences
          ? runExperienceScoutAgent({
              maxDeals: experienceLimit,
              maxQueries: experienceQueries,
            })
          : null,
        runItinerary ? runItineraryAgent() : null,
      ]);

    const alerts = scope === "all" ? await evaluateDealTriggers() : [];

    return NextResponse.json({
      ok: true,
      scope,
      flightResult,
      hotelResult,
      photoResult,
      experienceResult,
      itineraryResult,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] job failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
