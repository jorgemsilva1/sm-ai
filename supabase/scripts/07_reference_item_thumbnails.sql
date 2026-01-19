alter table public.client_reference_items
  add column if not exists thumbnail_url text;
