alter table public.client_competitors
  add column if not exists ai_profile_progress int not null default 0,
  add column if not exists ai_profile_stage text,
  add column if not exists ai_profile_started_at timestamptz;

