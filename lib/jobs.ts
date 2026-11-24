import type { Company, Job, WorkMode } from './platform.types';
import { isThaiListing } from './thaiJobs';

type Row = Record<string, unknown>;

function toCompany(row: Row): Company {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    industry: String(row.industry ?? ''),
    location: String(row.location ?? ''),
    website: row.website ? String(row.website) : null,
    description: String(row.description ?? ''),
    logo_url: row.logo_url ? String(row.logo_url) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

function toJob(row: Row): Job {
  const companyRaw = row.companies as Row | Row[] | null | undefined;
  const companyRow = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
  return {
    id: String(row.id),
    company_id: String(row.company_id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    responsibilities: Array.isArray(row.responsibilities)
      ? row.responsibilities.filter((v): v is string => typeof v === 'string')
      : [],
    location: String(row.location ?? ''),
    work_mode: (String(row.work_mode ?? 'onsite') as WorkMode),
    employment_type: String(row.employment_type ?? ''),
    required_skills: Array.isArray(row.required_skills)
      ? row.required_skills.filter((v): v is string => typeof v === 'string')
      : [],
    nice_to_have: Array.isArray(row.nice_to_have)
      ? row.nice_to_have.filter((v): v is string => typeof v === 'string')
      : [],
    career_en: row.career_en ? String(row.career_en) : null,
    career_category: row.career_category ? String(row.career_category) : null,
    salary_range: row.salary_range ? String(row.salary_range) : null,
    apply_url: row.apply_url ? String(row.apply_url) : null,
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    company: companyRow ? toCompany(companyRow) : null,
  };
}

export interface JobBoard {
  jobs: Job[];
  companies: Company[];
  source: 'db' | 'demo';
  error?: string;
}

export async function loadJobBoard(): Promise<JobBoard> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Public board is Thai-only: never surface foreign/European listings or € salaries.
    const jobs = ((data ?? []) as Row[]).map(toJob).filter(isThaiListing);
    if (jobs.length === 0) {
      return { jobs: [], companies: [], source: 'db' };
    }
    const companyMap = new Map<string, Company>();
    jobs.forEach((job) => {
      if (job.company) companyMap.set(job.company.id, job.company);
    });
    return { jobs, companies: [...companyMap.values()], source: 'db' };
  } catch (err) {
    return {
      jobs: [],
      companies: [],
      source: 'db',
      error: err instanceof Error ? err.message : 'โหลดข้อมูลงานจากฐานข้อมูลไม่สำเร็จ',
    };
  }
}

export async function listCompanies(): Promise<Company[]> {
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase.from('companies').select('*').order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toCompany);
}

export interface JobCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at?: string;
}

export async function listJobCategories(): Promise<JobCategory[]> {
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase.from('job_categories').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description ? String(row.description) : null,
    color: String(row.color ?? '#3b82f6'),
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
  }));
}

export async function listAllJobsAdmin(): Promise<{ jobs: Job[]; companies: Company[] }> {
  const { supabase } = await import('./supabaseClient');
  const [{ data: jobRows, error: jobError }, { data: companyRows, error: companyError }] = await Promise.all([
    supabase.from('jobs').select('*, companies(*)').order('created_at', { ascending: false }),
    supabase.from('companies').select('*').order('name'),
  ]);
  if (jobError) throw jobError;
  if (companyError) throw companyError;
  return {
    jobs: ((jobRows ?? []) as Row[]).map(toJob),
    companies: ((companyRows ?? []) as Row[]).map(toCompany),
  };
}

export interface NewCompanyInput {
  name: string;
  industry: string;
  location: string;
  website: string;
  description: string;
}

export async function createCompany(input: NewCompanyInput): Promise<Company> {
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: input.name.trim(),
      industry: input.industry.trim(),
      location: input.location.trim(),
      website: input.website.trim() || null,
      description: input.description.trim(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return toCompany(data as Row);
}

export async function deleteCompany(id: string): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

export interface NewJobInput {
  company_id: string;
  title: string;
  description: string;
  responsibilities: string[];
  location: string;
  work_mode: WorkMode;
  employment_type: string;
  required_skills: string[];
  nice_to_have: string[];
  career_en: string;
  career_category: string | null;
  salary_range: string | null;
  apply_url: string | null;
}

export async function createJob(input: NewJobInput): Promise<Job> {
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      company_id: input.company_id,
      title: input.title.trim(),
      description: input.description.trim(),
      responsibilities: input.responsibilities.filter(Boolean),
      location: input.location.trim(),
      work_mode: input.work_mode,
      employment_type: input.employment_type.trim(),
      required_skills: input.required_skills.filter(Boolean),
      nice_to_have: input.nice_to_have.filter(Boolean),
      career_en: input.career_en || null,
      career_category: input.career_category || null,
      salary_range: input.salary_range?.trim() || null,
      apply_url: input.apply_url?.trim() || null,
      is_active: true,
    })
    .select('*, companies(*)')
    .single();
  if (error) throw error;
  return toJob(data as Row);
}

export async function deleteJob(id: string): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}

export async function setJobActive(id: string, isActive: boolean): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  const { error } = await supabase.from('jobs').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}