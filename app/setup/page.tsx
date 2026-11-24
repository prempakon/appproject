'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpReal, signInWithGoogleReal } from '../../lib/auth';
import { uploadAvatarReal } from '../../lib/storage';
import { resolveRole, USER_STATUS_OPTIONS } from '../../lib/database.types';

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
  const [pdpaConsent, setPdpaConsent] = useState(false);

  const [formData, setFormData] = useState({
    email: oauthEmail.toLowerCase(),
    password: '',
    firstName: '',
    lastName: '',
    institution: '',
    major: '',
    user_status: USER_STATUS_OPTIONS[0].value,
    avatarFile: null as File | null,
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

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');

  const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_AVATAR_SIZE) {
        setAvatarError('รูปภาพต้องไม่เกิน 5 MB กรุณาเลือกไฟล์ที่เล็กลง');
        setAvatarFile(null);
        setPreviewAvatar(null);
        return;
      }
      setAvatarError('');
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setPreviewAvatar(url);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const passwordStrength = (pw: string): { score: number; message: string } => {
    if (!pw) return { score: 0, message: 'ยังไม่ได้ตั้งรหัสผ่าน' };
    if (pw.length < 8) return { score: 1, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
    let score = 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z\d]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    const messages = [
      'อ่อนแอเกินไป',
      'พอใช้ได้ แต่ควรตั้งให้ยากขึ้น',
      'ปานกลาง',
      'แข็งแรงดี',
      'แข็งแรงมาก',
    ];
    return { score: Math.min(score, 5), message: messages[Math.min(score - 1, 4)] };
  };

  const strength = passwordStrength(formData.password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAvatarError('');

    if (!pdpaConsent) {
      setAuthError('กรุณาแสดงความยินยอมตามนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนสมัครสมาชิก');
      return;
    }

    // กันเมลไม่มีโดเมนจริง (เช่น ggg@124) — เบราว์เซอร์เช็คหลวม ต้องเช็คเอง
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) {
      setAuthError('กรุณากรอกอีเมลให้ถูกต้อง เช่น name@gmail.com (ต้องมี .com หรือโดเมนจริง)');
      return;
    }

    if (formData.password.length < 8) {
      setAuthError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setBusy(true);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    // สำรอง localStorage เดิมไว้ก่อนเสมอ (fallback ถ้า DB พัง)
    localStorage.setItem('userProfile', JSON.stringify({
      name: fullName || 'ผู้ใช้ใหม่',
      avatar: previewAvatar || undefined,
      institution: formData.institution || undefined,
      major: formData.major || undefined,
      user_status: formData.user_status,
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
          name: fullName || 'ผู้ใช้ใหม่',
          institution: formData.institution || null,
          major: formData.major || null,
          user_status: formData.user_status,
          avatar_url: avatarUrl,
        });
        localStorage.setItem('userProfile', JSON.stringify({
          name: saved.name,
          avatar: saved.avatar_url || previewAvatar || undefined,
          institution: saved.institution || undefined,
          major: saved.major || undefined,
          user_status: saved.user_status,
          email: saved.email
        }));
      } else {
        // ทางจริง: Supabase Auth + profiles
        const { user } = await signUpReal(cleanEmail, formData.password, {
          name: fullName || 'ผู้ใช้ใหม่',
          institution: formData.institution || null,
          major: formData.major || null,
          user_status: formData.user_status,
          avatar_url: null,
        });
        // อัปโหลดรูปจริงถ้าเลือกไฟล์ (ไม่บังคับ — พังก็ใช้ preview เดิม)
        if (user && avatarFile) {
          try {
            const publicUrl = await uploadAvatarReal(user.id, avatarFile);
            const { supabase } = await import('../../lib/supabaseClient');
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            localStorage.setItem('userProfile', JSON.stringify({
              name: fullName || 'ผู้ใช้ใหม่',
              avatar: publicUrl,
              institution: formData.institution || undefined,
              major: formData.major || undefined,
              user_status: formData.user_status,
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

        {/* ปุ่มสมัครด้วย Google (เฉพาะโหมดสมัครธรรมดา) */}
        {!isOAuth && (
          <button
            type="button"
            onClick={signInWithGoogleReal}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.11z"
              />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.36-1.36-.36-2.09s.14-1.43.36-2.09V7.07h2.66v1.82c.31.43.85.7 1.43.7.56 0 1.1-.22 1.49-.63l2.08-2.13h2.78v2.65H10.9c-.58.73-1.34 1.18-2.16 1.36v2.12H5.84z" />
              <path fill="#EA4335" d="M12 5.38c1.32 0 2.53.36 3.56.98l2.65-2.65c-1.18-.58-2.6-.92-4.08-.92-3.63 0-6.69 2.52-7.21 5.84H2.18v1.44c2.35-1.94 5.46-3.18 8.9-3.18z" />
            </svg>
            สมัครด้วย Google
          </button>
        )}

        <form onSubmit={handleRegister} className="space-y-5">

          {/* ปุ่มสมัครด้วย Google (แสดงเมื่อ OAuth เสร็จแล้วจะซ่อน) */}
          {isOAuth && (
            <p className="text-xs font-bold text-blue-600 text-center mb-4">
              กำลังสมัครด้วยบัญชี Google: {formData.email || oauthEmail}
            </p>
          )}

          {/* อัปโหลดรูปโปรไฟล์ (ไม่บังคับ, สูงสุด 5 MB) */}
          <div className="flex flex-col items-center justify-center pb-1">
            <div className="relative group cursor-pointer mb-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md relative transition-all group-hover:border-blue-200 flex items-center justify-center bg-slate-50">
                {previewAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-slate-400 mb-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17v5l-1.405-1.405a.5.5 0 01-.707-.707L15 15.293V13.5a1.5 1.5 0 00-1-1.414l-1.95-1.95a.5.5 0 01.707-.707L12.5 9.293V7.5a1.5 1.5 0 00-1-1.414l-1.95-1.95a.5.5 0 01.707-.707L12.5 4.293V2.5a1.5 1.5 0 00-1-1.414L9.05.05a.5.5 0 01.707 0L12.5 2.207V4.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 6.793V8.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 10.293V11.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 13.293V14.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 15.793V16.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 17.793V18.5a1.5 1.5 0 001 1.414l1.95 1.95a.5.5 0 01-.707.707L12 20.293V22.5a1.5 1.5 0 001 1.414l-1.414-1.414a.5.5 0 01-.707-.707z" />
                    </svg>
                    <span className="text-[11px] font-bold text-slate-500">อัปโหลดรูปโปรไฟล์</span>
                    {avatarError && <span className="text-[10px] font-bold text-red-500 mt-0.5">{avatarError}</span>}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {avatarError && (
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                  {avatarError}
                </span>
              )}
            </div>
            {!previewAvatar && !avatarError && (
              <span className="text-xs font-bold text-slate-400">ไม่บังคับ · สูงสุด 5 MB</span>
            )}
          </div>

          {/* ช่องกรอกอีเมล */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">อีเมล</label>
            <input
              type="email" name="email" value={formData.email} onChange={handleChange}
              placeholder="name@example.com"
              readOnly={isOAuth}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium disabled:opacity-70"
              required
            />
          </div>

          {/* รหัสผ่าน (ไม่แสดงในโหมด OAuth จนกว่าจะต้องตั้ง) */}
          {!isOAuth && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium pr-10"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
              <div className={`flex items-center gap-1.5 mt-1 ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                <span className="text-[10px] font-bold">{strength.message}</span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`w-1 h-1 rounded-full transition-colors ${i <= strength.score ? 'bg-current' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          )}

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
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
              <div className={`flex items-center gap-1.5 mt-1 ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                <span className="text-[10px] font-bold">{strength.message}</span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`w-1 h-1 rounded-full transition-colors ${i <= strength.score ? 'bg-current' : 'bg-slate-200'}`} />
                ))}
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

          {/* สถานะผู้ใช้ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สถานะการทำงาน</label>
            <select
              name="user_status"
              value={formData.user_status}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
              required
            >
              {USER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* ช่องกรอกสถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ) และ สาขาวิชา / สายงาน */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ)</label>
              <input
                type="text" name="institution" value={formData.institution} onChange={handleChange}
                placeholder="เช่น มหาวิทยาลัย หรือ บริษัท"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สาขาวิชา / สายงานที่เชี่ยวชาญ</label>
              <input
                type="text" name="major" value={formData.major} onChange={handleChange}
                placeholder="เช่น วิศวกรรมซอฟต์แวร์, การตลาด, บัญชี"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
              />
            </div>
          </div>

          {/* PDPA Consent */}
          <div className="flex items-start gap-3 pt-1">
            <input
              type="checkbox"
              name="pdpa_consent"
              checked={pdpaConsent}
              onChange={(e) => setPdpaConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              required
            />
            <label className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              ฉันยินยอมให้ระบบเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม{' '}
              <a href="#" className="text-blue-600 hover:underline font-bold">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</a>
            </label>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={busy || !pdpaConsent} className="w-full bg-[#1c58f6] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] text-sm disabled:opacity-60">
              {busy ? (isOAuth ? 'กำลังบันทึกข้อมูล...' : 'กำลังสมัครสมาชิก...') : (isOAuth ? 'บันทึกข้อมูลและเข้าสู่ระบบ' : 'ลงทะเบียนและเข้าสู่ระบบ')}
            </button>
            {authError && <p className="text-xs font-bold text-red-500 text-center mt-2">{authError}</p>}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={async () => {
                if (isOAuth) {
                  try {
                    const { signOutReal } = await import('../../lib/auth');
                    await signOutReal();
                  } catch {
                    // ออกแบบ local ได้แม้เซิร์ฟเวอร์พัง
                  }
                  localStorage.removeItem('userRole');
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('userProfile');
                }
                router.push('/login');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isOAuth ? '← ยกเลิก กลับหน้าเข้าสู่ระบบ' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
