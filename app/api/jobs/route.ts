import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Company, Job, WorkMode } from '@/lib/platform.types';
import { isThaiListing } from '@/lib/thaiJobs';
import {
  buildFallbackLinks,
  buildQueryKey,
  extractJobSkills,
  normalizeJobLevel,
  resolveJobKeywords,
  sanitizeJobQuery,
  type JobLevel,
} from '@/lib/jobSearch';
import { CAREER_OPTIONS } from '@/lib/careers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

/** Sentinel used by the Thai location selector for remote/online work. */
const REMOTE_LOCATION = 'ทำงานออนไลน์';

interface AiInsight {
  career: string | null;
  careerEn: string | null;
  recommendedRole: string | null;
  skills: string[];
}

const EMPTY_INSIGHT: AiInsight = { career: null, careerEn: null, recommendedRole: null, skills: [] };

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

// Convert a live external posting into the shared Job shape so the board can
// score it with the same % Match pipeline as Supabase rows.
function externalToJob(e: ExternalJob, insight: AiInsight): Job {
  const remote = /remote|รีโมท|work from home|online|distributed/i.test(
    `${e.employment_type} ${e.location} ${e.title}`,
  );
  const companyId = `ext-${e.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'}`;
  return {
    id: `ext-${e.job_id}`,
    company_id: companyId,
    title: e.title,
    description: e.description ?? '',
    responsibilities: [],
    location: e.location,
    work_mode: remote ? 'remote' : 'onsite',
    employment_type: e.employment_type,
    required_skills: e.skills ?? [],
    nice_to_have: [],
    career_en: insight.careerEn,
    career_category: null,
    salary_range: e.salary,
    apply_url: e.apply_link || null,
    is_active: true,
    created_at: e.posted_at || undefined,
    company: {
      id: companyId,
      name: e.company,
      industry: '',
      location: e.location,
      website: null,
      description: '',
    },
    source: 'live-api',
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
      .select('*')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return EMPTY_INSIGHT;

    const row = data as Row;
    const skills = Array.isArray(row.skills)
      ? row.skills.filter((skill): skill is string => typeof skill === 'string')
      : [];

    const recommendedRole =
      typeof row.recommended_role === 'string' && row.recommended_role.trim()
        ? row.recommended_role.trim()
        : null;

    return {
      career: row.career ? String(row.career) : null,
      careerEn: row.career_en ? String(row.career_en) : null,
      recommendedRole,
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
    const wantsJobSearch = Boolean(
      (searchParams.get('role') ?? '').trim() || (searchParams.get('keywords') ?? '').trim(),
    );
    if (wantsJobSearch) {
      return handleExternalJobSearch(req);
    }
    const query = (searchParams.get('q') ?? '').trim();
    const category = (searchParams.get('category') ?? '').trim();
    const locationFilter = (searchParams.get('location') ?? '').trim();
    const workModeFilter = (searchParams.get('workMode') ?? '').trim();
    // Client-side profile hints: the browser session lives in localStorage, so
    // cookie-based auth.getUser() can miss it. The page forwards the latest
    // analysis row's role/skills so live search + % Match still work.
    const hintRole = (searchParams.get('matchRole') ?? '').trim().slice(0, 120);
    const hintSkills = (searchParams.get('matchSkills') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);

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
    // Known AI career_en values filter exactly; broad industry groups (e.g.
    // "การตลาด / การขาย") fall back to a text match on title/description.
    const KNOWN_CAREER_EN = new Set<string>(CAREER_OPTIONS.map((c) => c.value));
    const isKnownCareer = category !== '' && KNOWN_CAREER_EN.has(category);
    if (category) {
      if (isKnownCareer) {
        jobsQuery = jobsQuery.eq('career_en', category);
      } else {
        const safeCategory = escapeFilterValue(category);
        if (safeCategory) {
          jobsQuery = jobsQuery.or(
            `title.ilike.%${safeCategory}%,description.ilike.%${safeCategory}%`,
          );
        }
      }
    }

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

    // Merge client hints when the server-side insight is empty (or absent).
    const effectiveInsight: AiInsight =
      insight.career || insight.careerEn || insight.recommendedRole || insight.skills.length > 0
        ? insight
        : {
            career: hintRole || null,
            careerEn: null,
            recommendedRole: hintRole || null,
            skills: hintSkills,
          };

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

    // Merge live external listings (SerpApi Google Jobs Thailand when keyed).
    // real postings only, deduplicated against the DB rows above.
    let externalCount = 0;
    let serpError: string | null = null;
    let serpQuery: string | null = null;
    const liveLevel: JobLevel = wantsRemote || effectiveWorkMode === 'remote' ? 'remote' : 'all';
    const liveKeywords = resolveJobKeywords({
      role: effectiveInsight.recommendedRole ?? effectiveInsight.career,
      careerEn: effectiveInsight.careerEn,
      skills: effectiveInsight.skills,
    });
    const boardQueryKey = `board:${safeQuery || 'all'}:${category || 'all'}:${locationFilter || 'all'}:${effectiveWorkMode || 'all'}`;
    try {
      let live: ExternalJob[] | null = null;
      if (user) {
        live = await readJobCache(supabase, boardQueryKey, true);
      }
      if (!live || live.length === 0) {
        const apiKey = process.env.SERPAPI_KEY;
        if (apiKey) {
          // Universal query priority: typed search → category → AI role →
          // generic open-jobs browse. Sanitized to ≤4 words for ANY industry.
          serpQuery =
            sanitizeJobQuery(query, 4) ||
            sanitizeJobQuery(category, 4) ||
            sanitizeJobQuery(
              effectiveInsight.recommendedRole ??
                effectiveInsight.career ??
                effectiveInsight.careerEn ??
                '',
              4,
            ) ||
            'งานเปิดรับสมัคร';
          const serpLocation =
            wantsRemote || !locationFilter || locationFilter === 'all' || locationFilter === REMOTE_LOCATION
              ? 'Thailand'
              : escapeFilterValue(locationFilter) || 'Thailand';
          const serp = await fetchSerpApiJobs(apiKey, serpQuery, liveLevel, serpLocation);
          live = serp.jobs;
          serpError = serp.serpError;
          serpQuery = serp.serpQuery;
          const matchCandidates = [...liveKeywords, ...effectiveInsight.skills];
          live = live.map((job) => ({
            ...job,
            skills: job.skills && job.skills.length > 0
              ? job.skills
              : extractJobSkills(`${job.title} ${job.location} ${job.employment_type}`, matchCandidates),
          }));
        } else {
          live = [];
        }
        if (user && live.length > 0) {
          try {
            await supabase.from('job_search_cache').upsert(
              {
                query_key: boardQueryKey,
                jobs_payload: live,
                source: 'live_api',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'query_key' },
            );
          } catch (err) {
            console.error('job_search_cache board upsert failed:', err instanceof Error ? err.message.slice(0, 200) : err);
          }
        }
      }
      for (const ext of live ?? []) {
        const job = externalToJob(ext, effectiveInsight);
        if (!job.title) continue;
        if (safeQuery) {
          const hay = `${job.title} ${job.company?.name ?? ''} ${job.description}`.toLowerCase();
          if (!hay.includes(safeQuery.toLowerCase())) continue;
        }
        if (category) {
          if (isKnownCareer) {
            if (job.career_en !== category) continue;
          } else {
            const hay = `${job.title} ${job.company?.name ?? ''} ${job.description}`.toLowerCase();
            if (!hay.includes(category.toLowerCase())) continue;
          }
        }
        if (wantsRemote) {
          if (job.work_mode !== 'remote') continue;
        } else if (locationFilter && locationFilter !== 'all') {
          if (!job.location.toLowerCase().includes(locationFilter.toLowerCase())) continue;
        }
        if (effectiveWorkMode === 'onsite' || effectiveWorkMode === 'hybrid') {
          // External APIs don't distinguish hybrid — keep onsite + remote.
          if (effectiveWorkMode === 'onsite' && job.work_mode === 'remote') continue;
        }
        const key = `${job.title.toLowerCase().trim()}::${(job.company?.name ?? '').toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        jobs.push(job);
        externalCount += 1;
      }
    } catch (err) {
      console.error('Live job merge failed:', err instanceof Error ? err.message.slice(0, 200) : err);
    }

    return NextResponse.json({
      jobs,
      userCareer: effectiveInsight.career ?? effectiveInsight.recommendedRole,
      userCareerEn: effectiveInsight.careerEn,
      userRecommendedRole: effectiveInsight.recommendedRole,
      userSkills: effectiveInsight.skills,
      authenticated: Boolean(user) || Boolean(hintRole || hintSkills.length),
      source: 'db+live',
      externalCount,
      requiresSerpApiForThailand: !process.env.SERPAPI_KEY,
      missingApiKey: !process.env.SERPAPI_KEY,
      serpError,
      serpQuery,
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

// ---------------------------------------------------------------------------
// Google Jobs Thailand engine (SerpApi engine=google_jobs) with 24h Supabase cache
// ---------------------------------------------------------------------------

interface ExternalJob {
  job_id: string;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  salary: string | null;
  apply_link: string;
  posted_at: string;
  source_publisher: string;
  description?: string;
  skills?: string[];
  levels?: string[];
}

const LEVEL_QUERY_TERM: Record<JobLevel, string> = {
  all: '',
  internship: 'internship',
  junior: 'entry level junior',
  remote: 'remote',
};

function normalizeSerpApiJob(item: Row): ExternalJob | null {
  const title = String(item.title ?? '').trim();
  const company = String(item.company_name ?? '').trim();
  if (!title || !company) return null;

  const ext = (item.detected_extensions ?? {}) as Row;
  const applyOptions = Array.isArray(item.apply_options) ? (item.apply_options as Row[]) : [];
  const applyLink =
    String(applyOptions[0]?.link ?? item.share_link ?? '').trim() ||
    `https://www.google.com/search?q=${encodeURIComponent(`${title} ${company} jobs Thailand`)}&ibp=htl;jobs`;

  return {
    job_id: String(item.job_id ?? '').trim() || `${title}-${company}`,
    title,
    company,
    location: String(item.location ?? '').trim() || 'ประเทศไทย',
    employment_type: String(ext.schedule_type ?? '').trim() || 'งานประจำ',
    salary: ext.salary ? String(ext.salary) : null,
    apply_link: applyLink,
    posted_at: String(ext.posted_at ?? ext.posted_at_text ?? '').trim(),
    source_publisher: String(item.via ?? '').trim() || 'Google Jobs',
  };
}

interface SerpApiResult {
  jobs: ExternalJob[];
  serpError: string | null;
  serpQuery: string;
}

async function serpApiSearch(apiKey: string, cleanQuery: string, location = 'Thailand'): Promise<{ items: Row[]; error: string | null }> {
  const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(cleanQuery)}&location=${encodeURIComponent(location)}&gl=th&api_key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}`);
  }
  const body = (await res.json()) as { jobs_results?: Row[]; error?: string };
  return {
    items: Array.isArray(body.jobs_results) ? body.jobs_results : [],
    error: typeof body.error === 'string' && body.error.trim() ? body.error.trim() : null,
  };
}

async function fetchSerpApiJobs(
  apiKey: string,
  query: string,
  level: JobLevel,
  location = 'Thailand',
): Promise<SerpApiResult> {
  const term = LEVEL_QUERY_TERM[level];
  // Sanitize: strip parenthetical course/certificate text and cap `q` at 4
  // words — works for ANY industry, Thai or English.
  const cleanQuery = sanitizeJobQuery(`${query} ${term}`, 4) || 'งานเปิดรับสมัคร';
  let { items, error: serpError } = await serpApiSearch(apiKey, cleanQuery, location);

  // Narrow multi-word query returned 0 results — retry once with only the
  // first 2 core words of the same role (never switch industries).
  if (items.length === 0 && !serpError) {
    const words = cleanQuery.split(' ').filter(Boolean);
    if (words.length > 2) {
      const retryQuery = sanitizeJobQuery(words.slice(0, 2).join(' '), 4);
      if (retryQuery && retryQuery.toLowerCase() !== cleanQuery.toLowerCase()) {
        const retry = await serpApiSearch(apiKey, retryQuery, location);
        items = retry.items;
        serpError = retry.error;
      }
    }
  }

  const seen = new Set<string>();
  const jobs: ExternalJob[] = [];
  for (const raw of items) {
    const job = normalizeSerpApiJob(raw);
    if (!job) continue;
    const dedupeKey = job.job_id || `${job.title}::${job.company}`.toLowerCase();
    if (seen.has(dedupeKey.toLowerCase())) continue;
    if (level === 'remote' && !/remote|รีโมท|work from home|online/i.test(
      `${job.employment_type} ${job.location} ${job.title}`,
    )) {
      continue;
    }
    seen.add(dedupeKey.toLowerCase());
    jobs.push(job);
    if (jobs.length >= 40) break;
  }
  return { jobs, serpError, serpQuery: cleanQuery };
}

async function readJobCache(
  supabase: ReturnType<typeof createServerClient>,
  queryKey: string,
  freshOnly: boolean,
): Promise<ExternalJob[] | null> {
  try {
    let query = supabase
      .from('job_search_cache')
      .select('jobs_payload,updated_at')
      .eq('query_key', queryKey);
    if (freshOnly) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gt('updated_at', since);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    const payload = (data as Row).jobs_payload;
    return Array.isArray(payload) ? (payload as ExternalJob[]) : null;
  } catch {
    return null;
  }
}

async function handleExternalJobSearch(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = (searchParams.get('role') ?? '').trim().slice(0, 120);
  const keywords = (searchParams.get('keywords') ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 8);
  const level = normalizeJobLevel(searchParams.get('level'));
  const forceRefresh = ['1', 'true', 'yes'].includes((searchParams.get('forceRefresh') ?? '').toLowerCase());
  // Universal: sanitized role/keywords in ANY language; generic browse fallback.
  const linkQuery =
    sanitizeJobQuery(role, 4) ||
    sanitizeJobQuery(keywords.slice(0, 2).join(' '), 4) ||
    'งานเปิดรับสมัคร';
  const fallbackLinks = buildFallbackLinks(linkQuery);
  const queryKey = buildQueryKey(role, keywords, level);

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: authData } = await supabase.auth.getUser();
    const authed = Boolean(authData.user);

    // 24h cache hit — only for signed-in users (RLS requires `authenticated`).
    const apiKey = process.env.SERPAPI_KEY;
    const requiresSerpApiForThailand = !apiKey;
    const missingApiKey = !apiKey;
    if (authed && !forceRefresh) {
      const cached = await readJobCache(supabase, queryKey, true);
      if (cached && cached.length > 0) {
        return NextResponse.json({ jobs: cached, cached: true, fallbackLinks, queryKey, requiresSerpApiForThailand, missingApiKey });
      }
    }

    let jobs: ExternalJob[] = [];
    let serpError: string | null = null;
    let serpQuery: string | null = null;
    if (apiKey) {
      // Sanitized role/keywords only (any industry/language); skills stay for % Match.
      serpQuery = linkQuery;
      try {
        const result = await fetchSerpApiJobs(apiKey, serpQuery, level);
        jobs = result.jobs;
        serpError = result.serpError;
        serpQuery = result.serpQuery;
      } catch (err) {
        console.error('SerpApi fetch failed:', err instanceof Error ? err.message.slice(0, 200) : err);
        serpError = err instanceof Error ? err.message.slice(0, 200) : 'SerpApi request failed';
      }
    }
    // Ensure every job carries extractable skills for % Match scoring.
    jobs = jobs.map((job) => ({
      ...job,
      skills: job.skills && job.skills.length > 0
        ? job.skills
        : extractJobSkills(`${job.title} ${job.location} ${job.employment_type}`, keywords),
    }));

    if (jobs.length === 0) {
      // Zero-downtime: serve the freshest cached payload we have, even stale.
      // Never cache an empty result.
      const stale = authed ? await readJobCache(supabase, queryKey, false) : null;
      if (stale && stale.length > 0) {
        return NextResponse.json({ jobs: stale, cached: true, fallbackLinks, queryKey, requiresSerpApiForThailand, missingApiKey });
      }
      return NextResponse.json({ jobs: [], cached: false, fallbackLinks, queryKey, requiresSerpApiForThailand, missingApiKey, serpError, serpQuery });
    }

    if (authed) {
      try {
        await supabase.from('job_search_cache').upsert(
          {
            query_key: queryKey,
            jobs_payload: jobs,
            source: 'live_api',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'query_key' },
        );
      } catch (err) {
        console.error('job_search_cache upsert failed:', err instanceof Error ? err.message.slice(0, 200) : err);
      }
    }

    return NextResponse.json({ jobs, cached: false, fallbackLinks, queryKey, requiresSerpApiForThailand, missingApiKey });
  } catch (err) {
    console.error('External job search error:', err);
    // Never 500 — the UI always gets fallback search links.
    return NextResponse.json({ jobs: [], cached: false, fallbackLinks, queryKey, requiresSerpApiForThailand: !process.env.SERPAPI_KEY, missingApiKey: !process.env.SERPAPI_KEY });
  }
}
