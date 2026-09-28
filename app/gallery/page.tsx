'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function GalleryPage() {
  const [realFiles, setRealFiles] = useState<{ id: string; title: string; date: string; type: string; imageUrl: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshFiles = async () => {
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { listMyPortfolios } = await import('../../lib/profiles');
      const user = await getSessionUser();
      if (!user) return;
      const rows = await listMyPortfolios(user.id);
      setRealFiles(rows.map((r) => ({
        id: r.id,
        title: r.title,
        date: new Date(r.created_at).toLocaleDateString(),
        type: r.file_type,
        imageUrl: r.file_url,
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const handleDelete = async (id: string, imageUrl: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setDeleteError(null);
      return;
    }
    setDeletingId(id);
    setDeleteError(null);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { deletePortfolioReal } = await import('../../lib/storage');
      const user = await getSessionUser();
      if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนลบไฟล์');
      await deletePortfolioReal(user.id, id, imageUrl);
      setRealFiles((prev) => prev.filter((f) => f.id !== id));
      setConfirmId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'ลบไฟล์ไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const allFiles = realFiles;

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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 mb-1.5">ไฟล์ทั้งหมดของฉัน</h1>
            <p className="text-sm md:text-base text-slate-500 font-medium">จัดการและดูไฟล์ที่คุณอัปโหลดไว้ทั้งหมดที่นี่</p>
          </div>

          {/* 3. ฝั่งขวา: ป้ายบอกจำนวนไฟล์ */}
          <div className="w-full md:w-1/3 flex justify-center md:justify-end">
            <div className="px-4 py-2 bg-slate-200 rounded-lg font-bold text-slate-700 text-sm">
              {allFiles.length} FILES
            </div>
          </div>
           
        </div>

        {deleteError && (
          <p className="mb-6 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">⚠ {deleteError}</p>
        )}

        {/* --- Grid แสดงผลการ์ดไฟล์ --- */}
        {loading ? (
          <p className="py-16 text-sm font-bold text-slate-400 text-center">กำลังโหลดไฟล์...</p>
        ) : allFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          
          {allFiles.map((file) => (
            <div key={file.id} className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)] border border-slate-100 transition-all duration-300 overflow-hidden flex flex-col">
              
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-extrabold text-slate-800 shadow-sm">
                  {file.type}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.imageUrl); }}
                  disabled={deletingId === file.id}
                  title={confirmId === file.id ? 'กดอีกครั้งเพื่อยืนยันลบ' : 'ลบไฟล์นี้'}
                  className={`absolute top-3 right-3 z-10 p-1.5 rounded-full shadow-sm transition-all backdrop-blur-sm disabled:opacity-50 ${confirmId === file.id ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/95 text-slate-400 hover:text-red-600'}`}
                >
                  {confirmId === file.id ? (
                    <span className="px-1 text-[10px] font-extrabold whitespace-nowrap">
                      {deletingId === file.id ? '...' : 'ยืนยันลบ?'}
                    </span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
                
                {/^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.type) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.imageUrl} alt={file.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-[10px] font-extrabold text-slate-400">แตะเพื่อเปิดไฟล์</span>
                  </div>
                )}
                
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
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-sm font-bold text-slate-500">ยังไม่มีไฟล์ในคลัง</p>
            <Link href="/main" className="inline-block mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all">ไปอัปโหลดไฟล์</Link>
          </div>
        )}

      </div>
    </main>
  );
}