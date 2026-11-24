'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createCompany,
  createJob,
  deleteCompany,
  deleteJob,
  listAllJobsAdmin,
  setJobActive,
} from '../../../lib/jobs';
import { CAREER_OPTIONS, careerLabel, WORK_MODE_LABELS } from '../../../lib/careers';
import type { Company, Job, WorkMode } from '../../../lib/platform.types';

type Tab = 'companies' | 'jobs';
type Message = { type: 'success' | 'error'; text: string } | null;

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const labelClass = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500';

const emptyCompany = { name: '', industry: '', location: '', website: '', description: '' };

const emptyJob = {
  company_id: '',
  title: '',
  description: '',
  responsibilities: '',
  location: '',
  work_mode: 'onsite' as WorkMode,
  employment_type: 'พนักงานประจำ',
  required_skills: '',
  nice_to_have: '',
  career_en: '',
  career_category: '',
  salary_range: '',
  apply_url: '',
};

function formatError(err: unknown): string {
  const text = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : 'ไม่ทราบสาเหตุ';
  if (/relation|does not exist|schema cache|Could not find the table/i.test(text)) {
    return `${text} — ยังไม่ได้สร้างตาราง companies/jobs กรุณารันไฟล์ supabase/add_career_platform.sql ใน Supabase SQL Editor`;
  }
  return text;
}

