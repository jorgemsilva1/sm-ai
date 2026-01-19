create table if not exists public.client_schedule_items (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.client_schedule_drafts on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  strategy_id uuid not null references public.client_strategies on delete cascade,
  scheduled_at timestamptz not null,
  platform text not null,
  format text not null,
  title text not null,
  caption text not null,
  assets jsonb not null default '[]'::jsonb,
  rationale jsonb not null default '[]'::jsonb,
  status text not null default 'suggested',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_schedule_items_client_id_idx
  on public.client_schedule_items (client_id);
create index if not exists client_schedule_items_draft_id_idx
  on public.client_schedule_items (draft_id);
create index if not exists client_schedule_items_scheduled_at_idx
  on public.client_schedule_items (scheduled_at);

alter table public.client_schedule_items enable row level security;

drop policy if exists "Schedule items are scoped to owner"
  on public.client_schedule_items;
create policy "Schedule items are scoped to owner"
  on public.client_schedule_items
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_schedule_items_updated_at on public.client_schedule_items;
create trigger set_client_schedule_items_updated_at
before update on public.client_schedule_items
for each row
execute procedure public.set_updated_at();

