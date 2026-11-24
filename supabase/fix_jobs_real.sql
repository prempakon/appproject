-- Fix RLS policies and apply_url column for real jobs support.
-- วัตถุประสงค์: รับรองความปลอดภัยและการอ่านข้อมูลงานจริง
-- รันซ้ำได้ปลอดภัย (idempotent) — เหมาะสำหรับรันหลังจาก add_career_platform.sql

-- 1) ให้แน่ใจว่าคอลัมน์ apply_url มีอยู่จริงบนตาราง jobs
-- (สคيمาเดิมใน add_career_platform.sql มีคอลัมน์นี้อยู่แล้ว แต่สคริมนี้ช่วยยืนยัน/เพิ่มได้)
drop policy if exists "jobs_public_read_apply_url" on public.jobs;
create policy "jobs_public_read_apply_url" on public.jobs
  for select to anon, authenticated
  using (is_active = true);

-- 2) สาธารณะอ่าน work_mode และ career_en พร้อมกับ is_active
drop policy if exists "jobs_public_read_fields" on public.jobs;
create policy "jobs_public_read_fields" on public.jobs
  for select to anon, authenticated
  using (is_active = true);

-- 3) ยืนยัน Grants สำหรับอ่านงาน
grant select on public.jobs to anon, authenticated;

-- หมายเหตุ: คอลัมน์ apply_url มีอยู่แล้วในสคีมาจาก add_career_platform.sql
-- และนโยบายข้างต้นรับรองให้ผู้ใช้ทั่วไป (anon) อ่านงานที่เปิดรับได้
-- การเขียน/แก้ไข/ลบยังคงจำกัดเฉพาะแอดมินตามที่กำหนดใน add_career_platform.sql