import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getLatestFlightSample } from "@/data/flightPrices";
import type { FlightOffer } from "@/types/pricing";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);

const formatDuration = (minutes?: number, hours?: number) => {
  if (typeof minutes === "number") {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  }
  if (typeof hours === "number") {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  }
  return "Duration n/a";
};

const renderLeg = (label: string, leg?: FlightOffer["outbound"]) => {
  if (!leg) return `${label}: details pending`;
  const carrier = leg.carrierName ?? leg.carrierCode ?? "Carrier TBD";
  const flight = leg.flightCode ? ` (${leg.flightCode})` : "";
  const stops = leg.stopsText ?? (typeof leg.stops === "number" ? `${leg.stops} stops` : "Stops n/a");
  const duration = formatDuration(leg.durationMinutes, undefined);
  return `${label}: ${carrier}${flight} • ${stops} • ${duration}`;
};

const OfferCard = ({ offer, highlight }: { offer: FlightOffer; highlight?: string }) => {
  return (
    <article className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{highlight ?? "Offer"}</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{offer.carrier}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{offer.fareClass}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)]">Total</p>
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(offer.price, offer.currency)}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {offer.stops === 0 ? "Direct" : `${offer.stops} stops`} • {formatDuration(offer.combinedDurationMinutes, offer.durationHours)}
          </p>
        </div>
      </div>
      <div className="mt-4 text-sm text-[var(--muted)]">
        <p>{renderLeg("Outbound", offer.outbound)}</p>
        <p className="mt-1">{renderLeg("Return", offer.returnLeg)}</p>
      </div>
    </article>
  );
};

export default async function FlightOffersPage() {
  const latest = await getLatestFlightSample();
  const offers = latest?.metadata?.offers;
  const topOverall = offers?.topOverall ?? [];
  const topDirect = offers?.topDirect ?? [];

  const range = topOverall.length
    ? `${formatCurrency(Math.min(...topOverall.map((o) => o.price)), topOverall[0].currency)} – ${formatCurrency(
        Math.max(...topOverall.map((o) => o.price)),
        topOverall[0].currency
      )}`
    : "--";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Flights</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Top fare detail
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)]">
              Six latest offers (3 overall + 3 direct) captured from the same API response.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Range</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{range}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Latest snapshot</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="flex items-center justify-between">
        <Link
          href="/flights"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Back to flights
        </Link>
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Top 3 overall</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lowest total fares</h2>
          </div>
        </div>
        {topOverall.length ? (
          <div className="grid gap-4">
            {topOverall.map((offer, index) => (
              <OfferCard key={`overall-${index}`} offer={offer} highlight={`#${index + 1}`} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No offer detail yet. This section populates after the next flight API run.
          </p>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Top 3 direct</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nonstop options</h2>
        </div>
        {topDirect.length ? (
          <div className="grid gap-4">
            {topDirect.map((offer, index) => (
              <OfferCard key={`direct-${index}`} offer={offer} highlight={`Direct #${index + 1}`} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No direct fares found in the latest snapshot.
          </p>
        )}
      </section>
    </div>
  );
}
