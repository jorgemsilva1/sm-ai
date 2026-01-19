create table if not exists public.client_social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  provider text not null, -- instagram|facebook|tiktok|linkedin|youtube|x
  provider_account_id text,
  username text,
  display_name text,
  profile_url text,
  avatar_url text,
  scopes text[] not null default '{}',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  token_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, provider, provider_account_id)
);

alter table public.client_social_accounts enable row level security;

drop policy if exists "Social accounts are scoped to owner" on public.client_social_accounts;
create policy "Social accounts are scoped to owner"
  on public.client_social_accounts
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_social_accounts_updated_at on public.client_social_accounts;
create trigger set_client_social_accounts_updated_at
before update on public.client_social_accounts
for each row
execute procedure public.set_updated_at();

