import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlightTrendChart } from "@/components/charts/FlightTrendChart";
import { PRIMARY_TRIP } from "@/config/travel";
import { getLatestFlightSample, getRecentFlightPrices } from "@/data/flightPrices";
import type { FlightOffer } from "@/types/pricing";

export const dynamic = "force-dynamic";

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function FlightsPage() {
  const [history, latest] = await Promise.all([
    getRecentFlightPrices(30),
    getLatestFlightSample(),
  ]);

  const currencyCode = latest?.currency ?? history[0]?.currency ?? "CAD";
  const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: currencyCode });

  const chartData = history.map((row) => ({
    checkedAt: row.checked_at,
    price: row.price,
  }));

  const previousSample = history.length > 1 ? history[history.length - 2] : history[history.length - 1];
  const priceDelta = latest && previousSample ? latest.price - previousSample.price : 0;
  const deltaPercentage = previousSample ? (priceDelta / previousSample.price) * 100 : 0;
  const carrierSnapshotSample = [latest, ...[...history].reverse()].find((row) => {
    const metadata = row?.metadata;
    if (!metadata) return false;
    const hasLegs = Boolean(metadata.outbound || metadata.returnLeg);
    const hasOffers = Boolean(
      metadata.offers?.topOverall?.length || metadata.offers?.topDirect?.length
    );
    const hasLegacy = Boolean(getLegacyCarrierMetadata(metadata));
    return hasLegs || hasOffers || hasLegacy;
  });
  const carrierSnapshot = carrierSnapshotSample?.metadata;
  const outboundLeg = carrierSnapshot?.outbound;
  const returnLeg = carrierSnapshot?.returnLeg;
  const offers = carrierSnapshot?.offers;
  const topOverall = offers?.topOverall ?? [];
  const topDirect = offers?.topDirect ?? [];
  const primaryOffer = topOverall[0] ?? topDirect[0];
  const minOffer = topOverall.length ? Math.min(...topOverall.map((offer) => offer.price)) : null;
  const maxOffer = topOverall.length ? Math.max(...topOverall.map((offer) => offer.price)) : null;
  const rangeLabel =
    minOffer !== null && maxOffer !== null ? `${currency.format(minOffer)} – ${currency.format(maxOffer)}` : "--";
  const bestDirectOffer = topDirect[0];
  const showBestDirect =
    Boolean(bestDirectOffer) &&
    (!primaryOffer ||
      bestDirectOffer?.carrier !== primaryOffer.carrier ||
      bestDirectOffer?.fareClass !== primaryOffer.fareClass ||
      bestDirectOffer?.price !== primaryOffer.price ||
      bestDirectOffer?.stops !== primaryOffer.stops);
  const legacyCarrier = getLegacyCarrierMetadata(carrierSnapshot);
  const hasCarrierLegData = Boolean(
    outboundLeg?.carrierName || outboundLeg?.carrierCode || returnLeg?.carrierName || returnLeg?.carrierCode
  );
  const hasCarrierData = hasCarrierLegData || Boolean(primaryOffer) || Boolean(legacyCarrier);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Flights</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              YVR → BKK fare history
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)]">
              Daily snapshot of the cheapest round-trip economy fare for the Thailand window ({" "}
              {PRIMARY_TRIP.departDate} – {PRIMARY_TRIP.returnDate}).
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Latest fare</p>
              <p className="text-3xl font-semibold text-[var(--foreground)]">
                {latest ? currency.format(latest.price) : "--"}
              </p>
              {latest && (
                <p className="mt-2 text-xs text-[var(--muted)]">Checked {formatDateTime(latest.checked_at)}</p>
              )}
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Trend</p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              30-day flight price curve
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Comparison vs. previous run shows {priceDelta >= 0 ? "a bump of" : "a drop of"}{" "}
              {currency.format(Math.abs(priceDelta))} ({deltaPercentage.toFixed(1)}%).
            </p>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              priceDelta >= 0
                ? "bg-rose-500/15 text-rose-300"
                : "bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {priceDelta >= 0 ? "Slightly higher today" : "Cheaper than yesterday"}
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-[var(--sand)]/50 p-4">
          <FlightTrendChart data={chartData} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Link
          href="/flights/offers"
          className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--glow)]"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Fare range</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            Top 3 overall
          </h3>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{rangeLabel}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click to view the top 3 overall + top 3 direct fares.
          </p>
        </Link>
        <article className="rounded-3xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Benchmark</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Median (last 7 days)</h3>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
            {history.length ? currency.format(getMedianPrice(history.slice(-7))) : "--"}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            We use the 7-day median as our quick sanity check for alert thresholds.
          </p>
        </article>
        <article className="rounded-3xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Carrier note</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {hasCarrierData ? "Fare composition snapshot" : "Awaiting carrier breakdown"}
          </h3>
          {hasCarrierData ? (
            <div className="mt-2 text-sm text-[var(--muted)]">
              {hasCarrierLegData && outboundLeg && <p>{formatLeg("Outbound", outboundLeg)}</p>}
              {hasCarrierLegData && returnLeg && <p className="mt-1">{formatLeg("Return", returnLeg)}</p>}
              {primaryOffer && (
                <p className={hasCarrierLegData ? "mt-2" : ""}>
                  Cheapest sampled fare: {formatOfferSummary(primaryOffer)}
                </p>
              )}
              {!hasCarrierLegData && !primaryOffer && legacyCarrier && (
                <p>{formatLegacyCarrierSummary(legacyCarrier)}</p>
              )}
              {showBestDirect && bestDirectOffer && (
                <p className="mt-1">Best nonstop: {formatOfferSummary(bestDirectOffer)}</p>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">
                Source: {carrierSnapshot?.source === "rapidapi" ? "RapidAPI flight fare search" : "Live feed"}
              </p>
              {carrierSnapshotSample && latest && carrierSnapshotSample.id !== latest.id && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Last carrier breakdown captured {formatDateTime(carrierSnapshotSample.checked_at)}.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--muted)]">
                We need at least one completed flight-agent run with offer metadata to populate this card.
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">No additional API call is made from this page.</p>
            </>
          )}
        </article>
      </section>
    </div>
  );
}

