-- Travel Deal Tracker – Daily Photo Cache
-- Run with: psql $DATABASE_URL -f supabase/migrations/0002_daily_photos.sql

create table if not exists public.daily_photos (
    id uuid primary key default gen_random_uuid(),
    date date not null unique,
    source text not null default 'pexels',
    query text not null,
    alt text,
    image_url text not null,
    image_url_large text,
    image_url_thumb text,
    photographer text,
    photographer_url text,
    avg_color text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists daily_photos_date_idx on public.daily_photos (date desc);

comment on table public.daily_photos is 'Daily Thailand inspiration photos (cached from Pexels).';
