'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type SampleCase = {
  id: string;
  tabLabel: string;
  industry: string;
  recommendedRole: string;
  matchConfidence: number;
  evidenceFiles: { name: string; type: 'PDF' | 'IMG' }[];
  extractedSkills: string[];
  topJobs: { title: string; company: string; match: number }[];
};

const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'tech',
    tabLabel: 'สายเทคโนโลยี',
    industry: 'เทคโนโลยีและดิจิทัล',
    recommendedRole: 'Full-Stack Web Developer',
    matchConfidence: 91,
    evidenceFiles: [
      { name: 'Certificate_NextJS_2026.pdf', type: 'PDF' },
      { name: 'System_Architecture.png', type: 'IMG' },
    ],
    extractedSkills: ['React / Next.js', 'TypeScript', 'การออกแบบฐานข้อมูล', 'การแก้ปัญหาเชิงระบบ'],
    topJobs: [
      { title: 'Frontend Developer', company: 'TechNova Co., Ltd.', match: 94 },
      { title: 'Software Engineer', company: 'CloudScale Thailand', match: 88 },
    ],
  },
  {
    id: 'business',
    tabLabel: 'สายธุรกิจและการตลาด',
    industry: 'ธุรกิจ การเงิน และการจัดการ',
    recommendedRole: 'Digital Marketing & Data Analyst',
    matchConfidence: 89,
    evidenceFiles: [
      { name: 'Campaign_Performance_Q3.pdf', type: 'PDF' },
      { name: 'Sales_Dashboard.png', type: 'IMG' },
    ],
    extractedSkills: ['วิเคราะห์ข้อมูลการตลาด', 'วางแผนกลยุทธ์', 'การสื่อสารและนำเสนอ', 'บริหารโครงการ'],
    topJobs: [
      { title: 'Performance Marketing', company: 'GrowthLab Agency', match: 92 },
      { title: 'Business Analyst', company: 'Siam Retail Group', match: 85 },
    ],
  },
  {
    id: 'general',
    tabLabel: 'สายวิศวกรรม / การศึกษา',
    industry: 'วิศวกรรม อุตสาหกรรม และวิชาการ',
    recommendedRole: 'Project & Operations Coordinator',
    matchConfidence: 87,
    evidenceFiles: [
      { name: 'Safety_&_ISO_Cert.pdf', type: 'PDF' },
      { name: 'Workflow_Report.pdf', type: 'PDF' },
    ],
    extractedSkills: ['การบริหารจัดการเวลา', 'ควบคุมคุณภาพงาน', 'ประสานงานข้ามฝ่าย', 'ความรับผิดชอบสูง'],
    topJobs: [
      { title: 'Project Coordinator', company: 'Eastern Logistics PCL', match: 90 },
      { title: 'Training Specialist', company: 'EduPro Academy', match: 84 },
    ],
  },
];

export default function HeroShowcaseCard() {
  const [activeTab, setActiveTab] = useState<string>('tech');
  const current = SAMPLE_CASES.find((c) => c.id === activeTab) || SAMPLE_CASES[0];

  return (
    <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
      <div
        aria-hidden="true"
        className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-cyan-400/20 blur-xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl border border-blue-100 bg-blue-50/70 shadow-sm transition-transform duration-500"
      />

      <div className="relative -rotate-1 rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md transition-all duration-300 hover:rotate-0">
        <div className="mb-5 flex items-center justify-between gap-1 rounded-xl bg-slate-100 p-1">
          {SAMPLE_CASES.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {current.industry}
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-slate-900">
              {current.recommendedRole}
            </h3>
          </div>
          <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-1.5 text-right">
            <div className="text-[10px] font-medium text-emerald-700">ความสอดคล้อง</div>
            <div className="text-base font-extrabold text-emerald-600">
              {current.matchConfidence}%
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            หลักฐานที่ AI ตรวจสอบ
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {current.evidenceFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    file.type === 'PDF'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {file.type}
                </span>
                <span className="max-w-[160px] truncate font-medium">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            ทักษะเด่นที่สกัดได้ (ประเมิน 6 มิติ)
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {current.extractedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50/90 p-3.5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">ตำแหน่งงานที่แนะนำ</span>
            <span className="text-[11px] text-slate-400">อัปเดตเรียลไทม์</span>
          </div>
          <div className="space-y-2">
            {current.topJobs.map((job) => (
              <div
                key={job.title}
                className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{job.title}</div>
                  <div className="text-[11px] text-slate-500">{job.company}</div>
                </div>
                <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                  {job.match}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm12 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 16a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm13 0h2m-2 4h4m-4-2h4"
                />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold">เรซูเม่พร้อม QR Code สาธารณะ</div>
              <div className="text-[11px] text-slate-400">
                สแกนเปิดดูทักษะและผลงานได้ทันที
              </div>
            </div>
          </div>
          <Link
            href="/resume/demo"
            className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-500"
          >
            ดูตัวอย่าง →
          </Link>
        </div>
      </div>
    </div>
  );
}