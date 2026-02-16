import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">About</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Why this site exists
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
              Travel Deal Tracker is a personal project for planning one long Thailand trip from Vancouver.
              It tracks live flight and hotel signals, then pairs them with original notes to make booking
              decisions faster and cleaner.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">What is updated regularly</h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Daily flight sampling for the YVR to BKK corridor with trend comparison.
          </li>
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Daily hotel snapshots across Bangkok, Chiang Mai, Phuket, Krabi, and Koh Samui.
          </li>
          <li className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
            Trip guides reviewed weekly with practical booking notes and route tradeoffs.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Read next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/guides"
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/50"
          >
            Open trip guides
          </Link>
          <Link
            href="/affiliate-disclosure"
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/50"
          >
            Read affiliate disclosure
          </Link>
        </div>
      </section>
    </div>
  );
}
