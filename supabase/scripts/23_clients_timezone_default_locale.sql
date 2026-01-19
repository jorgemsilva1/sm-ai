alter table public.clients
add column if not exists timezone text not null default 'GMT+00:00';

alter table public.clients
add column if not exists default_locale text not null default 'pt';

