'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupProfilePage() {
  const router = useRouter();
  
  // State สำหรับเก็บข้อมูลทั้งหมดที่ User ต้องกรอก
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    institution: '',
    major: '',
    bio: '',
    githubLink: ''
  });

  const [previewAvatar, setPreviewAvatar] = useState('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPreviewAvatar(url);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // รวมชื่อ-นามสกุล และบันทึกข้อมูลทั้งหมดลง localStorage
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    localStorage.setItem('userProfile', JSON.stringify({
      name: fullName || 'ผู้ใช้งานใหม่',
      avatar: previewAvatar,
      institution: formData.institution,
      major: formData.major,
      bio: formData.bio,
      githubLink: formData.githubLink
    }));
    
    // บันทึกเสร็จแล้วเด้งไปหน้าหลัก
    router.push('/main');
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-xl p-8 sm:p-10 animate-in slide-in-from-bottom-4 duration-500 border border-slate-100">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">สร้างโปรไฟล์ของคุณ</h2>
          <p className="text-sm text-slate-500 mt-2">กรอกข้อมูลพื้นฐานเพื่อให้ AI วิเคราะห์และแนะนำสายงานได้แม่นยำขึ้น</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-8">
          
          {/* ส่วนอัปโหลดรูปภาพโปรไฟล์ */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer mb-3">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm relative transition-all group-hover:border-blue-100 group-hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                </div>
              </div>
              <input id="avatar-input" type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            <label htmlFor="avatar-input" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-100 transition-colors">
              เปลี่ยนรูปโปรไฟล์
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* ชื่อจริง */}
            <div className="space-y-2">
              <label className="block text-sm font-extrabold text-slate-700">ชื่อจริง</label>
              <input 
                type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                placeholder="ชื่อของคุณ" 
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 transition-all"
                required
              />
            </div>

            {/* นามสกุล */}
            <div className="space-y-2">
              <label className="block text-sm font-extrabold text-slate-700">นามสกุล</label>
              <input 
                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                placeholder="นามสกุลของคุณ" 
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 transition-all"
                required
              />
            </div>

            {/* มหาวิทยาลัย / สถานศึกษา */}
            <div className="space-y-2">
              <label className="block text-sm font-extrabold text-slate-700">มหาวิทยาลัย / สถานศึกษา</label>
              <input 
                type="text" name="institution" value={formData.institution} onChange={handleChange}
                placeholder="เช่น มหาวิทยาลัยราชภัฏเลย" 
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 transition-all"
                required
              />
            </div>

            {/* คณะ / สาขาวิชา */}
            <div className="space-y-2">
              <label className="block text-sm font-extrabold text-slate-700">คณะ / สาขาวิชา</label>
              <input 
                type="text" name="major" value={formData.major} onChange={handleChange}
                placeholder="เช่น วิทยาการคอมพิวเตอร์" 
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 transition-all"
                required
              />
            </div>
          </div>

         

          {/* แนะนำตัวเองแบบย่อ */}
          <div className="space-y-2">
            <label className="block text-sm font-extrabold text-slate-700">คำอธิบายตัวเองสั้นๆ (Bio)</label>
            <textarea 
              name="bio" value={formData.bio} onChange={handleChange}
              placeholder="เป้าหมายสายอาชีพ หรือทักษะที่คุณถนัด..." 
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 transition-all resize-none h-24"
            />
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2">
              บันทึกและเข้าสู่ระบบ
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
          
        </form>
      </div>
    </main>
  );
}