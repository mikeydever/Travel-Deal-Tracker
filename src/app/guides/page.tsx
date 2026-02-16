import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TRIP_GUIDES } from "@/content/guides";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default function GuidesPage() {
  const sortedGuides = [...TRIP_GUIDES].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Trip Guides</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Original planning notes for this Thailand trip
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
              These are practical field notes for route planning, hotel selection, and booking timing. Each
              guide is updated as pricing behavior changes.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Guides live</p>
              <p className="text-3xl font-semibold text-[var(--foreground)]">{sortedGuides.length}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Reviewed weekly</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {sortedGuides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
              {guide.focus}
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-[var(--foreground)]">
              {guide.title}
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{guide.summary}</p>
            <div className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>Updated {formatDate(guide.updatedAt)}</span>
              <span>{guide.readTime}</span>
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Read guide →
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
          Trust and transparency
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]/50"
            href="/about"
          >
            About this project
          </Link>
          <Link
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]/50"
            href="/affiliate-disclosure"
          >
            Affiliate disclosure
          </Link>
          <Link
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]/50"
            href="/contact"
          >
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
