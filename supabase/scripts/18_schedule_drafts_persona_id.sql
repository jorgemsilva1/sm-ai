alter table public.client_schedule_drafts
  add column if not exists persona_id uuid references public.client_personas on delete set null;

