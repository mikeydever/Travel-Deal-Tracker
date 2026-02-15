import Link from "next/link";
import { PRIMARY_TRIP, THAI_HUB_CITIES } from "@/config/travel";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getLatestFlightSample, getRecentFlightPrices } from "@/data/flightPrices";
import { getLatestHotelSnapshots } from "@/data/hotelPrices";
import { getDailyPhoto } from "@/data/dailyPhotos";

export const dynamic = "force-dynamic";

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const formatCurrency = (value: number, currency = "CAD") => {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en-CA", { style: "currency", currency })
    );
  }
  return currencyFormatters.get(currency)?.format(value) ?? `${value.toFixed(0)} ${currency}`;
};

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function Home() {
  const today = Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date());
  const [latestFlight, flightHistory, hotelSnapshots, dailyPhoto] = await Promise.all([
    getLatestFlightSample(),
    getRecentFlightPrices(14),
    getLatestHotelSnapshots(),
    getDailyPhoto(),
  ]);

  const previousFlight =
    flightHistory.length > 1 ? flightHistory[flightHistory.length - 2] : flightHistory[0];
  const flightDelta = latestFlight && previousFlight ? latestFlight.price - previousFlight.price : 0;
  const flightCurrencyCode = latestFlight?.currency ?? flightHistory[0]?.currency ?? "CAD";
  const formatFlightCurrencyWithCode = (value: number) =>
    `${formatCurrency(value, flightCurrencyCode)} ${flightCurrencyCode}`;

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--glow)]">
          <div className="absolute inset-0">
            {dailyPhoto?.image_url && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${dailyPhoto.image_url_large ?? dailyPhoto.image_url})`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,194,91,0.35),_transparent_55%)]" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 p-8 text-white lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Thailand Daily</p>
                <ThemeToggle className="border-white/20 bg-white/10 text-white/70" />
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl font-[var(--font-display)]">
                Live price intelligence for the Vancouver → Thailand corridor.
              </h1>
              <p className="mt-4 text-base text-white/80 sm:text-lg">
                Daily flight and hotel signals, plus curated experiences and itinerary ideas, tuned to the
                season’s best windows.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/40 px-6 py-4 text-sm text-white/80 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Today</p>
              <p className="text-lg font-semibold text-white">{today}</p>
              <p className="mt-2 text-xs text-white/60">Daily cron runs just after 07:00 PT.</p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-6 px-8 pb-8">
            <NavPills />
            {dailyPhoto ? (
              <p className="text-xs text-white/60">
                Photo by{" "}
                <a
                  className="underline decoration-white/40 underline-offset-4 hover:text-white"
                  href={dailyPhoto.photographer_url ?? "https://www.pexels.com"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {dailyPhoto.photographer ?? "Pexels"}
                </a>
              </p>
            ) : (
              <p className="text-xs text-white/50">Daily inspiration photo loads with the morning cron.</p>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Link
            href="/flights"
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Primary route</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {PRIMARY_TRIP.origin} → {PRIMARY_TRIP.destination}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {PRIMARY_TRIP.departDate} – {PRIMARY_TRIP.returnDate} (flex ±2 days)
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Trip length</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {PRIMARY_TRIP.tripLengthDays} days
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Cabin</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{PRIMARY_TRIP.cabin}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Open Flights →
            </p>
          </Link>

          <Link
            href="/hotels"
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Hotel focus</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">5 cities</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
              {THAI_HUB_CITIES.map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-[var(--card-border)] bg-[var(--accent-soft)]/30 px-3 py-1 text-[var(--accent)]"
                >
                  {city}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Open Hotels →
            </p>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Link
            href="/flights"
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Latest flight signal</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {latestFlight ? formatFlightCurrencyWithCode(latestFlight.price) : "--"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Checked {latestFlight ? formatDateTime(latestFlight.checked_at) : "n/a"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Currency: {flightCurrencyCode}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">7-day median</p>
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {formatFlightCurrencyWithCode(getMedianPrice(flightHistory.slice(-7)))}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Δ vs last pull</p>
                <p
                  className={`text-xl font-semibold ${
                    flightDelta >= 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {flightDelta >= 0 ? "+" : "-"}
                  {formatFlightCurrencyWithCode(Math.abs(flightDelta))}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Carrier insights update once live data streams in.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Deal triggers</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                <li>↘︎ 15% drop vs 30-day average</li>
                <li>⚡ Historical low detected</li>
                <li>🪄 Manual override for key events</li>
              </ul>
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Open Flights →
            </p>
          </Link>

          <Link
            href="/hotels"
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Hotel snapshot</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Nightly averages</h2>
            <ul className="mt-4 space-y-3">
              {hotelSnapshots.map((sample) => (
                <li key={sample.city} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{sample.city}</p>
                    <p className="text-xs text-[var(--muted)]">Daily average</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {formatCurrency(sample.avg_price, sample.currency)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(sample.checked_at).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Open Hotels →
            </p>
          </Link>
        </section>
      </div>
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
