import { NextResponse } from "next/server";

import { runFlightAgent } from "@/agents/flightAgent";
import { runHotelAgent } from "@/agents/hotelAgent";
import { env } from "@/lib/env";
import { evaluateDealTriggers } from "@/services/dealDetection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CronScope = "all" | "hotels" | "flights";

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
  return "all";
};

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = resolveScope(request);
    const runFlights = scope === "all" || scope === "flights";
    const runHotels = scope === "all" || scope === "hotels";

    const [flightResult, hotelResult] = await Promise.all([
      runFlights ? runFlightAgent() : null,
      runHotels ? runHotelAgent() : null,
    ]);

    const alerts = scope === "all" ? await evaluateDealTriggers() : [];

    return NextResponse.json({
      ok: true,
      scope,
      flightResult,
      hotelResult,
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
