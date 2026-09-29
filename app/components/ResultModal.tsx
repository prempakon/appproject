import React, { useRef, useState } from 'react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  analyzedAt?: string | null;
  analysis?: {
    skills: string[];
    career: string | null;
    accuracy: number;
    technical: number;
    soft: number;
    management: number;
    recommendations: { title: string; detail: string }[];
    warnings?: string[];
    rawInput?: string | null;
    textWarning?: string | null;
    model?: string | null;
    skillNotes?: { technical: string | null; soft: string | null; management: string | null };
  } | null;
}

const CAREER_TH: Record<string, string> = {
  'Software Engineer': 'วิศวกรซอฟต์แวร์',
  'Data Scientist': 'นักวิทยาศาสตร์ข้อมูล',
  'UX Designer': 'นักออกแบบประสบการณ์ผู้ใช้',
  'Cybersecurity Analyst': 'นักวิเคราะห์ความมั่นคงปลอดภัยไซเบอร์',
  'Marketing Strategist': 'นักกลยุทธ์การตลาด',
  'Finance Analyst': 'นักวิเคราะห์การเงิน',
};

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
  const technical = analysis.technical;
  const soft = analysis.soft;
  const management = analysis.management;
  const career = (() => {
    const raw = (analysis.career ?? '').trim();
    if (!raw) return 'ยังระบุสายงานไม่ได้';
    const hit = Object.keys(CAREER_TH).find((k) => k.toLowerCase() === raw.toLowerCase());
    return hit ? CAREER_TH[hit] : raw;
  })();
  const recommendations = analysis.recommendations.length > 0 ? analysis.recommendations : null;
  const warnings = analysis?.warnings && analysis.warnings.length > 0 ? analysis.warnings : null;
  const rawInput = analysis?.rawInput?.trim() ? analysis.rawInput.trim() : null;
  const textWarning = analysis?.textWarning?.trim() ? analysis.textWarning.trim() : null;
  const lowConfidence = accuracy < 30;
  const modelName = analysis?.model?.trim() ? analysis.model.trim() : null;

  const downloadPdf = async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
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
        <div className="p-6 md:p-8 overflow-y-auto flex-grow space-y-8 bg-white custom-scrollbar">
          {lowConfidence && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              ⚠ ผลวิเคราะห์นี้เป็นเพียงการประเมินเบื้องต้น อาจไม่แม่นยำ 100% — หลักฐานยังน้อยหรือคลุมเครือ ลองอัปโหลดใบเซอร์ ทรานสคริปต์ หรืองานที่ชัดขึ้นแล้ววิเคราะห์ใหม่
              {modelName?.includes('lite') ? ' (ครั้งนี้โมเดลหลักไม่ว่าง ใช้รุ่นสำรองตอบ ผลอาจละเอียดน้อยกว่า)' : ''}
            </p>
          )}
          
          {/* Card 1: สายงานที่สอดคล้อง */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* สายงาน */}
            <div className="col-span-1 border border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50/80 via-white to-white text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752-1.131.378-2.336.378-3.467 0-1.202-.4-1.936-1.541-1.936-2.752v-.747a8.51 8.51 0 01-3.423 0v.747c0 1.211-.734 2.352-1.936 2.752-1.131.378-2.336.378-3.467 0-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.716 48.716 0 017.5 5.455V5.25zm3 0a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v.205a48.34 48.34 0 00-4.5 0V5.25z" clipRule="evenodd" />
                  <path d="M3 15.75v-2.25c0-.99.56-1.897 1.448-2.34l.827-.413a.75.75 0 011.342.342V15a3 3 0 013 3h3a3 3 0 013-3v-3.66a.75.75 0 011.342-.342l.827.413c.888.443 1.448 1.35 1.448 2.34v2.25a2.25 2.25 0 01-2.25 2.25h-11.5a2.25 2.25 0 01-2.25-2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-800">ความสอดคล้องสายงาน</p>
                <p className="text-base font-bold text-slate-600 mt-2 leading-relaxed text-balance">{career}</p>
              </div>
              {!analysis.career && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  หลักฐานยังน้อย อัปโหลดใบเซอร์ ทรานสคริปต์ หรืองานโปรเจกต์เพิ่มเพื่อให้ AI แนะนำสายงานได้
                </p>
              )}
            </div>

            {/* Progress Bars (ขวา) */}
            <div className="col-span-1 md:col-span-2 border border-slate-100 rounded-2xl p-6 bg-slate-50/50 flex flex-col justify-center">
              <h4 className="text-sm font-extrabold text-slate-800 mb-5">สัดส่วนทักษะเฉพาะด้าน (Proficiency)</h4>
              
              <div className="space-y-4">
                {/* Bar 1 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">ทักษะเฉพาะทาง (Technical)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${technical}%` }}></div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1">{analysis.skillNotes?.technical ?? 'ความเชี่ยวชาญการเขียนโค้ดและระบบ'}</p>
                </div>

                {/* Bar 2 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">ทักษะทั่วไป (Soft Skills)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${soft}%` }}></div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1">{analysis.skillNotes?.soft ?? 'การสื่อสารและการทำงานร่วมกัน'}</p>
                </div>

                {/* Bar 3 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">การบริหารจัดการ (Management)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${management}%` }}></div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1">{analysis.skillNotes?.management ?? 'การส่งมอบงานและการวางแผน'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ทักษะที่ตรวจพบ */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-sm font-extrabold text-slate-800">ทักษะที่ตรวจพบจากเอกสาร</h4>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">{skills.length} ทักษะใหม่</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {skills.length > 0 ? (
                skills.map((skill, i) => (
                  <span key={`${skill}-${i}`} className="px-3 py-1.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">{skill}</span>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-600">ไม่พบทักษะจากไฟล์ที่ส่ง — ดูรายการไฟล์ที่ AI ไม่นับด้านล่าง</p>
              )}
            </div>
          </div>

          {/* สิ่งที่นักศึกษาพิมพ์ + คำเตือนข้อความไม่เกี่ยว */}
          {rawInput && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <h4 className="text-sm font-extrabold text-slate-800 mb-2">สิ่งที่คุณพิมพ์บอก AI</h4>
              <p className="text-xs font-medium text-slate-700 whitespace-pre-line">{rawInput}</p>
              {textWarning && (
                <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">⚠ {textWarning}</p>
              )}
            </div>
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

          {/* Card 3: คำแนะนำจาก AI */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
              </svg>
              คำแนะนำและคอร์สเรียนเพิ่มศักยภาพโดย AI
            </h4>
            
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

        </div>

        {/* Footer ของ Modal (ไม่รวมใน PDF) */}
        <div className="px-6 md:px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 bg-slate-50/80 flex-shrink-0">
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