alter table public.client_personas
  add column if not exists gender text,
  add column if not exists style_preferences text,
  add column if not exists location_place_id text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;
