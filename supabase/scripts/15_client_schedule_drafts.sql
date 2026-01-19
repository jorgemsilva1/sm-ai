create table if not exists public.client_schedule_drafts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  strategy_id uuid not null references public.client_strategies on delete cascade,
  name text,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Europe/Lisbon',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_schedule_drafts_client_id_idx
  on public.client_schedule_drafts (client_id);
create index if not exists client_schedule_drafts_strategy_id_idx
  on public.client_schedule_drafts (strategy_id);

alter table public.client_schedule_drafts enable row level security;

drop policy if exists "Schedule drafts are scoped to owner"
  on public.client_schedule_drafts;
create policy "Schedule drafts are scoped to owner"
  on public.client_schedule_drafts
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_schedule_drafts_updated_at on public.client_schedule_drafts;
create trigger set_client_schedule_drafts_updated_at
before update on public.client_schedule_drafts
for each row
execute procedure public.set_updated_at();

