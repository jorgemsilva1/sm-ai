create table if not exists public.client_posting_patterns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  platform text not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6), -- 0 = Sunday
  hour integer not null check (hour >= 0 and hour <= 23),
  engagement_score numeric, -- Calculated from historical performance
  post_count integer not null default 0,
  last_updated timestamptz not null default now(),
  unique (client_id, platform, day_of_week, hour)
);

create index if not exists idx_client_posting_patterns_client_platform 
  on public.client_posting_patterns(client_id, platform);

alter table public.client_posting_patterns enable row level security;

drop policy if exists "Posting patterns are scoped to owner" on public.client_posting_patterns;
create policy "Posting patterns are scoped to owner"
  on public.client_posting_patterns
  for all
  using (
    exists (
      select 1 from public.clients
      where clients.id = client_posting_patterns.client_id
      and clients.owner_id = auth.uid()
    )
  );
