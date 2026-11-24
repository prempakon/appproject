'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import ResumePreview from '../components/ResumePreview';
import { downloadElementAsPdf } from '../../lib/pdf';
import {
  emptyResume,
  loadResumeDraft,
  makeResumeSlug,
  newId,
  normalizeResume,
  resumeSharePath,
  savePublicResume,
  saveResumeDraft,
} from '../../lib/resume';
import type { ResumeData } from '../../lib/platform.types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

const labelClass = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

type Message = { type: 'success' | 'warning' | 'info'; text: string } | null;

export default function ResumeBuilderPage() {
  const router = useRouter();
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [skillsText, setSkillsText] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ตรวจสอบการยืนยันตัวตนก่อน - หากไม่มี session จริงให้เด้งล็อกอินทันที
    (async () => {
      try {
        const { getSessionUser } = await import('../../lib/auth');
        const user = await getSessionUser();
        if (!user) {
          router.push('/login?redirect=' + window.location.pathname);
        }
      } catch {
        router.push('/login');
      }
    })();

    let cancelled = false;

    (async () => {
      let base = loadResumeDraft();
      let localProfile: Record<string, unknown> = {};
      try {
        const raw = window.localStorage.getItem('userProfile');
        if (raw) localProfile = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Ignore malformed local profile.
      }

      if (!base) {
        base = emptyResume({
          fullName: typeof localProfile.name === 'string' ? localProfile.name : '',
          email: typeof localProfile.email === 'string' ? localProfile.email : '',
          location: typeof localProfile.major === 'string' ? localProfile.major : '',
          headline: typeof localProfile.major === 'string' ? localProfile.major : '',
          summary: typeof localProfile.bio === 'string' && localProfile.bio !== 'ยังไม่ได้กรอก' ? localProfile.bio : '',
          github: typeof localProfile.githubLink === 'string' ? localProfile.githubLink : '',
        });
      }

      try {
        const { getSessionUser } = await import('../../lib/auth');
        const { getMyProfile } = await import('../../lib/profiles');
        const user = await getSessionUser();
        if (user) {
          if (!cancelled) setUserId(user.id);
          const profile = await getMyProfile(user.id);
          if (profile && !cancelled) {
            base = {
              ...base,
              fullName: base.fullName || profile.name,
              email: base.email || profile.email,
              headline: base.headline || profile.major || '',
              location: base.location || profile.institution || '',
              summary: base.summary || (profile.bio !== 'ยังไม่ได้กรอก' ? profile.bio : ''),
              github: base.github || profile.github_link || '',
            };
          }
        }
      } catch {
        // Continue with local data when Supabase is unavailable.
      }

      if (!cancelled) {
        const clean = normalizeResume(base);
        setResume(clean);
        setSkillsText(clean.skills.join(', '));
        setCertificationsText(clean.certifications.join('\n'));
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) saveResumeDraft(resume);
  }, [resume, ready]);

  function update<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setResume((prev) => ({ ...prev, [key]: value }));
  }

  const addExperience = () => {
    setResume((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { id: newId(), role: '', company: '', start: '', end: '', details: '' },
      ],
    }));
  };

  const addEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [...prev.education, { id: newId(), degree: '', institution: '', year: '', gpa: '' }],
    }));
  };

  const addProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: newId(), name: '', detail: '', link: '' }],
    }));
  };

  const handleShare = async () => {
    setBusy(true);
    setMessage(null);
    const clean = normalizeResume(resume);
    saveResumeDraft(clean);
    const origin = window.location.origin;

    try {
      if (userId) {
        const nextSlug = slug ?? makeResumeSlug();
        try {
          const saved = await savePublicResume(userId, clean, nextSlug);
          setSlug(saved.slug);
          setShareUrl(`${origin}${resumeSharePath(clean, saved.slug, saved.id)}`);
          setMessage({ type: 'success', text: 'บันทึกเรซูเม่และสร้างลิงก์แชร์เรียบร้อยแล้ว' });
        } catch (err) {
          setShareUrl(`${origin}${resumeSharePath(clean)}`);
          setMessage({
            type: 'warning',
            text: `บันทึกออนไลน์ไม่สำเร็จ (${err instanceof Error ? err.message : 'ฐานข้อมูลยังไม่พร้อม'}) จึงสร้าง QR ที่ฝังข้อมูลในลิงก์แทน`,
          });
        }
      } else {
        setShareUrl(`${origin}${resumeSharePath(clean)}`);
        setMessage({
          type: 'info',
          text: 'ยังไม่ได้เข้าสู่ระบบ: QR นี้ฝังข้อมูลเรซูเม่ไว้ในลิงก์โดยตรง ใช้แชร์ได้ทันที แต่แนะนำให้เข้าสู่ระบบเพื่อลิงก์ที่สั้นและอัปเดตได้',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage({ type: 'success', text: 'คัดลอกลิงก์เรซูเม่แล้ว' });
    } catch {
      setMessage({ type: 'warning', text: 'คัดลอกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกลิงก์ด้วยตัวเอง' });
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `resume-qr-${(resume.fullName || 'lru').replace(/\s+/g, '-')}.png`;
    link.click();
  };

  const handlePdf = async () => {
    if (!previewRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadElementAsPdf(
        previewRef.current,
        `resume-${(resume.fullName || 'lru-student').replace(/\s+/g, '-')}.pdf`,
      );
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div data-print-hide className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Resume & QR</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">สร้างเรซูเม่และ QR Code</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              กรอกข้อมูลครั้งเดียว ได้เรซูเม่พร้อมพิมพ์ ดาวน์โหลด PDF และ QR Code สำหรับให้ผู้ประกอบการสแกนดูโปรไฟล์
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/main" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700">
              ← กลับหน้าหลัก
            </Link>
            <button
              type="button"
              onClick={handleShare}
              disabled={busy}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'กำลังสร้างลิงก์...' : 'บันทึกและสร้าง QR'}
            </button>
          </div>
        </div>

        {message && (
          <p
            data-print-hide
            className={`mb-6 rounded-xl border px-4 py-3 text-xs font-bold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div data-print-hide className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-sm font-black text-slate-900">ข้อมูลส่วนตัว</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ชื่อ-นามสกุล" value={resume.fullName} onChange={(v) => update('fullName', v)} placeholder="เช่น สมชาย ใจดี" />
                <Field label="ตำแหน่ง / สายอาชีพที่สนใจ" value={resume.headline} onChange={(v) => update('headline', v)} placeholder="เช่น Frontend Developer" />
                <Field label="อีเมล" type="email" value={resume.email} onChange={(v) => update('email', v)} placeholder="name@lru.ac.th" />
                <Field label="เบอร์โทร" value={resume.phone} onChange={(v) => update('phone', v)} placeholder="08x-xxx-xxxx" />
                <Field label="จังหวัด / ที่อยู่" value={resume.location} onChange={(v) => update('location', v)} placeholder="เลย" />
                <Field label="เว็บไซต์ / พอร์ตโฟลิโอ" value={resume.website} onChange={(v) => update('website', v)} placeholder="https://..." />
                <Field label="GitHub" value={resume.github} onChange={(v) => update('github', v)} placeholder="github.com/username" />
              </div>
              <label className="mt-4 block">
                <span className={labelClass}>สรุปโปรไฟล์</span>
                <textarea
                  value={resume.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  rows={4}
                  placeholder="เล่าสั้น ๆ ว่าคุณสนใจอะไร มีจุดแข็งด้านไหน และกำลังมองหาโอกาสแบบใด"
                  className={`${inputClass} resize-y`}
                />
              </label>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-sm font-black text-slate-900">ทักษะและใบรับรอง</h2>
              <label className="block">
                <span className={labelClass}>ทักษะ (คั่นด้วยเครื่องหมายจุลภาคหรือขึ้นบรรทัดใหม่)</span>
                <textarea
                  value={skillsText}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSkillsText(value);
                    update(
                      'skills',
                      value
                        .split(/[,\n]/)
                        .map((skill) => skill.trim())
                        .filter(Boolean),
                    );
                  }}
                  rows={3}
                  placeholder="React, TypeScript, SQL, Figma, การสื่อสาร"
                  className={`${inputClass} resize-y`}
                />
              </label>
              <label className="mt-4 block">
                <span className={labelClass}>ใบรับรอง / การอบรม (หนึ่งรายการต่อบรรทัด)</span>
                <textarea
                  value={certificationsText}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCertificationsText(value);
                    update(
                      'certifications',
                      value
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    );
                  }}
                  rows={3}
                  placeholder="Google Data Analytics Certificate 2025"
                  className={`${inputClass} resize-y`}
                />
              </label>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">ประสบการณ์</h2>
                <button type="button" onClick={addExperience} className="rounded-full bg-blue-50 px-3.5 py-2 text-[11px] font-extrabold text-blue-700 transition-colors hover:bg-blue-100">
                  + เพิ่มประสบการณ์
                </button>
              </div>
              <div className="space-y-5">
                {resume.experiences.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-bold text-slate-400">
                    ยังไม่มีประสบการณ์ — เพิ่มการฝึกงาน งานพาร์ทไทม์ หรือกิจกรรมที่เกี่ยวข้อง
                  </p>
                )}
                {resume.experiences.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-slate-500">รายการที่ {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => update('experiences', resume.experiences.filter((experience) => experience.id !== item.id))}
                        className="text-[11px] font-extrabold text-red-500 hover:text-red-700"
                      >
                        ลบ
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="ตำแหน่ง"
                        value={item.role}
                        onChange={(v) => update('experiences', resume.experiences.map((experience) => (experience.id === item.id ? { ...experience, role: v } : experience)))}
                        placeholder="Frontend Intern"
                      />
                      <Field
                        label="องค์กร / บริษัท"
                        value={item.company}
                        onChange={(v) => update('experiences', resume.experiences.map((experience) => (experience.id === item.id ? { ...experience, company: v } : experience)))}
                        placeholder="ชื่อบริษัท"
                      />
                      <Field
                        label="เริ่ม"
                        value={item.start}
                        onChange={(v) => update('experiences', resume.experiences.map((experience) => (experience.id === item.id ? { ...experience, start: v } : experience)))}
                        placeholder="มิ.ย. 2568"
                      />
                      <Field
                        label="สิ้นสุด"
                        value={item.end}
                        onChange={(v) => update('experiences', resume.experiences.map((experience) => (experience.id === item.id ? { ...experience, end: v } : experience)))}
                        placeholder="ปัจจุบัน"
                      />
                    </div>
                    <label className="mt-3 block">
                      <span className={labelClass}>รายละเอียด / ผลลัพธ์</span>
                      <textarea
                        value={item.details}
                        onChange={(event) => update('experiences', resume.experiences.map((experience) => (experience.id === item.id ? { ...experience, details: event.target.value } : experience)))}
                        rows={3}
                        placeholder="อธิบายสิ่งที่ทำและผลลัพธ์ที่วัดได้"
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">การศึกษา</h2>
                <button type="button" onClick={addEducation} className="rounded-full bg-blue-50 px-3.5 py-2 text-[11px] font-extrabold text-blue-700 transition-colors hover:bg-blue-100">
                  + เพิ่มการศึกษา
                </button>
              </div>
              <div className="space-y-5">
                {resume.education.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-bold text-slate-400">
                    เพิ่มประวัติการศึกษาเพื่อให้เรซูเม่สมบูรณ์
                  </p>
                )}
                {resume.education.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-slate-500">รายการที่ {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => update('education', resume.education.filter((education) => education.id !== item.id))}
                        className="text-[11px] font-extrabold text-red-500 hover:text-red-700"
                      >
                        ลบ
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="สาขา / ระดับการศึกษา" value={item.degree} onChange={(v) => update('education', resume.education.map((education) => (education.id === item.id ? { ...education, degree: v } : education)))} placeholder="วิทยาศาสตรบัณฑิต สาขาวิทยาการคอมพิวเตอร์" />
                      <Field label="สถานศึกษา" value={item.institution} onChange={(v) => update('education', resume.education.map((education) => (education.id === item.id ? { ...education, institution: v } : education)))} placeholder="มหาวิทยาลัยหรือสถาบันการศึกษา" />
                      <Field label="ปีที่จบ / ช่วงปี" value={item.year} onChange={(v) => update('education', resume.education.map((education) => (education.id === item.id ? { ...education, year: v } : education)))} placeholder="2564 – 2568" />
                      <Field label="GPA" value={item.gpa} onChange={(v) => update('education', resume.education.map((education) => (education.id === item.id ? { ...education, gpa: v } : education)))} placeholder="3.45" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">ผลงาน / โปรเจกต์</h2>
                <button type="button" onClick={addProject} className="rounded-full bg-blue-50 px-3.5 py-2 text-[11px] font-extrabold text-blue-700 transition-colors hover:bg-blue-100">
                  + เพิ่มโปรเจกต์
                </button>
              </div>
              <div className="space-y-5">
                {resume.projects.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-bold text-slate-400">
                    เพิ่มโปรเจกต์ที่คุณภาคภูมิใจ พร้อมลิงก์หรือผลลัพธ์
                  </p>
                )}
                {resume.projects.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-slate-500">รายการที่ {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => update('projects', resume.projects.filter((project) => project.id !== item.id))}
                        className="text-[11px] font-extrabold text-red-500 hover:text-red-700"
                      >
                        ลบ
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="ชื่อโปรเจกต์" value={item.name} onChange={(v) => update('projects', resume.projects.map((project) => (project.id === item.id ? { ...project, name: v } : project)))} placeholder="ระบบวิเคราะห์พอร์ตโฟลิโอ" />
                      <Field label="ลิงก์" value={item.link} onChange={(v) => update('projects', resume.projects.map((project) => (project.id === item.id ? { ...project, link: v } : project)))} placeholder="https://github.com/..." />
                    </div>
                    <label className="mt-3 block">
                      <span className={labelClass}>รายละเอียด</span>
                      <textarea
                        value={item.detail}
                        onChange={(event) => update('projects', resume.projects.map((project) => (project.id === item.id ? { ...project, detail: event.target.value } : project)))}
                        rows={3}
                        placeholder="บทบาท เทคโนโลยีที่ใช้ และผลลัพธ์"
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div data-print-hide className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm lg:sticky lg:top-24 lg:z-10">
              <p className="text-xs font-extrabold text-slate-500">ตัวอย่างเรซูเม่</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-full border border-slate-200 px-3.5 py-2 text-[11px] font-extrabold text-slate-600 transition-colors hover:bg-slate-50">
                  พิมพ์
                </button>
                <button type="button" onClick={handlePdf} disabled={pdfBusy} className="rounded-full bg-slate-900 px-3.5 py-2 text-[11px] font-extrabold text-white transition-colors hover:bg-slate-800 disabled:opacity-60">
                  {pdfBusy ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
                </button>
              </div>
            </div>

            <div ref={previewRef}>
              <ResumePreview data={resume} />
            </div>

            <div data-print-hide className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">แชร์ด้วย QR Code</h2>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">ให้ผู้ประกอบการสแกนเพื่อเปิดเรซูเม่สาธารณะ</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-extrabold text-violet-700">ฟรี</span>
              </div>

              {shareUrl ? (
                <div className="mt-5 space-y-4">
                  {shareUrl.length <= 1800 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <QRCodeCanvas ref={qrRef} value={shareUrl} size={180} level="M" marginSize={2} title="QR Code เรซูเม่" />
                      </div>
                      <p className="break-all text-center text-[10px] font-medium text-slate-500">{shareUrl}</p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                      ข้อมูลยาวเกินกว่าจะใส่ใน QR Code — กรุณาเข้าสู่ระบบและบันทึกเรซูเม่เพื่อสร้างลิงก์สั้น
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={copyShareUrl} className="rounded-full border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:bg-slate-50">
                      คัดลอกลิงก์
                    </button>
                    <button type="button" onClick={downloadQr} disabled={shareUrl.length > 1800} className="rounded-full bg-violet-600 px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-violet-700 disabled:opacity-50">
                      ดาวน์โหลด QR
                    </button>
                  </div>
                  <Link href={shareUrl} target="_blank" rel="noreferrer" className="block text-center text-[11px] font-extrabold text-blue-600 hover:underline">
                    เปิดหน้าเรซูเม่สาธารณะ →
                  </Link>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-xs font-bold text-slate-500">กด “บันทึกและสร้าง QR” ด้านบน เพื่อสร้างลิงก์แชร์</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">ระบบจะบันทึกลงบัญชีของคุณ หรือสร้างลิงก์ฝังข้อมูลหากยังไม่เข้าสู่ระบบ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
