-- Portfolio System / LRU — initial schema (additive, safe to run multiple times)
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
-- ไม่แตะโค้ดเดิมใน app/* ใดๆ รันเฉพาะฝั่ง DB

-- 1) profiles: ตรงกับ shape ใน localStorage userProfile ปัจจุบัน
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  name text not null default 'นักศึกษา LRU',
  avatar_url text,
  institution text not null default 'มหาวิทยาลัยราชภัฏเลย',
  major text default '-',
  bio text default 'ยังไม่ได้กรอก',
  github_link text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) portfolios: ไฟล์งานของนักศึกษา (ตัวจริงจะเก็บไฟล์ใน Storage bucket `portfolios`)
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text not null default 'JPG',
  file_size int,
  created_at timestamptz not null default now()
);
create index if not exists portfolios_user_id_idx on public.portfolios (user_id);

-- 3) analysis_results: ผลวิเคราะห์ AI ต่อ 1 portfolio (ตอนนี้ frontend mock 85% / 8 ทักษะ)
create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  skills text[] not null default '{}',
  career text,
  accuracy int not null default 85,
  technical int not null default 90,
  soft int not null default 65,
  management int not null default 50,
  recommendations jsonb not null default '[]',
  analyzed_at timestamptz not null default now()
);
create index if not exists analysis_results_user_id_idx on public.analysis_results (user_id);
create index if not exists analysis_results_portfolio_id_idx on public.analysis_results (portfolio_id);

-- 4) updated_at auto-touch
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.analysis_results enable row level security;

-- profiles: เจ้าของดู/แก้ของตัวเองได้, admin ดูทั้งหมด (ผ่าน role ใน JWT ไม่ได้ — เช็คผ่านตาราง, ขั้นต้นให้ authenticated อ่านของตัวเอง)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- portfolios: เจ้าของ CRUD ของตัวเอง
drop policy if exists "portfolios_select_own" on public.portfolios;
create policy "portfolios_select_own" on public.portfolios
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own" on public.portfolios
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own" on public.portfolios
  for delete to authenticated using (auth.uid() = user_id);

-- analysis_results: เจ้าของอ่านของตัวเอง (เขียนผ่าน service_role / edge function ในอนาคต)
drop policy if exists "analysis_select_own" on public.analysis_results;
create policy "analysis_select_own" on public.analysis_results
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "analysis_insert_own" on public.analysis_results;
create policy "analysis_insert_own" on public.analysis_results
  for insert to authenticated with check (auth.uid() = user_id);

-- 6) Storage buckets (รันใน SQL ได้เลย)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolios', 'portfolios', true)
on conflict (id) do nothing;

-- Storage policies: ทุกคนอ่านได้ (ต้นแบบ), เขียนเฉพาะ authenticated
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_write" on storage.objects;
create policy "avatars_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "portfolios_public_read" on storage.objects;
create policy "portfolios_public_read" on storage.objects
  for select using (bucket_id = 'portfolios');

drop policy if exists "portfolios_auth_write" on storage.objects;
create policy "portfolios_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolios');
