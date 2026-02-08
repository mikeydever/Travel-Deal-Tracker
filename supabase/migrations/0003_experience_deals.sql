-- Travel Deal Tracker – Experience Deals
-- Run with: psql $DATABASE_URL -f supabase/migrations/0003_experience_deals.sql

create table if not exists public.experience_deals (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    city text,
    category text,
    price numeric(10,2),
    currency char(3),
    rating numeric(3,2),
    reviews_count integer,
    url text not null unique,
    image_url text,
    summary text,
    source_domain text,
    scouted_date date not null,
    confidence numeric(3,2),
    needs_review boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists experience_deals_city_idx on public.experience_deals (city);
create index if not exists experience_deals_category_idx on public.experience_deals (category);
create index if not exists experience_deals_date_idx on public.experience_deals (scouted_date desc);

comment on table public.experience_deals is 'Web-scouted tours and attractions for Thailand hubs.';
