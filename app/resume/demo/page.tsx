'use client';

import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import ResumePreview from '../../components/ResumePreview';
import type { ResumeData } from '../../../lib/platform.types';

const DEMO_RESUME: ResumeData = {
  fullName: 'สมชาย ใจดี',
  headline: 'Frontend Developer & UI/UX Designer',
  email: 'somchai@example.com',
  phone: '081-234-5678',
  location: 'จังหวัดเลย',
  website: 'https://github.com/somchaidev',
  github: 'github.com/somchaidev',
  summary: 'นักพัฒนาฟรอนท์เอนด์ที่มีความสนใจในการสร้างประสบการณ์ผู้ใช้ที่ดี มีทักษะด้าน React, TypeScript, และ Figma ต้องการเติบโตในสายอาชีพนักพัฒนาซอฟต์แวร์',
  skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Figma', 'Git', 'UI/UX Design'],
  experiences: [
    {
      id: 'exp-1',
      role: 'Frontend Intern',
      company: 'Nova Software Studio',
      start: 'มิ.ย. 2567',
      end: 'ก.ย. 2567',
      details: 'พัฒนาหน้าเว็บด้วย React และ Tailwind CSS ร่วมกับทีมออกแบบเพื่อส่งมอบฟีเจอร์ใหม่ให้ลูกค้า',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'วิทยาศาสตรบัณฑิต สาขาวิทยาการคอมพิวเตอร์',
      institution: '',
      year: '2564 – 2568',
      gpa: '3.45',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'ระบบจัดการพอร์ตโฟลิโอ',
      detail: 'เว็บแอปสำหรับอัปโหลดผลงานและให้ AI วิเคราะห์ทักษะ พัฒนาด้วย Next.js และ Supabase',
      link: 'https://github.com/somchaidev/portfolio-system',
    },
  ],
  certifications: ['Google UX Design Certificate 2025', 'React Fundamentals 2024'],
};

const DEMO_SHARE_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/resume/demo`;

export default function ResumeDemoPage() {
  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
              </svg>
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">
              LRU <span className="text-blue-600">Portfolio</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold text-blue-700">
              โหมดสาธิต
            </span>
            <Link href="/resume" className="rounded-full bg-blue-600 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-blue-700">
              สร้างเรซูเม่ของคุณ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">Resume Demo</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">ตัวอย่างเรซูเม่สาธิต</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              นี่คือตัวอย่างเรซูเม่ที่สร้างจากระบบ ผู้ประกอบการสามารถสแกน QR Code เพื่อดูโปรไฟล์ได้ทันที
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/resume" className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-blue-700">
              สร้างเรซูเม่จริง
            </Link>
            <Link href="/jobs" className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700">
              ดูงานที่เปิดรับ
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            <div className="resume-sheet mx-auto w-full max-w-[210mm] rounded-2xl border border-slate-200 bg-white px-8 py-8 text-slate-800 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:px-10 sm:py-10">
              <ResumePreview data={DEMO_RESUME} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-black text-slate-900">แชร์ด้วย QR Code</h2>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">ตัวอย่าง QR Code สำหรับแชร์เรซูเม่สาธิต</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-extrabold text-violet-700">ตัวอย่าง</span>
              </div>

              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <QRCodeCanvas value={DEMO_SHARE_URL || 'https://lru-portfolio.example.com/resume/demo'} size={160} level="M" marginSize={2} title="QR Code เรซูเม่ตัวอย่าง" />
                </div>
                <p className="break-all text-center text-[10px] font-medium text-slate-500">{DEMO_SHARE_URL || 'https://lru-portfolio.example.com/resume/demo'}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(DEMO_SHARE_URL);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    คัดลอกลิงก์
                  </button>
                  <Link href="/resume" className="rounded-full bg-violet-600 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-violet-700">
                    สร้างจริง
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-4">เกี่ยวกับตัวอย่างนี้</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>เรซูเม่นี้เป็นข้อมูลตัวอย่างสำหรับการสาธิตเท่านั้น</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>ผู้ใช้จริงสามารถสร้างเรซูเม่ของตนเองได้ที่หน้า <Link href="/resume" className="text-blue-600 hover:underline font-medium">สร้างเรซูเม่</Link></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>QR Code จะเชื่อมโยงไปยังหน้าเรซูเม่สาธารณะที่ผู้ประกอบการสแกนดูได้ทันที</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
