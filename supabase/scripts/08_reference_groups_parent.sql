alter table public.client_reference_groups
  add column if not exists parent_id uuid references public.client_reference_groups on delete cascade;
