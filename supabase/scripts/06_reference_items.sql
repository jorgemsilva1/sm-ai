create table if not exists public.client_reference_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.client_reference_groups on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  type text not null,
  title text not null,
  url text,
  notes text,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_reference_items enable row level security;

drop policy if exists "Reference items are scoped to owner" on public.client_reference_items;
create policy "Reference items are scoped to owner"
  on public.client_reference_items
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_reference_items_updated_at on public.client_reference_items;
create trigger set_reference_items_updated_at
before update on public.client_reference_items
for each row
execute procedure public.set_updated_at();
