import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AffiliateDisclosurePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Disclosure</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Affiliate relationship notice
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
              This project may use affiliate links for some travel brands. If a booking is made through those
              links, the site owner may receive a commission at no extra cost to the traveler.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">How links are used</h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Guides and planning pages may include affiliate-ready links as part of normal trip research.
          </li>
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Prices and recommendations are still evaluated on itinerary fit, location quality, and total trip
            friction, not only commission rate.
          </li>
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Sponsored placement is not sold on this site at this time.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--muted)]">
          Updated: February 16, 2026. For questions, use the contact page.
        </p>
        <Link className="mt-3 inline-block text-sm font-medium text-[var(--accent)]" href="/contact">
          Go to contact →
        </Link>
      </section>
    </div>
  );
}
