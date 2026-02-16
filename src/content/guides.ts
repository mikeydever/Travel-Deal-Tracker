export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface GuideLink {
  label: string;
  href: string;
  note: string;
}

export interface TripGuide {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  readTime: string;
  focus: string;
  sections: GuideSection[];
  checklist: string[];
  bookingLinks: GuideLink[];
}

export const TRIP_GUIDES: TripGuide[] = [
  {
    slug: "bangkok-base-5-night-plan",
    title: "Bangkok Base Plan for the First 5 Nights",
    summary:
      "A practical first-week setup that keeps transfer friction low while you adjust to timezone and weather.",
    updatedAt: "2026-02-16",
    readTime: "6 min",
    focus: "Bangkok | Arrival phase",
    sections: [
      {
        heading: "Why Start in Bangkok",
        paragraphs: [
          "Bangkok has the best arrival logistics for this trip shape: direct airport rail options, many late check-ins, and broad hotel inventory at different budget levels.",
          "Using Bangkok as the first five-night base gives margin for jet lag, SIM setup, and one weather-disrupted day without breaking the whole trip."
        ]
      },
      {
        heading: "Neighborhood Priority",
        paragraphs: [
          "For this itinerary, prioritize BTS-access neighborhoods over waterfront-only views. Lower transfer time usually saves more than a premium room with inconvenient transport.",
          "Sukhumvit (Asok to Phrom Phong) and Silom are the best balance for transit, food, and flexible day planning."
        ]
      },
      {
        heading: "Hotel Selection Rules",
        paragraphs: [
          "Filter to properties with at least 8.0 review score, free cancellation, and breakfast option. Those three constraints reduce downside risk most on short stays.",
          "If two properties are within 8 to 12 CAD per night, choose the one with stronger transport access over room size."
        ]
      }
    ],
    checklist: [
      "Target nightly range: 85 to 145 CAD after taxes",
      "Book refundable first, then tighten 7 to 10 days before departure",
      "Keep airport transfer under 60 minutes at rush hour",
      "Avoid committing all five nights to one non-refundable deal"
    ],
    bookingLinks: [
      { label: "Agoda Bangkok search", href: "https://www.agoda.com/city/bangkok-th.html", note: "Strong Bangkok inventory depth" },
      { label: "Booking.com Bangkok search", href: "https://www.booking.com/city/th/bangkok.html", note: "Useful cancellation filters" },
      { label: "Trip.com Bangkok hotels", href: "https://www.trip.com/hotels/list?city=359", note: "Good cross-check for promo rates" }
    ]
  },
  {
    slug: "phuket-vs-krabi-cost-tradeoff",
    title: "Phuket vs Krabi: Cost, Transfer, and Comfort Tradeoff",
    summary:
      "How to choose between Phuket and Krabi using total-friction math instead of just nightly room price.",
    updatedAt: "2026-02-16",
    readTime: "7 min",
    focus: "South islands | Mid-trip decision",
    sections: [
      {
        heading: "The Common Mistake",
        paragraphs: [
          "Comparing only nightly hotel rates hides transfer spend and lost day value. A cheaper hotel can still produce a more expensive stay once ferry, taxi, and timing are included.",
          "For this trip, include transfer cost and transfer time as first-class inputs in every comparison."
        ]
      },
      {
        heading: "Phuket Bias",
        paragraphs: [
          "Phuket usually wins when flight timings matter and you want backup options. It has stronger flight frequency and wider accommodation spread.",
          "Room pricing can look higher, but smoother logistics often offset this for a short window."
        ]
      },
      {
        heading: "Krabi Bias",
        paragraphs: [
          "Krabi wins when daily pace matters more than nightlife and you can tolerate fewer transport fallbacks.",
          "If weather changes your activity plan, keep one flexible day and avoid chained prepaid excursions."
        ]
      }
    ],
    checklist: [
      "Compare total stay cost: room + transfers + one buffer day",
      "Use refundable holds in both cities for 48 to 72 hours",
      "Prefer property location over luxury tier on short stays",
      "Lock final city after checking 10-day weather trend"
    ],
    bookingLinks: [
      { label: "Agoda Phuket", href: "https://www.agoda.com/city/phuket-th.html", note: "Good coverage in Patong and Kata" },
      { label: "Agoda Krabi", href: "https://www.agoda.com/city/krabi-th.html", note: "Strong Ao Nang options" },
      { label: "12Go transfer options", href: "https://12go.asia/en", note: "Use for transfer timing checks" }
    ]
  },
  {
    slug: "chiang-mai-cool-season-plan",
    title: "Chiang Mai Cool-Season Hotel Plan",
    summary:
      "A focused approach for Chiang Mai in cool season with emphasis on walkability, quiet sleep, and day-trip flexibility.",
    updatedAt: "2026-02-16",
    readTime: "5 min",
    focus: "Chiang Mai | Slow-travel block",
    sections: [
      {
        heading: "Area Strategy",
        paragraphs: [
          "Old City and Nimman solve different problems. Old City is best for temples and walkable mornings; Nimman is better for modern cafes and airport convenience.",
          "For a 4 to 6 night block, split-stay only if rates are similar and you want different rhythms. Otherwise pick one anchor."
        ]
      },
      {
        heading: "Room Standards That Matter",
        paragraphs: [
          "Prioritize quiet-room mentions, strong AC, and late check-in reliability. These factors affect trip quality more than visual room style.",
          "If reviews mention street noise repeatedly, skip even if price looks attractive."
        ]
      },
      {
        heading: "Price Timing",
        paragraphs: [
          "Chiang Mai prices can move quickly around festivals and weekends. Track a rolling 7-day band, then book when price is in the lower third and cancellation is flexible.",
          "Do not chase the absolute minimum if location quality drops significantly."
        ]
      }
    ],
    checklist: [
      "Target nightly range: 70 to 130 CAD",
      "Require free cancellation unless discount is meaningful",
      "Validate noise comments in latest reviews",
      "Set one day for Doi Suthep or countryside trip"
    ],
    bookingLinks: [
      { label: "Booking.com Chiang Mai", href: "https://www.booking.com/city/th/chiang-mai.html", note: "Filter by review score and cancellation" },
      { label: "Trip.com Chiang Mai hotels", href: "https://www.trip.com/hotels/list?city=623", note: "Compare final taxes and fees" },
      { label: "Agoda Chiang Mai", href: "https://www.agoda.com/city/chiang-mai-th.html", note: "Useful for flash promotions" }
    ]
  },
  {
    slug: "yvr-bkk-booking-playbook",
    title: "YVR to BKK Flight Booking Playbook",
    summary:
      "A simple rule set for when to buy, when to hold, and how to compare layover quality against fare drops.",
    updatedAt: "2026-02-16",
    readTime: "6 min",
    focus: "Flights | Purchase timing",
    sections: [
      {
        heading: "Signal to Watch",
        paragraphs: [
          "Use the median trend and not one-off lows. A single cheap quote is often a low-quality itinerary, stale fare, or poor return timing.",
          "The useful signal is sustained movement below your trailing median with acceptable layover structure."
        ]
      },
      {
        heading: "Buy vs Hold Rule",
        paragraphs: [
          "Buy when fare is at least 10 to 15 percent below your 30-day median and total travel time is still acceptable for your energy budget.",
          "Hold when fare drops are tied to overnight layovers that would force extra hotel nights or heavy recovery days."
        ]
      },
      {
        heading: "Airline Mix",
        paragraphs: [
          "For this corridor, one-stop options are often the best value-quality compromise. Two-stop routes can look cheap but usually cost more in fatigue.",
          "Record carrier and stop count in your tracker so decisions are based on comparable trip quality."
        ]
      }
    ],
    checklist: [
      "Set buy trigger at 15 percent under 30-day average",
      "Cap total travel duration to preserve first two days in Thailand",
      "Prefer one-stop over two-stop if price delta is small",
      "Recheck fare within 24 hours of purchase if cancellation policy allows"
    ],
    bookingLinks: [
      { label: "Aviasales route search", href: "https://www.aviasales.com/", note: "Primary route benchmarking" },
      { label: "Trip.com flights", href: "https://www.trip.com/flights/", note: "Secondary fare check" },
      { label: "CheapOair flights", href: "https://www.cheapoair.com/", note: "Additional fare spread check" }
    ]
  }
];

export const getGuideBySlug = (slug: string) =>
  TRIP_GUIDES.find((guide) => guide.slug === slug);
