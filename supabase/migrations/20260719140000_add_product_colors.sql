alter table public.products
add column colors text[] not null default '{}';
