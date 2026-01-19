alter table public.client_strategies
  add column if not exists persona_id uuid references public.client_personas on delete set null;

