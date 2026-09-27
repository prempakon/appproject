'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInReal, signInWithGoogleReal } from '../lib/auth';
import { getMyProfile } from '../lib/profiles';
import { resolveRole } from '../lib/database.types';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const router = useRouter();

  const saveLocalSession = (cleanEmail: string, role: 'admin' | 'student', name?: string, avatar?: string) => {
    localStorage.setItem('userRole', role);
    localStorage.setItem('userEmail', cleanEmail);
    if (role === 'student') {
      localStorage.setItem('userProfile', JSON.stringify({
        name: name || cleanEmail.split('@')[0] || 'นักศึกษา LRU',
        avatar: avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150',
        email: cleanEmail
      }));
    }
  };

  const processLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const role = resolveRole(cleanEmail);
    if (role === 'admin') {
      // ถ้าเป็นแอดมิน ไปหน้าแดชบอร์ด
      saveLocalSession(cleanEmail, 'admin');
      router.push('/admin');
    } else {
      // ถ้ามีบัญชีอยู่แล้ว (ผู้ใช้ทั่วไป) ให้พุ่งตรงไปหน้าหลัก /main ทันที
      saveLocalSession(cleanEmail, 'student');
      router.push('/main');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      // ทางจริง: Supabase Auth + profiles
      const { user } = await signInReal(email.trim(), password);
      if (user) {
        try {
          const profile = await getMyProfile(user.id);
          const role = (profile?.role as 'admin' | 'student') ?? resolveRole(user.email ?? email);
          saveLocalSession((user.email ?? email).toLowerCase(), role, profile?.name, profile?.avatar_url ?? undefined);
          router.push(role === 'admin' ? '/admin' : '/main');
          return;
        } catch {
          // อ่านโปรไฟล์พัง ใช้ role จากอีเมลแทน
          const role = resolveRole(user.email ?? email);
          saveLocalSession((user.email ?? email).toLowerCase(), role);
          router.push(role === 'admin' ? '/admin' : '/main');
          return;
        }
      }
    } catch (err: unknown) {
      // fallback: บัญชี mock เดิมที่ยังไม่มีใน Auth (เช่น admin@lru.ac.th) ให้เข้าได้เหมือนเดิม
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials')) {
        processLogin(email);
        return;
      }
      setAuthError(msg || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

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
    <main 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 text-gray-800 relative"
      style={{
        backgroundColor: '#f0f4fd',
        backgroundImage: `
          radial-gradient(at 85% 20%, #e6e9ff 0px, transparent 60%),
          radial-gradient(at 15% 85%, #e1e4fc 0px, transparent 60%),
          radial-gradient(at 50% 75%, #fdf9ef 0px, transparent 55%),
          radial-gradient(at 10% 10%, #dee3fb 0px, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* GOOGLE ACCOUNT CHOOSER MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 sm:p-8 overflow-hidden border border-slate-100">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-black text-xl shadow-inner">
                G
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">ลงชื่อเข้าใช้ด้วย Google</h3>
              <p className="text-xs text-slate-500 mt-1">เลือกบัญชีเพื่อดำเนินการต่อยัง Portfolio System</p>
            </div>

            <div className="space-y-3 mb-6">
              <div 
                onClick={() => processLogin('student.lru@lru.ac.th')}
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  S
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Student LRU</p>
                  <p className="text-xs text-slate-400 truncate">student.lru@lru.ac.th</p>
                </div>
                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">เลือก</span>
              </div>

              <div 
                onClick={() => processLogin('admin@lru.ac.th')}
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  A
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Administrator</p>
                  <p className="text-xs text-slate-400 truncate">admin@lru.ac.th</p>
                </div>
                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">เลือก</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleReal}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors mb-2"
            >
              เชื่อม Google จริง (Supabase OAuth)
            </button>
            <button 
              type="button" 
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-[460px] rounded-3xl shadow-[0_24px_70px_-24px_rgba(30,64,175,0.28)] p-10 sm:p-12 relative flex flex-col justify-center border border-slate-200/70 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="mb-8 mt-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome <span className="block mt-1.5 text-[1.35rem] font-semibold text-gray-500">ยินดีต้อนรับ</span>
          </h1>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-medium font-medium text-gray-700">ที่อยู่อีเมล</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lru.ac.th หรือ นักศึกษา" 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 outline-none text-gray-900 placeholder-gray-400 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-medium font-medium text-gray-700">รหัสผ่าน</label>
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">ลืมรหัสผ่าน?</a>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••" 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 outline-none text-gray-900 placeholder-gray-400 transition-all duration-200 pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} className="w-full bg-[#1c58f6] hover:bg-blue-700 active:scale-[0.99] text-white font-medium py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-blue-500/20 disabled:opacity-60">
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'Sign In'}
          </button>
          {authError && <p className="text-xs font-bold text-red-500 text-center">{authError}</p>}
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink-0 px-4 text-xs font-medium text-gray-400">or continue with</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <button 
          type="button" 
          onClick={() => setShowGoogleModal(true)} 
          className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign In with Google
        </button>

        {/* ปุ่มสำหรับสมัครสมาชิกใหม่ (วิ่งไปหน้า Setup) */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ยังไม่มีบัญชีผู้ใช้ใช่ไหม?{' '}
            <button 
              type="button" 
              onClick={() => router.push('/setup')} 
              className="font-bold text-blue-600 hover:underline focus:outline-none"
            >
              สมัครสมาชิก (ลงทะเบียน)
            </button>
          </p>
        </div>

      </div>
    </main>
  );
}