alter table public.clients
add column if not exists timezone text not null default 'Europe/Lisbon';

alter table public.clients
add column if not exists default_locale text not null default 'pt';

