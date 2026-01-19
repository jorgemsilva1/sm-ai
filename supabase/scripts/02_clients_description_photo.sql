alter table public.clients
  add column if not exists description text,
  add column if not exists photo_url text;
