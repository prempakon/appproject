'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  JOB_LEVELS,
  buildFallbackLinks,
  normalizeJobLevel,
  resolveJobKeywords,
  type FallbackLink,
  type JobLevel,
} from '../lib/jobSearch';

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
}

interface JobsApiResponse {
  jobs?: ExternalJob[];
  cached?: boolean;
  fallbackLinks?: FallbackLink[];
  error?: string;
}

interface QuickExplore {
  label: string;
  role: string;
  keywords: string[];
}

const QUICK_EXPLORE: QuickExplore[] = [
  { label: 'Frontend Developer', role: 'Frontend Developer', keywords: ['Frontend Developer', 'React Developer', 'Web Developer'] },
  { label: 'Backend Developer', role: 'Backend Developer', keywords: ['Backend Developer', 'Node.js Developer', 'API Developer'] },
  { label: 'Data Analyst', role: 'Data Analyst', keywords: ['Data Analyst', 'Data Scientist', 'Business Intelligence Analyst'] },
  { label: 'UX/UI Designer', role: 'UX/UI Designer', keywords: ['UX Designer', 'UI Designer', 'Product Designer'] },
];

interface JobRecommendationsSectionProps {
  role?: string | null;
  careerEn?: string | null;
  skills?: string[];
  jobKeywords?: string[];
  hasAnalysis?: boolean;
}

