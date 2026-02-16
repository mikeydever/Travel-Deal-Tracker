import type { BlogPost } from "@/types/blog";

export const BLOG_SEED_POSTS: BlogPost[] = [
  {
    id: "seed-2026-02-16-market-setup",
    slug: "thailand-trip-market-setup-feb-16-2026",
    title: "Thailand Trip Market Setup: What to Watch This Week",
    summary:
      "A baseline update on YVR to Bangkok airfare and Thai hub hotel pricing so we can spot real discounts as approvals land.",
    status: "published",
    publishedAt: "2026-02-16T15:00:00.000Z",
    content: {
      takeaway:
        "Use this week to set your baseline. Once affiliate approvals clear, compare only against routes and hotels that match your trip-quality floor.",
      sections: [
        {
          heading: "Flight baseline",
          paragraphs: [
            "We are tracking economy fares from Vancouver (YVR) to Bangkok (BKK) for the October 28 to November 18, 2026 travel window.",
            "The decision rule remains simple: prioritize sustained declines versus short-lived outliers and keep itinerary quality constraints (stop count and total travel time).",
          ],
        },
        {
          heading: "Hotel baseline",
          paragraphs: [
            "Hotel tracking focuses on Bangkok, Chiang Mai, Phuket, Krabi, and Koh Samui with a quality floor to reduce noisy low-end inventory.",
            "This keeps comparisons honest and prevents fake savings caused by mismatched property quality.",
          ],
        },
        {
          heading: "What changes next",
          paragraphs: [
            "As programs approve, we will route additional partner links into guides and track whether broadened inventory produces lower all-in prices.",
            "Posts will emphasize concrete dates, source links, and price-impact context for this exact trip.",
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