const getMedianPrice = (samples: { price: number }[]) => {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a.price - b.price);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1].price + sorted[mid].price) / 2;
  }
  return sorted[mid].price;
};

const formatLeg = (label: string, leg: { carrierName?: string; carrierCode?: string; flightCode?: string; stops?: number; stopsText?: string; durationMinutes?: number }) => {
  const carrier = leg.carrierName ?? leg.carrierCode ?? "Carrier TBD";
  const flight = leg.flightCode ? ` (${leg.flightCode})` : "";
  const stops = leg.stopsText ?? (typeof leg.stops === "number" ? `${leg.stops} stops` : "Stops n/a");
  const duration = leg.durationMinutes ? formatDuration(leg.durationMinutes) : "Duration n/a";
  return `${label}: ${carrier}${flight} • ${stops} • ${duration}`;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const hoursLabel = hours ? `${hours}h` : "0h";
  const minutesLabel = `${remaining.toString().padStart(2, "0")}m`;
  return `${hoursLabel} ${minutesLabel}`;
};

const formatOfferSummary = (offer: FlightOffer) => {
  const stops = offer.stops === 0 ? "Direct" : `${offer.stops} stops`;
  const totalDurationMinutes = offer.combinedDurationMinutes ?? Math.round((offer.durationHours ?? 0) * 60);
  const duration = totalDurationMinutes > 0 ? formatDuration(totalDurationMinutes) : "Duration n/a";
  return `${offer.carrier} • ${offer.fareClass} • ${stops} • ${duration}`;
};

const getLegacyCarrierMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata as Record<string, unknown>;
  const carrier = typeof raw.carrier === "string" ? raw.carrier : undefined;
  const fareClass =
    typeof raw.fare_class === "string"
      ? raw.fare_class
      : typeof raw.fareClass === "string"
        ? raw.fareClass
        : undefined;
  if (!carrier && !fareClass) return null;
  return { carrier, fareClass };
};

const formatLegacyCarrierSummary = (legacy: { carrier?: string; fareClass?: string }) => {
  const carrier = legacy.carrier ?? "Carrier TBD";
  const fareClass = legacy.fareClass ?? "Fare class n/a";
  return `Cheapest sampled fare: ${carrier} • ${fareClass}`;
};
