alter table public.client_personas
  add column if not exists avatar_color text,
  add column if not exists age_range text,
  add column if not exists location text;
