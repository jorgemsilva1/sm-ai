alter table public.client_competitors
  add column if not exists ai_profile jsonb,
  add column if not exists ai_profile_sources jsonb,
  add column if not exists ai_profile_crawl jsonb,
  add column if not exists ai_profile_status text not null default 'idle',
  add column if not exists ai_profile_error text,
  add column if not exists ai_profile_updated_at timestamptz;

