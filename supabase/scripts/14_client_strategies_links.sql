alter table public.client_strategies
  add column if not exists competitor_ids uuid[] not null default '{}',
  add column if not exists reference_group_ids uuid[] not null default '{}';

