import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TRIP_GUIDES, getGuideBySlug } from "@/content/guides";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export async function generateStaticParams() {
  return TRIP_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return {
      title: "Guide not found | Travel Deal Tracker",
    };
  }

  return {
    title: `${guide.title} | Travel Deal Tracker`,
    description: guide.summary,
  };
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const related = TRIP_GUIDES.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">{guide.focus}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              {guide.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">{guide.summary}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-[var(--muted)]">
              Last updated {formatDate(guide.updatedAt)} · {guide.readTime}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <NavPills className="mt-8" />
      </section>

      <article className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="space-y-8">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-[15px] text-[var(--muted)]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Checklist</p>
          <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            {guide.checklist.map((item) => (
              <li key={item} className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
            Booking options
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            These links are included as natural planning references for this trip. They may include affiliate
            tracking in production.
          </p>
          <div className="mt-4 space-y-3">
            {guide.bookingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3 transition hover:border-[var(--accent)]/55"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{link.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{link.note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">More guides</p>
          <Link className="text-sm font-medium text-[var(--accent)]" href="/guides">
            View all guides →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {related.map((item) => (
            <Link
              key={item.slug}
              href={`/guides/${item.slug}`}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/45 px-4 py-3 text-sm text-[var(--foreground)] transition hover:border-[var(--accent)]/50"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
