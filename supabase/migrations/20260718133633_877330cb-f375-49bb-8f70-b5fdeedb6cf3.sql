
-- =============== ADMINS ALLOWLIST ===============
create table public.admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.admins to authenticated;
grant all on public.admins to service_role;
alter table public.admins enable row level security;

-- Security definer function to check admin without recursion
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = _user_id
  )
$$;

create policy "admins can read admins" on public.admins for select to authenticated using (public.is_admin(auth.uid()));
create policy "admins can insert admins" on public.admins for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "admins can update admins" on public.admins for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins can delete admins" on public.admins for delete to authenticated using (public.is_admin(auth.uid()));

insert into public.admins(email) values ('khushhal12196@gmail.com');

-- =============== CATEGORIES ===============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select using (true);
create policy "admins insert categories" on public.categories for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "admins update categories" on public.categories for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins delete categories" on public.categories for delete to authenticated using (public.is_admin(auth.uid()));

-- =============== PRODUCTS ===============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  price_cents int not null default 0,
  currency text not null default 'INR',
  quantity int not null default 0,
  sizes text[] not null default '{}',
  images text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read active" on public.products for select using (is_active = true);
create policy "admins read all products" on public.products for select to authenticated using (public.is_admin(auth.uid()));
create policy "admins insert products" on public.products for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "admins update products" on public.products for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins delete products" on public.products for delete to authenticated using (public.is_admin(auth.uid()));

-- =============== ORDERS ===============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address text not null,
  shipping_city text not null,
  shipping_postal text,
  shipping_country text not null default 'India',
  items jsonb not null,
  subtotal_cents int not null default 0,
  total_cents int not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "anyone can create order" on public.orders for insert with check (true);
create policy "admins update orders" on public.orders for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =============== SITE SETTINGS (singleton) ===============
create table public.site_settings (
  id int primary key default 1,
  brand_name text not null default 'khushhal''s boutique',
  logo_url text,
  hero_eyebrow text default 'Volume 04 / Issue 01',
  hero_headline text default 'The Soft Resistance',
  hero_subhead text default 'A study in structural fluidity and the tactile memory of hand-woven textiles.',
  hero_image_url text,
  marquee_items text[] not null default array['New Arrivals','Curated Selection','Limited Drop 04'],
  upcoming_title text default 'The Winter Residency',
  upcoming_body text default 'Our upcoming capsule collection explores the intersection of utilitarian durability and sculptural softness.',
  upcoming_image_url text,
  homepage_category_ids uuid[] not null default '{}',
  admin_notification_email text not null default 'khushhal12196@gmail.com',
  footer_tagline text default 'A study of enduring objects and intentional dressing.',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);
grant select on public.site_settings to anon;
grant select, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select using (true);
create policy "admins update settings" on public.site_settings for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.site_settings (id) values (1);

-- =============== SEED CATEGORIES ===============
insert into public.categories (name, slug, sort_order) values
  ('New Arrivals', 'new-arrivals', 1),
  ('Best Sellers', 'best-sellers', 2),
  ('Upcoming', 'upcoming', 3);
