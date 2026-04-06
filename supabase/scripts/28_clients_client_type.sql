alter table public.clients
  add column if not exists client_type text check (client_type in ('services', 'content_creator')) default 'services';
