create table if not exists public.client_personas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  owner_id uuid references auth.users not null,
  name text not null,
  role_title text,
  demographics text,
  goals text,
  pain_points text,
  motivations text,
  channels text,
  content_preferences text,
  objections text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_personas enable row level security;

drop policy if exists "Personas are scoped to owner" on public.client_personas;
create policy "Personas are scoped to owner"
  on public.client_personas
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_client_personas_updated_at on public.client_personas;
create trigger set_client_personas_updated_at
before update on public.client_personas
for each row
execute procedure public.set_updated_at();
