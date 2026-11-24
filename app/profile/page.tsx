'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { USER_STATUS_OPTIONS, type Profile, type UserStatus } from '../../lib/database.types';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LEGACY_BIO = 'ยังไม่ได้กรอก';

type Feedback = { type: 'success' | 'error'; message: string } | null;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function initialsFrom(firstName: string, lastName: string, email: string) {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  const single = first || last;
  if (single) {
    const parts = single.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return single.slice(0, 2).toUpperCase();
  }
  const prefix = (email.split('@')[0] ?? '').replace(/[^\p{L}\p{N}]/gu, '');
  return prefix ? prefix.slice(0, 2).toUpperCase() : '?';
}

function readLocalProfile(): Partial<Profile> | null {
  try {
    const saved = window.localStorage.getItem('userProfile');
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Partial<Profile>;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userStatus, setUserStatus] = useState<UserStatus | ''>('');
  const [institution, setInstitution] = useState('');
  const [major, setMajor] = useState('');
  const [bio, setBio] = useState('');

  // --- Strict auth guard: verify the Supabase user first, then query only that row. ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;

      const user = authData.user;
      if (authError || !user) {
        router.replace('/login?redirect=/profile');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const local = readLocalProfile();
      const db = (data as Profile | null) ?? null;

      if (error && !db) {
        setFeedback({
          type: 'error',
          message: `โหลดข้อมูลโปรไฟล์ไม่สำเร็จ: ${error.message}`,
        });
      }

      const nameSource = db?.name || (typeof local?.name === 'string' ? local.name : '');
      const { firstName: first, lastName: last } = splitName(nameSource);

      setFirstName(first);
      setLastName(last);
      setUserStatus(db?.user_status ?? '');
      setInstitution(db?.institution ?? (typeof local?.institution === 'string' ? local.institution : ''));
      setMajor(db?.major ?? (typeof local?.major === 'string' ? local.major : ''));
      const bioSource = db?.bio ?? (typeof local?.bio === 'string' ? local.bio : '');
      setBio(bioSource === LEGACY_BIO ? '' : bioSource ?? '');
      setAvatarUrl(db?.avatar_url ?? null);
      setLoading(false);
    })().catch((error: unknown) => {
      if (cancelled) return;
      setFeedback({
        type: 'error',
        message: `โหลดข้อมูลโปรไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`,
      });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const displayName = fullName || 'ผู้ใช้';
  const initials = initialsFrom(firstName, lastName, email);

  const persistLocalProfile = (patch: {
    name: string;
    avatarUrl: string | null;
    institution: string;
    major: string;
    bio: string;
    userStatus: UserStatus | '';
  }) => {
    try {
      window.localStorage.setItem('userProfile', JSON.stringify({
        name: patch.name,
        avatar: patch.avatarUrl ?? '',
        institution: patch.institution,
        major: patch.major,
        bio: patch.bio || LEGACY_BIO,
        userStatus: patch.userStatus,
      }));
      if (email) window.localStorage.setItem('userEmail', email);
    } catch (error) {
      // Non-critical: the DB write already succeeded, only the local mirror failed.
      console.warn('บันทึกสำรองใน localStorage ไม่สำเร็จ', error);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setFeedback({ type: 'error', message: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น' });
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: 'error', message: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB' });
      return;
    }

    if (!userId) {
      router.replace('/login?redirect=/profile');
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const { uploadAvatarReal } = await import('../../lib/storage');
      const publicUrl = await uploadAvatarReal(userId, file);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (error) throw error;

      setAvatarUrl(publicUrl);
      persistLocalProfile({
        name: fullName,
        avatarUrl: publicUrl,
        institution,
        major,
        bio,
        userStatus,
      });
      setFeedback({ type: 'success', message: 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      router.replace('/login?redirect=/profile');
      return;
    }

    if (!firstName.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกชื่อจริงก่อนบันทึก' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const patch = {
      email,
      name: fullName,
      avatar_url: avatarUrl,
      user_status: userStatus || null,
      institution: institution.trim() || null,
      major: major.trim() || null,
      bio: bio.trim(),
    };

    try {
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('id');

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: userId,
          ...patch,
        });
        if (insertError) throw insertError;
      }

      persistLocalProfile({
        name: fullName,
        avatarUrl,
        institution: institution.trim(),
        major: major.trim(),
        bio: bio.trim(),
        userStatus,
      });
      setFeedback({ type: 'success', message: 'บันทึกโปรไฟล์เรียบร้อยแล้ว' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `บันทึกโปรไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          <div className="h-24 w-24 rounded-full bg-slate-100 mx-auto animate-pulse" />
          <p className="mt-6 text-center text-sm font-bold text-slate-500">กำลังตรวจสอบสิทธิ์และโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-100 pb-6 text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`รูปโปรไฟล์ของ ${displayName}`}
              className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm mx-auto"
            />
          ) : (
            <div
              aria-label={`อักษรย่อของ ${displayName}`}
              className="w-24 h-24 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto"
            >
              {initials}
            </div>
          )}

          <h1 className="mt-4 text-2xl font-black text-slate-900">{displayName}</h1>
          {email && <p className="mt-1 text-xs font-medium text-slate-400">{email}</p>}

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading}
            className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
          >
            {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปโปรไฟล์'}
          </button>
          <p className="mt-2 text-[11px] font-medium text-slate-400">JPG, PNG หรือ WEBP — ไม่เกิน 5MB</p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 rounded-xl border px-4 py-3 text-xs font-bold ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? '✓ ' : '⚠ '}
            {feedback.message}
          </div>
        )}

        {/* Editable profile form */}
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">ชื่อจริง</span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="เช่น สมชาย"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">นามสกุล</span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="เช่น ใจดี"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">สถานะปัจจุบัน</span>
            <select
              value={userStatus}
              onChange={(event) => setUserStatus(event.target.value as UserStatus | '')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400"
            >
              <option value="">ยังไม่ระบุ</option>
              {USER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              สถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ)
            </span>
            <input
              type="text"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="เช่น มหาวิทยาลัย, บริษัท หรือองค์กร (ถ้ามี)"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              สาขาวิชา / สายงานที่เชี่ยวชาญ
            </span>
            <input
              type="text"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              placeholder="เช่น วิทยาการคอมพิวเตอร์, การตลาด, วิศวกรรม"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              คำอธิบายตัวตน (BIO)
            </span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              placeholder="เล่าสั้น ๆ ว่าคุณทำอะไร ถนัดอะไร และกำลังมองหาโอกาสแบบไหน"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-400"
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/main')}
              className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              ← กลับหน้าหลัก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#1c58f6] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลโปรไฟล์'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
