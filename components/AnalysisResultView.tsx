import React from 'react';
import RadarChart from '@/app/components/RadarChart';
import type { ScoreDimensions } from '@/lib/platform.types';

export const ANALYSIS_RADAR_LABELS = [
  'ทักษะเทคนิค',
  'ทักษะทั่วไป',
  'การบริหารจัดการ',
  'ความแม่นยำของข้อมูล',
  'การสื่อสาร',
  'ความคิดสร้างสรรค์',
] as const;

const RADAR_KEYS = ['technical', 'soft', 'management', 'accuracy', 'communication', 'creativity'] as const;

export interface AnalysisSkillNotes {
  technical: string | null;
  soft: string | null;
  management: string | null;
  communication?: string | null;
  creativity?: string | null;
}

const CAREER_TH: Record<string, string> = {
  'Software Engineer': 'วิศวกรซอฟต์แวร์',
  'Data Scientist': 'นักวิทยาศาสตร์ข้อมูล',
  'UX Designer': 'นักออกแบบประสบการณ์ผู้ใช้',
  'Cybersecurity Analyst': 'นักวิเคราะห์ความมั่นคงปลอดภัยไซเบอร์',
  'Marketing Strategist': 'นักกลยุทธ์การตลาด',
  'Finance Analyst': 'นักวิเคราะห์การเงิน',
};

