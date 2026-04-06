alter table public.clients
  add column if not exists metadata jsonb default '{}'::jsonb;
