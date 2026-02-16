import Link from "next/link";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getPublishedBlogPosts } from "@/data/blogPosts";

export const dynamic = "force-dynamic";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts(24);
  const latest = posts[0] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Trip Blog</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Source-backed market updates for this Thailand trip
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
              Posts combine our internal flight and hotel trends with curated external travel sources.
              Auto-publish is blocked unless quality checks pass.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Published posts</p>
              <p className="text-3xl font-semibold text-[var(--foreground)]">{posts.length}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Latest {latest ? formatDate(latest.publishedAt) : "n/a"}</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      {latest && (
        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Latest update</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--foreground)]">
            <Link className="hover:text-[var(--accent)]" href={`/blog/${latest.slug}`}>
              {latest.title}
            </Link>
          </h2>
          <p className="mt-3 max-w-4xl text-sm text-[var(--muted)]">{latest.summary}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted)]">
            {formatDate(latest.publishedAt)}
          </p>
          <p className="mt-4 text-sm font-medium text-[var(--accent)]">Read post →</p>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
              {formatDate(post.publishedAt)}
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-[var(--foreground)]">{post.title}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{post.summary}</p>
            <p className="mt-4 text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-1">
              Read update →
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
