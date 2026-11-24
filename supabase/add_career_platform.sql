-- Career platform tables: companies, jobs, resumes
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
-- ปลอดภัยต่อการรันซ้ำ (create ... if not exists / drop policy if exists)
-- ไม่มีตารางหรือคอลัมน์เกี่ยวกับการชำระเงิน

-- 1) companies: บริษัทในเครือข่ายหลักสูตร
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default '',
  location text not null default '',
  website text,
  description text not null default '',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_name_idx on public.companies (name);

-- 2) jobs: ประกาศรับสมัครงาน
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text not null default '',
  responsibilities text[] not null default '{}',
  location text not null default '',
  work_mode text not null default 'onsite' check (work_mode in ('onsite', 'hybrid', 'remote')),
  employment_type text not null default 'พนักงานประจำ',
  required_skills text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  career_en text,
  salary_range text,
  apply_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_company_id_idx on public.jobs (company_id);
create index if not exists jobs_active_idx on public.jobs (is_active);
create index if not exists jobs_career_en_idx on public.jobs (career_en);

-- 3) resumes: เรซูเม่ที่แชร์ผ่าน QR Code / ลิงก์สาธารณะ
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  data jsonb not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_slug_idx on public.resumes (slug);

-- 4) updated_at auto-touch
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.handle_updated_at();

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.handle_updated_at();

drop trigger if exists resumes_updated_at on public.resumes;
create trigger resumes_updated_at
  before update on public.resumes
  for each row execute function public.handle_updated_at();

-- 5) RLS — security hardened
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.resumes enable row level security;

-- companies/jobs: สาธารณะอ่านได้เฉพาะงานที่เปิดรับ (anon + authenticated)
drop policy if exists "companies_public_read" on public.companies;
create policy "companies_public_read" on public.companies
  for select to anon, authenticated using (true);

drop policy if exists "jobs_public_read" on public.jobs;
create policy "jobs_public_read" on public.jobs
  for select to anon, authenticated using (is_active = true);

-- เขียน/แก้ไข/ลบ companies: เฉพาะ admin role เท่านั้น (ผ่าน JWT claim หรือ email pattern)
drop policy if exists "companies_admin_write" on public.companies;
create policy "companies_admin_write" on public.companies
  for all to authenticated
  using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  )
  with check (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

drop policy if exists "jobs_admin_write" on public.jobs;
create policy "jobs_admin_write" on public.jobs
  for all to authenticated
  using (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  )
  with check (
    (auth.jwt() ->> 'email') ILIKE '%@admin.com'
    OR (auth.jwt() ->> 'email') IN ('admin@lru.ac.th', 'superadmin@lru.ac.th')
  );

-- resumes: เจ้าของอ่าน/เขียนของตัวเองเท่านั้น
drop policy if exists "resumes_public_read" on public.resumes;
create policy "resumes_public_read" on public.resumes
  for select to anon, authenticated using (is_public = true);

drop policy if exists "resumes_owner_read" on public.resumes;
create policy "resumes_owner_read" on public.resumes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "resumes_owner_insert" on public.resumes;
create policy "resumes_owner_insert" on public.resumes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "resumes_owner_update" on public.resumes;
create policy "resumes_owner_update" on public.resumes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "resumes_owner_delete" on public.resumes;
create policy "resumes_owner_delete" on public.resumes
  for delete to authenticated using (auth.uid() = user_id);

-- 6) Grants
grant select on public.companies to anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant select on public.resumes to anon, authenticated;
grant all on public.companies to authenticated;
grant all on public.jobs to authenticated;
grant all on public.resumes to authenticated;

-- 7) ตัวอย่างข้อมูลเริ่มต้น (ไม่บังคับ)
-- insert into public.companies (name, industry, location, website, description) values
--   ('Nova Software Studio', 'Software & Product', 'ขอนแก่น', 'https://example.com/nova',
--    'ทีมพัฒนาซอฟต์แวร์และผลิตภัณฑ์ดิจิทัลสำหรับธุรกิจในภาคอีสาน')
-- on conflict do nothing;
