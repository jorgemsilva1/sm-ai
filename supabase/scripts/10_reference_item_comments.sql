create table if not exists public.client_reference_item_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.client_reference_items on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.client_reference_item_comments enable row level security;

drop policy if exists "Reference item comments are scoped to owner"
  on public.client_reference_item_comments;
create policy "Reference item comments are scoped to owner"
  on public.client_reference_item_comments
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
