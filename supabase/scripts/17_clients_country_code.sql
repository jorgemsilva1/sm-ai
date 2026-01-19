alter table public.clients
  add column if not exists country_code text not null default 'PT';

