# Travel Deal Tracker

Travel Deal Tracker is an internal MVP that monitors the Vancouver → Thailand corridor, logs daily flight + hotel prices, and surfaces deal alerts when fares beat the baseline.

---

## Requirements

The product scope lives in the following docs:

- `PRD.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `AGENTS.md`
- `TASKS.md`

Keep these files up to date as we implement later phases.

---

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth)
- Recharts (Phase 4 dashboard)

---

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy the sample environment variables and fill in keys
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anonymous key for client access
   - `SUPABASE_SERVICE_ROLE_KEY` – optional, only for server jobs
   - `FLIGHT_API_KEY` / `HOTEL_API_KEY` – connectors used by data agents
   - `CRON_SECRET` – shared secret used by the scheduled cron endpoint
3. Run the development server
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` to see the dashboard shell.

---

## Database

- Schema migrations live in `supabase/migrations`. Apply them with Supabase CLI or plain `psql`:
  ```bash
  psql $DATABASE_URL -f supabase/migrations/0001_core_schema.sql
  ```
- Optional sample data sits in `supabase/seeds/seed_data.sql` to hydrate dashboards locally:
  ```bash
  psql $DATABASE_URL -f supabase/seeds/seed_data.sql
  ```
- Tables follow `DATA_MODEL.md` (flight_prices, hotel_prices, events, alerts_log) and include JSONB metadata fields so upcoming agents can stash API payload fragments without schema churn.

---

## Data Collection Agents

- The daily cron endpoint lives at `POST /api/cron`. Protect it with `CRON_SECRET` (send `Authorization: Bearer <secret>`).
- Vercel Cron example configuration:
  - `0 7 * * *` → `https://<deployment>/api/cron`
- Locally, run the Next.js dev server then trigger the agents via curl:
  ```bash
  curl -X POST http://localhost:3000/api/cron
  # or with secret
  curl -X POST http://localhost:3000/api/cron -H "Authorization: Bearer $CRON_SECRET"
  ```
- Flight agent stores the cheapest YVR ↔ BKK fare for the current travel window. Hotel agent iterates the five Thai hubs defined in `src/config/travel.ts` and persists daily averages.

---

## Alerts & Deal Detection

- After each cron run we evaluate the newest samples against the last 30 days.
  - Trigger if price drops >15% vs. 30-day mean (`flight_drop`, `hotel_drop_*`).
  - Trigger if price hits a historical low (`flight_low`, `hotel_low_*`).
- Alerts are deduped for 24h via `alerts_log` and recorded with JSON metadata.
- `src/services/email.ts` contains a stub that currently logs to the console—swap with a real provider when ready.

---

## Dashboard Pages

- `/` Overview: trip summary, latest flight + hotel signals, automation checklist.
- `/flights`: 30-day fare chart (Recharts) + benchmark stats.
- `/hotels`: city snapshots and micro area charts for each Thai hub.

All pages are built with responsive Tailwind layouts so they stay readable on mobile.

---

## Scripts

- `npm run dev` – Next.js dev server
- `npm run build` – Production build
- `npm run start` – Start the compiled app
- `npm run lint` – ESLint (configured via `eslint.config.mjs`)

---

## Roadmap Snapshot

- Phase 1: App scaffold, Tailwind theme, Supabase client ✅
- Phase 2: Database schema + migrations ✅
- Phase 3: Data collection agents + schedulers ✅
- Phase 4: Dashboard views + charts ✅
- Phase 5: Alerts + polish (PWA, loading states, error UX)

---

## Future Ideas

- Multi-user subscriptions
- Predictive price modeling
- AI deal scoring
- Telegram / SMS alerts
 
