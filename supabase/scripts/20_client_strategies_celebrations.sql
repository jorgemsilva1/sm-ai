alter table public.client_strategies
  add column if not exists use_celebration_dates boolean not null default true;

