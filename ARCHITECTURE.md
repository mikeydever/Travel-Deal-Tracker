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
- Agents: flight, hotel, photo, experiences scout, itinerary generator

---

## Database
Postgres (via Supabase)

Tables:
- flight_prices
- hotel_prices
- events
- alerts_log
- daily_photos
- experience_deals
- itinerary_suggestions

---

## External APIs
Preferred:
- Amadeus (flights)
- Hotel price aggregator API
- Pexels (daily photo)
- Brave Search (experiences scout)
- OpenAI (deal extraction + itinerary narration)

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
