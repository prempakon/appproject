'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpReal } from '../../lib/auth';
import { uploadAvatarReal } from '../../lib/storage';
import { resolveRole } from '../../lib/database.types';

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  );
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthEmail = searchParams.get('email') ?? '';
  const isOAuth = searchParams.get('oauth') === '1' && !!oauthEmail;
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [formData, setFormData] = useState({
    email: oauthEmail.toLowerCase(),
    password: '',
    firstName: '',
    lastName: '',
    institution: 'มหาวิทยาลัยราชภัฏเลย',
    major: '',
  });

  // โหมด OAuth: ดึงชื่อจากโปรไฟล์ Google ที่ callback สร้างไว้มากรอกให้
  useEffect(() => {
    if (!isOAuth) return;
    let cancelled = false;
    (async () => {
      try {
        const { getSessionUser } = await import('../../lib/auth');
        const { getMyProfile } = await import('../../lib/profiles');
        const user = await getSessionUser();
        if (!user || cancelled) return;
        const profile = await getMyProfile(user.id);
        if (!profile || cancelled) return;
        const parts = (profile.name || '').trim().split(/\s+/);
        setFormData((prev) => ({
          ...prev,
          email: profile.email || prev.email,
          firstName: parts.slice(0, -1).join(' ') || parts[0] || '',
          lastName: parts.length > 1 ? parts[parts.length - 1] : '',
        }));
      } catch {
        // เงียบไว้ กรอกเองได้
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOAuth]);

  const [previewAvatar, setPreviewAvatar] = useState('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      const url = URL.createObjectURL(e.target.files[0]);
      setPreviewAvatar(url);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // กันเมลไม่มีโดเมนจริง (เช่น ggg@124) — เบราว์เซอร์เช็คหลวม ต้องเช็คเอง
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) {
      setAuthError('กรุณากรอกอีเมลให้ถูกต้อง เช่น name@gmail.com (ต้องมี .com หรือโดเมนจริง)');
      return;
    }
    setBusy(true);
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    // สำรอง localStorage เดิมไว้ก่อนเสมอ (fallback ถ้า DB พัง)
    localStorage.setItem('userProfile', JSON.stringify({
      name: fullName || 'นักศึกษาใหม่',
      avatar: previewAvatar,
      institution: formData.institution,
      major: formData.major,
      email: formData.email
    }));
    localStorage.setItem('userRole', resolveRole(cleanEmail));
    localStorage.setItem('userEmail', formData.email);

    try {
      if (isOAuth) {
        // โหมด Google: มีบัญชี Auth แล้ว แค่อัปเดตโปรไฟล์ให้สมบูรณ์ (ไม่สมัครรหัสผ่าน)
        const { getSessionUser } = await import('../../lib/auth');
        const { upsertMyProfile } = await import('../../lib/profiles');
        const user = await getSessionUser();
        if (!user) throw new Error('เซสชัน Google หมดอายุ กดปุ่ม Google ใหม่อีกครั้ง');
        // ตั้งรหัสผ่าน (บังคับสำหรับบัญชี Google)
        if (formData.password.trim()) {
          const { supabase } = await import('../../lib/supabaseClient');
          const { error: pwErr } = await supabase.auth.updateUser({ password: formData.password });
          if (pwErr) throw pwErr;
        }
        let avatarUrl: string | null = null;
        if (avatarFile) {
          try {
            avatarUrl = await uploadAvatarReal(user.id, avatarFile);
          } catch {
            // เงียบไว้ ใช้รูปเดิม
          }
        }
        const saved = await upsertMyProfile(user.id, {
          email: cleanEmail,
          name: fullName || 'นักศึกษาใหม่',
          institution: formData.institution,
          major: formData.major,
          avatar_url: avatarUrl,
        });
        localStorage.setItem('userProfile', JSON.stringify({
          name: saved.name,
          avatar: saved.avatar_url || previewAvatar,
          institution: saved.institution,
          major: saved.major,
          email: saved.email
        }));
      } else {
        // ทางจริง: Supabase Auth + profiles
        const { user } = await signUpReal(cleanEmail, formData.password, {
          name: fullName || 'นักศึกษาใหม่',
          institution: formData.institution,
          major: formData.major,
          avatar_url: null,
        });
        // อัปโหลดรูปจริงถ้าเลือกไฟล์ (ไม่บังคับ — พังก็ใช้ preview เดิม)
        if (user && avatarFile) {
          try {
            const publicUrl = await uploadAvatarReal(user.id, avatarFile);
            const { supabase } = await import('../../lib/supabaseClient');
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            localStorage.setItem('userProfile', JSON.stringify({
              name: fullName || 'นักศึกษาใหม่',
              avatar: publicUrl,
              institution: formData.institution,
              major: formData.major,
              email: formData.email
            }));
          } catch {
            // เงียบไว้ ใช้ local preview ต่อได้
          }
        }
      }
    } catch (err: unknown) {
      // ถ้าอีเมลซ้ำ (มีใน Auth แล้ว) ให้แจ้งแต่ยังพาเข้าได้ด้วย local fallback
      const msg = err instanceof Error ? err.message : '';
      if (!msg.toLowerCase().includes('already registered') && !msg.toLowerCase().includes('already exists')) {
        setAuthError(msg || 'สมัครไม่สำเร็จ แต่บันทึกแบบออฟไลน์ไว้แล้ว');
      }
    } finally {
      setBusy(false);
    }
    
    // ลงทะเบียนเสร็จ พาไปหน้าหลักทันที
    const role = resolveRole(cleanEmail);
    router.push(role === 'admin' ? '/admin' : '/main');
  };

  return (
    <main className="min-h-screen bg-[#f0f4fd] flex items-center justify-center p-4 py-10">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-[0_24px_70px_-24px_rgba(30,64,175,0.22)] p-8 sm:p-10 animate-in slide-in-from-bottom-4 duration-500 border border-slate-200/70">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {isOAuth ? 'กรอกข้อมูลให้ครบ' : 'สมัครสมาชิกใหม่'}
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {isOAuth
              ? `เชื่อม Google สำเร็จ (${formData.email || oauthEmail}) กรอกข้อมูลส่วนตัวเพื่อเริ่มใช้งาน`
              : 'กรอกอีเมล รหัสผ่าน และข้อมูลส่วนตัวเพื่อสร้างบัญชีระบบ Portfolio'}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          
          {/* อัปโหลดรูปโปรไฟล์ */}
          <div className="flex flex-col items-center justify-center pb-1">
            <div className="relative group cursor-pointer mb-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md relative transition-all group-hover:border-blue-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /></svg>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            <span className="text-xs font-bold text-blue-600">อัปโหลดรูปโปรไฟล์</span>
          </div>

          {/* ช่องกรอกอีเมล และ รหัสผ่าน */}
          <div className={`grid grid-cols-1 ${isOAuth ? '' : 'sm:grid-cols-2'} gap-4`}>
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">อีเมล</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="student@lru.ac.th" 
                readOnly={isOAuth}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium disabled:opacity-70"
                required
              />
            </div>

            {!isOAuth && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                  placeholder="••••••••••••" 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
            </div>
            )}
          </div>

          {/* ตั้งรหัสผ่านสำหรับบัญชี Google (บังคับ) */}
          {isOAuth && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">ตั้งรหัสผ่าน</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                  placeholder="ตั้งรหัสผ่านสำหรับเข้าสู่ระบบครั้งต่อไป" 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium pr-10"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-400">ต้องตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบด้วยอีเมลในครั้งต่อไป</p>
            </div>
          )}

          {/* ช่องกรอกชื่อ และ นามสกุล */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">ชื่อจริง</label>
              <input 
                type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                placeholder="ชื่อของคุณ" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">นามสกุล</label>
              <input 
                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                placeholder="นามสกุลของคุณ" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* ช่องกรอกมหาวิทยาลัย และ สาขาวิชา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">มหาวิทยาลัย / สถานศึกษา</label>
              <input 
                type="text" name="institution" value={formData.institution} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สาขาวิชา</label>
              <input 
                type="text" name="major" value={formData.major} onChange={handleChange}
                placeholder="เช่น วิทยาการคอมพิวเตอร์" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={busy} className="w-full bg-[#1c58f6] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] text-sm disabled:opacity-60">
              {busy ? (isOAuth ? 'กำลังบันทึกข้อมูล...' : 'กำลังสมัครสมาชิก...') : (isOAuth ? 'บันทึกข้อมูลและเข้าสู่ระบบ' : 'ลงทะเบียนและเข้าสู่ระบบ')}
            </button>
            {authError && <p className="text-xs font-bold text-red-500 text-center mt-2">{authError}</p>}
          </div>

          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => router.push('/')} 
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </button>
          </div>
          
        </form>
      </div>
    </main>
  );
}