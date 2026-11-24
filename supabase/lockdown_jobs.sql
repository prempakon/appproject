-- Lock down job posting: regular users must never create job listings.
-- The /jobs page is a recommendation + external-apply hub only.
-- Run after supabase/add_community_jobs.sql if that file was ever applied.
-- Safe to re-run (drop policy if exists).
--
-- Keeps:
--   jobs_public_read  -> anyone can read active jobs
--   jobs_admin_write  -> admin job CRUD in /admin/jobs still works
--
-- Removes:
--   jobs_authenticated_insert
--   jobs_owner_update
--   jobs_owner_delete

drop policy if exists "jobs_authenticated_insert" on public.jobs;
drop policy if exists "jobs_owner_update" on public.jobs;
drop policy if exists "jobs_owner_delete" on public.jobs;

-- Verify with:
--   select policyname, cmd, roles from pg_policies where tablename = 'jobs';
-- Expected remaining policies: jobs_public_read (SELECT) and jobs_admin_write (ALL).
