'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ResumePreview from '../../components/ResumePreview';
import { loadResumeById } from '../../../lib/resume';
import { downloadElementAsPdf } from '../../../lib/pdf';
import type { ResumeData } from '../../../lib/platform.types';

export default function ResumeByIdPage() {
  return (
    <Suspense fallback={<ResumeLoading />}>
      <ResumeByIdViewer />
    </Suspense>
  );
}

function ResumeLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9ff] p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-bold text-slate-500">กำลังโหลดเรซูเม่...</p>
      </div>
    </main>
  );
}

function ResumeByIdViewer() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [data, setData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resume = await loadResumeById(id);
        if (!resume) {
          if (!cancelled) setError('ไม่พบเรซูเม่นี้ หรือลิงก์อาจหมดอายุ/ถูกปิดการแชร์');
        } else if (!cancelled) {
          setData(resume);
        }
      } catch {
        if (!cancelled) setError('เปิดเรซูเม่ไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePdf = async () => {
    if (!previewRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadElementAsPdf(
        previewRef.current,
        `resume-${(data?.fullName || 'lru-student').replace(/\s+/g, '-')}.pdf`,
      );
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) return <ResumeLoading />;

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
              </svg>
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">
              LRU <span className="text-blue-600">Portfolio</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {data && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  พิมพ์
                </button>
                <button
                  type="button"
                  onClick={handlePdf}
                  disabled={pdfBusy}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {pdfBusy ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
                </button>
              </>
            )}
            <Link href="/resume" className="rounded-full bg-blue-600 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-blue-700">
              สร้างเรซูเม่ของคุณ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
        {error ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="mt-5 text-xl font-black text-slate-900">เปิดเรซูเม่ไม่สำเร็จ</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
            <Link href="/resume" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700">
              สร้างเรซูเม่ใหม่
            </Link>
          </div>
        ) : data ? (
          <>
            <div ref={previewRef}>
              <ResumePreview data={data} />
            </div>
            <p className="mt-6 text-center text-[11px] font-bold text-slate-400">
              เรซูเม่นี้แชร์ผ่าน LRU Portfolio · ข้อมูลถูกส่งโดยเจ้าของโปรไฟล์
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
