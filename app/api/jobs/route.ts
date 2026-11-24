import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Company, Job, WorkMode } from '@/lib/platform.types';
import { isThaiListing } from '@/lib/thaiJobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

/** Sentinel used by the Thai location selector for remote/online work. */
const REMOTE_LOCATION = 'ทำงานออนไลน์';

interface AiInsight {
  career: string | null;
  careerEn: string | null;
  skills: string[];
}

const EMPTY_INSIGHT: AiInsight = { career: null, careerEn: null, skills: [] };

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

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

  const fallbackName = row.company_name ? String(row.company_name) : '';
  const company: Company | null = companyRow
    ? toCompany(companyRow)
    : fallbackName
      ? {
          id: row.company_id ? String(row.company_id) : `external-${String(row.id)}`,
          name: fallbackName,
          industry: 'บริษัทผู้จ้าง',
          location: String(row.location ?? ''),
          website: null,
          description: '',
        }
      : null;

  return {
    id: String(row.id),
    company_id: company ? company.id : String(row.company_id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    responsibilities: Array.isArray(row.responsibilities)
      ? row.responsibilities.filter((value): value is string => typeof value === 'string')
      : [],
    location: String(row.location ?? ''),
    work_mode: String(row.work_mode ?? 'onsite') as WorkMode,
    employment_type: String(row.employment_type ?? ''),
    required_skills: Array.isArray(row.required_skills)
      ? row.required_skills.filter((value): value is string => typeof value === 'string')
      : [],
    nice_to_have: Array.isArray(row.nice_to_have)
      ? row.nice_to_have.filter((value): value is string => typeof value === 'string')
      : [],
    career_en: row.career_en ? String(row.career_en) : null,
    career_category: row.career_category ? String(row.career_category) : null,
    salary_range: row.salary_range ? String(row.salary_range) : null,
    apply_url: row.apply_url ? String(row.apply_url) : null,
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    company,
    isDemo: false,
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    result.push(clean);
  }
  return result;
}

// Escape characters that would break PostgREST filter expressions.
function escapeFilterValue(value: string): string {
  return value.replace(/[%,()*]/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// The signed-in user's latest AI analysis (career + skills only)
// ---------------------------------------------------------------------------

async function loadAiInsight(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AiInsight> {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('career, career_en, skills')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return EMPTY_INSIGHT;

    const row = data as Row;
    const skills = Array.isArray(row.skills)
      ? row.skills.filter((skill): skill is string => typeof skill === 'string')
      : [];

    return {
      career: row.career ? String(row.career) : null,
      careerEn: row.career_en ? String(row.career_en) : null,
      skills: dedupeStrings(skills).slice(0, 24),
    };
  } catch {
    return EMPTY_INSIGHT;
  }
}

// ---------------------------------------------------------------------------
// GET: Thai-only active jobs + the caller's AI career/skills for matching
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') ?? '').trim();
    const category = (searchParams.get('category') ?? '').trim();
    const locationFilter = (searchParams.get('location') ?? '').trim();
    const workModeFilter = (searchParams.get('workMode') ?? '').trim();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    let jobsQuery = supabase
      .from('jobs')
      .select('*, companies(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(120);

    const safeQuery = escapeFilterValue(query);
    if (safeQuery) {
      jobsQuery = jobsQuery.or(
        `title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`,
      );
    }
    if (category) jobsQuery = jobsQuery.eq('career_en', category);

    // "ทำงานออนไลน์" means remote work anywhere in Thailand, not a province name.
    const wantsRemote = locationFilter === REMOTE_LOCATION;
    if (wantsRemote) {
      jobsQuery = jobsQuery.eq('work_mode', 'remote');
    } else if (locationFilter && locationFilter !== 'all') {
      jobsQuery = jobsQuery.ilike('location', `%${escapeFilterValue(locationFilter)}%`);
    }

    const effectiveWorkMode = wantsRemote ? '' : workModeFilter;
    if (
      effectiveWorkMode === 'onsite' ||
      effectiveWorkMode === 'hybrid' ||
      effectiveWorkMode === 'remote'
    ) {
      jobsQuery = jobsQuery.eq('work_mode', effectiveWorkMode);
    }

    const [jobsResult, insight] = await Promise.all([
      jobsQuery,
      user ? loadAiInsight(supabase, user.id) : Promise.resolve(EMPTY_INSIGHT),
    ]);

    const rows = Array.isArray(jobsResult.data) ? (jobsResult.data as Row[]) : [];

    // Final Thai-only guard + de-duplicate the same role/company pair.
    const seen = new Set<string>();
    const jobs: Job[] = [];
    for (const row of rows) {
      const job = toJob(row);
      if (!job.title || !isThaiListing(job)) continue;
      const key = `${job.title.toLowerCase().trim()}::${(job.company?.name ?? '').toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(job);
    }

    return NextResponse.json({
      jobs,
      userCareer: insight.career,
      userCareerEn: insight.careerEn,
      userSkills: insight.skills,
      authenticated: Boolean(user),
      source: 'db',
      query: {
        q: query,
        category,
        location: locationFilter,
        workMode: effectiveWorkMode,
      },
    });
  } catch (err) {
    console.error('Jobs API error:', err);
    return NextResponse.json(
      {
        jobs: [],
        userCareer: null,
        userCareerEn: null,
        userSkills: [],
        authenticated: false,
        source: 'db',
        error: err instanceof Error ? err.message : 'โหลดข้อมูลงานไม่สำเร็จ',
      },
      { status: 500 },
    );
  }
}
