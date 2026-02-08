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
- Itinerary agent now seeds days from bookable experiences, stays in city blocks (starts/ends in Bangkok), and supports a PTO-friendly duration.

## Verification
- Pending: validate new cron scopes and data availability once new env vars are set.

## Notes
- If the chart labels look sparse, check Supabase row counts for the active trip window (YVR–BKK, 2026-10-28 to 2026-11-18).
