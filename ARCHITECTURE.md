# Architecture

## Frontend
- Next.js
- Tailwind CSS
- Recharts
- PWA enabled

---

## Backend
- Next.js API routes OR Node service
- Scheduled jobs via cron or serverless scheduler

---

## Database
Postgres (via Supabase)

Tables:
- flight_prices
- hotel_prices
- events
- alerts_log

---

## External APIs
Preferred:
- Amadeus (flights)
- Hotel price aggregator API

Fallback:
- Mock data if API unavailable

---

## Deployment
- Vercel or similar
- Domain: yourfuture.club

---

## Scheduler
Daily job:
- Pull prices
- Store data
- Evaluate alerts
