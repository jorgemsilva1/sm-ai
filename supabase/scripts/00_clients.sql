create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  focus_area text,
  website text,
  description text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  audience text,
  tone text,
  references_text text,
  goals text,
  brand_values text,
  updated_at timestamptz not null default now(),
  unique (client_id)
);

alter table public.clients enable row level security;
alter table public.client_profiles enable row level security;

drop policy if exists "Clients are scoped to owner" on public.clients;
create policy "Clients are scoped to owner"
  on public.clients
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Profiles are scoped to owner" on public.client_profiles;
create policy "Profiles are scoped to owner"
  on public.client_profiles
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_client_profiles_updated_at on public.client_profiles;
create trigger set_client_profiles_updated_at
before update on public.client_profiles
for each row
execute procedure public.set_updated_at();
