import React from 'react';
import Link from 'next/link';

export default function GalleryPage() {
  const allFiles = [
    { id: 1, title: 'Certificate_AWS.jpg', date: 'Aug 15, 2024', type: 'JPG', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop' },
    { id: 2, title: 'Transcript_2024.pdf', date: 'Jul 22, 2024', type: 'PDF', imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop' },
    { id: 3, title: 'Diploma_CS.jpg', date: 'Jun 10, 2024', type: 'JPG', imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop' },
    { id: 4, title: 'Resume_Updated.pdf', date: 'May 01, 2024', type: 'PDF', imageUrl: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=800&auto=format&fit=crop' },
    { id: 5, title: 'ID_Card_Copy.png', date: 'Jan 15, 2024', type: 'PNG', imageUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=800&auto=format&fit=crop' },
    { id: 6, title: 'Award_Hackathon.jpg', date: 'Nov 20, 2023', type: 'JPG', imageUrl: 'https://images.unsplash.com/photo-1531545514251-b159ce8bf590?q=80&w=800&auto=format&fit=crop' },
  ];

  return (
    <main className="min-h-screen bg-[#f8f9fa] p-4 sm:p-8 lg:p-12 text-slate-800 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header และปุ่มย้อนกลับ (จัดข้อความให้อยู่ตรงกลางเป๊ะ) */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 border-b border-slate-200 pb-6 gap-6">
          
          {/* 1. ฝั่งซ้าย: ปุ่มย้อนกลับ */}
          <div className="w-full md:w-1/3 flex justify-start">
            <Link 
              href="/main" // กลับไปหน้า main
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:scale-105 transition-all shadow-sm text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
          </div>

          {/* 2. ตรงกลาง: หัวข้อ (จัด text-center กลางจอ) */}
          <div className="w-full md:w-1/3 flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-1.5">ไฟล์ทั้งหมดของฉัน</h1>
            <p className="text-sm md:text-base text-slate-500 font-medium">จัดการและดูไฟล์ที่คุณอัปโหลดไว้ทั้งหมดที่นี่</p>
          </div>

          {/* 3. ฝั่งขวา: ป้ายบอกจำนวนไฟล์ */}
          <div className="w-full md:w-1/3 flex justify-center md:justify-end">
            <div className="px-4 py-2 bg-slate-200 rounded-lg font-bold text-slate-700 text-sm">
              {allFiles.length} FILES
            </div>
          </div>
          
        </div>

        {/* --- Grid แสดงผลการ์ดไฟล์ --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          
          {allFiles.map((file) => (
            <div key={file.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 transition-all duration-300 overflow-hidden flex flex-col">
              
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-extrabold text-slate-800 shadow-sm">
                  {file.type}
                </div>
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.imageUrl} alt={file.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  
                  {/* --- ปุ่มโหลดไฟล์แบบกดแล้วโหลดเลย --- */}
                  <a 
                    href={file.imageUrl}
                    download={file.title} 
                    className="transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 bg-white text-blue-600 font-bold px-4 py-2 text-sm rounded-full flex items-center gap-1.5 shadow-xl hover:bg-blue-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    โหลดไฟล์
                  </a>

                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-extrabold text-slate-800 text-base truncate" title={file.title}>{file.title}</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-1">Uploaded on {file.date}</p>
              </div>
              
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}