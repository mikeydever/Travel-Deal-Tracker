import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Contact</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Reach the site owner
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
              Use the channels below for corrections, partnership notes, or itinerary feedback related to this
              project.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:hello@yourfuture.club"
          className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/55"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Email</p>
          <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">hello@yourfuture.club</p>
          <p className="mt-2 text-sm text-[var(--muted)]">General questions and corrections.</p>
        </a>

        <a
          href="https://github.com/mikeydever/Travel-Deal-Tracker/issues"
          target="_blank"
          rel="noreferrer"
          className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/55"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Issue tracker</p>
          <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">GitHub issues</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Bug reports and content updates.</p>
        </a>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--muted)]">
          For policy context, read the affiliate disclosure and about pages.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="text-sm font-medium text-[var(--accent)]" href="/affiliate-disclosure">
            Affiliate disclosure →
          </Link>
          <Link className="text-sm font-medium text-[var(--accent)]" href="/about">
            About this project →
          </Link>
        </div>
      </section>
    </div>
  );
}
