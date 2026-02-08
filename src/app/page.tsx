import { AGENT_PIPELINES, PRIMARY_TRIP, THAI_HUB_CITIES } from "@/config/travel";
import { NavPills } from "@/components/NavPills";
import { getLatestFlightSample, getRecentFlightPrices } from "@/data/flightPrices";
import { getLatestHotelSnapshots } from "@/data/hotelPrices";

export const dynamic = "force-dynamic";

const flightCurrency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const formatCurrency = (value: number, currency = "CAD") => {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(currency, new Intl.NumberFormat("en-CA", { style: "currency", currency }));
  }
  return currencyFormatters.get(currency)?.format(value) ?? `${value.toFixed(0)} ${currency}`;
};

const readinessChecklist = [
  "Supabase schema planned",
  "Mock adapters ready if APIs are missing",
  "Alert definitions confirmed (>15% drop & historical low)",
];

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function Home() {
  const today = Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date());
  const [latestFlight, flightHistory, hotelSnapshots] = await Promise.all([
    getLatestFlightSample(),
    getRecentFlightPrices(14),
    getLatestHotelSnapshots(),
  ]);

  const previousFlight = flightHistory.length > 1 ? flightHistory[flightHistory.length - 2] : flightHistory[0];
  const flightDelta = latestFlight && previousFlight ? latestFlight.price - previousFlight.price : 0;

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Travel Deal Tracker</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Thailand price intelligence for YVR departures
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                We follow the Vancouver → Thailand corridor daily, store every fare + hotel datapoint, and surface deals the moment they beat the 30-day baseline.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today</p>
              <p className="text-lg font-semibold text-slate-900">{today}</p>
              <p className="mt-2 text-xs text-slate-500">Daily cron runs just after 07:00 PT.</p>
            </div>
          </div>
          <NavPills className="mt-8" />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-[var(--card-border)] bg-white/80 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary route</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              {PRIMARY_TRIP.origin} → {PRIMARY_TRIP.destination}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {PRIMARY_TRIP.departDate} – {PRIMARY_TRIP.returnDate} (flex ±2 days)
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-slate-400">Trip length</p>
                <p className="text-lg font-semibold text-slate-900">
                  {PRIMARY_TRIP.tripLengthDays} days
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Cabin</p>
                <p className="text-lg font-semibold text-slate-900">{PRIMARY_TRIP.cabin}</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--card-border)] bg-white/80 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hotel focus</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">5 cities</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              {THAI_HUB_CITIES.map((city) => (
                <span key={city} className="rounded-full bg-[var(--accent-soft)]/50 px-3 py-1 text-[var(--accent)]">
                  {city}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--card-border)] bg-white/80 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deal triggers</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>↘︎ 15% drop vs 30-day average</li>
              <li>⚡ Historical low detected</li>
              <li>🪄 Manual override for key events</li>
            </ul>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-[var(--card-border)] bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest flight signal</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              {latestFlight ? flightCurrency.format(latestFlight.price) : "--"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Checked {latestFlight ? formatDateTime(latestFlight.checked_at) : "n/a"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">7-day median</p>
                <p className="text-xl font-semibold text-slate-900">
                  {flightCurrency.format(getMedianPrice(flightHistory.slice(-7)))}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Δ vs last pull</p>
                <p
                  className={`text-xl font-semibold ${
                    flightDelta >= 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {flightDelta >= 0 ? "+" : "-"}
                  {flightCurrency.format(Math.abs(flightDelta))}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Carrier insights available once live data streams in.
            </p>
          </article>

          <article className="rounded-3xl border border-[var(--card-border)] bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hotel snapshot</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Nightly averages</h2>
            <ul className="mt-4 space-y-3">
              {hotelSnapshots.map((sample) => (
                <li key={sample.city} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sample.city}</p>
                    <p className="text-xs text-slate-500">Daily average</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(sample.avg_price, sample.currency)}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(sample.checked_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {AGENT_PIPELINES.map((pipeline) => (
            <article
              key={pipeline.title}
              className="flex flex-col gap-4 rounded-3xl border border-[var(--card-border)] bg-white p-6 shadow-sm"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Automation</p>
                <h3 className="text-xl font-semibold text-slate-900">{pipeline.title}</h3>
              </div>
              <p className="text-sm font-medium text-[var(--accent)]">{pipeline.cadence}</p>
              <p className="text-sm text-slate-600">{pipeline.summary}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[var(--card-border)] bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Launch checklist</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">MVP readiness</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                These are the guardrails we keep in sight while building the upcoming phases: data model, collectors, charts, and alerts.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--accent)]">
              Scheduler: cron-friendly, single run per day.
            </div>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {readinessChecklist.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-dashed border-[var(--card-border)] bg-white/70 px-4 py-3 text-sm text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
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
