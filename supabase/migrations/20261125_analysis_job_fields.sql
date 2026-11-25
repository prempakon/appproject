-- Persist AI-derived job-search fields so recommendations and the
-- duplicate-run guard survive across sessions and history reloads.

alter table public.analysis_results
  add column if not exists recommended_role text;

alter table public.analysis_results
  add column if not exists job_keywords text[];
