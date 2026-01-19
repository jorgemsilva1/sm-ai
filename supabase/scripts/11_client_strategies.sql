create table if not exists public.client_strategies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  title text not null,
  status text,
  objectives text,
  audience text,
  positioning text,
  key_messages text,
  content_pillars text,
  formats text,
  channels text,
  cadence text,
  kpis text,
  guardrails text,
  ai_notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_strategies_active
  on public.client_strategies (client_id)
  where is_active;

alter table public.client_strategies enable row level security;

drop policy if exists "Client strategies are scoped to owner"
  on public.client_strategies;
create policy "Client strategies are scoped to owner"
  on public.client_strategies
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_strategies_updated_at on public.client_strategies;
create trigger set_client_strategies_updated_at
before update on public.client_strategies
for each row
execute procedure public.set_updated_at();
