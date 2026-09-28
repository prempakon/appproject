'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

function loadSavedProfile() {
  const initial = {
    formData: {
      firstName: '',
      lastName: '',
      institution: 'มหาวิทยาลัยราชภัฏเลย',
      major: '',
      bio: '',
    },
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150',
  };
  try {
    const savedProfile = typeof window === 'undefined' ? null : localStorage.getItem('userProfile');
    if (!savedProfile) return initial;
    const data = JSON.parse(savedProfile);
    const fullName = (data.name || '').trim();
    const lastSpaceIndex = fullName.lastIndexOf(' ');
    let fName = fullName;
    let lName = '';
    if (lastSpaceIndex !== -1) {
      fName = fullName.substring(0, lastSpaceIndex);
      lName = fullName.substring(lastSpaceIndex + 1);
    }
    return {
      formData: {
        firstName: fName || '',
        lastName: lName || '',
        institution: data.institution || 'มหาวิทยาลัยราชภัฏเลย',
        major: data.major || '',
        bio: data.bio || '',
      },
      avatar: data.avatar || initial.avatar,
    };
  } catch (e) {
    console.error('Error parsing profile', e);
    return initial;
  }
}

export default function EditProfilePage() {
  const router = useRouter();
  const [saved] = useState(loadSavedProfile);

  const [formData, setFormData] = useState(saved.formData);

  const [previewAvatar, setPreviewAvatar] = useState(saved.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      const url = URL.createObjectURL(e.target.files[0]);
      setPreviewAvatar(url);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    
    const existing = localStorage.getItem('userProfile');
    let email = 'student@lru.ac.th';
    if (existing) {
      try {
        email = JSON.parse(existing).email || email;
      } catch {}
    }

    // local ก่อนเสมอ (ของเดิมไม่หาย)
    localStorage.setItem('userProfile', JSON.stringify({
      name: fullName || 'นักศึกษา LRU',
      avatar: previewAvatar,
      institution: formData.institution,
      major: formData.major,
      bio: formData.bio,
      email: email
    }));

    // ทางจริง: อัปโหลดรูป + upsert profiles (พังก็ยังไป /main ได้ด้วย local)
    try {
      const { getSessionUser } = await import('../../../lib/auth');
      const { upsertMyProfile } = await import('../../../lib/profiles');
      const { uploadAvatarReal } = await import('../../../lib/storage');
      const user = await getSessionUser();
      if (user) {
        let avatarUrl = previewAvatar.startsWith('blob:') ? null : previewAvatar;
        if (avatarFile) {
          try {
            avatarUrl = await uploadAvatarReal(user.id, avatarFile);
          } catch {}
        }
        const saved = await upsertMyProfile(user.id, {
          email: user.email ?? email,
          name: fullName || 'นักศึกษา LRU',
          institution: formData.institution,
          major: formData.major,
          bio: formData.bio,
          avatar_url: avatarUrl,
        });
        localStorage.setItem('userProfile', JSON.stringify({
          name: saved.name,
          avatar: saved.avatar_url || previewAvatar,
          institution: saved.institution,
          major: saved.major,
          bio: (saved as { bio: string }).bio,
          email: saved.email
        }));
      }
    } catch {
      // เงียบไว้
    } finally {
      setBusy(false);
    }
    
    router.push('/main');
  };

  return (
    <main className="min-h-screen bg-[#f0f4fd] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-[0_24px_70px_-24px_rgba(30,64,175,0.22)] p-6 sm:p-8 border border-slate-200/70 my-auto">
        
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">แก้ไขโปรไฟล์ส่วนตัว</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">อัปเดตข้อมูลส่วนตัวและประวัติย่อของคุณในระบบ Portfolio</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* เปลี่ยนรูปโปรไฟล์ */}
          <div className="flex flex-col items-center justify-center pb-1">
            <div className="relative group cursor-pointer mb-1.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md relative transition-all group-hover:border-blue-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /></svg>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            <span className="text-xs font-bold text-blue-600">เปลี่ยนรูปโปรไฟล์</span>
          </div>

          {/* ชื่อ และ นามสกุล */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">ชื่อจริง</label>
              <input 
                type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                placeholder="ชื่อของคุณ" 
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">นามสกุล</label>
              <input 
                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                placeholder="นามสกุลของคุณ" 
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* มหาวิทยาลัย และ สาขาวิชา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">มหาวิทยาลัย / สถานศึกษา</label>
              <input 
                type="text" name="institution" value={formData.institution} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สาขาวิชา</label>
              <input 
                type="text" name="major" value={formData.major} onChange={handleChange}
                placeholder="เช่น วิทยาการคอมพิวเตอร์" 
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* คำอธิบายตัวตน (BIO) */}
          <div className="space-y-1">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">คำอธิบายตัวตน (BIO)</label>
            <textarea 
              name="bio" value={formData.bio} onChange={handleChange} rows={2}
              placeholder="เป้าหมายสายอาชีพ หรือทักษะที่คุณถนัด..." 
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 transition-all font-medium resize-none"
            />
          </div>

          <div className="pt-1 flex gap-3">
            <button 
              type="button" 
              onClick={() => router.push('/main')} 
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={busy}
              className="flex-1 bg-[#1c58f6] hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] text-sm disabled:opacity-60"
            >
              {busy ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
          
        </form>
      </div>
    </main>
  );
}