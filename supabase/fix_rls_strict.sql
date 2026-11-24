-- ============================================================
-- Fix Strict RLS Policies (auth.uid() = user_id)
-- ============================================================
-- วัตถุประสงค์: บังคับให้ทุกตารางส่วนตัวมี RLS policy ครอบคลุม
-- ให้แน่ใจว่า unauthenticated users อ่านไม่ได้ และ users อ่านได้เฉพาะข้อมูลของตัวเองเท่านั้น
-- รันซ้ำได้ปลอดภัย (idempotent) — รันหลังจาก add_career_platform.sql
-- ============================================================

-- ----------------------------------------------------------
-- 1. profiles table — ให้แค่เจ้าของโปรไฟล์อ่านได้
-- ----------------------------------------------------------
drop policy if exists "profiles_user_select" on public.profiles;
create policy "profiles_user_select" on public.profiles
  for select to anon, authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (email LIKE '%@admin.com');

-- ----------------------------------------------------------
-- 2. analysis_results table — ให้แค่เจ้าของวิเคราะห์อ่านได้
-- ----------------------------------------------------------
drop policy if exists "analysis_results_user_select" on public.analysis_results;
create policy "analysis_results_user_select" on public.analysis_results
  for select to anon, authenticated
  using (auth.uid() = user_id);

drop policy if exists "analysis_results_admin_all" on public.analysis_results;
create policy "analysis_results_admin_all" on public.analysis_results
  for all to authenticated
  using (email LIKE '%@admin.com');

-- ----------------------------------------------------------
-- 3. portfolios table — ให้แค่เจ้าของพอร์ตโฟลิโ�อ่าน/เขียนได้
-- ----------------------------------------------------------
drop policy if exists "portfolios_user_select" on public.portfolios;
create policy "portfolios_user_select" on public.portfolios
  for select to anon, authenticated
  using (auth.uid() = user_id);

drop policy if exists "portfolios_user_insert" on public.portfolios;
create policy "portfolios_user_insert" on public.portfolios
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_user_update" on public.portfolios;
create policy "portfolios_user_update" on public.portfolios
  for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "portfolios_admin_all" on public.portfolios;
create policy "portfolios_admin_all" on public.portfolios
  for all to authenticated
  using (email LIKE '%@admin.com');

-- ----------------------------------------------------------
-- 4. jobs table — ปรับปรุงให้มี policy สำหรับ apply_url
-- ----------------------------------------------------------
drop policy if exists "jobs_public_read_apply_url" on public.jobs;
create policy "jobs_public_read_apply_url" on public.jobs
  for select to anon, authenticated
  using (is_active = true);

-- ----------------------------------------------------------
-- 5. Grants — ให้สิทธิ์อ่านสำหรับ anon/authenticated
-- ----------------------------------------------------------
grant select on public.profiles to anon, authenticated;
grant select on public.analysis_results to anon, authenticated;
grant select on public.portfolios to anon, authenticated;

-- ----------------------------------------------------------
-- หมายเหตุ:
-- - นโยบายข้างต้นบังคับใช้ auth.uid() = user_id/owner_id
-- - ผู้ใช้ทั่วไป (anon) สามารถอ่านข้อมูลที่เปิดรับเท่านั้น
-- - แอดมิน (อีเมลลง @admin.com) มีสิทธิ์ complete access
-- - รันคำสั่งนี้ซ้ำได้ปลอดภัย (idempotent)
-- ============================================================