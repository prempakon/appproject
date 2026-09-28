'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type RealFile = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
};

type LatestAnalysis = {
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: { title: string; detail: string }[];
  warnings: string[];
  analyzed_at: string;
};

type StudentRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  institution: string;
  major: string;
  latestUpload: string;
  career: string;
  careerTh: string;
  files: number;
  skills: string[];
  status: 'analyzed' | 'pending';
  realFiles: RealFile[];
  latestAnalysis: LatestAnalysis | null;
};

const CAREER_ORDER = ['Software Engineer', 'Data Scientist', 'UX Designer', 'Cybersecurity Analyst', 'Marketing Strategist', 'Finance Analyst'];

const PAGE_SIZE = 7;

export default function AdminDashboard() {
  const router = useRouter();

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [analyzedIds, setAnalyzedIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [careerFilter, setCareerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'analyzed' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [previewFile, setPreviewFile] = useState<RealFile | null>(null);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', institution: '', major: '', role: 'student' });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    // ถ้าไม่ใช่ admin ให้เด้งกลับหน้า Login ทันที
    if (role !== 'admin') {
      router.push('/');
      return;
    }
    // ดึงข้อมูลจริงจาก DB (ไม่มี mock — ว่างก็โชว์ว่าง)
    (async () => {
      try {
        const { listProfilesForAdmin } = await import('../../lib/profiles');
        const { profiles, portfolios, analyses } = await listProfilesForAdmin();
        setAnalyzedIds(analyses.map((a) => a.portfolio_id));
        const mapped: StudentRow[] = profiles.map((p) => {
          const files = portfolios.filter((f) => f.user_id === p.id);
          const latest = analyses.find((a) => a.user_id === p.id) ?? null;
          return {
            id: `DB-${p.id.slice(0, 8).toUpperCase()}`,
            userId: p.id,
            name: p.name,
            email: p.email,
            institution: p.institution,
            major: p.major,
            latestUpload: files.length > 0 ? new Date(files[0].created_at).toLocaleDateString('th-TH') : '-',
            career: latest?.career_en ?? '-',
            careerTh: latest?.career ?? '-',
            files: files.length,
            skills: latest?.skills ?? [],
            status: latest ? 'analyzed' : 'pending',
            latestAnalysis: latest
              ? {
                  accuracy: latest.accuracy ?? 0,
                  technical: latest.technical ?? 0,
                  soft: latest.soft ?? 0,
                  management: latest.management ?? 0,
                  recommendations: latest.recommendations ?? [],
                  warnings: latest.warnings ?? [],
                  analyzed_at: latest.analyzed_at,
                }
              : null,
            realFiles: files.map((f) => ({ id: f.id, title: f.title, file_url: f.file_url, file_type: f.file_type, created_at: f.created_at })),
          };
        });
        setRows(mapped);
      } catch {
        setLoadError('ดึงข้อมูลแอดมินไม่สำเร็จ (อาจยังไม่รัน fix_rls_admin.sql หรือไม่มีสิทธิ์)');
      }
    })();
  }, [router]);

  const openEdit = (row: StudentRow) => {
    setViewing(null);
    setEditForm({
      name: row.name,
      institution: row.institution,
      major: row.major === '-' ? '' : row.major,
      role: row.email === 'admin@lru.ac.th' || row.email === 'superadmin@lru.ac.th' ? 'admin' : 'student',
    });
    setEditError(null);
    setEditing(row);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) {
      setEditError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      const { adminUpdateProfile } = await import('../../lib/profiles');
      await adminUpdateProfile(editing.userId, {
        name: editForm.name.trim(),
        institution: editForm.institution.trim() || 'มหาวิทยาลัยราชภัฏเลย',
        major: editForm.major.trim() || '-',
        role: editForm.role as 'student' | 'admin',
      });
      setRows((prev) => prev.map((r) => r.id === editing.id
        ? { ...r, name: editForm.name.trim(), institution: editForm.institution.trim() || 'มหาวิทยาลัยราชภัฏเลย', major: editForm.major.trim() || '-' }
        : r));
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setEditBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchKeyword = !keyword || row.name.toLowerCase().includes(keyword) || row.id.toLowerCase().includes(keyword) || row.email.toLowerCase().includes(keyword);
      const matchCareer = careerFilter === 'all' || row.career === careerFilter;
      const matchStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchKeyword && matchCareer && matchStatus;
    });
  }, [rows, search, careerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const careerStats = useMemo(() => {
    const counts = CAREER_ORDER.map((career) => ({ career, count: rows.filter((row) => row.career === career).length }));
    const others = rows.filter((row) => row.career !== '-' && !CAREER_ORDER.includes(row.career)).length;
    const all = others > 0 ? [...counts, { career: 'อาชีพอื่นๆ', count: others }] : counts;
    const max = Math.max(1, ...all.map((c) => c.count));
    return all.map((c) => ({ ...c, percent: Math.round((c.count / max) * 100) }));
  }, [rows]);

  const topSkill = useMemo(() => {
    const tally = new Map<string, number>();
    rows.forEach((row) => row.skills.forEach((skill) => tally.set(skill, (tally.get(skill) ?? 0) + 1)));
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '-';
  }, [rows]);

  const analyzedCount = rows.filter((row) => row.status === 'analyzed').length;
  const totalFiles = rows.reduce((sum, row) => sum + row.files, 0);
  const analyzedFiles = rows.reduce(
    (sum, row) => sum + row.realFiles.filter((f) => analyzedIds.includes(f.id)).length,
    0,
  );

  const resetFilters = () => {
    setSearch('');
    setCareerFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const { deleteProfileForAdmin } = await import('../../lib/profiles');
      await deleteProfileForAdmin(deleting.userId);
    } catch {
      // ลบใน DB ไม่สำเร็จก็เอาออกจากจอพร้อมแจ้งผ่าน loadError
      setLoadError('ลบในฐานข้อมูลไม่สำเร็จ แต่เอาออกจากรายการจอแล้ว');
    }
    setRows((prev) => prev.filter((row) => row.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      {/* ================= TOP NAV ================= */}
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-[0_1px_12px_rgba(15,23,42,0.05)]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center">E</div>
            <span className="text-lg font-extrabold text-slate-800">แดชบอร์ดผู้บริหาร</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-bold text-slate-600">ผู้ดูแลระบบ</span>
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center">A</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-10">
        {loadError && (
          <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠ {loadError}</p>
        )}
        {/* ================= STATISTICS ================= */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800">สถิติและข้อมูลเชิงลึกของระบบ</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <StatCard label="จำนวนนักศึกษาทั้งหมด" value={rows.length.toLocaleString()} hint={`${analyzedCount} วิเคราะห์แล้ว / ${rows.length - analyzedCount} ยังไม่วิเคราะห์`} tone="blue" />
              <StatCard label="พอร์ตโฟลิโอที่วิเคราะห์แล้ว" value={analyzedFiles.toLocaleString()} hint={`จากไฟล์ทั้งหมด ${totalFiles.toLocaleString()} ไฟล์`} tone="green" />
              <StatCard label="ทักษะยอดนิยมสูงสุด" value={topSkill} hint="ทักษะที่พบบ่อยที่สุดจากพอร์ตโฟลิโอ" tone="amber" />
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.05)] p-6">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <h3 className="font-extrabold text-slate-800">การกระจายสายอาชีพที่แนะนำสำหรับการพัฒนาหลักสูตร</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">ใช้วางแผนหลักสูตรจากสายอาชีพที่ AI แนะนำให้นักศึกษา</p>
                </div>
                <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">ภาคเรียนล่าสุด</span>
              </div>

              <div className="flex items-end justify-between gap-3 h-52">
                {careerStats.map((stat, index) => (
                  <div key={stat.career} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                    <span className="text-xs font-extrabold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">{stat.count}</span>
                    <div
                      className="w-full max-w-[52px] rounded-t-md transition-all"
                      style={{ height: `${Math.max(stat.percent, 6)}%`, backgroundColor: barColor(index) }}
                    />
                    <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">{stat.career}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= STUDENT TABLE ================= */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-800">ตรวจสอบพอร์ตโฟลิโอนักศึกษา</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">พบ {filtered.length} รายการจากทั้งหมด {rows.length} รายการ</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหาชื่อ, รหัส หรืออีเมล"
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm transition-all"
                />
              </div>

              <select
                value={careerFilter}
                onChange={(e) => { setCareerFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-medium transition-all"
              >
                <option value="all">ทุกสายอาชีพ</option>
                {CAREER_ORDER.map((career) => (
                  <option key={career} value={career}>{career}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'analyzed' | 'pending'); setPage(1); }}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-medium transition-all"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="analyzed">วิเคราะห์แล้ว</option>
                <option value="pending">รอวิเคราะห์</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">รหัสนักศึกษา</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">อัปโหลดล่าสุด</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">สายอาชีพที่ AI แนะนำ</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">สถานะ</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{row.id}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{row.name}</p>
                        <p className="text-xs text-slate-400">{row.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.latestUpload}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.careerTh}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${row.status === 'analyzed' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                          {row.status === 'analyzed' ? 'วิเคราะห์แล้ว' : 'รอวิเคราะห์'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewing(row)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors active:scale-95">
                            ดูข้อมูล
                          </button>
                          <button onClick={() => openEdit(row)} aria-label={`แก้ไข ${row.name}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleting(row)} aria-label={`ลบ ${row.name}`} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <p className="text-sm font-bold text-slate-500">ไม่พบข้อมูลนักศึกษาที่ตรงกับเงื่อนไข</p>
                        <button onClick={resetFilters} className="mt-3 text-xs font-extrabold text-blue-600 hover:underline">ล้างตัวกรอง</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs font-medium text-slate-500">หน้า {currentPage} จาก {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{viewing.name}</h3>
                <p className="text-xs font-medium text-slate-400">{viewing.id} · {viewing.email}</p>
              </div>
              <button onClick={() => setViewing(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <DetailRow label="สถานศึกษา" value={viewing.institution} />
              <DetailRow label="คณะ / สาขาวิชา" value={viewing.major} />
              <DetailRow label="สายอาชีพที่ AI แนะนำ" value={viewing.careerTh} />
              <DetailRow label="อัปโหลดล่าสุด" value={`${viewing.latestUpload} · ${viewing.files} ไฟล์`} />
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">ทักษะที่ตรวจพบ</p>
                {viewing.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewing.skills.map((skill) => (
                      <span key={skill} className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400">ยังไม่มีผลวิเคราะห์ทักษะ</p>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">ผลการวิเคราะห์ล่าสุด</p>
                  {viewing.latestAnalysis && (
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(viewing.latestAnalysis.analyzed_at).toLocaleDateString('th-TH')}
                    </span>
                  )}
                </div>
                {viewing.latestAnalysis ? (
                  <div className="space-y-3">
                    {viewing.latestAnalysis.accuracy < 30 && (
                      <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        ⚠ AI ไม่มั่นใจผลนี้ (ความแม่นยำ {viewing.latestAnalysis.accuracy}%)
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-extrabold text-slate-800">{viewing.latestAnalysis.accuracy}%</span>
                      <span className="text-[11px] font-medium text-slate-400">ความแม่นยำ</span>
                    </div>
                    {[
                      { label: 'Technical', value: viewing.latestAnalysis.technical, color: 'bg-blue-500' },
                      { label: 'Soft Skills', value: viewing.latestAnalysis.soft, color: 'bg-purple-500' },
                      { label: 'Management', value: viewing.latestAnalysis.management, color: 'bg-indigo-500' },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>{bar.label}</span>
                          <span>{bar.value}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className={`${bar.color} h-1.5 rounded-full`} style={{ width: `${bar.value}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {viewing.latestAnalysis.recommendations.length > 0 && (
                      <div className="pt-1 space-y-2">
                        {viewing.latestAnalysis.recommendations.map((rec, i) => (
                          <div key={i}>
                            <p className="text-xs font-extrabold text-slate-700">{rec.title}</p>
                            <p className="text-[11px] text-slate-500">{rec.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {viewing.latestAnalysis.warnings.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        {viewing.latestAnalysis.warnings.map((w, i) => (
                          <p key={i} className="text-[11px] font-bold text-amber-700">⚠ {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400">ยังไม่มีผลวิเคราะห์</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">ผลงานที่อัปโหลด ({viewing.files} ไฟล์)</p>
                {viewing.realFiles.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewing.realFiles.map((file) => {
                      const isImage = /^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.file_type);
                      const isAnalyzed = analyzedIds.includes(file.id);
                      return (
                        <button
                          key={file.file_url}
                          onClick={() => isImage && setPreviewFile(file)}
                          className="w-full flex items-center gap-3 rounded-xl border border-slate-100 hover:border-blue-300 px-2.5 py-2 transition-all text-left"
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.file_url} alt={file.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
                          ) : (
                            <span className="w-14 h-14 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
                              {file.file_type}
                            </span>
                          )}
                          <span className="min-w-0 flex-grow">
                            <span className="block text-xs font-bold text-slate-700 truncate">{file.title}</span>
                            <span className="mt-1 flex items-center gap-1.5">
                              <span className="block text-[10px] font-medium text-slate-400">
                                {new Date(file.created_at).toLocaleDateString('th-TH')} · {isImage ? 'แตะเพื่อดูรูป' : file.file_type}
                              </span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isAnalyzed ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                                {isAnalyzed ? 'วิเคราะห์แล้ว' : 'ยังไม่วิเคราะห์'}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400">ยังไม่มีไฟล์</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => viewing && openEdit(viewing)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors">แก้ไขข้อมูล</button>
              <button onClick={() => setViewing(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.3)] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-800">แก้ไขข้อมูลนักศึกษา</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">{editing.id} · {editing.email}</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">ชื่อ-นามสกุล</label>
                <input
                  type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">มหาวิทยาลัย / สถานศึกษา</label>
                <input
                  type="text" value={editForm.institution} onChange={(e) => setEditForm((p) => ({ ...p, institution: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สาขาวิชา</label>
                  <input
                    type="text" value={editForm.major} onChange={(e) => setEditForm((p) => ({ ...p, major: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">สิทธิ์</label>
                  <select
                    value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-800 font-medium"
                  >
                    <option value="student">นักศึกษา</option>
                    <option value="admin">แอดมิน</option>
                  </select>
                </div>
              </div>
              {editError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠ {editError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setEditing(null)} disabled={editBusy} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">ยกเลิก</button>
              <button onClick={saveEdit} disabled={editBusy} className="flex-1 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                {editBusy ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FILE PREVIEW ================= */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
        >
          <div onClick={(event) => event.stopPropagation()} className="bg-white w-full max-w-xl rounded-[2rem] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold tracking-tight text-slate-800 truncate">{previewFile.title}</h3>
                <p className="text-xs font-medium text-slate-400">
                  {new Date(previewFile.created_at).toLocaleDateString('th-TH')} · {previewFile.file_type}
                </p>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewFile.file_url} alt={previewFile.title} className="w-full max-h-[70vh] object-contain bg-slate-950" />
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <a href={previewFile.file_url} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors">
                เปิดไฟล์ต้นฉบับ
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM ================= */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">ลบข้อมูลนักศึกษา?</h3>
            <p className="text-sm text-slate-500 mt-2">{deleting.name} ({deleting.id}) พร้อมผลวิเคราะห์ทั้งหมดจะถูกลบออกจากรายการนี้</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function barColor(index: number) {
  const palette = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
  return palette[index % palette.length];
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: 'blue' | 'green' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.05)] px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 truncate">{value}</p>
        <p className="text-[11px] font-medium text-slate-400 truncate">{hint}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}