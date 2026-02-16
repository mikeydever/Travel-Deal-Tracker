import { BLOG_SEED_POSTS } from "@/content/blogSeed";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { BlogContent, BlogPost, BlogPostInput, BlogSource } from "@/types/blog";

const SELECT_FIELDS =
  "id, slug, title, summary, status, published_at, content, sources, metadata, created_at";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: "draft" | "published";
  published_at: string;
  content?: BlogContent;
  sources?: BlogSource[];
  metadata?: BlogPost["metadata"];
}

const normalizeContent = (value: unknown): BlogContent => {
  if (!value || typeof value !== "object") {
    return { takeaway: "", sections: [] };
  }

  const record = value as Record<string, unknown>;
  const rawSections = Array.isArray(record.sections) ? record.sections : [];
  const sections = rawSections
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const entry = section as Record<string, unknown>;
      const heading = typeof entry.heading === "string" ? entry.heading.trim() : "";
      const rawParagraphs = Array.isArray(entry.paragraphs) ? entry.paragraphs : [];
      const paragraphs = rawParagraphs
        .filter((paragraph): paragraph is string => typeof paragraph === "string")
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      if (!heading || paragraphs.length === 0) {
        return null;
      }

      return { heading, paragraphs };
    })
    .filter((section): section is { heading: string; paragraphs: string[] } => Boolean(section));

  return {
    takeaway: typeof record.takeaway === "string" ? record.takeaway : "",
    sections,
  };
};

const normalizeSources = (value: unknown): BlogSource[] => {
  if (!Array.isArray(value)) return [];
  const normalized: BlogSource[] = [];

  for (const source of value) {
    if (!source || typeof source !== "object") continue;
    const row = source as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!title || !url) continue;

    normalized.push({
      title,
      url,
      snippet: typeof row.snippet === "string" ? row.snippet : undefined,
      publishedAt: typeof row.publishedAt === "string" ? row.publishedAt : undefined,
      domain: typeof row.domain === "string" ? row.domain : undefined,
    });
  }

  return normalized;
};

const rowToPost = (row: BlogPostRow): BlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  status: row.status,
  publishedAt: row.published_at,
  content: normalizeContent(row.content),
  sources: normalizeSources(row.sources),
  metadata: row.metadata,
});

export const saveBlogPost = async (input: BlogPostInput): Promise<BlogPost> => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    status: input.status ?? "published",
    published_at: input.publishedAt ?? new Date().toISOString(),
    content: input.content,
    sources: input.sources,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await client
    .from("blog_posts")
    .upsert(payload, { onConflict: "slug" })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(`Failed to save blog post: ${error.message}`);
  }

  return rowToPost(data as BlogPostRow);
};

export const getPublishedBlogPosts = async (limit = 20): Promise<BlogPost[]> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("blog_posts")
      .select(SELECT_FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return BLOG_SEED_POSTS;
    }

    return (data as BlogPostRow[]).map(rowToPost);
  } catch (error) {
    console.warn("[blog_posts] falling back to seed posts", error);
    return BLOG_SEED_POSTS;
  }
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("blog_posts")
      .select(SELECT_FIELDS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return BLOG_SEED_POSTS.find((post) => post.slug === slug) ?? null;
    }

    return rowToPost(data as BlogPostRow);
  } catch (error) {
    console.warn("[blog_posts] failed to load post", error);
    return BLOG_SEED_POSTS.find((post) => post.slug === slug) ?? null;
  }
};

export const getRecentBlogTitles = async (limit = 12): Promise<string[]> => {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("blog_posts")
      .select("title")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((row: { title?: string }) => row.title ?? "")
      .map((title) => title.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn("[blog_posts] failed to load recent titles", error);
    return BLOG_SEED_POSTS.map((post) => post.title);
  }
};

export const getLatestPublishedBlogPost = async (): Promise<BlogPost | null> => {
  const posts = await getPublishedBlogPosts(1);
  return posts[0] ?? null;
};
