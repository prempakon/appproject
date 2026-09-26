'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// === แก้ไข Path ตรงนี้ให้ตรงกับโครงสร้างโฟลเดอร์เป๊ะๆ ===
import ResultModal from '../components/ResultModal'; 

const PORTFOLIO_FILES = [
  { id: 1, title: 'Certificate_AWS.jpg', date: 'Aug 15, 2024', analyzedAt: '15 ส.ค. 2567, 10:30 น.', skills: 'พบ 12 ทักษะ', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop', type: 'JPG' },
  { id: 2, title: 'Transcript_2024.pdf', date: 'Jul 22, 2024', analyzedAt: '22 ก.ค. 2567, 14:45 น.', skills: 'พบ 8 ทักษะ', imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop', type: 'PDF' },
  { id: 3, title: 'Diploma_CS.jpg', date: 'Jun 10, 2024', analyzedAt: '10 มิ.ย. 2567, 09:15 น.', skills: 'พบ 15 ทักษะ', imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop', type: 'JPG' },
];

export default function PortfolioStorage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preview' | 'processing' | 'success'>('idle');
  
  const [additionalSkillsText, setAdditionalSkillsText] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedModalFiles, setSelectedModalFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === State สำหรับเก็บข้อมูล User ===
  const [userProfile, setUserProfile] = useState({ name: 'User', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150' });

  // โหลดข้อมูล User ทันทีที่เปิดหน้าต่างนี้
  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
  }, []);

  // ดักคลิกพื้นที่อื่นเพื่อปิด Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('#history-dropdown-container')) {
        setIsHistoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMediaModalOpen) setSelectedModalFiles([]);
  }, [isMediaModalOpen]);

  useEffect(() => {
    return () => { previewUrls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }); };
  }, [previewUrls]);

  const handleFilesSelected = (files: File[], urls: string[]) => {
    setIsMediaModalOpen(false);
    setSelectedFiles(files);
    setPreviewUrls(urls);
    setAdditionalSkillsText('');
    setUploadStatus('preview');
  };

  const startAIProcessing = () => {
    setUploadStatus('processing');
    setTimeout(() => {
      setUploadStatus('success');
      setShowResultModal(true);
    }, 4000);
  };

  const openHistoryModal = (fileData: any) => {
    const mockFile = new File([''], fileData.title, { type: fileData.type === 'PDF' ? 'application/pdf' : 'image/jpeg' });
    setSelectedFiles([mockFile]);
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

  const toggleGallerySelection = (fileData: any) => {
    setSelectedModalFiles((prev) => {
      const isAlreadySelected = prev.some((f) => f.id === fileData.id);
      return isAlreadySelected ? prev.filter((f) => f.id !== fileData.id) : [...prev, fileData];
    });
  };

  const confirmGallerySelection = () => {
    const mockFiles = selectedModalFiles.map((f) => new File([''], f.title, { type: f.type === 'PDF' ? 'application/pdf' : 'image/jpeg' }));
    const urls = selectedModalFiles.map(f => f.imageUrl);
    handleFilesSelected(mockFiles, urls);
  };

  const handleMainDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = filesArray.filter((f) => f.size <= 10 * 1024 * 1024);
      if (validFiles.length > 0) {
        const urls = validFiles.map(f => URL.createObjectURL(f));
        handleFilesSelected(validFiles, urls);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const resetUpload = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setAdditionalSkillsText('');
    setUploadStatus('idle');
    setShowResultModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans relative overflow-x-hidden flex flex-col">
      <input type="file" multiple ref={fileInputRef} onChange={handleLocalFileSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />

      <ResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} files={selectedFiles} />

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
                <button onClick={() => setIsMediaModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50 relative">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                {PORTFOLIO_FILES.map((file) => {
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.imageUrl} alt={file.title} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105 opacity-90' : 'group-hover:scale-105'}`} />
                      </div>
                      <div className="p-3 bg-white">
                        <h4 className={`font-bold text-xs truncate transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{file.title}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedModalFiles.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
                  <span className="text-white font-medium text-sm whitespace-nowrap">เลือกแล้ว <span className="font-extrabold text-blue-400">{selectedModalFiles.length}</span> รายการ</span>
                  <button onClick={confirmGallerySelection} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-sm transition-all active:scale-95 whitespace-nowrap">ยืนยันการนำเข้า</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= NAVBAR / HEADER ด้านบนสุด ================= */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
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
                    {PORTFOLIO_FILES.map((file) => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* === ดึงรูป User จาก State มาแสดงตรงนี้ === */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm font-bold text-slate-800">{userProfile.name}</span>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-colors flex-shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={userProfile.avatar} 
                  alt="User Profile" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= เนื้อหาหลัก (Main Content) ================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 flex flex-col h-full w-full py-8">
        
        {/* --- โซน 1: กล่องอัปโหลดหลัก --- */}
        <section className="relative w-full flex-shrink-0">
          <div
            onDragOver={uploadStatus === 'idle' ? handleDragOver : undefined}
            onDragLeave={uploadStatus === 'idle' ? handleDragLeave : undefined}
            onDrop={uploadStatus === 'idle' ? handleMainDrop : undefined}
            className={`relative z-10 rounded-[2rem] px-6 py-10 flex flex-col items-center justify-center transition-all duration-500 ease-out border-[3px] border-dashed w-full ${uploadStatus === 'idle' ? (isDragging ? 'bg-blue-50/90 border-blue-500 scale-[1.01] shadow-2xl shadow-blue-500/20' : 'bg-white border-slate-300 hover:border-blue-400') : 'bg-white border-slate-100 shadow-md border-solid'}`}
          >
            {/* 1. สถานะรอรับไฟล์ (Idle) */}
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
                  <button onClick={() => setIsMediaModalOpen(true)} className="px-6 py-3.5 bg-white text-blue-600 border border-slate-200 hover:bg-slate-50 rounded-full font-bold text-base transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    เลือกจากคลัง
                  </button>
                </div>
                <span className="mt-8 text-sm font-medium text-slate-400">รองรับการเลือกไฟล์ PDF, JPG, PNG (Max 10MB)</span>
              </>
            )}

            {/* 2. สถานะตรวจสอบและเพิ่มข้อความ (Preview) */}
            {uploadStatus === 'preview' && (
              <div className="flex flex-col items-center animate-in fade-in duration-300 w-full px-4 sm:px-8 py-4">
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center">ตรวจสอบและให้ข้อมูลเพิ่มเติม</h3>
                <p className="text-base text-slate-500 mb-8 text-center max-w-lg">พิมพ์ทักษะที่เกี่ยวข้องกับผลงานนี้ เพื่อให้ AI วิเคราะห์ทักษะได้แม่นยำยิ่งขึ้นแม้ไม่มีในเอกสาร</p>

                <div className="flex gap-4 overflow-x-auto w-full max-w-3xl mb-8 pb-4 px-2 justify-center custom-scrollbar">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-2xl mb-10">
                  <label className="block text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" /><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" /></svg>
                    เพิ่มทักษะหรือรายละเอียดเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    value={additionalSkillsText}
                    onChange={(e) => setAdditionalSkillsText(e.target.value)}
                    placeholder="เช่น มีทักษะเขียนโปรแกรม React, Node.js จากการทำโปรเจกต์ แต่ยังไม่มีใบเซอร์รับรอง..."
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none h-32 text-slate-700 placeholder:text-slate-400 transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                  <button onClick={resetUpload} className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-base transition-all active:scale-95">ยกเลิก</button>
                  <button onClick={startAIProcessing} className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    ให้ AI วิเคราะห์ทักษะ
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* 3. สถานะประมวลผล */}
            {uploadStatus === 'processing' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 overflow-hidden flex-shrink-0 w-full py-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">AI กำลังวิเคราะห์เอกสาร {selectedFiles.length} รายการ...</h3>
                <div className="text-sm text-slate-500 mb-6 flex flex-col items-center gap-1.5 max-h-24 flex-shrink-0 overflow-y-auto w-full max-w-sm pr-2">
                  {selectedFiles.slice(0, 3).map((f, i) => (
                    <span key={i} className="flex items-center gap-2 truncate w-full justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      {f.name}
                    </span>
                  ))}
                  {selectedFiles.length > 3 && <span className="text-xs text-slate-400">และอีก {selectedFiles.length - 3} รายการ...</span>}
                </div>
              </div>
            )}

            {/* 4. สถานะสำเร็จ */}
            {uploadStatus === 'success' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 flex-shrink-0 w-full py-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-6 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">วิเคราะห์ {selectedFiles.length} รายการเสร็จสมบูรณ์!</h3>
                <p className="text-base text-slate-500 mb-8 text-center max-w-md flex-shrink-0">วิเคราะห์ทักษะจากเอกสารและข้อความเรียบร้อยแล้ว</p>
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

        {/* --- โซน 2: คลังผลงาน --- */}
        <section className="flex flex-col flex-grow pb-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-200 pb-4 flex-shrink-0 gap-4">
            <div className="flex items-baseline gap-4 flex-shrink-0">
              <h2 className="text-3xl font-extrabold text-slate-800 flex-shrink-0">คลังรูปภาพของฉัน (ล่าสุด)</h2>
            </div>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                เพิ่มรูปภาพ
              </button>
              <Link href="/gallery" className="group flex items-center gap-2 text-base font-bold text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0">
                ดูทั้งหมด
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transform transition-transform group-hover:translate-x-1 flex-shrink-0"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {PORTFOLIO_FILES.map((file) => (
              <div key={file.id} className="group bg-white rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0">
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-extrabold text-slate-800 shadow-sm flex-shrink-0">{file.type}</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.imageUrl} alt={file.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out flex-shrink-0" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] flex-shrink-0">
                    <a href={file.imageUrl} download={file.title} className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-blue-600 font-bold px-6 py-3 text-lg rounded-full flex items-center gap-2 shadow-xl hover:bg-blue-50 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      โหลดไฟล์
                    </a>
                  </div>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-grow flex-shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-xl truncate flex-shrink-0" title={file.title}>{file.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 mb-6 flex-shrink-0">Uploaded on {file.date}</p>
                  
                  <div className="mt-auto flex-shrink-0">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl border border-blue-100 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
                      <span className="text-xs font-extrabold tracking-wide uppercase overflow-hidden flex-shrink-0">AI วิเคราะห์ทักษะ: {file.skills}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}