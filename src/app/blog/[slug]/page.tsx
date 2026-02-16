import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getBlogPostBySlug, getPublishedBlogPosts } from "@/data/blogPosts";

export const dynamic = "force-dynamic";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const displayDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found | Travel Deal Tracker",
    };
  }

  return {
    title: `${post.title} | Travel Deal Tracker`,
    description: post.summary,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = (await getPublishedBlogPosts(6)).filter((item) => item.slug !== post.slug).slice(0, 3);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Trip Blog</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              {post.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">{post.summary}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-[var(--muted)]">
              Published {formatDate(post.publishedAt)}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <NavPills className="mt-8" />
      </section>

      <article className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="space-y-8">
          {post.content.sections.map((section) => (
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

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Trip takeaway</p>
        <p className="mt-3 text-base text-[var(--foreground)]">{post.content.takeaway}</p>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">Sources</p>
        <div className="mt-4 space-y-3">
          {post.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-4 py-3 transition hover:border-[var(--accent)]/55"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{source.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{source.domain ?? displayDomain(source.url)}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">More updates</p>
          <Link className="text-sm font-medium text-[var(--accent)]" href="/blog">
            View all posts →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {related.map((item) => (
            <Link
              key={item.slug}
              href={`/blog/${item.slug}`}
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
