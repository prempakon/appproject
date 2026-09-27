'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: 'นักศึกษา LRU',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150',
    institution: 'มหาวิทยาลัยราชภัฏเลย',
    major: '-',
    bio: 'ยังไม่ได้กรอก'
  });

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setProfile(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f0f4fd] p-6 sm:p-10 flex flex-col items-center">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-xl p-8 sm:p-10 border border-slate-100 space-y-6">
        
        {/* Header Profile */}
        <div className="flex items-center gap-5 border-b border-slate-100 pb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{profile.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">ข้อมูลโปรไฟล์ผู้ใช้งานระบบ Portfolio</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">มหาวิทยาลัย / สถานศึกษา</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{profile.institution}</p>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">คณะ / สาขาวิชา</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{profile.major || '-'}</p>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">BIO (คำอธิบายตัวตน)</p>
            <p className="text-base font-medium text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100">{profile.bio || 'ยังไม่ได้กรอก'}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 flex gap-3">
          <button 
            onClick={() => router.push('/main')} 
            className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            ← กลับหน้าหลัก
          </button>
          <button 
            onClick={() => router.push('/profile/edit')} 
            className="flex-1 bg-[#1c58f6] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] text-sm"
          >
            แก้ไขโปรไฟล์
          </button>
        </div>

      </div>
    </main>
  );
}