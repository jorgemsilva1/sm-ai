-- Storage policies for reference assets bucket
-- Bucket must exist and be public: reference-assets

create policy "Reference assets are readable"
  on storage.objects
  for select
  using (bucket_id = 'reference-assets');

create policy "Reference assets are insertable by authenticated users"
  on storage.objects
  for insert
  with check (bucket_id = 'reference-assets' and auth.uid() is not null);

create policy "Reference assets are updatable by authenticated users"
  on storage.objects
  for update
  using (bucket_id = 'reference-assets' and auth.uid() is not null)
  with check (bucket_id = 'reference-assets' and auth.uid() is not null);

create policy "Reference assets are deletable by authenticated users"
  on storage.objects
  for delete
  using (bucket_id = 'reference-assets' and auth.uid() is not null);
