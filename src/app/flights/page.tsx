import { NavPills } from "@/components/NavPills";
import { FlightTrendChart } from "@/components/charts/FlightTrendChart";
import { PRIMARY_TRIP } from "@/config/travel";
import { getLatestFlightSample, getRecentFlightPrices } from "@/data/flightPrices";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function FlightsPage() {
  const [history, latest] = await Promise.all([
    getRecentFlightPrices(30),
    getLatestFlightSample(),
  ]);

  const chartData = history.map((row) => ({
    checkedAt: row.checked_at,
    price: row.price,
  }));

  const previousSample = history.length > 1 ? history[history.length - 2] : history[history.length - 1];
  const priceDelta = latest && previousSample ? latest.price - previousSample.price : 0;
  const deltaPercentage = previousSample ? (priceDelta / previousSample.price) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Flights</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">YVR → BKK fare history</h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Daily snapshot of the cheapest round-trip economy fare for the Thailand window ({" "}
              {PRIMARY_TRIP.departDate} – {PRIMARY_TRIP.returnDate}).
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-white/80 px-6 py-4 text-sm text-slate-600 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest fare</p>
            <p className="text-3xl font-semibold text-slate-900">
              {latest ? currency.format(latest.price) : "--"}
            </p>
            {latest && (
              <p className="mt-2 text-xs text-slate-500">Checked {formatDateTime(latest.checked_at)}</p>
            )}
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-white/90 p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Trend</p>
            <h2 className="text-2xl font-semibold text-slate-900">30-day flight price curve</h2>
            <p className="mt-1 text-sm text-slate-600">
              Comparison vs. previous run shows {priceDelta >= 0 ? "a bump of" : "a drop of"}{" "}
              {currency.format(Math.abs(priceDelta))} ({deltaPercentage.toFixed(1)}%).
            </p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium ${
            priceDelta >= 0
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}>
            {priceDelta >= 0 ? "Slightly higher today" : "Cheaper than yesterday"}
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50/70 p-4">
          <FlightTrendChart data={chartData} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-dashed border-[var(--card-border)] bg-white/80 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Benchmark</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Median (last 7 days)</h3>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {history.length ? currency.format(getMedianPrice(history.slice(-7))) : "--"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            We use the 7-day median as our quick sanity check for alert thresholds.
          </p>
        </article>
        <article className="rounded-3xl border border-dashed border-[var(--card-border)] bg-white/80 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Carrier note</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Awaiting live carrier data</h3>
          <p className="mt-2 text-sm text-slate-600">
            Once the flight API is wired up, we’ll capture fare class, stops, and duration metadata here.
          </p>
          <p className="mt-1 text-xs text-slate-500">Current mock adapter focuses on pricing only.</p>
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
