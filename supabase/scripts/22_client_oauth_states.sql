create table if not exists public.client_oauth_states (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  provider text not null,
  state text not null unique,
  code_verifier text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.client_oauth_states enable row level security;

drop policy if exists "OAuth states are scoped to owner" on public.client_oauth_states;
create policy "OAuth states are scoped to owner"
  on public.client_oauth_states
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

