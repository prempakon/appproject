'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import RadarChart from './RadarChart';

type CareerTab = 'it' | 'business' | 'education';

const CAREER_PRESETS: Record<
  CareerTab,
  { label: string; values: number[]; jobs: { title: string; company: string; match: number }[] }
> = {
  it: {
    label: 'เทคโนโลยี / IT',
    values: [88, 82, 75, 70, 78, 85],
    jobs: [
      { title: 'Frontend Developer', company: 'Nova Software Studio', match: 92 },
      { title: 'Junior Data Analyst', company: 'DataWise Analytics', match: 78 },
    ],
  },
  business: {
    label: 'ธุรกิจและการเงิน',
    values: [65, 88, 90, 85, 80, 82],
    jobs: [
      { title: 'Financial Analyst', company: 'อีสานการเงิน Advisory', match: 85 },
      { title: 'Marketing Strategist', company: 'Loei Creative House', match: 72 },
    ],
  },
  education: {
    label: 'การศึกษาและวิศวกรรม',
    values: [78, 72, 80, 85, 88, 74],
    jobs: [
      { title: 'Civil Engineer', company: 'SecureNorth', match: 80 },
      { title: 'Teacher / Educator', company: 'LearnLoop EdTech', match: 74 },
    ],
  },
};

const RADAR_LABELS = [
  'ปฏิบัติงานเฉพาะทาง',
  'การแก้ปัญหา',
  'การสื่อสาร',
  'บริหารจัดการ',
  'การปรับตัวเรียนรู้',
  'ความรับผิดชอบ',
];

export default function CareerRadarPreview() {
  const [activeTab, setActiveTab] = useState<CareerTab>('it');
  const preset = CAREER_PRESETS[activeTab];

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-blue-200/50 via-indigo-100/40 to-amber-100/40 blur-2xl" />
      <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_30px_80px_-30px_rgba(30,64,175,0.35)] backdrop-blur">

        {/* Compact top pill-tab bar */}
        <div className="flex gap-1 px-2 py-1 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
          {(['it', 'business', 'education'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {CAREER_PRESETS[tab].label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="lg:w-1/3 flex flex-col items-center gap-4">
            <div className="w-full max-w-[300px]">
              <RadarChart
                labels={RADAR_LABELS}
                values={preset.values}
                size={320}
                color="#2563eb"
                fillColor="rgba(37, 99, 235, 0.18)"
                showValues
              />
            </div>
            <p className="text-center text-xs font-medium text-slate-500">
              คะแนนรวม {Math.round(preset.values.reduce((a, b) => a + b, 0) / preset.values.length)}%
            </p>
          </div>

          <div className="flex-1 space-y-3">
            {/* Matched job recommendations */}
            <div className="space-y-2">
              {preset.jobs.map((job) => (
                <div
                  key={job.title}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-100 bg-white"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{job.title}</p>
                    <p className="text-[10px] text-slate-500">{job.company}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                    {job.match}% Match
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive footer bar */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-xs font-bold text-slate-900">สร้างเรซูเม่พร้อม QR Code</p>
                <p className="text-[10px] text-slate-500">
                  ให้ผู้ประกอบการสแกนดูโปรไฟล์ได้ทันที
                </p>
              </div>
              <Link
                href="/resume/demo"
                className="px-3 py-1.5 rounded-full bg-blue-600 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors"
              >
                ดูตัวอย่าง →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
