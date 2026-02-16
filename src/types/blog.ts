export interface BlogSource {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  domain?: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogContent {
  takeaway: string;
  sections: BlogSection[];
}

export interface BlogMetadata {
  aiProvider?: "anthropic" | "openai" | "fallback";
  confidence?: number;
  noveltyScore?: number;
  qualityChecks?: string[];
  qualityFailures?: string[];
  flightDeltaPct?: number;
  maxHotelDeltaPct?: number;
  generatedAt?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: "draft" | "published";
  publishedAt: string;
  content: BlogContent;
  sources: BlogSource[];
  metadata?: BlogMetadata;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  summary: string;
  status?: "draft" | "published";
  publishedAt?: string;
  content: BlogContent;
  sources: BlogSource[];
  metadata?: BlogMetadata;
}
