create table if not exists public.client_competitors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  name text not null,
  website text,
  instagram text,
  tiktok text,
  facebook text,
  youtube text,
  linkedin text,
  x text,
  notes text,
  swot_strengths text,
  swot_weaknesses text,
  swot_opportunities text,
  swot_threats text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_competitors_client_id_idx
  on public.client_competitors (client_id);

alter table public.client_competitors enable row level security;

drop policy if exists "Competitors are scoped to owner"
  on public.client_competitors;
create policy "Competitors are scoped to owner"
  on public.client_competitors
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_competitors_updated_at on public.client_competitors;
create trigger set_client_competitors_updated_at
before update on public.client_competitors
for each row
execute procedure public.set_updated_at();

