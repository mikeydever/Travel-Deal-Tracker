-- Travel Deal Tracker – Seed Data
-- Usage: psql $DATABASE_URL -f supabase/migrations/0001_core_schema.sql
--        psql $DATABASE_URL -f supabase/seeds/seed_data.sql

insert into public.flight_prices (origin, destination, depart_date, return_date, price, currency, checked_at, metadata)
values
    ('YVR', 'BKK', '2025-10-28', '2025-11-18', 1325.00, 'CAD', now() - interval '2 day', jsonb_build_object('carrier', 'CX', 'fare_class', 'Economy Light')),
    ('YVR', 'BKK', '2025-10-28', '2025-11-18', 1210.00, 'CAD', now() - interval '1 day', jsonb_build_object('carrier', 'JAL', 'fare_class', 'Economy')),
    ('YVR', 'BKK', '2025-10-28', '2025-11-18', 1184.00, 'CAD', now(), jsonb_build_object('carrier', 'EVA', 'fare_class', 'Economy Flex'))
on conflict do nothing;

insert into public.hotel_prices (city, avg_price, currency, checked_at, metadata)
values
    ('Bangkok', 154.00, 'CAD', now() - interval '2 day', jsonb_build_object('sample_size', 112)),
    ('Chiang Mai', 102.00, 'CAD', now() - interval '2 day', jsonb_build_object('sample_size', 74)),
    ('Phuket', 189.00, 'CAD', now() - interval '2 day', jsonb_build_object('sample_size', 88)),
    ('Krabi', 165.00, 'CAD', now() - interval '2 day', jsonb_build_object('sample_size', 45)),
    ('Koh Samui', 213.00, 'CAD', now() - interval '2 day', jsonb_build_object('sample_size', 51)),
    ('Bangkok', 148.00, 'CAD', now() - interval '1 day', jsonb_build_object('sample_size', 120)),
    ('Chiang Mai', 97.00, 'CAD', now() - interval '1 day', jsonb_build_object('sample_size', 70)),
    ('Phuket', 201.00, 'CAD', now() - interval '1 day', jsonb_build_object('sample_size', 90)),
    ('Bangkok', 142.00, 'CAD', now(), jsonb_build_object('sample_size', 126)),
    ('Chiang Mai', 95.00, 'CAD', now(), jsonb_build_object('sample_size', 79))
on conflict do nothing;

insert into public.events (name, location, start_date, end_date, notes)
values
    ('Loy Krathong', 'Bangkok', '2025-11-05', '2025-11-09', 'Nation-wide lantern festival; expect riverfront hotel demand.'),
    ('Yi Peng Lantern Festival', 'Chiang Mai', '2025-11-06', '2025-11-08', 'High demand for Chiang Mai core; monitor hotel surge.'),
    ('Vegetarian Festival', 'Phuket', '2025-10-20', '2025-10-28', 'Peaks before departure window but still impacts October rates.')
on conflict do nothing;

insert into public.alerts_log (type, message, triggered_at, reference_type, metadata)
values
    ('flight_drop', 'Fare dropped 15% vs 30-day average for YVR→BKK Oct 28 departure.', now() - interval '1 day', 'flight_prices', jsonb_build_object('threshold', 0.15)),
    ('hotel_low', 'Bangkok hotels reached a new low average nightly rate.', now(), 'hotel_prices', jsonb_build_object('city', 'Bangkok'))
on conflict do nothing;
