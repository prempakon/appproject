'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Loader2,
  MapPin,
  Sparkles,
  ArrowUpRight,
  Briefcase,
} from 'lucide-react';
import { rankJobs, matchTone } from '../../lib/jobMatching';
import { careerLabel, JOB_GROUP_OPTIONS, WORK_MODE_LABELS } from '../../lib/careers';
import { THAI_PROVINCES } from '../../lib/thaiJobs';
import { supabase } from '../../lib/supabaseClient';
import { sanitizeJobQuery } from '../../lib/jobSearch';
import type { Job, WorkMode } from '../../lib/platform.types';

const REMOTE_LOCATION = 'ทำงานออนไลน์';

const LOCATION_OPTIONS: string[] = [
  ...new Set<string>([REMOTE_LOCATION, 'กรุงเทพมหานคร', 'ขอนแก่น', 'เลย', ...THAI_PROVINCES]),
];

interface JobsApiResponse {
  jobs?: Job[];
  userCareer?: string | null;
  userCareerEn?: string | null;
  userSkills?: string[];
  authenticated?: boolean;
  externalCount?: number;
  requiresSerpApiForThailand?: boolean;
  missingApiKey?: boolean;
  serpError?: string | null;
  serpQuery?: string | null;
  userRecommendedRole?: string | null;
  error?: string;
}

interface PortalCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  keyword: string;
  url: string;
  border: string;
  badge: string;
  button: string;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

