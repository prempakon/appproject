-- ให้เจ้าของลบไฟล์ในโฟลเดอร์ตัวเองได้ (path ขึ้นต้นด้วย user id)
drop policy if exists "avatars_auth_delete_own" on storage.objects;
create policy "avatars_auth_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolios_auth_delete_own" on storage.objects;
create policy "portfolios_auth_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text
  );
