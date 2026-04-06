alter table public.clients
  add column if not exists crawler_settings jsonb;

