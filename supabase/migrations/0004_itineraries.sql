-- Travel Deal Tracker – Itinerary Suggestions
-- Run with: psql $DATABASE_URL -f supabase/migrations/0004_itineraries.sql

create table if not exists public.itinerary_suggestions (
    id uuid primary key default gen_random_uuid(),
    window_start date not null,
    window_end date not null,
    duration_days integer not null,
    title text,
    summary text,
    days jsonb not null default '[]'::jsonb,
    score numeric(5,2),
    created_at timestamptz not null default now()
);

create index if not exists itinerary_window_idx on public.itinerary_suggestions (window_start, window_end);
create index if not exists itinerary_duration_idx on public.itinerary_suggestions (duration_days);
create index if not exists itinerary_created_idx on public.itinerary_suggestions (created_at desc);

comment on table public.itinerary_suggestions is 'Generated trip itineraries for recommended windows.';
