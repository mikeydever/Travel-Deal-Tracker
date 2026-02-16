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
- Agents: flight, hotel, photo, experiences scout, itinerary generator, blog writer

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
- blog_posts

---

## External APIs
Preferred:
- Amadeus (flights)
- Hotel price aggregator API
- Pexels (daily photo)
- Brave Search (experiences scout)
- OpenAI (deal extraction + itinerary narration)
- Anthropic Claude (optional blog drafting)

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
- Generate source-backed blog entry (publish only if quality gates pass)
