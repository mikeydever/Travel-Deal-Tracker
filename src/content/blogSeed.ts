import type { BlogPost } from "@/types/blog";

export const BLOG_SEED_POSTS: BlogPost[] = [
  {
    id: "seed-2026-02-16-market-setup",
    slug: "thailand-trip-market-setup-feb-16-2026",
    title: "Thailand Trip Market Setup: 18-Day Plan With Travel-Day Reality",
    summary:
      "A baseline update for the October 29 to November 16, 2026 travel window, with itinerary pacing tuned to an 18-day usable trip.",
    status: "published",
    publishedAt: "2026-02-16T15:00:00.000Z",
    content: {
      takeaway:
        "Use this week to set your baseline. Once affiliate approvals clear, compare only against routes and hotels that match your trip-quality floor.",
      sections: [
        {
          heading: "Flight baseline",
          paragraphs: [
            "We are tracking economy fares from Vancouver (YVR) to Bangkok (BKK) for the October 29 to November 16, 2026 travel window.",
            "The decision rule remains simple: prioritize sustained declines versus short-lived outliers and keep itinerary quality constraints (stop count and total travel time).",
          ],
        },
        {
          heading: "18-day itinerary options",
          paragraphs: [
            "Balanced split: 5 nights Bangkok, 4 nights Chiang Mai, and 6 nights in one beach hub, with travel buffers on both ends.",
            "Slow split: 7 nights Bangkok plus 8 nights in one secondary base to reduce transfer friction and preserve energy.",
          ],
        },
        {
          heading: "Date-line and work-return constraint",
          paragraphs: [
            "Leaving on October 29, 2026 can mean arriving around October 31, 2026 depending on routing and crossing the International Date Line.",
            "Returning on November 16, 2026 keeps a buffer before work on November 18, 2026.",
          ],
        },
        {
          heading: "Hotel baseline",
          paragraphs: [
            "Hotel tracking focuses on Bangkok, Chiang Mai, Phuket, Krabi, and Koh Samui with a quality floor to reduce noisy low-end inventory.",
            "This keeps comparisons honest and prevents fake savings caused by mismatched property quality.",
          ],
        },
      ],
    },
    sources: [
      {
        title: "Travelpayouts program dashboard",
        url: "https://app.travelpayouts.com/",
        domain: "travelpayouts.com",
      },
      {
        title: "Travel Deal Tracker guides",
        url: "https://www.yourfuture.club/guides",
        domain: "yourfuture.club",
      },
    ],
    metadata: {
      aiProvider: "fallback",
      confidence: 0.5,
      generatedAt: "2026-02-16T15:00:00.000Z",
      qualityChecks: ["seed_content"],
    },
  },
];
