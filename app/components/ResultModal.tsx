import React from 'react';

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
  if (!isOpen) return null;

  const analyzedLabel = analyzedAt ?? new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!analysis) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 text-center">
          <p className="text-base font-extrabold text-slate-800">โหลดผลวิเคราะห์ไม่สำเร็จ</p>
          <p className="text-xs font-medium text-slate-500 mt-2">ไม่มีผลวิเคราะห์สำหรับไฟล์นี้ ลองวิเคราะห์ใหม่อีกครั้ง</p>
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.3)] overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
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
          </div>
          
          <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
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
          
          {/* Card 1: สัดส่วนทักษะและความแม่นยำ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ความแม่นยำ (วงกลม) */}
            <div className="col-span-1 border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-blue-100" />
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="289" strokeDashoffset={289 - (289 * accuracy) / 100} className="text-blue-600 drop-shadow-md" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">{accuracy}%</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">ความแม่นยำ</span>
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs font-bold text-slate-800 mb-1">ความสอดคล้องสายงาน</p>
                <p className="text-xs text-slate-500">{career}</p>
              </div>
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
                  <p className="text-[10px] text-slate-400 mt-1">ความเชี่ยวชาญการเขียนโค้ดและระบบ</p>
                </div>

                {/* Bar 2 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">ทักษะทั่วไป (Soft Skills)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${soft}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">การสื่อสารและการทำงานร่วมกัน</p>
                </div>

                {/* Bar 3 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">การบริหารจัดการ (Management)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${management}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">การส่งมอบงานและการวางแผน</p>
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
                <p className="text-xs font-medium text-slate-500">ไม่พบทักษะจากไฟล์ที่ส่ง — ดูรายการไฟล์ที่ AI ไม่นับด้านล่าง</p>
              )}
            </div>
          </div>

          {/* สิ่งที่นักศึกษาพิมพ์ + คำเตือนข้อความไม่เกี่ยว */}
          {rawInput && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <h4 className="text-sm font-extrabold text-slate-800 mb-2">สิ่งที่คุณพิมพ์บอก AI</h4>
              <p className="text-xs font-medium text-slate-600 whitespace-pre-line">{rawInput}</p>
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
                      <p className="text-xs font-extrabold text-slate-800 mb-0.5">{rec.title}</p>
                      <p className="text-[11px] text-slate-500">{rec.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-500">AI ไม่ได้ให้คำแนะนำสำหรับไฟล์ชุดนี้</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer ของ Modal (มีแต่ปุ่มดาวน์โหลด) */}
        <div className="px-6 md:px-8 py-5 border-t border-slate-100 flex justify-end items-center bg-slate-50/80 flex-shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            ดาวน์โหลด PDF
          </button>
        </div>

      </div>
    </div>
  );
}