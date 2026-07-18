
-- Lock down is_admin execute
revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

-- Tighten orders insert
drop policy "anyone can create order" on public.orders;
create policy "anyone can create order" on public.orders
for insert
with check (
  length(coalesce(customer_email, '')) > 3
  and length(coalesce(customer_name, '')) > 0
  and length(coalesce(shipping_address, '')) > 0
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) > 0
  and total_cents >= 0
);

-- Storage policies for product-images and site-assets buckets
create policy "public read product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "admins upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "public read site assets"
on storage.objects for select
using (bucket_id = 'site-assets');

create policy "admins upload site assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

create policy "admins update site assets"
on storage.objects for update
to authenticated
using (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

create policy "admins delete site assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-assets' and public.is_admin(auth.uid()));
