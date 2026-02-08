import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HotelSparkline } from "@/components/charts/HotelSparkline";
import { getHotelHistoryByCity, getLatestHotelSnapshots } from "@/data/hotelPrices";

export const dynamic = "force-dynamic";

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const formatCurrency = (value: number, currency = "CAD") => {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(currency, new Intl.NumberFormat("en-CA", { style: "currency", currency }));
  }
  return currencyFormatters.get(currency)?.format(value) ?? `${value.toFixed(0)} ${currency}`;
};

const formatTimestamp = (value: string | Date) =>
  new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });

export default async function HotelsPage() {
  const [snapshots, historyByCity] = await Promise.all([
    getLatestHotelSnapshots(),
    getHotelHistoryByCity(undefined, 20),
  ]);

  const latestTimestamp = snapshots[0]?.checked_at;

  const chartCards = Object.entries(historyByCity).map(([city, rows]) => ({
    city,
    rows,
    data: rows.map((row) => ({ checkedAt: row.checked_at, avgPrice: row.avg_price })),
    currency: rows.at(-1)?.currency ?? "CAD",
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Hotels</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Thai city averages (nightly)
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)]">
              We track five hub cities daily to understand how macro demand (events, weather) shifts
              accomodation costs.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Last updated</p>
              <p className="text-3xl font-semibold text-[var(--foreground)]">
                {latestTimestamp ? formatTimestamp(latestTimestamp) : "--"}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">Daily pulls @ 07:05 PT</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">Snapshot</p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Current nightly ranges</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Prices shown below represent the last pull per city. Use charts to inspect intra-week swings.
            </p>
          </div>
          <div className="rounded-full bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--accent)]">
            Events agent overlays festival spikes bi-weekly.
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {snapshots.map((row) => (
            <div
              key={row.city}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/30 px-5 py-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{row.city}</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">
                    {formatCurrency(row.avg_price, row.currency)}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">{formatTimestamp(row.checked_at)}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Sample size: {typeof row.metadata?.sampleSize === "number" ? row.metadata.sampleSize : "--"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">City curves</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">20-day trend per hub</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {chartCards.map((card) => (
            <article
              key={card.city}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{card.city}</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {formatCurrency(card.rows.at(-1)?.avg_price ?? 0, card.currency)}
                  </p>
                </div>
                <p className="text-xs text-[var(--muted)]">↑ {getRange(card.rows, card.currency)} range</p>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--card)] p-2">
                <HotelSparkline data={card.data} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const getRange = (rows: { avg_price: number }[], currency: string) => {
  if (!rows.length) return "--";
  const prices = rows.map((row) => row.avg_price);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  return formatCurrency(Math.round(max - min), currency);
};
