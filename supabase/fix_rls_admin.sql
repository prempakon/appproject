-- รันครั้งเดียวใน SQL Editor เพื่อให้แอดมินดึงข้อมูลจริงได้
-- ของเดิม select-own อย่างเดียวทำให้หน้า /admin เจอ 0 แถว

-- profiles: authenticated อ่านทั้งหมดได้ (ต้นแบบ; ถ้าต้องการเข้มค่อยเปลี่ยนเป็นเช็ค role=admin)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_all_auth" on public.profiles;
create policy "profiles_select_all_auth" on public.profiles
  for select to authenticated using (true);

-- portfolios: authenticated อ่านทั้งหมดได้ (แอดมินนับไฟล์/ดูผลงาน)
drop policy if exists "portfolios_select_own" on public.portfolios;
drop policy if exists "portfolios_select_all_auth" on public.portfolios;
create policy "portfolios_select_all_auth" on public.portfolios
  for select to authenticated using (true);

-- analysis_results: authenticated อ่านทั้งหมดได้ (แอดมินดูสายอาชีพ/ทักษะรวม)
drop policy if exists "analysis_select_own" on public.analysis_results;
drop policy if exists "analysis_select_all_auth" on public.analysis_results;
create policy "analysis_select_all_auth" on public.analysis_results
  for select to authenticated using (true);

-- profiles: authenticated แก้ไข/ลบได้ทั้งหมด (แอดมินจัดการข้อมูลนักศึกษา; ต้นแบบ)
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_all_auth" on public.profiles;
create policy "profiles_update_all_auth" on public.profiles
  for update to authenticated using (true) with check (true);

drop policy if exists "profiles_delete_all_auth" on public.profiles;
create policy "profiles_delete_all_auth" on public.profiles
  for delete to authenticated using (true);