function formatPostedAt(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function JobRecommendationsSection({
  role,
  careerEn,
  skills = [],
  jobKeywords = [],
  hasAnalysis = false,
}: JobRecommendationsSectionProps) {
  const [level, setLevel] = useState<JobLevel>('all');
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [fallbackLinks, setFallbackLinks] = useState<FallbackLink[]>([]);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [override, setOverride] = useState<{ role: string; keywords: string[] } | null>(null);
  const autoLoadedRef = useRef(false);

  const keywords = useMemo(
    () => resolveJobKeywords({ role, careerEn, skills, jobKeywords }),
    [role, careerEn, skills, jobKeywords],
  );

  const effectiveRole = override?.role ?? role ?? '';
  const effectiveKeywords = override?.keywords ?? keywords;
  const queryText = effectiveRole || effectiveKeywords[0] || 'งาน';

  const links = fallbackLinks.length > 0 ? fallbackLinks : buildFallbackLinks(queryText);

  const runSearch = useCallback(
    async (forceRefresh: boolean, searchRole: string, searchKeywords: string[], searchLevel: JobLevel) => {
      const params = new URLSearchParams();
      if (searchRole) params.set('role', searchRole);
      if (searchKeywords.length > 0) params.set('keywords', searchKeywords.join(','));
      params.set('level', searchLevel);
      if (forceRefresh) params.set('forceRefresh', '1');

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobs?${params.toString()}`, { cache: 'no-store' });
        const data = (await res.json()) as JobsApiResponse;
        if (!res.ok) {
          throw new Error(data.error || `โหลดข้อมูลงานไม่สำเร็จ (HTTP ${res.status})`);
        }
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setCached(Boolean(data.cached));
        if (Array.isArray(data.fallbackLinks) && data.fallbackLinks.length > 0) {
          setFallbackLinks(data.fallbackLinks);
        }
      } catch (err) {
        setJobs([]);
        setCached(false);
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลงานไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchJobs = useCallback(
    (forceRefresh: boolean) => runSearch(forceRefresh, effectiveRole, effectiveKeywords, level),
    [runSearch, effectiveRole, effectiveKeywords, level],
  );

  // Auto-load once for analyzed users; un-analyzed users must click a chip first.
  useEffect(() => {
    if (!hasAnalysis || autoLoadedRef.current) return;
    if (!effectiveRole && effectiveKeywords.length === 0) return;
    autoLoadedRef.current = true;
    const timer = window.setTimeout(() => void fetchJobs(false), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnalysis, effectiveRole, effectiveKeywords.join('|')]);

  // Re-fetch when the level filter changes (cache makes this cheap).
  const levelRef = useRef(level);
  useEffect(() => {
    if (levelRef.current === level) return;
    levelRef.current = level;
    if (!hasAnalysis && !override) return;
    const timer = window.setTimeout(() => void fetchJobs(false), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const explore = (item: QuickExplore) => {
    setOverride({ role: item.role, keywords: item.keywords });
    setActiveKeyword(null);
    setLevel('all');
    void runSearch(false, item.role, item.keywords, 'all');
  };

  const pickKeyword = (keyword: string) => {
    setActiveKeyword(keyword);
    setOverride(null);
    const reordered = [keyword, ...effectiveKeywords.filter((k) => k !== keyword)].slice(0, 8);
    void runSearch(false, effectiveRole, reordered, level);
  };

  const displayedKeywords = effectiveKeywords.slice(0, 8);
  const showEmptyState = !hasAnalysis && !override;

  return (
    <section className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Briefcase className="h-5 w-5 text-blue-600" />
            ตำแหน่งงานที่แนะนำจากทักษะ AI
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            ดึงประกาศงานจริงจาก Google Jobs ประเทศไทย (SerpApi) ตามสายอาชีพและคีย์เวิร์ดที่ AI วิเคราะห์ — อัปเดตแคชทุก 24 ชั่วโมง
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cached && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
              แคชล่าสุด (≤24 ชม.)
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchJobs(true)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {showEmptyState ? (
        <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-5 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">ยังไม่มีผลวิเคราะห์ — สำรวจตำแหน่งงานยอดนิยมได้เลย</p>
          <p className="mt-1 text-xs font-medium text-slate-500">เลือกสายอาชีพด้านล่างเพื่อดึงประกาศงานจริง หรืออัปโหลดผลงานเพื่อให้ AI แนะนำงานที่ตรงทักษะคุณ</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_EXPLORE.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => explore(item)}
                className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-extrabold text-blue-700 shadow-sm transition-all hover:border-blue-500 hover:bg-blue-600 hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Level filter pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {JOB_LEVELS.map((item) => {
              const active = level === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLevel(normalizeJobLevel(item.value))}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Clickable keyword chips */}
          {displayedKeywords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">คีย์เวิร์ด:</span>
              {displayedKeywords.map((keyword) => {
                const active = activeKeyword === keyword;
                return (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => pickKeyword(keyword)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-300'
                    }`}
                  >
                    {keyword}
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          <div className="mt-5">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                    <div className="mt-4 h-8 w-full rounded-lg bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center">
                <p className="text-sm font-bold text-red-700">⚠ {error}</p>
                <p className="mt-1 text-xs font-medium text-red-600/80">ระบบยังเปิดให้ค้นหาตรงผ่าน 5 แพลตฟอร์มด้านล่างได้ทันที</p>
                <button
                  type="button"
                  onClick={() => void fetchJobs(false)}
                  className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
                >
                  ลองใหม่
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-bold text-slate-600">ไม่พบประกาศงานสำหรับเงื่อนไขนี้</p>
                <p className="mt-1 text-xs font-medium text-slate-400">ลองเปลี่ยนระดับตำแหน่งหรือใช้ช่องค้นหาด้านล่างแทน</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.slice(0, 12).map((job) => {
                  const posted = formatPostedAt(job.posted_at);
                  return (
                    <article
                      key={job.job_id || `${job.title}-${job.company}`}
                      className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-extrabold leading-snug text-slate-800">{job.title}</h4>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-500">
                          {job.source_publisher}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-blue-700">{job.company}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500">
                        {job.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.employment_type && <span>{job.employment_type}</span>}
                        {job.salary && <span className="text-emerald-700">{job.salary}</span>}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <span className="text-[10px] font-medium text-slate-400">{posted}</span>
                        {job.apply_link ? (
                          <a
                            href={job.apply_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-white transition-colors hover:bg-blue-700"
                          >
                            สมัครงาน
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">ไม่มีลิงก์สมัคร</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Direct search bar across 5 platforms */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
          <Search className="h-3.5 w-3.5" />
          ค้นหาตำแหน่งงานจริงใน 5 แพลตฟอร์ม
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="text-xs font-extrabold text-slate-800 group-hover:text-blue-700">{link.name}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">{link.tagline}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default JobRecommendationsSection;
