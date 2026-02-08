/* eslint-disable @next/next/no-img-element */
import type { ExperienceDealRow } from "@/types/experiences";

interface ExperiencesGridProps {
  deals: ExperienceDealRow[];
}

const formatPrice = (deal: ExperienceDealRow) => {
  if (!deal.price || !deal.currency) return "Price on site";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: deal.currency,
    maximumFractionDigits: 0,
  }).format(deal.price);
};

export function ExperiencesGrid({ deals }: ExperiencesGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {deals.map((deal) => (
        <article
          key={deal.id}
          className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
        >
          <div className="relative h-44 overflow-hidden bg-[var(--sand)]/40">
            {deal.image_url ? (
              <img
                src={deal.image_url}
                alt={deal.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Thailand
              </div>
            )}
            {deal.needs_review ? (
              <span className="absolute left-4 top-4 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                Needs review
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                {deal.city ?? "Thailand"} · {deal.category ?? "Experience"}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {deal.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {deal.summary ?? "Curated highlight from today’s scout."}
              </p>
            </div>
            <div className="mt-auto flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">From</p>
                <p className="text-base font-semibold text-[var(--foreground)]">{formatPrice(deal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted)]">Rating</p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {deal.rating ? `${deal.rating.toFixed(1)}★` : "—"}
                </p>
              </div>
            </div>
            <a
              href={deal.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            >
              View source
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
