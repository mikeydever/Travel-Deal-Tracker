# Status (2026-02-08)

## Production
- Primary domain: https://www.yourfuture.club (root redirects to www).
- Vercel project: `travel-deal-tracker`.
- Daily cron enabled via `vercel.json` (schedule `0 16 * * *`, 8:00 AM PST) calling `/api/cron`.
- `CRON_SECRET` is set in Vercel.

## Recent Changes
- Added client-mount guards to avoid hydration/DOM errors:
  - `/Users/michaelwindeyer/Desktop/Travel Deal Tracker/src/components/charts/FlightTrendChart.tsx`
  - `/Users/michaelwindeyer/Desktop/Travel Deal Tracker/src/components/NavPills.tsx`
- Added cron schedule config:
  - `/Users/michaelwindeyer/Desktop/Travel Deal Tracker/vercel.json`

## Verification
- One-time cron run executed successfully; flights updated with RapidAPI data and “Live carrier snapshot” now appears.
- Playwright checks confirmed `/flights` and `/hotels` load on the new domain.

## Notes
- If the chart labels look sparse, check Supabase row counts for the active trip window (YVR–BKK, 2026-10-28 to 2026-11-18).