function buildPortals(
  roleTitle: string,
  careerText: string,
  location: string,
  query: string,
): PortalCard[] {
  // Clean short English job title only — never long Thai skill sentences.
  const keyword = [query.trim() || roleTitle || careerText].filter(Boolean).join(' ').trim() ||
    'งานในประเทศไทย';
  const thaiLocation =
    location === REMOTE_LOCATION ? 'ทำงานออนไลน์ (ทั่วประเทศ)' : location || 'ทั่วประเทศไทย';
  const locationKeyword = location
    ? `${keyword} ${location === REMOTE_LOCATION ? 'รีโมท' : location}`
    : keyword;

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${keyword} งาน ${thaiLocation}`,
  )}&ibp=htl;jobs`;
  const jobThaiUrl = `https://jobthai.com/th/jobs?keyword=${encodeURIComponent(locationKeyword)}`;
  const jobsDbUrl = `https://th.jobsdb.com/th/jobs?keywords=${encodeURIComponent(locationKeyword)}`;

  const linkedInParams = new URLSearchParams({
    keywords: keyword,
    location: location && location !== REMOTE_LOCATION ? location : 'Thailand',
  });
  if (location === REMOTE_LOCATION) linkedInParams.set('f_WT', '2');

  return [
    {
      id: 'google',
      name: 'Google Jobs Thailand',
      tagline: 'รวมประกาศงานจากทุกเว็บไซต์ในประเทศไทย',
      description: 'ค้นหาตำแหน่งงานจากหลายแหล่งในหน้าเดียว แล้วเลือกสมัครกับเว็บไซต์ต้นทางได้ทันที',
      keyword: `${keyword} · ${thaiLocation}`,
      url: googleUrl,
      border: 'border-t-blue-500',
      badge: 'bg-blue-50 text-blue-700',
      button: 'bg-blue-600 text-white group-hover:bg-blue-700',
    },
    {
      id: 'jobthai',
      name: 'JobThai',
      tagline: 'เว็บหางานไทยที่บริษัทเปิดรับสมัครโดยตรง',
      description: 'ตำแหน่งงานไทยครอบคลุมทุกจังหวัด เหมาะกับงานประจำและงานที่ต้องการสมัครกับบริษัทโดยตรง',
      keyword: locationKeyword,
      url: jobThaiUrl,
      border: 'border-t-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700',
      button: 'bg-emerald-600 text-white group-hover:bg-emerald-700',
    },
    {
      id: 'jobsdb',
      name: 'JobsDB Thailand',
      tagline: 'งานจากบริษัทชั้นนำทั่วประเทศไทย',
      description: 'รวมงานประจำและงานสายเทคนิคจากบริษัทขนาดใหญ่ พร้อมตัวกรองเงินเดือนและทำเล',
      keyword: locationKeyword,
      url: jobsDbUrl,
      border: 'border-t-purple-500',
      badge: 'bg-purple-50 text-purple-700',
      button: 'bg-purple-600 text-white group-hover:bg-purple-700',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Jobs',
      tagline: 'งานในไทยและงานรีโมทจากเครือข่ายมืออาชีพ',
      description: 'ค้นหางานที่ตรงสายจากโปรไฟล์มืออาชีพ และติดตามบริษัทที่คุณสนใจได้โดยตรง',
      keyword: `${keyword} · ${location && location !== REMOTE_LOCATION ? location : 'Thailand'}`,
      url: `https://www.linkedin.com/jobs/search/?${linkedInParams.toString()}`,
      border: 'border-t-indigo-500',
      badge: 'bg-indigo-50 text-indigo-700',
      button: 'bg-indigo-600 text-white group-hover:bg-indigo-700',
    },
  ];
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchBusy, setSearchBusy] = useState(false);
  const [errorNote, setErrorNote] = useState('');

  const [authenticated, setAuthenticated] = useState(false);
  const [userCareer, setUserCareer] = useState<string | null>(null);
  const [userCareerEn, setUserCareerEn] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [requiresSerpApi, setRequiresSerpApi] = useState(false);
  const [externalCount, setExternalCount] = useState(0);
  const [serpError, setSerpError] = useState<string | null>(null);
  const [clientAuthed, setClientAuthed] = useState(false);
  const [clientCareer, setClientCareer] = useState<string | null>(null);
  const [clientCareerEn, setClientCareerEn] = useState<string | null>(null);
  const [clientRecommendedRole, setClientRecommendedRole] = useState<string | null>(null);
  const [clientSkills, setClientSkills] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [career, setCareer] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [workMode, setWorkMode] = useState<'all' | WorkMode>('all');

  // Latest analysis row loaded client-side (session lives in localStorage, so
  // the API's cookie auth can miss it). Feeds % Match + the live job query.
  // profileRef keeps loadJobs stable — it is read at call time, not subscribed.
  const profileRef = React.useRef({ role: '', skills: [] as string[] });

  const loadJobs = useCallback(async (params?: URLSearchParams) => {
    const qs = params ? new URLSearchParams(params) : new URLSearchParams();
    const { role, skills } = profileRef.current;
    const cleanRole = sanitizeJobQuery(role, 4);
    if (cleanRole) qs.set('matchRole', cleanRole);
    if (skills.length > 0) qs.set('matchSkills', skills.slice(0, 8).join(','));
    const res = await fetch(`/api/jobs?${qs.toString()}`, { cache: 'no-store' });
    const data = (await res.json()) as JobsApiResponse;
    if (!res.ok) throw new Error(data.error ?? 'โหลดข้อมูลงานไม่สำเร็จ');

    setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    setAuthenticated(Boolean(data.authenticated));
    setUserCareer(data.userCareer ?? null);
    setUserCareerEn(data.userCareerEn ?? null);
    const serverSkills = Array.isArray(data.userSkills) ? data.userSkills : [];
    setUserSkills(serverSkills);
    if (serverSkills.length > 0 && profileRef.current.skills.length === 0) {
      profileRef.current.skills = serverSkills;
    }
    setRequiresSerpApi(Boolean(data.requiresSerpApiForThailand || data.missingApiKey));
    setExternalCount(typeof data.externalCount === 'number' ? data.externalCount : 0);
    setSerpError(typeof data.serpError === 'string' && data.serpError ? data.serpError : null);
    setErrorNote('');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || !user) return;
        setClientAuthed(true);
        const { data: row } = await supabase
          .from('analysis_results')
          .select('*')
          .eq('user_id', user.id)
          .order('analyzed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!active || !row) return;
        const r = row as Record<string, unknown>;
        const career = typeof r.career === 'string' ? r.career : null;
        const careerEn = typeof r.career_en === 'string' ? r.career_en : null;
        const recommendedRole =
          typeof r.recommended_role === 'string' && r.recommended_role.trim()
            ? r.recommended_role.trim()
            : null;
        const skills = Array.isArray(r.skills)
          ? r.skills.filter((s): s is string => typeof s === 'string')
          : [];
        setClientCareer(career);
        setClientCareerEn(careerEn);
        setClientRecommendedRole(recommendedRole);
        setClientSkills(skills);
        profileRef.current = {
          role: recommendedRole || careerEn || career || '',
          skills,
        };
        // Refetch once with the real profile so live jobs + % Match engage.
        setLoading(true);
        loadJobs()
          .catch(() => undefined)
          .finally(() => {
            if (active) setLoading(false);
          });
      } catch {
        // Profile hints are best-effort; the API still returns DB jobs.
      }
    })();
    return () => {
      active = false;
    };
  }, [loadJobs]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      loadJobs()
        .catch((err: unknown) => {
          if (active) setErrorNote(err instanceof Error ? err.message : 'โหลดข้อมูลงานไม่สำเร็จ');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadJobs]);

  // Server insight wins; fall back to the client-loaded analysis row so % Match
  // and the AI banner work even when cookie auth misses the localStorage session.
  const effCareer = userCareer || clientCareer;
  const effCareerEn = userCareerEn || clientCareerEn;
  const effSkills = userSkills.length > 0 ? userSkills : clientSkills;
  const isAuthed = authenticated || clientAuthed;
  const aiCareer = effCareerEn || effCareer || '';
  const hasCareer = Boolean(aiCareer);
  const hasSkills = isAuthed && effSkills.length > 0;
  const hasAiProfile = isAuthed && (hasCareer || hasSkills);

  const portals = useMemo(() => {
    const roleTitle =
      sanitizeJobQuery(clientRecommendedRole || effCareerEn || effCareer || '', 4) || effCareerEn || '';
    return buildPortals(
      roleTitle,
      career ? careerLabel(career) : aiCareer ? careerLabel(aiCareer) : '',
      jobLocation,
      search,
    );
  }, [career, effCareerEn, effCareer, clientRecommendedRole, aiCareer, jobLocation, search]);

  const rankedJobs = useMemo(() => {
    const ranked = rankJobs(jobs, {
      userSkills: hasSkills ? effSkills : [],
      preferredCareer: career || effCareerEn || null,
      preferredLocation: jobLocation || null,
    });

    if (hasSkills) return ranked;

    return [...ranked].sort((a, b) => {
      const aTime = a.job.created_at ? Date.parse(a.job.created_at) : 0;
      const bTime = b.job.created_at ? Date.parse(b.job.created_at) : 0;
      return bTime - aTime;
    });
  }, [jobs, hasSkills, effSkills, career, effCareerEn, jobLocation]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (searchBusy) return;
    setSearchBusy(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (career) params.set('category', career);
      if (jobLocation) params.set('location', jobLocation);
      if (workMode !== 'all' && jobLocation !== REMOTE_LOCATION) {
        params.set('workMode', workMode);
      }
      await loadJobs(params);
    } catch (err: unknown) {
      setErrorNote(err instanceof Error ? err.message : 'โหลดข้อมูลงานไม่สำเร็จ');
    } finally {
      setSearchBusy(false);
    }
  }

  async function clearFilters(): Promise<void> {
    setSearch('');
    setCareer('');
    setJobLocation('');
    setWorkMode('all');
    setLoading(true);
    try {
      await loadJobs();
    } catch (err: unknown) {
      setErrorNote(err instanceof Error ? err.message : 'โหลดข้อมูลงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
              AI Job Recommendation
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              ศูนย์แนะนำงานตามทักษะของคุณ
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              ระบบจับคู่งานด้วยสายอาชีพและทักษะที่ AI วิเคราะห์จากโปรไฟล์ของคุณ แล้วพาคุณไปสมัครงาน
              บนเว็บไซต์ต้นทางได้โดยตรง — ไม่มีระบบชำระเงินใด ๆ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/resume"
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
            >
              อัปเดตเรซูเม่ + QR
            </Link>
            <Link
              href="/analytics"
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              ดูผลวิเคราะห์อาชีพ
            </Link>
          </div>
        </header>

        {!isAuthed ? (
          <section className="mt-6 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    เข้าสู่ระบบเพื่อให้ AI จับคู่งานให้คุณ
                  </p>
                  <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
                    ระบบจะอ่านสายอาชีพและทักษะจากผลวิเคราะห์ล่าสุดของคุณ แล้วคำนวณ % Match
                    และทักษะที่ควรเสริมให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <Link
                href="/login?redirect=/jobs"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-blue-700"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </section>
        ) : !hasAiProfile ? (
          <section className="mt-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">ยังไม่มีผลวิเคราะห์ AI ในโปรไฟล์</p>
                  <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
                    อัปโหลดพอร์ตโฟลิโอหรือเพิ่มทักษะในเรซูเม่ แล้วให้ AI วิเคราะห์
                    เพื่อปลดล็อกคะแนน % Match และคำแนะนำทักษะที่ควรเสริม
                  </p>
                </div>
              </div>
              <Link
                href="/main"
                className="rounded-full bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-amber-600"
              >
                อัปโหลดพอร์ตโฟลิโอ
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
                    ผลวิเคราะห์ AI ล่าสุด
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {hasCareer ? careerLabel(aiCareer) : 'ยังระบุสายอาชีพไม่ได้'}
                  </p>
                  {effSkills.length > 0 ? (
                    <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
                      ทักษะเด่น:{' '}
                      <span className="font-bold text-slate-700">
                        {effSkills.slice(0, 6).join(' · ')}
                      </span>
                      {effSkills.length > 6 ? ` และอีก ${effSkills.length - 6} ทักษะ` : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      ยังไม่พบทักษะในผลวิเคราะห์ — เพิ่มพอร์ตโฟลิโอแล้ววิเคราะห์ด้วย AI
                      เพื่อให้ % Match แม่นยำขึ้น
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/analytics"
                className="rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                ดูรายละเอียดผลวิเคราะห์
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
          <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-12">
            <label className="md:col-span-3">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                ค้นหางาน
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ชื่องาน ทักษะ หรือบริษัท"
                className={inputClass}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                สายอาชีพ
              </span>
              <select
                value={career}
                onChange={(event) => setCareer(event.target.value)}
                className={inputClass}
              >
                <option value="">ทุกสายอาชีพ</option>
                {JOB_GROUP_OPTIONS.filter((o) => o.value !== '').map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {clientRecommendedRole &&
                  !JOB_GROUP_OPTIONS.some((o) => o.value === clientRecommendedRole) && (
                    <option value={clientRecommendedRole}>
                      ตาม AI: {clientRecommendedRole}
                    </option>
                  )}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                จังหวัด / ทำเล
              </span>
              <select
                value={jobLocation}
                onChange={(event) => {
                  const next = event.target.value;
                  setJobLocation(next);
                  if (next === REMOTE_LOCATION) setWorkMode('all');
                }}
                className={inputClass}
              >
                <option value="">ทุกทำเลในประเทศไทย</option>
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                รูปแบบการทำงาน
              </span>
              <select
                value={jobLocation === REMOTE_LOCATION ? 'all' : workMode}
                onChange={(event) => setWorkMode(event.target.value as 'all' | WorkMode)}
                disabled={jobLocation === REMOTE_LOCATION}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="all">ทั้งหมด</option>
                <option value="onsite">{WORK_MODE_LABELS.onsite}</option>
                <option value="hybrid">{WORK_MODE_LABELS.hybrid}</option>
                <option value="remote">{WORK_MODE_LABELS.remote}</option>
              </select>
            </label>

            <div className="flex items-end gap-2 md:col-span-3">
              <button
                type="submit"
                disabled={searchBusy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {searchBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SearchIcon className="h-4 w-4" />
                )}
                {searchBusy ? 'กำลังค้นหา...' : 'ค้นหา'}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-slate-200 px-3.5 py-2.5 text-xs font-extrabold text-slate-500 transition-colors hover:bg-slate-50"
              >
                ล้าง
              </button>
            </div>

            <p className="text-[11px] font-bold text-slate-400 md:col-span-12">
              เลือก “{REMOTE_LOCATION}” เพื่อดูงานรีโมททั้งหมด · ลิงก์แนะนำด้านล่างจะปรับตามสายอาชีพ
              ทักษะ และทำเลที่คุณเลือก
            </p>
          </form>

          {errorNote && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
              {errorNote}
            </p>
          )}

          {requiresSerpApi && (
            <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-bold text-blue-800">
              ℹ️ ประกาศงานสดจาก Google Jobs ประเทศไทย (SerpApi) จะพร้อมใช้งานเมื่อตั้งค่า{' '}
              <code className="rounded bg-blue-100 px-1">SERPAPI_KEY</code> ใน .env —
              ขณะนี้แสดงเฉพาะประกาศงานจากฐานข้อมูลและลิงก์ค้นหา 4 แพลตฟอร์มด้านล่าง
            </p>
          )}

          {serpError && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-800">
              ⚠️ SerpApi Google Jobs ส่งกลับข้อผิดพลาด: {serpError} —
              โปรดตรวจสอบ SERPAPI_KEY ใน .env หรือดูการใช้งานบัญชีบน serpapi.com
            </p>
          )}
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                เว็บไซต์ต้นทางแนะนำสำหรับคุณ
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                สร้างลิงก์ค้นหาจากสายอาชีพ ทักษะ และทำเลของคุณ — สมัครงานบนเว็บไซต์ทางการได้ทันที
              </p>
            </div>
            {hasAiProfile && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700">
                ปรับตามผลวิเคราะห์ AI
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {portals.map((portal) => (
              <a
                key={portal.id}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col rounded-2xl border border-t-4 border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] ${portal.border}`}
              >
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ${portal.badge}`}
                >
                  {portal.name}
                </span>
                <h3 className="mt-3 text-sm font-black leading-snug text-slate-900">
                  {portal.tagline}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{portal.description}</p>
                <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
                  ค้นหา: {portal.keyword}
                </p>
                <span
                  className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[11px] font-extrabold transition-colors ${portal.button}`}
                >
                  ไปที่เว็บไซต์ต้นทาง
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900">
              <Briefcase className="h-5 w-5 text-slate-400" />
              ประกาศงานจริง (ฐานข้อมูล + Live API)
              <span className="text-sm font-extrabold text-slate-400">({rankedJobs.length})</span>
            </h2>
            <p className="text-[11px] font-bold text-slate-400">
              {hasSkills
                ? `จับคู่จาก ${effSkills.length} ทักษะที่ AI ตรวจพบ`
                : 'เข้าสู่ระบบและวิเคราะห์โปรไฟล์เพื่อดู % Match'}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
                />
              ))}
            </div>
          ) : rankedJobs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="text-sm font-black text-slate-700">
                ยังไม่มีประกาศงานที่ตรงกับตัวกรอง
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs font-medium text-slate-400">
                {serpError
                  ? `SerpApi ตอบกลับ: ${serpError} — ตรวจสอบ SERPAPI_KEY แล้วลองใหม่`
                  : requiresSerpApi
                    ? 'ยังไม่ได้ตั้งค่า SERPAPI_KEY — ตั้งค่าใน .env เพื่อดึงงานจริงจาก Google Jobs ประเทศไทย หรือใช้ลิงก์ค้นหา 4 แพลตฟอร์มด้านบน'
                    : 'SerpApi ไม่พบงานที่ตรงกับตัวกรองนี้ (0 ผลลัพธ์) — ลองเปลี่ยนสายอาชีพ/ทำเลให้กว้างขึ้น หรือล้างตัวกรอง และใช้ลิงก์ค้นหา 4 แพลตฟอร์มด้านบน'}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rankedJobs.map((match) => {
                const tone = matchTone(match.score);
                const missing = match.missingSkills.slice(0, 3);
                return (
                  <article
                    key={match.job.id}
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {match.job.source === 'live-api' && (
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-extrabold text-cyan-700">
                          งานจริง · Live API
                        </span>
                      )}
                      {hasSkills && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${tone.className}`}
                        >
                          {tone.label} {match.score}%
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                        {WORK_MODE_LABELS[match.job.work_mode] ?? match.job.work_mode}
                      </span>
                      {match.job.employment_type && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                          {match.job.employment_type}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug text-slate-900">
                      {match.job.title}
                    </h3>

                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {match.job.company?.name ?? 'ไม่ระบุผู้จ้าง'}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {match.job.location}
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-emerald-700">
                      {match.job.salary_range ?? 'ไม่ระบุค่าตอบแทน'}
                    </p>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {match.job.description}
                    </p>

                    {match.job.required_skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {match.job.required_skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {hasSkills && missing.length > 0 && (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                        ทักษะที่ควรเสริม: {missing.join(', ')}
                      </p>
                    )}

                    {hasSkills && (
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${tone.bar}`}
                          style={{ width: `${match.score}%` }}
                        />
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      {match.job.apply_url ? (
                        <a
                          href={match.job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold text-white transition-colors hover:bg-slate-800"
                        >
                          ไปสมัครที่เว็บไซต์ต้นทาง ↗
                        </a>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-[11px] font-extrabold text-slate-400">
                          ยังไม่มีลิงก์สมัครจากต้นทาง
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