export default function AdminJobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [jobForm, setJobForm] = useState(emptyJob);

  useEffect(() => {
    if (localStorage.getItem('userRole') !== 'admin') {
      router.push('/login');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await listAllJobsAdmin();
        if (cancelled) return;
        setCompanies(data.companies);
        setJobs(data.jobs);
        setJobForm((prev) => ({ ...prev, company_id: prev.company_id || data.companies[0]?.id || '' }));
      } catch (err) {
        if (!cancelled) setLoadError(formatError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllJobsAdmin();
      setCompanies(data.companies);
      setJobs(data.jobs);
      setJobForm((prev) => ({ ...prev, company_id: prev.company_id || data.companies[0]?.id || '' }));
    } catch (err) {
      setLoadError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  const jobCountByCompany = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((job) => map.set(job.company_id, (map.get(job.company_id) ?? 0) + 1));
    return map;
  }, [jobs]);

  const activeJobs = jobs.filter((job) => job.is_active !== false).length;

  const submitCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!companyForm.name.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อบริษัท' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await createCompany(companyForm);
      setCompanyForm(emptyCompany);
      setMessage({ type: 'success', text: 'เพิ่มบริษัทเรียบร้อยแล้ว' });
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: `เพิ่มบริษัทไม่สำเร็จ: ${formatError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  const submitJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!jobForm.company_id) {
      setMessage({ type: 'error', text: 'กรุณาเลือกบริษัทก่อนสร้างประกาศงาน' });
      return;
    }
    if (!jobForm.title.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่องาน' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await createJob({
        company_id: jobForm.company_id,
        title: jobForm.title,
        description: jobForm.description,
        responsibilities: splitLines(jobForm.responsibilities),
        location: jobForm.location,
        work_mode: jobForm.work_mode,
        employment_type: jobForm.employment_type,
        required_skills: splitList(jobForm.required_skills),
        nice_to_have: splitList(jobForm.nice_to_have),
        career_en: jobForm.career_en,
        career_category: jobForm.career_category,
        salary_range: jobForm.salary_range,
        apply_url: jobForm.apply_url,
      });
      setJobForm((prev) => ({ ...emptyJob, company_id: prev.company_id }));
      setMessage({ type: 'success', text: 'เพิ่มประกาศงานเรียบร้อยแล้ว' });
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: `เพิ่มประกาศงานไม่สำเร็จ: ${formatError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  const removeCompany = async (company: Company) => {
    if (!window.confirm(`ลบบริษัท “${company.name}” และประกาศงานทั้งหมดของบริษัทนี้หรือไม่?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteCompany(company.id);
      setMessage({ type: 'success', text: `ลบบริษัท ${company.name} แล้ว` });
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: `ลบบริษัทไม่สำเร็จ: ${formatError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  const removeJob = async (job: Job) => {
    if (!window.confirm(`ลบประกาศงาน “${job.title}” หรือไม่?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteJob(job.id);
      setMessage({ type: 'success', text: 'ลบประกาศงานแล้ว' });
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: `ลบประกาศงานไม่สำเร็จ: ${formatError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  const toggleJob = async (job: Job) => {
    setBusy(true);
    setMessage(null);
    try {
      await setJobActive(job.id, job.is_active === false);
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: `อัปเดตสถานะไม่สำเร็จ: ${formatError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-black text-white">J</span>
            <div>
              <p className="text-lg font-extrabold leading-tight text-slate-800">จัดการงานและบริษัท</p>
              <p className="text-[11px] font-bold text-slate-400">สำหรับผู้ดูแลระบบเท่านั้น</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/jobs" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 hover:border-blue-300 hover:text-blue-700">
              ดูหน้าจับคู่งาน
            </Link>
            <Link href="/admin" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800">
              ← กลับแดชบอร์ดผู้บริหาร
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 md:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="บริษัทในระบบ" value={companies.length} tone="bg-blue-50 text-blue-700" />
          <StatCard label="ประกาศงานทั้งหมด" value={jobs.length} tone="bg-violet-50 text-violet-700" />
          <StatCard label="ประกาศที่เปิดรับ" value={activeJobs} tone="bg-emerald-50 text-emerald-700" />
        </div>

        {message && (
          <p
            className={`rounded-xl border px-4 py-3 text-xs font-bold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        {loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-bold text-amber-900">⚠ {loadError}</p>
            <p className="mt-2 text-[11px] font-medium text-amber-800/80">
              หลังรัน SQL แล้ว กดปุ่ม “โหลดใหม่” ด้านล่าง ระบบจะแสดงข้อมูลจริงแทนข้อมูลตัวอย่างในหน้าจับคู่งาน
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 rounded-full border border-amber-300 bg-white px-4 py-2 text-[11px] font-extrabold text-amber-800 hover:bg-amber-100"
            >
              โหลดใหม่
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('companies')}
            className={`rounded-full px-5 py-2.5 text-xs font-extrabold transition-colors ${
              tab === 'companies' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            บริษัท ({companies.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('jobs')}
            className={`rounded-full px-5 py-2.5 text-xs font-extrabold transition-colors ${
              tab === 'jobs' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            ประกาศงาน ({jobs.length})
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'กำลังโหลด...' : '↻ โหลดใหม่'}
          </button>
        </div>

        {tab === 'companies' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <form onSubmit={submitCompany} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">เพิ่มบริษัท</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">บริษัทจะปรากฏในหน้าจับคู่งานและเป็นเจ้าของประกาศงาน</p>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className={labelClass}>ชื่อบริษัท *</span>
                  <input
                    value={companyForm.name}
                    onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
                    placeholder="เช่น Nova Software Studio"
                    className={inputClass}
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>อุตสาหกรรม</span>
                    <input
                      value={companyForm.industry}
                      onChange={(event) => setCompanyForm({ ...companyForm, industry: event.target.value })}
                      placeholder="Software & Product"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>ที่ตั้ง</span>
                    <input
                      value={companyForm.location}
                      onChange={(event) => setCompanyForm({ ...companyForm, location: event.target.value })}
                      placeholder="เลย / ขอนแก่น / รีโมท"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>เว็บไซต์</span>
                  <input
                    value={companyForm.website}
                    onChange={(event) => setCompanyForm({ ...companyForm, website: event.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>คำอธิบายบริษัท</span>
                  <textarea
                    value={companyForm.description}
                    onChange={(event) => setCompanyForm({ ...companyForm, description: event.target.value })}
                    rows={4}
                    placeholder="ธุรกิจของบริษัท บรรยากาศการทำงาน และจุดเด่น"
                    className={`${inputClass} resize-y`}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? 'กำลังบันทึก...' : '+ เพิ่มบริษัท'}
              </button>
            </form>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">รายชื่อบริษัท</h2>
                <span className="text-[11px] font-extrabold text-slate-400">{companies.length} แห่ง</span>
              </div>

              {loading ? (
                <div className="mt-4 space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-bold text-slate-400">
                  ยังไม่มีบริษัทในฐานข้อมูล — เพิ่มบริษัทแรกจากแบบฟอร์มด้านซ้าย
                </p>
              ) : (
                <div className="mt-4 max-h-[560px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                  {companies.map((company) => (
                    <div key={company.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900">{company.name}</p>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                            {[company.industry, company.location].filter(Boolean).join(' · ') || 'ไม่ระบุ'}
                          </p>
                          <p className="mt-1 text-[10px] font-extrabold text-blue-600">
                            {jobCountByCompany.get(company.id) ?? 0} ตำแหน่ง
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCompany(company)}
                          disabled={busy}
                          className="flex-shrink-0 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          ลบ
                        </button>
                      </div>
                      {company.description && (
                        <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                          {company.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <form onSubmit={submitJob} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">เพิ่มประกาศงาน</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">งานจะแสดงในหน้าจับคู่งานทันทีเมื่อเปิดรับ</p>

              {companies.length === 0 && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-bold text-amber-800">
                  ต้องเพิ่มบริษัทก่อนจึงจะสร้างประกาศงานได้
                </p>
              )}

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className={labelClass}>บริษัท *</span>
                  <select
                    value={jobForm.company_id}
                    onChange={(event) => setJobForm({ ...jobForm, company_id: event.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">เลือกบริษัท</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>ชื่องาน *</span>
                  <input
                    value={jobForm.title}
                    onChange={(event) => setJobForm({ ...jobForm, title: event.target.value })}
                    placeholder="เช่น Frontend Developer"
                    className={inputClass}
                    required
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>รายละเอียดงาน</span>
                  <textarea
                    value={jobForm.description}
                    onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })}
                    rows={3}
                    placeholder="ภาพรวมของตำแหน่งและสิ่งที่ผู้สมัครจะได้ทำ"
                    className={`${inputClass} resize-y`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>หน้าที่ความรับผิดชอบ (หนึ่งบรรทัดต่อข้อ)</span>
                  <textarea
                    value={jobForm.responsibilities}
                    onChange={(event) => setJobForm({ ...jobForm, responsibilities: event.target.value })}
                    rows={3}
                    placeholder={'พัฒนา UI ด้วย React\nเชื่อมต่อ API\nร่วมรีวิวโค้ด'}
                    className={`${inputClass} resize-y`}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>ทำเล</span>
                    <input
                      value={jobForm.location}
                      onChange={(event) => setJobForm({ ...jobForm, location: event.target.value })}
                      placeholder="เลย / กรุงเทพมหานคร / รีโมท"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>รูปแบบการทำงาน</span>
                    <select
                      value={jobForm.work_mode}
                      onChange={(event) => setJobForm({ ...jobForm, work_mode: event.target.value as WorkMode })}
                      className={inputClass}
                    >
                      <option value="onsite">{WORK_MODE_LABELS.onsite}</option>
                      <option value="hybrid">{WORK_MODE_LABELS.hybrid}</option>
                      <option value="remote">{WORK_MODE_LABELS.remote}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>ประเภทการจ้าง</span>
                    <input
                      value={jobForm.employment_type}
                      onChange={(event) => setJobForm({ ...jobForm, employment_type: event.target.value })}
                      placeholder="พนักงานประจำ / ฝึกงาน / พาร์ทไทม์"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>ช่วงเงินเดือน</span>
                    <input
                      value={jobForm.salary_range}
                      onChange={(event) => setJobForm({ ...jobForm, salary_range: event.target.value })}
                      placeholder="20,000 – 35,000 บาท"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>ทักษะที่ต้องการ (คั่นด้วยเครื่องหมายจุลภาค)</span>
                  <input
                    value={jobForm.required_skills}
                    onChange={(event) => setJobForm({ ...jobForm, required_skills: event.target.value })}
                    placeholder="React, JavaScript, HTML, CSS, Git"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>ทักษะเสริม (คั่นด้วยเครื่องหมายจุลภาค)</span>
                  <input
                    value={jobForm.nice_to_have}
                    onChange={(event) => setJobForm({ ...jobForm, nice_to_have: event.target.value })}
                    placeholder="TypeScript, Next.js, Figma"
                    className={inputClass}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>สายอาชีพที่เกี่ยวข้อง</span>
                    <select
                      value={jobForm.career_en}
                      onChange={(event) => setJobForm({ ...jobForm, career_en: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">ไม่ระบุ</option>
                      {CAREER_OPTIONS.map((career) => (
                        <option key={career.value} value={career.value}>
                          {career.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>ลิงก์สมัคร / อีเมลติดต่อ</span>
                    <input
                      value={jobForm.apply_url}
                      onChange={(event) => setJobForm({ ...jobForm, apply_url: event.target.value })}
                      placeholder="https://... หรือ mailto:hr@company.com"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || companies.length === 0}
                className="mt-5 w-full rounded-full bg-emerald-600 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? 'กำลังบันทึก...' : '+ เพิ่มประกาศงาน'}
              </button>
            </form>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">ประกาศงานทั้งหมด</h2>
                <span className="text-[11px] font-extrabold text-slate-400">{jobs.length} ตำแหน่ง</span>
              </div>

              {loading ? (
                <div className="mt-4 space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-bold text-slate-400">
                  ยังไม่มีประกาศงาน — เพิ่มประกาศแรกจากแบบฟอร์มด้านซ้าย
                </p>
              ) : (
                <div className="mt-4 max-h-[640px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                  {jobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900">{job.title}</p>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                            {job.company?.name ?? 'ไม่ระบุบริษัท'} · {job.location || 'ไม่ระบุทำเล'} · {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                job.is_active === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {job.is_active === false ? 'ปิดรับ' : 'เปิดรับ'}
                            </span>
                            {job.career_en && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-extrabold text-blue-700">
                                {careerLabel(job.career_en)}
                              </span>
                            )}
                            {(job.required_skills ?? []).slice(0, 3).map((skill) => (
                              <span key={skill} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleJob(job)}
                            disabled={busy}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          >
                            {job.is_active === false ? 'เปิดรับ' : 'ปิดรับ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeJob(job)}
                            disabled={busy}
                            className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 p-5 ${tone}`}>
      <p className="text-2xl font-black">{value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] font-bold opacity-80">{label}</p>
    </div>
  );
}
