-- Community job & freelance board
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
-- ปลอดภัยต่อการรันซ้ำ (add column if not exists / drop policy if exists)
-- ไม่มีระบบชำระเงินใดๆ

-- 1) รองรับประกาศจากผู้ใช้ทั่วไป (ไม่ต้องมีบริษัทในตาราง companies)
alter table public.jobs add column if not exists company_name text;
alter table public.jobs add column if not exists posted_by uuid references auth.users (id) on delete set null;
alter table public.jobs alter column company_id drop not null;

create index if not exists jobs_posted_by_idx on public.jobs (posted_by);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

-- 2) ให้ผู้ใช้ที่เข้าสู่ระบบแล้วประกาศงาน/โปรเจกต์ได้
drop policy if exists "jobs_authenticated_insert" on public.jobs;
create policy "jobs_authenticated_insert" on public.jobs
  for insert to authenticated
  with check (posted_by is null or posted_by = auth.uid());

-- 3) เจ้าของประกาศลบประกาศของตัวเองได้
drop policy if exists "jobs_owner_delete" on public.jobs;
create policy "jobs_owner_delete" on public.jobs
  for delete to authenticated
  using (posted_by = auth.uid());

-- 4) เจ้าของประกาศแก้ไขประกาศของตัวเองได้
drop policy if exists "jobs_owner_update" on public.jobs;
create policy "jobs_owner_update" on public.jobs
  for update to authenticated
  using (posted_by = auth.uid())
  with check (posted_by = auth.uid());

-- หมายเหตุ: policy เดิม "jobs_admin_write" และ "jobs_public_read" ยังคงทำงานอยู่
-- (policy แบบ permissive หลายตัวจะรวมกันด้วย OR)
