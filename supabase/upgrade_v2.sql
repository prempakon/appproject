-- Supabase upgrade v2: career_category, radar_scores, and admin dynamic grouping
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
-- ปลอดภัยต่อการรันซ้ำ (create ... if not exists / add column if not exists)

-- 1) Add career_category and radar_scores columns to analysis_results
alter table public.analysis_results
  add column if not exists career_category text;

alter table public.analysis_results
  add column if not exists radar_scores jsonb not null default '{}';

create index if not exists analysis_results_career_category_idx on public.analysis_results (career_category);

-- 2) job_categories: dynamic career categories for admin grouping
create table if not exists public.job_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#3b82f6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists job_categories_name_idx on public.job_categories (name);

-- 3) jobs: add career_category reference for dynamic grouping
alter table public.jobs
  add column if not exists career_category text;

create index if not exists jobs_career_category_idx on public.jobs (career_category);

-- 4) updated_at triggers for new tables
drop trigger if exists job_categories_updated_at on public.job_categories;
create trigger job_categories_updated_at
  before update on public.job_categories
  for each row execute function public.handle_updated_at();

-- 5) RLS for job_categories
alter table public.job_categories enable row level security;

drop policy if exists "job_categories_public_read" on public.job_categories;
create policy "job_categories_public_read" on public.job_categories
  for select to anon, authenticated using (is_active = true);

drop policy if exists "job_categories_admin_write" on public.job_categories;
create policy "job_categories_admin_write" on public.job_categories
  for all to authenticated
  using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  )
  with check (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

-- 6) Grants
grant select on public.job_categories to anon, authenticated;
grant all on public.job_categories to authenticated;

-- 7) Seed default job categories (idempotent)
insert into public.job_categories (name, description, color) values
  ('เทคโนโลยีสารสนเทศ', 'งานด้านซอฟต์แวร์ ข้อมูล และระบบสารสนเทศ', '#3b82f6'),
  ('ธุรกิจและการตลาด', 'งานด้านธุรกิจ การตลาด การขาย และการบริหาร', '#10b981'),
  ('สร้างสรรค์และออกแบบ', 'งานด้านงานออกแบบ สื่อ และความคิดสร้างสรรค์', '#8b5cf6'),
  ('สาธารณสุขและการแพทย์', 'งานด้านสาธารณสุข การแพทย์ และการดูแลสุขภาพ', '#ef4444'),
  ('การศึกษา', 'งานด้านการศึกษา การสอน และการฝึกอบรม', '#f59e0b'),
  ('การเงินและบัญชี', 'งานด้านการเงิน บัญชี และการเงินการธนาคาร', '#06b6d4'),
  ('วิศวกรรม', 'งานด้านวิศวกรรมและเทคนิค', '#84cc16'),
  ('อื่นๆ', 'อาชีพอื่นที่ไม่จัดอยู่ในหมวดหมู่ข้างต้น', '#6b7280')
on conflict (name) do nothing;

-- 8) RLS for base tables - strict policies
-- profiles: owner can read/update own; admin can read all
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_select_all_auth" on public.profiles;
create policy "profiles_select_all_auth" on public.profiles
  for select to authenticated using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- portfolios: owner CRUD; admin read only
drop policy if exists "portfolios_select_own" on public.portfolios;
create policy "portfolios_select_own" on public.portfolios
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "portfolios_select_admin" on public.portfolios;
create policy "portfolios_select_admin" on public.portfolios
  for select to authenticated using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own" on public.portfolios
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own" on public.portfolios
  for delete to authenticated using (auth.uid() = user_id);

-- analysis_results: owner CRUD; admin read only
drop policy if exists "analysis_select_own" on public.analysis_results;
create policy "analysis_select_own" on public.analysis_results
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "analysis_select_admin" on public.analysis_results;
create policy "analysis_select_admin" on public.analysis_results
  for select to authenticated using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

drop policy if exists "analysis_insert_own" on public.analysis_results;
create policy "analysis_insert_own" on public.analysis_results
  for insert to authenticated with check (auth.uid() = user_id);
