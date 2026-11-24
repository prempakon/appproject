'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSessionUser, signInReal, signInWithGoogleReal } from '../../lib/auth';
import { getMyProfile } from '../../lib/profiles';
import { resolveRole } from '../../lib/database.types';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/main';

  // Feature name mapping for redirect notice
  const featureNames: Record<string, string> = {
    '/analytics': 'วิเคราะห์อาชีพ',
    '/main': 'พอร์ตโฟลิโอ',
    '/resume': 'สร้างเรซูเม่พร้อม QR Code',
    '/gallery': 'คลังผลงาน',
    '/profile': 'โปรไฟล์ของฉัน',
  };
  const featureName = featureNames[redirectPath] || 'ฟีเจอร์นี้';

  // On direct visit (no redirect), clear stale auth state
  useEffect(() => {
    if (redirectPath === '/main') {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userProfile');
    }
  }, [redirectPath]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const { user } = await signInReal(email.trim(), password);
      if (user) {
        try {
          const profile = await getMyProfile(user.id);
          const role = (profile?.role as 'admin' | 'student') ?? resolveRole(user.email ?? email);
          const cleanEmail = (user.email ?? email).toLowerCase();
          if (role === 'admin') {
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userEmail', cleanEmail);
            localStorage.setItem('userProfile', JSON.stringify({
              name: profile?.name || 'ผู้ดูแลระบบ',
              avatar: profile?.avatar_url || '',
              email: cleanEmail
            }));
            router.push('/admin');
          } else {
            localStorage.setItem('userRole', 'student');
            localStorage.setItem('userEmail', cleanEmail);
            if (profile) {
              localStorage.setItem('userProfile', JSON.stringify({
                name: profile.name || cleanEmail.split('@')[0] || 'ผู้ใช้ใหม่',
                avatar: profile.avatar_url || '',
                email: cleanEmail
              }));
            } else {
              localStorage.setItem('userProfile', JSON.stringify({
                name: cleanEmail.split('@')[0] || 'ผู้ใช้ใหม่',
                avatar: '',
                email: cleanEmail
              }));
            }
            router.push(redirectPath || '/main');
          }
        } catch {
          const role = resolveRole(user.email ?? email);
          const cleanEmail = (user.email ?? email).toLowerCase();
          localStorage.setItem('userRole', role);
          localStorage.setItem('userEmail', cleanEmail);
          localStorage.removeItem('userProfile');
          router.push(redirectPath || '/main');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setAuthError(msg || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleReal = async () => {
    setAuthError('');
    try {
      const { error } = await signInWithGoogleReal();
      if (error) throw error;
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in ไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/70 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* --- LEFT COLUMN: Showcase panel --- */}
        <div className="lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-8 flex flex-col justify-between gap-6 text-left">
          {/* Decorative radial glows */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-400/20 blur-3xl" />

          {/* Top: badge + headline + subtitle */}
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-blue-100 w-fit">
              AI Career &amp; Portfolio
            </div>
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-balance mt-4">เปลี่ยนผลงานจริง ให้เป็นโอกาสทางอาชีพ</h1>
            <p className="text-sm text-blue-100/85 mt-2 leading-relaxed">ระบบวิเคราะห์ศักยภาพ 6 มิติด้วย AI พร้อมสร้างเรซูเม่ QR Code และจับคู่ตำแหน่งงานที่ตรงกับทักษะของคุณ</p>
          </div>

          {/* Middle: structured 3-step guide */}
          <div className="relative space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-sm font-bold text-white">เข้าสู่ระบบหรือสมัครสมาชิกฟรี</p>
                <p className="text-xs text-blue-100/80 leading-relaxed mt-0.5">เปิดใช้งานพื้นที่เก็บพอร์ตและข้อมูลส่วนตัว</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-sm font-bold text-white">อัปโหลดผลงานหรือเรซูเม่</p>
                <p className="text-xs text-blue-100/80 leading-relaxed mt-0.5">ให้ AI ประเมินทักษะ 6 มิติจากหลักฐานจริง</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-sm font-bold text-white">รับเรซูเม่ QR Code และจับคู่งาน</p>
                <p className="text-xs text-blue-100/80 leading-relaxed mt-0.5">ยื่นสมัครงานจริงพร้อมดู % ความเหมาะสม</p>
              </div>
            </div>
          </div>

          {/* Bottom: translucent summary bar */}
          <div className="relative rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3 text-xs text-blue-100 flex items-center justify-between">
            <span>รองรับทุกสายอาชีพ • ปลอดภัยตามมาตรฐาน PDPA</span>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Alert + login form --- */}
        <div className="lg:col-span-7 bg-white p-7 sm:p-9 lg:p-12 flex flex-col justify-center">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">ยินดีต้อนรับกลับ</h2>
            <p className="text-sm text-slate-500 mt-1.5">เข้าสู่ระบบเพื่อดำเนินการต่อกับพอร์ตโฟลิโออาชีพของคุณ</p>
          </div>

          {/* --- Contextual ?redirect= alert banner --- */}
          {redirectPath && redirectPath !== '/main' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 shrink-0 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนใช้งานฟีเจอร์นี้</p>
                <p className="text-sm text-amber-600">ฟีเจอร์: {featureName}</p>
              </div>
            </div>
          )}

          {/* --- Login Form --- */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">อีเมลของคุณ</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-600/15 outline-none text-gray-900 placeholder-gray-400 transition-all duration-200 pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-600/15 outline-none text-gray-900 placeholder-gray-400 transition-all duration-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    {showPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    ) : (
                      <>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#1c58f6] hover:bg-blue-700 active:scale-[0.99] text-white font-medium py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-blue-500/20 disabled:opacity-60"
            >
              {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
            {authError && <p className="mt-2 text-xs font-bold text-red-600 text-center">{authError}</p>}
          </form>

          {/* --- Google Sign-In --- */}
          <button
            type="button"
            onClick={handleGoogleReal}
            className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {/* Self-contained 4-color Google "G" — immune to global SVG CSS rules */}
            <img
              src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285F4' d='M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z'/%3E%3Cpath fill='%2334A853' d='M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z'/%3E%3Cpath fill='%23FBBC05' d='M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z'/%3E%3Cpath fill='%23EA4335' d='M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z'/%3E%3C/svg%3E"
              alt="Google"
              width={18}
              height={18}
              className="w-[18px] h-[18px] shrink-0"
            />
            เข้าสู่ระบบด้วย Google
          </button>

          {/* --- Register Link --- */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              ยังไม่มีบัญชีผู้ใช้นะ?{' '}
              <a
                href="/setup"
                className="font-bold text-blue-600 hover:underline focus:outline-none transition-colors"
              >
                สมัครสมาชิกฟรี →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}