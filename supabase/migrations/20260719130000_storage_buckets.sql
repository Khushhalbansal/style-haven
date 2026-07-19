-- Ensure buckets exist
insert into storage.buckets (id, name, public)
values 
  ('product-images', 'product-images', true),
  ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Add RLS policies for storage.objects if they don't exist
create policy "Public Access" on storage.objects for select using (true);
create policy "Authenticated Upload" on storage.objects for insert with check (auth.role() = 'authenticated');
create policy "Authenticated Update" on storage.objects for update using (auth.role() = 'authenticated');
create policy "Authenticated Delete" on storage.objects for delete using (auth.role() = 'authenticated');
