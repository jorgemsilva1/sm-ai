create table if not exists public.client_reference_groups (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.client_reference_groups on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  name text not null,
  description text,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_reference_groups enable row level security;

drop policy if exists "Reference groups are scoped to owner" on public.client_reference_groups;
create policy "Reference groups are scoped to owner"
  on public.client_reference_groups
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_reference_groups_updated_at on public.client_reference_groups;
create trigger set_reference_groups_updated_at
before update on public.client_reference_groups
for each row
execute procedure public.set_updated_at();
