-- Travel Deal Tracker – Core Schema
-- Run with: psql $DATABASE_URL -f supabase/migrations/0001_core_schema.sql

create extension if not exists "pgcrypto";

create table if not exists public.flight_prices (
    id uuid primary key default gen_random_uuid(),
    origin text not null,
    destination text not null,
    depart_date date not null,
    return_date date not null,
    price numeric(10,2) not null,
    currency char(3) not null default 'CAD',
    checked_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists flight_prices_unique_sample
    on public.flight_prices (origin, destination, depart_date, return_date, checked_at);

create index if not exists flight_prices_route_idx
    on public.flight_prices (origin, destination, depart_date, return_date);

create index if not exists flight_prices_checked_idx
    on public.flight_prices (checked_at desc);

create table if not exists public.hotel_prices (
    id uuid primary key default gen_random_uuid(),
    city text not null,
    avg_price numeric(10,2) not null,
    currency char(3) not null default 'CAD',
    checked_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists hotel_prices_unique_sample
    on public.hotel_prices (city, checked_at);

create index if not exists hotel_prices_city_idx
    on public.hotel_prices (city);

create index if not exists hotel_prices_checked_idx
    on public.hotel_prices (checked_at desc);

create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    location text not null,
    start_date date not null,
    end_date date not null,
    notes text,
    updated_at timestamptz not null default now(),
    constraint events_valid_dates check (end_date >= start_date)
);

create index if not exists events_start_date_idx on public.events (start_date);

create table if not exists public.alerts_log (
    id uuid primary key default gen_random_uuid(),
    type text not null,
    message text not null,
    triggered_at timestamptz not null default now(),
    reference_type text,
    reference_id uuid,
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists alerts_log_triggered_idx on public.alerts_log (triggered_at desc);

comment on table public.flight_prices is 'Historical flight price samples collected by the Flight Agent.';
comment on table public.hotel_prices is 'Historical hotel price samples collected by the Hotel Agent.';
comment on table public.events is 'List of Thai events/festivals that may affect pricing.';
comment on table public.alerts_log is 'Audit log for deal detections and notifications.';
