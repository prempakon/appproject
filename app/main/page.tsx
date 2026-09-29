'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ResultModal from '../components/ResultModal'; 

type UserProfile = {
  name: string;
  avatar: string;
  institution?: string;
  major?: string;
  bio?: string;
  githubLink?: string;
};

type CloudFile = {
  id: string | number;
  title: string;
  type: string;
  imageUrl: string;
};

type HistoryItem = {
  id: string;
  title: string;
  analyzedAt: string;
  type: string;
  analysis: {
    skills: string[];
    career: string | null;
    careerEn: string | null;
    accuracy: number;
    technical: number;
    soft: number;
    management: number;
    recommendations: { title: string; detail: string }[];
    warnings: string[];
    rawInput: string | null;
    textWarning: string | null;
    skillNotes: { technical: string | null; soft: string | null; management: string | null };
    model: string | null;
  } | null;
};

export default function PortfolioStorage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preview' | 'processing' | 'success'>('idle');
  
  const [additionalSkillsText, setAdditionalSkillsText] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<(string | null)[]>([]);
  const [resultDate, setResultDate] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedModalFiles, setSelectedModalFiles] = useState<CloudFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [gallerySaving, setGallerySaving] = useState(false);

  const [userProfile] = useState<UserProfile>(() => {
    const fallback = { name: 'User', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150' };
    try {
      const saved = typeof window === 'undefined' ? null : localStorage.getItem('userProfile');
      if (saved) return { ...fallback, ...JSON.parse(saved) };
    } catch {
      // ใช้ค่าเริ่มต้น
    }
    return fallback;
  });
  const [aiResult, setAiResult] = useState<{
    skills: string[];
    career: string | null;
    careerEn: string | null;
    accuracy: number;
    technical: number;
    soft: number;
    management: number;
    recommendations: { title: string; detail: string }[];
    warnings: string[];
    rawInput: string | null;
    textWarning: string | null;
    skillNotes: { technical: string | null; soft: string | null; management: string | null };
    model: string | null;
  } | null>(null);
  const [myPortfolios, setMyPortfolios] = useState<{ id: string; title: string; file_url: string; file_type: string; created_at: string }[]>([]);
  const [myHistory, setMyHistory] = useState<{
    id: string;
    title: string;
    analyzedAt: string;
    skills: string;
    type: string;
    analysis: {
      skills: string[];
      career: string | null;
      careerEn: string | null;
      accuracy: number;
      technical: number;
      soft: number;
      management: number;
      recommendations: { title: string; detail: string }[];
      warnings: string[];
      rawInput: string | null;
      textWarning: string | null;
      skillNotes: { technical: string | null; soft: string | null; management: string | null };
      model: string | null;
    };
  }[]>([]);

  const refreshMyPortfolios = async () => {
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { listMyPortfolios, listMyAnalyses } = await import('../../lib/profiles');
      const user = await getSessionUser();
      if (!user) return;
      setMyPortfolios(await listMyPortfolios(user.id));
      const analyses = await listMyAnalyses(user.id);
      setMyHistory(analyses.map((a) => ({
        id: a.id,
        title: a.portfolio_title,
        analyzedAt: new Date(a.analyzed_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        skills: `พบ ${a.skills.length} ทักษะ`,
        type: 'DB',
        analysis: {
          skills: a.skills,
          career: a.career,
          careerEn: a.career_en ?? null,
          accuracy: a.accuracy,
          technical: a.technical,
          soft: a.soft,
          management: a.management,
          recommendations: a.recommendations,
          warnings: a.warnings ?? [],
          rawInput: a.raw_input ?? null,
          textWarning: null,
          skillNotes: a.skill_notes ?? { technical: null, soft: null, management: null },
          model: null,
        },
      })));
    } catch {
      // เงียบไว้ ใช้ mock เดิม
    }
  };

  useEffect(() => {
    // โหลดข้อมูลคลังครั้งแรกจาก DB (async fetch คือ external sync ที่ถูกต้องใน effect)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMyPortfolios();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#history-dropdown-container')) {
        setIsHistoryDropdownOpen(false);
      }
      if (!target.closest('#profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openMediaModal = () => {
    setSelectedModalFiles([]);
    setModalError(null);
    setIsMediaModalOpen(true);
  };

  useEffect(() => {
    return () => { previewUrls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }); };
  }, [previewUrls]);

  const handleFilesSelected = (files: File[], urls: string[], existingIds: (string | null)[] = []) => {
    setIsMediaModalOpen(false);
    setSelectedFiles(files);
    setPreviewUrls(urls);
    setSelectedExistingIds(existingIds);
    setAdditionalSkillsText('');
    setAnalysisError(null);
    setUploadStatus('preview');
  };

  const startAIProcessing = async () => {
    setUploadStatus('processing');
    setAiResult(null);
    setAnalysisError(null);
    // 1) เรียก Gemini วิเคราะห์ (ไฟล์จริง + ข้อความอาชีพที่สนใจ)
    let ai: {
      skills: string[];
      career: string | null;
      careerEn: string | null;
      accuracy: number;
      technical: number;
      soft: number;
      management: number;
      recommendations: { title: string; detail: string }[];
      warnings: string[];
      rawInput: string | null;
      textWarning: string | null;
      skillNotes: { technical: string | null; soft: string | null; management: string | null };
      model: string | null;
    } | null = null;
    // ย่อรูปก่อนส่งให้ AI (ประหยัดโควต้า token + เร็วขึ้น ไฟล์ต้นฉบับยังอัปโหลดเต็มขนาด)
    // เอกสารตัวหนังสือใช้ 1600px เพื่อให้ AI อ่านข้อความในใบเซอร์ได้ชัด
    const downscaleImage = (file: File, maxSide = 1600): Promise<File> => {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          resolve(file);
          return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          if (scale >= 1) {
            URL.revokeObjectURL(url);
            resolve(file);
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(
            (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file),
            'image/jpeg',
            0.85,
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });
    };

    try {
      const form = new FormData();
      form.append('interestText', additionalSkillsText);
      form.append('major', userProfile.major || '');
      form.append('institution', userProfile.institution || '');
      for (const f of selectedFiles) {
        if (f.size <= 0) continue;
        form.append('files', await downscaleImage(f), f.name);
      }
      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        if (errBody.detail) console.error('AI analyze detail:', errBody.detail);
        throw new Error(errBody.error || `AI วิเคราะห์ไม่สำเร็จ (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!Array.isArray(data.skills)) {
        throw new Error('AI ตอบกลับไม่ถูกต้อง ลองใหม่อีกครั้ง');
      }
      ai = {
        skills: data.skills,
        career: data.career ?? null,
        careerEn: typeof data.careerEn === 'string' ? data.careerEn : null,
        accuracy: data.accuracy ?? 0,
        technical: data.technical ?? 0,
        soft: data.soft ?? 0,
        management: data.management ?? 0,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        rawInput: additionalSkillsText.trim() ? additionalSkillsText.trim() : null,
        textWarning: typeof data.textWarning === 'string' ? data.textWarning : null,
        skillNotes: {
          technical: typeof data.skillNotes?.technical === 'string' ? data.skillNotes.technical : null,
          soft: typeof data.skillNotes?.soft === 'string' ? data.skillNotes.soft : null,
          management: typeof data.skillNotes?.management === 'string' ? data.skillNotes.management : null,
        },
        model: typeof data._model === 'string' ? data._model : null,
      };
      setAiResult(ai);
    } catch (err) {
      // AI ล้มเหลว: กลับไปหน้า preview พร้อมข้อความ error — ไม่โชว์ mock ไม่เซฟค่าปลอม
      setUploadStatus('preview');
      setAnalysisError(err instanceof Error ? err.message : 'AI วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง');
      return;
    }
    // 2) บันทึกผลจริงลง DB (ai เป็น null ไม่ได้แล้วเพราะ return ไปก่อนถ้า AI ล้มเหลว)
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { uploadPortfolioReal, saveAnalysisReal } = await import('../../lib/storage');
      const user = await getSessionUser();
      if (user && selectedFiles.length > 0 && ai) {
        for (let idx = 0; idx < selectedFiles.length; idx++) {
          const f = selectedFiles[idx];
          const existingId = selectedExistingIds[idx] ?? null;
          try {
            if (existingId) {
              await saveAnalysisReal(user.id, existingId, {
                skills: ai.skills,
                career: ai.career,
                careerEn: ai.careerEn,
                accuracy: ai.accuracy,
                technical: ai.technical,
                soft: ai.soft,
                management: ai.management,
                recommendations: ai.recommendations,
                rawInput: ai.rawInput,
                warnings: ai.warnings,
                skillNotes: ai.skillNotes,
              });
            } else if (f.size > 0) {
              const row = await uploadPortfolioReal(user.id, f);
              await saveAnalysisReal(user.id, (row as { id: string }).id, {
                skills: ai.skills,
                career: ai.career,
                careerEn: ai.careerEn,
                accuracy: ai.accuracy,
                technical: ai.technical,
                soft: ai.soft,
                management: ai.management,
                recommendations: ai.recommendations,
                rawInput: ai.rawInput,
                warnings: ai.warnings,
                skillNotes: ai.skillNotes,
              });
            }
          } catch {
            // ไฟล์เดียวพัง ข้ามไปไฟล์ต่อไป
          }
        }
      }
    } catch {
      // เซฟ DB พังก็ยังโชว์ผลจริงใน modal ได้
    }
    setUploadStatus('success');
    setResultDate(new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }));
    setShowResultModal(true);
    refreshMyPortfolios();
  };

  const openHistoryModal = (fileData: HistoryItem) => {
    const mockFile = new File([''], fileData.title, { type: fileData.type === 'PDF' ? 'application/pdf' : 'image/jpeg' });
    setSelectedFiles([mockFile]);
    setSelectedExistingIds([null]);
    // ถ้าเป็นประวัติจริง ส่งผลวิเคราะห์จริงเข้า modal ด้วย
    if (fileData.analysis) {
      setAiResult(fileData.analysis);
    } else {
      setAiResult(null);
    }
    setResultDate(fileData.analyzedAt ?? null);
    setShowResultModal(true);
    setIsHistoryDropdownOpen(false);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((f) => f.size <= 10 * 1024 * 1024);
      if (validFiles.length > 0) {
        const urls = validFiles.map(f => URL.createObjectURL(f));
        handleFilesSelected(validFiles, urls);
      }
    }
  };

  const [dropError, setDropError] = useState('');

  const toggleGallerySelection = (fileData: CloudFile) => {
    setSelectedModalFiles((prev) => {
      const isAlreadySelected = prev.some((f) => f.id === fileData.id);
      return isAlreadySelected ? prev.filter((f) => f.id !== fileData.id) : [...prev, fileData];
    });
  };

  const dbIdOf = (id: string | number): string | null => {
    const s = String(id);
    return s.startsWith('db-') ? s.slice(3) : null;
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const confirmGallerySelection = async () => {
    setModalError(null);
    // ดึงไฟล์จริงจาก URL ในคลัง (ห้ามส่ง File เปล่า ไม่งั้น AI ได้ 0 ไฟล์แล้วมโนทักษะจากสาขา)
    const files: File[] = [];
    const urls: string[] = [];
    const ids: (string | null)[] = [];
    for (const f of selectedModalFiles) {
      const real = await fetchUrlAsFile(f.imageUrl, f.title);
      if (real) {
        files.push(real);
        urls.push(f.imageUrl);
        ids.push(dbIdOf(f.id));
      }
    }
    if (files.length === 0) {
      setModalError('ดึงไฟล์จากคลังไม่สำเร็จ (ติด CORS หรือลิงก์เสีย) ลองเลือกไฟล์อื่น');
      return;
    }
    handleFilesSelected(files, urls, ids);
  };

  // ลากการ์ดจากคลัง: แนบข้อมูลรูปไปกับ drag event (รองรับหลายรูปที่เลือกไว้)
  const [gallerySelected, setGallerySelected] = useState<{ id: string; title: string; imageUrl: string; type: string }[]>([]);

  const toggleGalleryCard = (file: { id: string; title: string; imageUrl: string; type: string }) => {
    setGallerySelected((prev) =>
      prev.some((f) => f.id === file.id) ? prev.filter((f) => f.id !== file.id) : [...prev, file]
    );
  };

  // ส่งรูปที่เลือกในคลังเข้าขั้นตอนวิเคราะห์ (ดึง URL กลับมาเป็นไฟล์ + จำ id แถวเดิมไว้กันอัปโหลดซ้ำ)
  const sendGalleryToAnalysis = async (list: { id: string; title: string; imageUrl: string; type: string }[]) => {
    if (list.length === 0) return;
    setDropError('');
    const files: File[] = [];
    const urls: string[] = [];
    const ids: (string | null)[] = [];
    for (const item of list) {
      const f = await fetchUrlAsFile(item.imageUrl, item.title);
      if (f) {
        files.push(f);
        urls.push(item.imageUrl);
        ids.push(dbIdOf(item.id));
      }
    }
    if (files.length > 0) {
      setGallerySelected([]);
      handleFilesSelected(files, urls, ids);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setDropError('ดึงรูปจากคลังไม่สำเร็จ (ติด CORS) ให้กด “เลือกจากคลัง” แทน');
      setTimeout(() => setDropError(''), 5000);
    }
  };

  // ดึงรูปจาก URL (คลังของตัวเอง/unsplash ตัวอย่าง) กลับมาเป็น File เพื่อเข้าขั้นตอนวิเคราะห์
  const fetchUrlAsFile = async (imageUrl: string, title: string): Promise<File | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size > 10 * 1024 * 1024) return null;
      return new File([blob], title || 'gallery-image.jpg', { type: blob.type || 'image/jpeg' });
    } catch {
      return null;
    }
  };

  const handleMainDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDropError('');
    // รวมไฟล์จากทั้ง files และ items (บางเบราว์เซอร์ส่งมาทาง items)
    const fromFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0
      ? Array.from(e.dataTransfer.files)
      : [];
    const fromItems: File[] = [];
    if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) fromItems.push(f);
        }
      }
    }
    const seen = new Set<string>();
    const filesArray = [...fromFiles, ...fromItems].filter((f) => {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (filesArray.length === 0) {
      // วาง URL รูปจากเว็บ: ดึงกลับมาเป็นไฟล์ (รูปในคลังใช้วิธีคลิกเลือก + ปุ่มนำไปวิเคราะห์แทน)
      const metaRaw = e.dataTransfer.getData('application/x-portfolio');
      const uriList = e.dataTransfer.getData('text/uri-list');
      let meta: { title?: string; imageUrl?: string } = {};
      try {
        if (metaRaw) meta = JSON.parse(metaRaw);
      } catch {
        // ไม่ใช่การ์ดคลัง ข้ามไปใช้ URL ตรงๆ
      }
      const imageUrl = meta.imageUrl || (uriList ? uriList.split('\n')[0].trim() : '');
      if (imageUrl) {
        const file = await fetchUrlAsFile(imageUrl, meta.title || 'gallery-image.jpg');
        if (file) {
          handleFilesSelected([file], [imageUrl]);
          return;
        }
        setDropError('ดึงรูปจากคลังไม่สำเร็จ (ติด CORS) ให้กด “เลือกจากคลัง” แทน');
        setTimeout(() => setDropError(''), 5000);
        return;
      }
      setDropError('ลากรูปจากเว็บโดยตรงไม่ได้ ให้คลิกขวา > บันทึกรูปลงเครื่องก่อน แล้วค่อยลากไฟล์มาใส่');
      setTimeout(() => setDropError(''), 5000);
      return;
    }
    const validFiles = filesArray.filter((f) => f.size <= 10 * 1024 * 1024);
    if (validFiles.length > 0) {
      const urls = validFiles.map(f => URL.createObjectURL(f));
      handleFilesSelected(validFiles, urls);
    } else {
      setDropError('ไฟล์ใหญ่เกิน 10MB ไม่รองรับ');
      setTimeout(() => setDropError(''), 5000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // เพิ่มรูปจากเครื่องสู่คลังโดยตรง (ไม่ผ่านขั้นตอนวิเคราะห์)
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const handleGalleryDirectSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files).filter((f) => f.size <= 10 * 1024 * 1024);
    if (filesArray.length === 0) {
      setGalleryError('ไฟล์ใหญ่เกิน 10MB ไม่รองรับ');
      return;
    }
    setGallerySaving(true);
    setGalleryError(null);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { uploadPortfolioReal } = await import('../../lib/storage');
      const user = await getSessionUser();
      if (!user) {
        setGalleryError('ยังไม่ได้เข้าสู่ระบบจริง (บัญชีทดลอง) — ออกจากระบบแล้วสมัคร/เข้าสู่ระบบด้วยอีเมลรหัสผ่านก่อนเพิ่มรูป');
        return;
      }
      let failed = 0;
      let firstErr = '';
      for (const f of filesArray) {
        try {
          await uploadPortfolioReal(user.id, f);
        } catch (err) {
          if (!firstErr) firstErr = err instanceof Error ? err.message : String(err);
          failed++;
        }
      }
      if (failed > 0) {
        setGalleryError(
          `เพิ่มได้บางไฟล์ (${filesArray.length - failed}/${filesArray.length}) ที่เหลืออัปโหลดไม่สำเร็จ` +
          (firstErr ? ` — สาเหตุ: ${firstErr}` : ''),
        );
      }
      await refreshMyPortfolios();
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'เพิ่มรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setGallerySaving(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSelectedExistingIds([]);
    setResultDate(null);
    setAnalysisError(null);
    setAiResult(null);
    setAdditionalSkillsText('');
    setUploadStatus('idle');
    setShowResultModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans relative overflow-x-hidden flex flex-col">
      <input type="file" multiple ref={fileInputRef} onChange={handleLocalFileSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
      <input type="file" multiple ref={galleryFileInputRef} onChange={handleGalleryDirectSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />

      <ResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} files={selectedFiles} analysis={aiResult} analyzedAt={resultDate} />

      {/* MODAL เลือกไฟล์จากคลาวด์ */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[700px] max-h-[90vh]">
            <div className="px-6 pt-6 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-800">เลือกไฟล์จากคลาวด์</h3>
                  <p className="text-slate-500 text-sm mt-1">ดึงผลงานเดิมที่คุณเคยอัปโหลดไว้ มาวิเคราะห์ซ้ำได้ทันที (เลือกได้หลายไฟล์)</p>
                </div>
                <button onClick={() => { setModalError(null); setIsMediaModalOpen(false); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50 relative">
              {myPortfolios.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                {myPortfolios.map((p) => {
                  const file = { id: `db-${p.id}`, title: p.title, type: p.file_type, imageUrl: p.file_url };
                  const isSelected = selectedModalFiles.some((f) => f.id === file.id);
                  return (
                    <div key={file.id} onClick={() => toggleGallerySelection(file)} className={`group cursor-pointer bg-white rounded-xl border-2 transition-all overflow-hidden relative ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'}`}>
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white p-1 rounded-full shadow-md animate-in zoom-in duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                        <div className="absolute top-2 left-2 z-10 bg-white/95 px-2 py-1 rounded text-[10px] font-extrabold text-slate-800 shadow-sm">{file.type}</div>
                        {/^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.type) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.imageUrl} alt={file.title} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105 opacity-90' : 'group-hover:scale-105'}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <h4 className={`font-bold text-xs truncate transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{file.title}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
                <p className="py-16 text-sm font-bold text-slate-400 text-center">ยังไม่มีไฟล์ในคลัง<br />เพิ่มรูปจากเครื่องก่อน แล้วค่อยกลับมาเลือกที่นี่</p>
              )}
              {modalError && (
                <p className="mb-4 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">⚠ {modalError}</p>
              )}
              {selectedModalFiles.length > 0 && (
                <div className="sticky bottom-6 mx-auto w-fit bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
                  <span className="text-white font-medium text-sm whitespace-nowrap">เลือกแล้ว <span className="font-extrabold text-blue-400">{selectedModalFiles.length}</span> รายการ</span>
                  <button onClick={confirmGallerySelection} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-sm transition-all active:scale-95 whitespace-nowrap">ยืนยันการนำเข้า</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= NAVBAR / HEADER ================= */}
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-[0_1px_12px_rgba(15,23,42,0.05)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
            </svg>
            Port<span className="text-slate-800">Folio</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Dropdown ประวัติการวิเคราะห์ */}
            <div id="history-dropdown-container" className="relative hidden sm:block">
              <button 
                onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${isHistoryDropdownOpen ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ดูประวัติการวิเคราะห์
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isHistoryDropdownOpen ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {isHistoryDropdownOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                    <h4 className="font-extrabold text-slate-800 text-sm">ประวัติการวิเคราะห์ (ล่าสุด)</h4>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {myHistory.length > 0 ? (
                      myHistory.map((file) => (
                        <div key={file.id} onClick={() => openHistoryModal(file)} className="px-4 py-3.5 border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors flex flex-col gap-1.5 group">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{file.title}</p>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded flex-shrink-0">{file.skills}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {file.analyzedAt}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-xs font-medium text-slate-400 text-center">ยังไม่มีประวัติการวิเคราะห์<br />วิเคราะห์ไฟล์เพื่อสร้างประวัติของตัวเอง</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div id="profile-dropdown-container" className="relative">
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-3"
              >
                <span className="hidden sm:block text-sm font-bold text-slate-800">{userProfile.name}</span>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 shadow-sm cursor-pointer transition-colors flex-shrink-0 bg-slate-100 ${isProfileDropdownOpen ? 'border-blue-500' : 'border-slate-200 hover:border-blue-400'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={userProfile.avatar} alt="User Profile" className="w-full h-full object-cover" />
                </div>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={userProfile.avatar} alt="User Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{userProfile.name}</p>
                      <p className="text-xs font-medium text-slate-400 truncate">ข้อมูลที่กรอกไว้ตอนสร้างโปรไฟล์</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">มหาวิทยาลัย / สถานศึกษา</p>
                      <p className="text-sm font-bold text-slate-800">{userProfile.institution || 'ยังไม่ได้กรอก'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">คณะ / สาขาวิชา</p>
                      <p className="text-sm font-bold text-slate-800">{userProfile.major || 'ยังไม่ได้กรอก'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Bio</p>
                      <p className="text-sm font-medium text-slate-700 whitespace-pre-line">{userProfile.bio || 'ยังไม่ได้กรอก'}</p>
                    </div>
                    {userProfile.githubLink && (
                      <div>
                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">GitHub</p>
                        <a href={userProfile.githubLink} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline break-all">{userProfile.githubLink}</a>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-3 space-y-2">
                    {/* แก้ไขลิงก์ตรงนี้ให้วิ่งไปหน้า /profile/edit */}
                    <Link href="/profile/edit" className="block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors">
                      แก้ไขโปรไฟล์
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { signOutReal } = await import('../../lib/auth');
                          await signOutReal();
                        } catch {
                          // ออกแบบ local ได้แม้เซิร์ฟเวอร์พัง
                        }
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('userEmail');
                        localStorage.removeItem('userProfile');
                        window.location.href = '/';
                      }}
                      className="block w-full text-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 rounded-full font-bold text-sm transition-colors"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= เนื้อหาหลัก (Main Content) ================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 flex flex-col h-full w-full py-8">
        
        <section className="relative w-full flex-shrink-0">
          <div
            onDragOver={uploadStatus === 'idle' ? handleDragOver : undefined}
            onDragLeave={uploadStatus === 'idle' ? handleDragLeave : undefined}
            onDrop={uploadStatus === 'idle' ? handleMainDrop : undefined}
            className={`relative z-10 rounded-[2rem] px-6 py-10 flex flex-col items-center justify-center transition-all duration-500 ease-out border-[3px] border-dashed w-full ${uploadStatus === 'idle' ? (isDragging ? 'bg-blue-50/90 border-blue-500 scale-[1.01] shadow-[0_20px_50px_-20px_rgba(37,99,235,0.45)]' : 'bg-white border-slate-300/80 hover:border-blue-400 shadow-[0_8px_30px_rgba(15,23,42,0.04)]') : 'bg-white border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.05)] border-solid'}`}
          >
            {uploadStatus === 'idle' && (
              <>
                <div className={`w-16 h-16 flex items-center justify-center rounded-full mb-6 transition-all duration-300 flex-shrink-0 ${isDragging ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                </div>
                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">นำเข้าผลงานของคุณ</h3>
                <p className="text-base text-slate-500 mb-8 text-center flex-shrink-0">{isDragging ? 'ปล่อยเมาส์เพื่ออัปโหลดไฟล์เลย!' : 'ลากไฟล์มาวางที่นี่ หรือเลือกวิธีนำเข้าด้านล่าง'}</p>

                <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    อัปโหลดจากคอมพิวเตอร์ของคุณ
                  </button>
                  <button onClick={openMediaModal} className="px-6 py-3.5 bg-white text-blue-600 border border-slate-200 hover:bg-slate-50 rounded-full font-bold text-base transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    เลือกจากคลัง
                  </button>
                </div>
                <span className="mt-8 text-sm font-medium text-slate-400">รองรับการเลือกไฟล์ PDF, JPG, PNG (Max 10MB)</span>
                {dropError && <p className="mt-3 text-sm font-bold text-red-500 text-center max-w-lg">{dropError}</p>}
              </>
            )}

            {uploadStatus === 'preview' && (
              <div className="flex flex-col items-center animate-in fade-in duration-300 w-full px-4 sm:px-8 py-4">
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center">ตรวจสอบและให้ข้อมูลเพิ่มเติม</h3>
                <p className="text-base text-slate-500 mb-8 text-center max-w-lg">พิมพ์ทักษะที่เกี่ยวข้องกับผลงานนี้ เพื่อให้ AI วิเคราะห์ทักษะได้แม่นยำยิ่งขึ้นแม้ไม่มีในเอกสาร</p>

                <div className="flex gap-4 overflow-x-auto w-full max-w-3xl mb-8 pb-4 px-2 justify-center custom-scrollbar">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-2xl mb-10">
                  <label className="block text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" /><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" /></svg>
                    เพิ่มทักษะ รายละเอียด หรืออาชีพที่คุณสนใจ (ถ้ามี)
                  </label>
                  <textarea
                    value={additionalSkillsText}
                    onChange={(e) => setAdditionalSkillsText(e.target.value)}
                    placeholder="เช่น อยากเป็น Data Scientist มีทักษะเขียนโปรแกรม React, Node.js จากการทำโปรเจกต์ แต่ยังไม่มีใบเซอร์รับรอง... AI จะใช้เป้าหมายนี้ประเมินความพร้อมให้"
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none h-32 text-slate-700 placeholder:text-slate-400 transition-all shadow-inner"
                  />
                  <p className="text-xs font-medium text-slate-400 mt-2">AI จะอ่านอาชีพที่สนใจจากช่องนี้ไปประเมินร่วมกับผลงานที่อัปโหลด</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                  <button onClick={resetUpload} className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-base transition-all active:scale-95">ยกเลิก</button>
                  <button onClick={startAIProcessing} className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    ให้ AI วิเคราะห์ทักษะ
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                </div>
                {analysisError && (
                  <p className="mt-4 max-w-md text-center text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠ {analysisError}</p>
                )}
              </div>
            )}

            {uploadStatus === 'processing' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 overflow-hidden flex-shrink-0 w-full py-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">AI กำลังวิเคราะห์เอกสาร {selectedFiles.length} รายการ...</h3>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 flex-shrink-0 w-full py-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-6 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">วิเคราะห์ {selectedFiles.length} รายการเสร็จสมบูรณ์!</h3>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                  <button onClick={() => setShowResultModal(true)} className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-lg active:scale-95">
                    ดูผลการวิเคราะห์อีกครั้ง
                  </button>
                  <button onClick={resetUpload} className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-base transition-all active:scale-95">
                    วิเคราะห์ไฟล์เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- คลังผลงาน --- */}
        <section className="flex flex-col flex-grow pb-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-200 pb-4 flex-shrink-0 gap-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex-shrink-0">คลังรูปภาพของฉัน</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => galleryFileInputRef.current?.click()} disabled={gallerySaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all shadow-sm whitespace-nowrap disabled:opacity-60">
                {gallerySaving ? 'กำลังเพิ่มลงคลัง...' : '+ เพิ่มรูปจากเครื่องสู่คลัง'}
              </button>
              <Link href="/gallery" className="px-5 py-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded-full font-bold text-sm transition-all shadow-sm whitespace-nowrap">
                ดูรูปทั้งหมด ({myPortfolios.length}) →
              </Link>
            </div>
          </div>
          {galleryError && (
            <p className="mb-6 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠ {galleryError}</p>
          )}

          {gallerySelected.length > 0 && (
            <div className="mb-6 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4">
              <span className="text-white font-medium text-sm whitespace-nowrap">เลือกแล้ว <span className="font-extrabold text-blue-400">{gallerySelected.length}</span> รายการ (คลิกการ์ดเพื่อเลือกเพิ่ม)</span>
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setGallerySelected([])} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm transition-all whitespace-nowrap">ล้าง</button>
                <button onClick={() => sendGalleryToAnalysis(gallerySelected)} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-sm transition-all active:scale-95 whitespace-nowrap">นำไปวิเคราะห์ →</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {myPortfolios.length > 0 ? (
              myPortfolios.slice(0, 6).map((file) => {
              const card = { id: `db-${file.id}`, title: file.title, imageUrl: file.file_url, type: file.file_type };
              const selected = gallerySelected.some((f) => f.id === card.id);
              return (
              <div key={file.id} onClick={() => toggleGalleryCard(card)} title="คลิกเพื่อเลือกหลายรูป" className={`group bg-white rounded-3xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)] border-2 transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0 cursor-pointer relative ${selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100'}`}>
                {selected && (
                  <div className="absolute top-3 right-3 z-20 bg-blue-600 text-white p-1.5 rounded-full shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  </div>
                )}
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-extrabold text-slate-800 shadow-sm flex-shrink-0">{file.file_type}</div>
                  {/^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.file_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.file_url} alt={file.title} draggable={false} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out flex-shrink-0 pointer-events-none" />
                  ) : (
                    <a href={file.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-[10px] font-extrabold text-slate-400">แตะเพื่อเปิดไฟล์</span>
                    </a>
                  )}
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-grow flex-shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-xl truncate flex-shrink-0" title={file.title}>{file.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 mb-6 flex-shrink-0">Uploaded on {new Date(file.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              );
              })
            ) : (
              <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">ยังไม่มีไฟล์ในคลัง — กด “+ เพิ่มรูปจากเครื่องสู่คลัง” หรืออัปโหลดด้านบนเพื่อเริ่มต้น</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}