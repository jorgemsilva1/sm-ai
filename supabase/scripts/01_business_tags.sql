create table if not exists public.business_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.client_business_tags (
  client_id uuid not null references public.clients on delete cascade,
  tag_id uuid not null references public.business_tags on delete cascade,
  owner_id uuid references auth.users not null,
  created_at timestamptz not null default now(),
  primary key (client_id, tag_id)
);

alter table public.business_tags enable row level security;
alter table public.client_business_tags enable row level security;

drop policy if exists "Business tags are readable" on public.business_tags;
create policy "Business tags are readable"
  on public.business_tags
  for select
  using (auth.uid() is not null);

drop policy if exists "Client tags are scoped to owner" on public.client_business_tags;
create policy "Client tags are scoped to owner"
  on public.client_business_tags
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
