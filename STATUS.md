# Status (2026-02-08)

## Production
- Primary domain: https://www.yourfuture.club (root redirects to www).
- Vercel project: `travel-deal-tracker`.
- Daily cron enabled via `vercel.json` for photo, flights/hotels, experiences, and itinerary agents.
- `CRON_SECRET` is set in Vercel.

## Recent Changes
- Dark-first visual refresh + theme toggle across core pages.
- Daily Thailand photo agent + cached hero photo on `/`.
- Experiences scout + `/experiences` page.
- Itinerary generator + `/itinerary` page.
- New cron scopes for `photo`, `experiences`, `itinerary`.
- Flight API temporarily disabled via `FLIGHT_API_DISABLED_UNTIL=2026-02-08` to prevent overages (auto-reenables on 2026-02-09).
- Added `/flights/offers` for top-3 overall + top-3 direct fare details.
- Experiences page now supports saved items (local storage) and filters that honor URL params.
- Experiences scout now prefers Viator API (bookable deals with price + rating) when `VIATOR_API_KEY` is set.
- Itinerary agent now seeds days from bookable experiences, stays in city blocks (starts/ends in Bangkok), and supports PTO-friendly durations.
- In-country itineraries now end on `PRIMARY_TRIP.returnDate - 1` (for 2026-10-28 → 2026-11-17), so you can treat `PRIMARY_TRIP.returnDate` as the flight-home day.
- Long itineraries are generated deterministically (AI only used for short trips) to avoid repetitive day text.

## Verification
- Pending: validate itinerary UX for the 21-day PTO plan (Oct 28 → Nov 17) after regenerating suggestions.

## Notes
- If the chart labels look sparse, check Supabase row counts for the active trip window (YVR–BKK, 2026-10-28 to 2026-11-18).
- PTO reference: off work 2026-10-28 through 2026-11-17, back to work 2026-11-18.
