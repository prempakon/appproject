import React from 'react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
}

export default function ResultModal({ isOpen, onClose, files }: ResultModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
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
              วิเคราะห์เมื่อ: 24 ตุลาคม 2567
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
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="289" strokeDashoffset="43" className="text-blue-600 drop-shadow-md" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">85%</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">ความแม่นยำ</span>
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs font-bold text-slate-800 mb-1">ความสอดคล้องสายงาน</p>
                <p className="text-xs text-slate-500">วิศวกรซอฟต์แวร์ (ระดับสูง)</p>
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
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">ความเชี่ยวชาญการเขียนโค้ดและระบบ</p>
                </div>

                {/* Bar 2 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">ทักษะทั่วไป (Soft Skills)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">การสื่อสารและการทำงานร่วมกัน</p>
                </div>

                {/* Bar 3 */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800">การบริหารจัดการ (Management)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '50%' }}></div>
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
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">8 ทักษะใหม่</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-100">Python</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">Data Analysis</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-100">Machine Learning</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">SQL</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-orange-50 text-orange-700 border border-orange-100">UX Design</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">Project Management</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-pink-50 text-pink-700 border border-pink-100">Communication</span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-md bg-pink-50 text-pink-700 border border-pink-100">Leadership</span>
            </div>
          </div>

          {/* Card 3: คำแนะนำจาก AI */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
              </svg>
              คำแนะนำและคอร์สเรียนเพิ่มศักยภาพโดย AI
            </h4>
            
            <div className="space-y-4">
              {/* Item 1 */}
              <div className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 mb-0.5">แนะนำคอร์สเรียน: Advanced Machine Learning & Deep Learning</p>
                  <p className="text-[11px] text-slate-500">เพื่อพัฒนาทักษะ Machine Learning ของคุณให้อยู่ในเกณฑ์เชี่ยวชาญระดับสูงตรงตามที่สายงานต้องการ</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 mb-0.5">พัฒนาพอร์ตฟอลิโอ: เข้าร่วมกิจกรรม Hackathon หรือ Project-based</p>
                  <p className="text-[11px] text-slate-500">ช่วยเสริมทักษะการบริหารจัดการ (Management) และการทำงานจริงเป็นทีมซึ่งส่งผลดีต่อ Soft Skills</p>
                </div>
              </div>
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