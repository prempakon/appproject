'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RadarChart from '../components/RadarChart';
import { loadJobBoard } from '../../lib/jobs';
import { rankJobs, matchTone } from '../../lib/jobMatching';
import { loadResumeDraft } from '../../lib/resume';
import { careerLabel } from '../../lib/careers';
import {
  buildCareerReadiness,
  buildScoreSnapshot,
  buildSkillFrequency,
  collectUserSkills,
  readinessSummary,
  type AnalysisLike,
} from '../../lib/careerAnalytics';
import type { ResumeData } from '../../lib/platform.types';
import type { MyAnalysisRow } from '../../lib/profiles';

const RADAR_LABELS = [
  'ทักษะเทคนิค',
  'ทักษะทั่วไป',
  'การบริหารจัดการ',
  'ความแม่นยำ',
  'การสื่อสาร',
  'ความคิดสร้างสรรค์',
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<MyAnalysisRow[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof loadJobBoard>>['jobs']>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  // --- Auth check: redirect unauthenticated visitors immediately ---
  useEffect(() => {
    let cancelled = false;

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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const draft = loadResumeDraft();
      let rows: MyAnalysisRow[] = [];
      let hasUser = false;

      try {
        const { getSessionUser } = await import('../../lib/auth');
        const user = await getSessionUser();
        if (user) {
          hasUser = true;
          const { listMyAnalyses } = await import('../../lib/profiles');
          rows = await listMyAnalyses(user.id);
        }
      } catch {
        // Supabase unavailable: fall back to the local resume draft.
      }

      const board = await loadJobBoard();
      if (cancelled) return;

      setAnalyses(rows);
      setResume(draft);
      setJobs(board.jobs);
      setSignedIn(hasUser);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const skills = useMemo(
    () => collectUserSkills(analyses as unknown as AnalysisLike[], resume),
    [analyses, resume],
  );

  const snapshot = useMemo(
    () => buildScoreSnapshot(analyses as unknown as AnalysisLike[], resume),
    [analyses, resume],
  );

  const matches = useMemo(
    () => rankJobs(jobs, { userSkills: skills, preferredCareer: snapshot.careerEn, preferredLocation: resume?.location ?? '' }),
    [jobs, skills, snapshot.careerEn, resume],
  );

  const summary = useMemo(() => readinessSummary(matches), [matches]);
  const readiness = useMemo(() => buildCareerReadiness(matches), [matches]);
  const frequency = useMemo(
    () => buildSkillFrequency(analyses as unknown as AnalysisLike[], resume),
    [analyses, resume],
  );

  const radarValues = [
    snapshot.technical,
    snapshot.soft,
    snapshot.management,
    snapshot.accuracy,
    snapshot.communication,
    snapshot.creativity,
  ];
  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;
  const hasData = Boolean(latestAnalysis || resume);
  const maxFrequency = frequency[0]?.count ?? 1;

  const statCards = [
    { label: 'คะแนนทักษะเทคนิค', value: snapshot.technical, tone: 'bg-blue-500' },
    { label: 'คะแนนทักษะทั่วไป', value: snapshot.soft, tone: 'bg-violet-500' },
    { label: 'คะแนนการบริหารจัดการ', value: snapshot.management, tone: 'bg-indigo-500' },
    { label: 'ความน่าเชื่อถือของข้อมูล', value: snapshot.accuracy, tone: 'bg-emerald-500' },
    { label: 'คะแนนการสื่อสาร', value: snapshot.communication, tone: 'bg-amber-500' },
    { label: 'คะแนนความคิดสร้างสรรค์', value: snapshot.creativity, tone: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {!signedIn && (
          <div className="mb-4 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-extrabold text-blue-700 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            โหมดสำรวจแบบสาธารณะ — เข้าสู่ระบบเพื่อดูผลวิเคราะห์พอร์ตโฟลิโอของคุณ
          </div>
        )}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Career Analytics</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">แดชบอร์ดวิเคราะห์เส้นทางอาชีพ</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              รวมผลวิเคราะห์พอร์ตโฟลิโอ ทักษะจากเรซูเม่ และตำแหน่งงานที่เปิดรับ เพื่อดูว่าคุณพร้อมแค่ไหนสำหรับแต่ละสายอาชีพ
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/main" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700">
              อัปโหลดผลงาน
            </Link>
            <Link href="/resume" className="rounded-full bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-slate-800">
              แก้ไขเรซูเม่
            </Link>
          </div>
        </div>

        {!loading && !hasData && (
          <div className="mt-6 rounded-3xl border border-dashed border-amber-300 bg-amber-50/70 px-6 py-10 text-center">
            <h2 className="text-lg font-black text-amber-900">ยังไม่มีข้อมูลเพียงพอสำหรับวิเคราะห์</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-amber-800/80">
              อัปโหลดใบเซอร์ ทรานสคริปต์ หรือผลงานให้ AI วิเคราะห์ หรือกรอกทักษะในเรซูเม่ก่อน แล้วกลับมาดูแดชบอร์ดนี้ ระบบจะคำนวณคะแนนและจับคู่งานให้อัตโนมัติ
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/main" className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-700">
                เริ่มวิเคราะห์พอร์ตโฟลิโอ
              </Link>
              <Link href="/resume" className="rounded-full border border-amber-300 bg-white px-5 py-2.5 text-xs font-extrabold text-amber-800 hover:bg-amber-100">
                กรอกเรซูเม่
              </Link>
            </div>
          </div>
        )}

        {!signedIn && hasData && (
          <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
            กำลังแสดงข้อมูลจากเรซูเม่ที่บันทึกไว้ในเครื่องนี้ — เข้าสู่ระบบเพื่อรวมผลวิเคราะห์จากพอร์ตโฟลิโอของคุณด้วย
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">ภาพรวมทักษะ 6 มิติ</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {snapshot.source === 'analysis'
                    ? 'อ้างอิงผลวิเคราะห์พอร์ตโฟลิโอล่าสุด'
                    : 'ประมาณการจากทักษะและประสบการณ์ในเรซูเม่'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold text-slate-600">
                {latestAnalysis ? new Date(latestAnalysis.analyzed_at).toLocaleDateString('th-TH') : 'เรซูเม่'}
              </span>
            </div>

            <div className="mt-4 grid items-center gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[320px]">
                <RadarChart labels={RADAR_LABELS} values={radarValues} size={400} />
              </div>
              <div className="space-y-3">
                {statCards.map((stat) => (
                  <div key={stat.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">{stat.label}</span>
                      <span className="text-slate-900">{stat.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${stat.tone}`} style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }} />
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">สายอาชีพที่ตรงที่สุด</p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {careerLabel(snapshot.careerEn ?? latestAnalysis?.career_en)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-black text-slate-900">ความพร้อมสู่ตลาดงาน</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">เทียบโปรไฟล์ของคุณกับตำแหน่งงานที่เปิดรับในระบบ</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-700">{summary.strongMatches}</p>
                <p className="mt-1 text-[11px] font-bold text-emerald-800/80">งานที่เหมาะมาก (≥60%)</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-2xl font-black text-blue-700">{summary.averageScore}%</p>
                <p className="mt-1 text-[11px] font-bold text-blue-800/80">คะแนนเฉลี่ยทุกตำแหน่ง</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">ตำแหน่งที่ตรงที่สุด</p>
              {summary.topMatch ? (
                <>
                  <p className="mt-1.5 text-sm font-black text-slate-900">{summary.topMatch.job.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                    {summary.topMatch.job.company?.name ?? 'ไม่ระบุบริษัท'} · {summary.topMatch.job.location}
                  </p>
                  <span className={`mt-2 inline-block rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${matchTone(summary.topMatch.score).className}`}>
                    {matchTone(summary.topMatch.score).label} {summary.topMatch.score}%
                  </span>
                </>
              ) : (
                <p className="mt-1.5 text-xs font-bold text-slate-400">ยังไม่มีตำแหน่งงานให้เปรียบเทียบ</p>
              )}
              <Link href="/jobs" className="mt-3 inline-block text-[11px] font-extrabold text-blue-600 hover:underline">
                ดูงานทั้งหมด →
              </Link>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">ทักษะที่ควรเสริม</p>
              {summary.topMatch && summary.topMatch.missingSkills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {summary.topMatch.missingSkills.slice(0, 6).map((skill) => (
                    <span key={skill} className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-xs font-bold text-slate-400">
                  {summary.topMatch ? 'ไม่มีช่องว่างทักษะที่สำคัญ' : 'เพิ่มทักษะเพื่อดูคำแนะนำ'}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-black text-slate-900">ความพร้อมรายสายอาชีพ</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">คะแนนเฉลี่ยจากการจับคู่งานในแต่ละสายงาน</p>

            <div className="mt-5 space-y-4">
              {readiness.map((item) => (
                <div key={item.career}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        item.value >= 60 ? 'bg-emerald-500' : item.value >= 35 ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    {item.jobCount > 0 ? `${item.jobCount} ตำแหน่งที่เกี่ยวข้อง` : 'ยังไม่มีตำแหน่งงานในสายนี้'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-black text-slate-900">ทักษะที่พบบ่อยในโปรไฟล์</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">นับจากผลวิเคราะห์ล่าสุดและทักษะในเรซูเม่</p>

            {frequency.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-bold text-slate-400">
                ยังไม่พบทักษะ — เพิ่มทักษะในเรซูเม่หรืออัปโหลดผลงานให้ AI วิเคราะห์
              </p>
            ) : (
              <div className="mt-5 space-y-3.5">
                {frequency.map((item) => (
                  <div key={item.skill}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span className="truncate text-slate-700">{item.skill}</span>
                      <span className="ml-2 flex-shrink-0 text-slate-400">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                        style={{ width: `${Math.max(6, Math.round((item.count / maxFrequency) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">ประวัติการวิเคราะห์ล่าสุด</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">ผลจาก AI ล่าสุด 5 รายการ</p>
            </div>
            <Link href="/main" className="text-[11px] font-extrabold text-blue-600 hover:underline">
              ไปที่หน้าวิเคราะห์ →
            </Link>
          </div>

          {analyses.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-400">
              {signedIn ? 'ยังไม่มีผลวิเคราะห์ — อัปโหลดผลงานเพื่อเริ่มต้น' : 'เข้าสู่ระบบเพื่อดูประวัติการวิเคราะห์ของคุณ'}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    <th className="py-2.5 pr-4">ไฟล์ / หลักฐาน</th>
                    <th className="py-2.5 pr-4">สายอาชีพ</th>
                    <th className="py-2.5 pr-4">เทคนิค</th>
                    <th className="py-2.5 pr-4">ทั่วไป</th>
                    <th className="py-2.5 pr-4">บริหาร</th>
                    <th className="py-2.5">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 5).map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0">
                      <td className="max-w-[200px] truncate py-3 pr-4 font-bold text-slate-700">{row.portfolio_title}</td>
                      <td className="py-3 pr-4 font-bold text-slate-600">
                        {careerLabel(row.career_en ?? row.career)}
                      </td>
                      <td className="py-3 pr-4 font-extrabold text-blue-700">{row.technical ?? 0}%</td>
                      <td className="py-3 pr-4 font-extrabold text-violet-700">{row.soft ?? 0}%</td>
                      <td className="py-3 pr-4 font-extrabold text-indigo-700">{row.management ?? 0}%</td>
                      <td className="py-3 font-bold text-slate-400">
                        {new Date(row.analyzed_at).toLocaleDateString('th-TH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}