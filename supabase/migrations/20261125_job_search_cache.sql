-- 20261125_job_search_cache.sql
-- Cache for broad-coverage external job searches (Google Jobs engine).
-- Only authenticated users may read/write the cache; results are shared.

create table if not exists public.job_search_cache (
  id uuid primary key default gen_random_uuid(),
  query_key text unique not null,
  jobs_payload jsonb not null default '[]'::jsonb,
  source text not null default 'live_api',
  updated_at timestamptz not null default now()
);

alter table public.job_search_cache enable row level security;

-- Policies are re-created so this migration is safe to run more than once.
drop policy if exists "Authenticated users can read job cache" on public.job_search_cache;
create policy "Authenticated users can read job cache"
  on public.job_search_cache for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can upsert job cache" on public.job_search_cache;
create policy "Authenticated users can upsert job cache"
  on public.job_search_cache for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update job cache" on public.job_search_cache;
create policy "Authenticated users can update job cache"
  on public.job_search_cache for update
  to authenticated
  using (true)
  with check (true);
