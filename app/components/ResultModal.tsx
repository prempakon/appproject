import React, { useRef, useState } from 'react';
import { AnalysisResultView } from '../../components/AnalysisResultView';
import type { ScoreDimensions } from '../../lib/platform.types';

function clampScore(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  analyzedAt?: string | null;
  analysis?: {
    skills: string[];
    career: string | null;
    careerEn?: string | null;
    accuracy: number;
    technical: number;
    soft: number;
    management: number;
    radarScores?: Partial<ScoreDimensions> | null;
    recommendations: { title: string; detail: string }[];
    warnings?: string[];
    rawInput?: string | null;
    textWarning?: string | null;
    model?: string | null;
    skillNotes?: {
      technical: string | null;
      soft: string | null;
      management: string | null;
      communication?: string | null;
      creativity?: string | null;
    };
  } | null;
}

export default function ResultModal({ isOpen, onClose, files, analyzedAt, analysis }: ResultModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const analyzedLabel = analyzedAt ?? new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!analysis) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 text-center">
          <p className="text-base font-extrabold text-slate-800">โหลดผลวิเคราะห์ไม่สำเร็จ</p>
          <p className="text-xs font-medium text-slate-600 mt-2">ไม่มีผลวิเคราะห์สำหรับไฟล์นี้ ลองวิเคราะห์ใหม่อีกครั้ง</p>
          <button onClick={onClose} className="mt-6 px-8 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm">ปิด</button>
        </div>
      </div>
    );
  }

  const skills = analysis.skills;
  const accuracy = analysis.accuracy;
  const technical = clampScore(analysis.technical, 0);
  const soft = clampScore(analysis.soft, 0);
  const management = clampScore(analysis.management, 0);
  const radarScores: ScoreDimensions = {
    technical: clampScore(analysis.radarScores?.technical, technical),
    soft: clampScore(analysis.radarScores?.soft, soft),
    management: clampScore(analysis.radarScores?.management, management),
    accuracy: clampScore(analysis.radarScores?.accuracy, clampScore(analysis.accuracy, 0)),
    communication: clampScore(analysis.radarScores?.communication, Math.round((technical + soft) / 2)),
    creativity: clampScore(analysis.radarScores?.creativity, Math.round((soft + management) / 2)),
  };
  const recommendations = analysis.recommendations.length > 0 ? analysis.recommendations : null;
  const warnings = analysis?.warnings && analysis.warnings.length > 0 ? analysis.warnings : null;
  const rawInput = analysis?.rawInput?.trim() ? analysis.rawInput.trim() : null;
  const textWarning = analysis?.textWarning?.trim() ? analysis.textWarning.trim() : null;
  const lowConfidence = accuracy < 30;
  const modelName = analysis?.model?.trim() ? analysis.model.trim() : null;
  const bannerMeta = [
    `วิเคราะห์เมื่อ ${analyzedLabel}`,
    files.length > 0 ? `${files.length} ไฟล์: ${files.map((file) => file.name).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const downloadPdf = async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    const root = reportRef.current;
    const prevRootMax = root.style.maxHeight;
    const prevRootOverflow = root.style.overflow;
    const body = root.querySelector<HTMLElement>('[data-report-body]');
    const prevBodyMax = body?.style.maxHeight ?? '';
    const prevBodyOverflow = body?.style.overflow ?? '';
    const hidden: { el: HTMLElement; prev: string }[] = [];
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);
      // คลายความสูงให้เนื้อหาทั้งหมดเรนเดอร์ครบ (ของที่เลื่อนลงไปจะได้ไม่ถูกตัด)
      root.style.maxHeight = 'none';
      root.style.overflow = 'visible';
      if (body) {
        body.style.maxHeight = 'none';
        body.style.overflow = 'visible';
      }
      // ซ่อนส่วนที่ไม่เอาใน PDF (ปุ่มกด) ตรงๆ ไม่พึ่ง option ของ lib
      root.querySelectorAll<HTMLElement>('[data-pdf-hide]').forEach((el) => {
        hidden.push({ el, prev: el.style.display });
        el.style.display = 'none';
      });
      await document.fonts?.ready;
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
      } else {
        // ตัดหลายหน้าตามความสูง A4
        const pxPerMm = canvas.width / imgW;
        const pagePx = Math.floor((pageH - margin * 2) * pxPerMm);
        let done = 0;
        let first = true;
        while (done < canvas.height) {
          const sliceH = Math.min(pagePx, canvas.height - done);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceH;
          slice.getContext('2d')?.drawImage(canvas, 0, done, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (!first) pdf.addPage();
          pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, imgW, (sliceH * imgW) / canvas.width);
          done += sliceH;
          first = false;
        }
      }
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`ผลวิเคราะห์ทักษะ-${stamp}.pdf`);
    } finally {
      hidden.forEach(({ el, prev }) => {
        el.style.display = prev;
      });
      root.style.maxHeight = prevRootMax;
      root.style.overflow = prevRootOverflow;
      if (body) {
        body.style.maxHeight = prevBodyMax;
        body.style.overflow = prevBodyOverflow;
      }
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={reportRef} className="bg-white w-full max-w-3xl rounded-[2rem] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.3)] overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
        {/* Header ของ Modal */}
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 relative bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">ผลการวิเคราะห์ทักษะด้วยระบบ AI</h3>
            {modelName && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">AI: {modelName}</span>
            )}
          </div>
          
          <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              ชื่อไฟล์: {files[0]?.name || "transcript_academic.pdf"}
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              วิเคราะห์เมื่อ: {analyzedLabel}
            </span>
          </div>
        </div>

        {/* ส่วนเนื้อหา Body */}
        <div data-report-body className="p-6 md:p-8 overflow-y-auto flex-grow space-y-8 bg-white custom-scrollbar">
          {lowConfidence && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              ⚠ ผลวิเคราะห์นี้เป็นเพียงการประเมินเบื้องต้น อาจไม่แม่นยำ 100% — หลักฐานยังน้อยหรือคลุมเครือ ลองอัปโหลดใบเซอร์ ทรานสคริปต์ หรืองานที่ชัดขึ้นแล้ววิเคราะห์ใหม่
              {modelName?.includes('lite') ? ' (ครั้งนี้โมเดลหลักไม่ว่าง ใช้รุ่นสำรองตอบ ผลอาจละเอียดน้อยกว่า)' : ''}
            </p>
          )}
          
          {/* Unified 3-Tier AI Analysis Layout — Tier 1 + Tier 2 + Tier 3 */}
          <AnalysisResultView
            career={analysis.career}
            careerEn={analysis.careerEn}
            scores={radarScores}
            skills={skills}
            skillNotes={analysis.skillNotes}
            meta={bannerMeta}
            chartSize={340}
          />

          {/* ข้อมูลประกอบการวิเคราะห์ */}
          {rawInput && (
            <section>
              <h4 className="text-sm font-extrabold text-slate-800 mb-4">ข้อมูลประกอบการวิเคราะห์</h4>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-slate-700 whitespace-pre-line">{rawInput}</p>
              {textWarning && (
                <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">⚠ {textWarning}</p>
              )}
            </div>
          </section>
          )}

          {/* เตือนไฟล์ที่ไม่ใช่ผลงาน (AI ไม่นับเป็นทักษะ) */}
          {warnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h4 className="text-sm font-extrabold text-amber-800 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                ไฟล์ที่ AI ไม่นับเป็นผลงาน ({warnings.length})
              </h4>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs font-medium text-amber-800">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* คำแนะนำจาก AI */}
          <section>
            <h4 className="text-sm font-extrabold text-slate-800 mb-4">คำแนะนำและคอร์สเรียนเพิ่มศักยภาพ</h4>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
            
            <div className="space-y-4">
              {recommendations ? (
                recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${i % 2 === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800 mb-0.5">{rec.title}</p>
                      <p className="text-xs text-slate-600">{rec.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-600">AI ไม่ได้ให้คำแนะนำสำหรับไฟล์ชุดนี้</p>
              )}
            </div>
          </div>
          </section>

        </div>

        {/* Footer ของ Modal (ไม่รวมใน PDF) */}
        <div data-pdf-hide className="px-6 md:px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 bg-slate-50/80 flex-shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-8 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg font-bold text-sm transition-all active:scale-95"
          >
            ปิด
          </button>
          <button 
            onClick={downloadPdf}
            disabled={downloading}
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
          </button>
        </div>

      </div>
    </div>
  );
}