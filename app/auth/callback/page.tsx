'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getSessionUser } from '../../../lib/auth';
import { getMyProfile } from '../../../lib/profiles';
import { resolveRole } from '../../../lib/database.types';

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackRunner />
    </Suspense>
  );
}

function CallbackRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // PKCE: แลก code ตรงนี้ได้เลย (verifier อยู่ใน browser เดียวกัน)
        const code = searchParams.get('code');
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        }
        // implicit: client อ่าน session จาก hash ให้เองตอน init
        const user = await getSessionUser();
        if (!user || cancelled) {
          throw new Error('ไม่พบ session หลังกลับจาก Google');
        }
        const cleanEmail = (user.email ?? '').toLowerCase();
        if (!cleanEmail) throw new Error('ไม่พบอีเมลจาก Google');
        const role = resolveRole(cleanEmail);
        if (role === 'admin') {
          router.push('/admin');
          return;
        }
        // ยังไม่สร้างแถวโปรไฟล์ตรงนี้ — ไปสร้างตอนกดบันทึกใน setup เท่านั้น
        let toSetup = true;
        try {
          const profile = await getMyProfile(user.id);
          const major = (profile as { major?: string } | null)?.major;
          if (profile && major && major !== '-') {
            toSetup = false;
          }
        } catch {
          // อ่านไม่ได้ ให้ไป setup ไว้ก่อน
        }
        if (cancelled) return;
        if (toSetup) {
          router.push(`/setup?email=${encodeURIComponent(cleanEmail)}&oauth=1`);
        } else {
          // แค่ cache ฝั่งเครื่องไว้โชว์ชื่อ (ยังไม่สร้างแถว DB)
          localStorage.setItem('userRole', 'student');
          localStorage.setItem('userEmail', cleanEmail);
          router.push('/main');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'เชื่อม Google ไม่สำเร็จ');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-[#f0f4fd] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 px-8 py-10 text-center max-w-sm w-full">
        {error ? (
          <>
            <p className="text-base font-extrabold text-slate-800">เชื่อม Google ไม่สำเร็จ</p>
            <p className="text-xs font-medium text-slate-500 mt-2">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full py-3 rounded-xl bg-[#1c58f6] hover:bg-blue-700 text-white font-bold text-sm transition-all"
            >
              กลับหน้าเข้าสู่ระบบ
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-600">กำลังเชื่อมบัญชี Google...</p>
          </>
        )}
      </div>
    </main>
  );
}