function clampScore(value: unknown, fallback: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Normalize legacy/partial `radar_scores` rows to a complete 0–100 profile.
 * Missing axes are derived from the values that do exist, so historical rows
 * never render `0%`, `undefined`, or `NaN`.
 */
export function normalizeScoreDimensions(scores?: Partial<ScoreDimensions> | null): ScoreDimensions {
  const source = scores ?? {};
  const technical = clampScore(source.technical, 0);
  const soft = clampScore(source.soft, 0);
  const management = clampScore(source.management, 0);
  const accuracy = clampScore(source.accuracy, Math.round((technical + soft + management) / 3));
  const communication = clampScore(source.communication, Math.round((technical + soft) / 2));
  const creativity = clampScore(source.creativity, Math.round((soft + management) / 2));
  return { technical, soft, management, accuracy, communication, creativity };
}

function resolveCareerLabel(career?: string | null, careerEn?: string | null): { label: string; isFallback: boolean } {
  const raw = (career ?? '').trim();
  if (raw) return { label: raw, isFallback: false };
  const en = (careerEn ?? '').trim();
  if (en) {
    const hit = Object.keys(CAREER_TH).find((k) => k.toLowerCase() === en.toLowerCase());
    return { label: hit ? CAREER_TH[hit] : en, isFallback: true };
  }
  return { label: 'ยังระบุสายงานไม่ได้', isFallback: true };
}

/** Tier 1 — Career Match Banner (สรุปสายงานที่สอดคล้อง) */
export function CareerMatchBanner({
  career,
  careerEn,
  meta,
  action,
}: {
  career?: string | null;
  careerEn?: string | null;
  meta?: string | null;
  action?: React.ReactNode;
}) {
  const { label, isFallback } = resolveCareerLabel(career, careerEn);
  return (
    <div className="border border-slate-100 rounded-2xl p-6 flex items-center gap-5 bg-gradient-to-r from-blue-50/80 via-white to-white">
      <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752-1.131.378-2.336.378-3.467 0-1.202-.4-1.936-1.541-1.936-2.752v-.747a8.51 8.51 0 01-3.423 0v.747c0 1.211-.734 2.352-1.936 2.752-1.131.378-2.336.378-3.467 0-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.716 48.716 0 017.5 5.455V5.25zm3 0a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v.205a48.34 48.34 0 00-4.5 0V5.25z" clipRule="evenodd" />
          <path d="M3 15.75v-2.25c0-.99.56-1.897 1.448-2.34l.827-.413a.75.75 0 011.342.342V15a3 3 0 013 3h3a3 3 0 013-3v-3.66a.75.75 0 011.342-.342l.827.413c.888.443 1.448 1.35 1.448 2.34v2.25a2.25 2.25 0 01-2.25 2.25h-11.5a2.25 2.25 0 01-2.25-2.25z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-extrabold text-slate-800 leading-relaxed text-balance">{label}</p>
        {isFallback && (
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
            หลักฐานยังน้อย อัปโหลดใบเซอร์ ทรานสคริปต์ หรืองานโปรเจกต์เพิ่มเพื่อให้ AI แนะนำสายงานได้
          </p>
        )}
        {meta && (
          <p className="mt-1 text-[11px] font-medium text-slate-400 truncate" title={meta}>{meta}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0" data-pdf-hide>{action}</div>}
    </div>
  );
}

/** Tier 2 — 2-Column RadarChart + 6-Axis Skill Cards */
export function AnalysisRadarGrid({
  scores,
  skillNotes,
  chartSize = 360,
}: {
  scores?: Partial<ScoreDimensions> | null;
  skillNotes?: AnalysisSkillNotes | null;
  chartSize?: number;
}) {
  const normalized = normalizeScoreDimensions(scores);
  const cards = [
    { key: 'technical', label: 'ทักษะเทคนิค', score: normalized.technical, note: skillNotes?.technical ?? 'ความเชี่ยวชาญเฉพาะทางจากหลักฐานที่ AI วิเคราะห์', bar: 'bg-blue-500', badge: 'border-blue-100 bg-blue-50 text-blue-700' },
    { key: 'soft', label: 'ทักษะทั่วไป', score: normalized.soft, note: skillNotes?.soft ?? 'การสื่อสารและการทำงานร่วมกับผู้อื่น', bar: 'bg-violet-500', badge: 'border-violet-100 bg-violet-50 text-violet-700' },
    { key: 'management', label: 'การบริหารจัดการ', score: normalized.management, note: skillNotes?.management ?? 'การวางแผน การจัดลำดับความสำคัญ และการส่งมอบงาน', bar: 'bg-indigo-500', badge: 'border-indigo-100 bg-indigo-50 text-indigo-700' },
    { key: 'accuracy', label: 'ความแม่นยำของข้อมูล', score: normalized.accuracy, note: 'ระดับความน่าเชื่อถือของหลักฐานที่ AI ใช้วิเคราะห์', bar: 'bg-emerald-500', badge: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
    { key: 'communication', label: 'การสื่อสาร', score: normalized.communication, note: skillNotes?.communication ?? 'ทักษะการสื่อสารและนำเสนอผลงาน', bar: 'bg-amber-500', badge: 'border-amber-100 bg-amber-50 text-amber-700' },
    { key: 'creativity', label: 'ความคิดสร้างสรรค์', score: normalized.creativity, note: skillNotes?.creativity ?? 'ความสามารถในการคิดไอเดียและออกแบบงานใหม่', bar: 'bg-purple-500', badge: 'border-purple-100 bg-purple-50 text-purple-700' },
  ];
  return (
    <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5">
          <div className="w-full max-w-[400px] mx-auto flex items-center justify-center p-0">
            <RadarChart
              labels={[...ANALYSIS_RADAR_LABELS]}
              values={RADAR_KEYS.map((key) => normalized[key])}
              size={chartSize}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-7">
          {cards.map((card) => (
            <div key={card.key} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-extrabold leading-tight text-slate-800">{card.label}</p>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black ${card.badge}`}>{card.score}/100</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                <div className={`h-1.5 rounded-full ${card.bar}`} style={{ width: `${card.score}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] font-medium leading-snug text-slate-500 line-clamp-3">{card.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tier 3 — Detected Skills Tag Cloud (ทักษะที่ตรวจพบจากเอกสาร) */
export function DetectedSkillsCloud({ skills }: { skills: string[] }) {
  const safeSkills = Array.isArray(skills) ? skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim() !== '') : [];
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h4 className="text-sm font-extrabold text-slate-800">ทักษะที่ตรวจพบจากเอกสาร</h4>
        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">{safeSkills.length} ทักษะ</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {safeSkills.length > 0 ? (
          safeSkills.map((skill, i) => (
            <span key={`${skill}-${i}`} className="px-3 py-1.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">{skill}</span>
          ))
        ) : (
          <p className="text-xs font-medium text-slate-600">ไม่พบทักษะจากไฟล์ที่ส่ง — ดูรายการไฟล์ที่ AI ไม่นับด้านล่าง</p>
        )}
      </div>
    </section>
  );
}

export interface AnalysisResultViewProps {
  career?: string | null;
  careerEn?: string | null;
  scores?: Partial<ScoreDimensions> | null;
  skills: string[];
  skillNotes?: AnalysisSkillNotes | null;
  meta?: string | null;
  action?: React.ReactNode;
  chartSize?: number;
  className?: string;
}

/**
 * Unified 3-Tier AI Analysis Layout shared by `/main` and the
 * "ผลการวิเคราะห์ทักษะด้วยระบบ AI" modal. Legacy 3-bar progress rows are
 * intentionally absent — every consumer renders this single component.
 */
export function AnalysisResultView({
  career,
  careerEn,
  scores,
  skills,
  skillNotes,
  meta,
  action,
  chartSize = 360,
  className = '',
}: AnalysisResultViewProps) {
  return (
    <div className={`w-full space-y-6 ${className}`.trim()}>
      {/* Tier 1 — Career Match Banner */}
      <section>
        <h4 className="text-sm font-extrabold text-slate-800 mb-4">สรุปสายงานที่สอดคล้อง</h4>
        <CareerMatchBanner career={career} careerEn={careerEn} meta={meta} action={action} />
      </section>

      {/* Tier 2 — RadarChart + 6 skill cards */}
      <section>
        <h4 className="text-sm font-extrabold text-slate-800 mb-4">ระดับทักษะรายด้าน</h4>
        <AnalysisRadarGrid scores={scores} skillNotes={skillNotes} chartSize={chartSize} />
      </section>

      {/* Tier 3 — Detected skills tag cloud */}
      <DetectedSkillsCloud skills={skills} />
    </div>
  );
}

export default AnalysisResultView;
