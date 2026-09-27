'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type StudentRow = {
  id: string;
  name: string;
  email: string;
  institution: string;
  major: string;
  latestUpload: string;
  career: string;
  files: number;
  skills: string[];
  status: 'analyzed' | 'pending';
};

const STUDENTS: StudentRow[] = [
  { id: 'STU-1001', name: 'Maria Santos', email: 'maria.santos@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'วิทยาการคอมพิวเตอร์', latestUpload: 'ส.ค. 28, 2026', career: 'Software Engineer', files: 6, skills: ['Python', 'SQL', 'Git', 'React'], status: 'analyzed' },
  { id: 'STU-1002', name: "James O'Brien", email: 'james.obrien@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'วิทยาการข้อมูล', latestUpload: 'ส.ค. 25, 2026', career: 'Data Scientist', files: 4, skills: ['Python', 'Pandas', 'Machine Learning'], status: 'analyzed' },
  { id: 'STU-1003', name: 'Aiko Tanaka', email: 'aiko.tanaka@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'เทคโนโลยีมัลติมีเดีย', latestUpload: 'ส.ค. 22, 2026', career: 'UX Designer', files: 9, skills: ['Figma', 'User Research', 'Prototyping'], status: 'analyzed' },
  { id: 'STU-1004', name: 'Carlos Rivera', email: 'carlos.rivera@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'ความมั่นคงปลอดภัยไซเบอร์', latestUpload: 'ส.ค. 20, 2026', career: 'Cybersecurity Analyst', files: 3, skills: ['Linux', 'Networking', 'SIEM'], status: 'pending' },
  { id: 'STU-1005', name: 'Emily Chen', email: 'emily.chen@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'วิศวกรรมซอฟต์แวร์', latestUpload: 'ก.ย. 01, 2026', career: 'Software Engineer', files: 7, skills: ['TypeScript', 'Next.js', 'Docker'], status: 'analyzed' },
  { id: 'STU-1006', name: 'David Okonkwo', email: 'david.okonkwo@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'วิทยาการข้อมูล', latestUpload: 'ส.ค. 18, 2026', career: 'Data Scientist', files: 5, skills: ['R', 'Statistics', 'Power BI'], status: 'pending' },
  { id: 'STU-1007', name: 'Sarah Mitchell', email: 'sarah.mitchell@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'การตลาดดิจิทัล', latestUpload: 'ส.ค. 15, 2026', career: 'Marketing Strategist', files: 2, skills: ['SEO', 'Content', 'Analytics'], status: 'analyzed' },
  { id: 'STU-1008', name: 'Nattapong Srisai', email: 'nattapong.s@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'การบัญชี', latestUpload: 'ส.ค. 12, 2026', career: 'Finance Analyst', files: 4, skills: ['Excel', 'Accounting', 'Power BI'], status: 'analyzed' },
  { id: 'STU-1009', name: 'Praewa Chaiyaphum', email: 'praewa.c@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'เทคโนโลยีมัลติมีเดีย', latestUpload: 'ส.ค. 09, 2026', career: 'UX Designer', files: 8, skills: ['Figma', 'Motion', 'Design System'], status: 'analyzed' },
  { id: 'STU-1010', name: 'Kittipong Meesuk', email: 'kittipong.m@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'วิศวกรรมซอฟต์แวร์', latestUpload: 'ส.ค. 05, 2026', career: 'Software Engineer', files: 3, skills: ['Java', 'Spring', 'MySQL'], status: 'pending' },
  { id: 'STU-1011', name: 'Wanida Phonsri', email: 'wanida.p@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'การตลาดดิจิทัล', latestUpload: 'ส.ค. 02, 2026', career: 'Marketing Strategist', files: 5, skills: ['Ads', 'Copywriting', 'CRM'], status: 'analyzed' },
  { id: 'STU-1012', name: 'Somchai Wongdee', email: 'somchai.w@lru.ac.th', institution: 'มหาวิทยาลัยราชภัฏเลย', major: 'ความมั่นคงปลอดภัยไซเบอร์', latestUpload: 'ก.ค. 30, 2026', career: 'Cybersecurity Analyst', files: 6, skills: ['Pentest', 'Python', 'Forensics'], status: 'analyzed' },
];

type PortfolioFile = {
  name: string;
  kind: string;
  hue: number;
};

const FILE_KINDS = ['UI Design', 'Certificate', 'Project Screenshot', 'Poster', 'Report', 'Prototype', 'Award', 'Mockup', 'Diagram'];

function portfolioOf(row: StudentRow): PortfolioFile[] {
  return Array.from({ length: row.files }, (_, index) => ({
    name: `${row.id.toLowerCase()}-portfolio-${String(index + 1).padStart(2, '0')}.png`,
    kind: FILE_KINDS[index % FILE_KINDS.length],
    hue: (index * 47 + row.id.charCodeAt(row.id.length - 1) * 13) % 360,
  }));
}

const CAREER_ORDER = ['Software Engineer', 'Data Scientist', 'UX Designer', 'Cybersecurity Analyst', 'Marketing Strategist', 'Finance Analyst'];

const PAGE_SIZE = 7;

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    // ถ้าไม่ใช่ admin ให้เด้งกลับหน้า Login ทันที
    if (role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const [rows, setRows] = useState<StudentRow[]>(STUDENTS);
  const [search, setSearch] = useState('');
  const [careerFilter, setCareerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'analyzed' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [preview, setPreview] = useState<PortfolioFile | null>(null);

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
    const max = Math.max(1, ...counts.map((c) => c.count));
    return counts.map((c) => ({ ...c, percent: Math.round((c.count / max) * 100) }));
  }, [rows]);

  const topSkill = useMemo(() => {
    const tally = new Map<string, number>();
    rows.forEach((row) => row.skills.forEach((skill) => tally.set(skill, (tally.get(skill) ?? 0) + 1)));
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '-';
  }, [rows]);

  const analyzedCount = rows.filter((row) => row.status === 'analyzed').length;
  const portfolioCount = rows.reduce((sum, row) => sum + row.files, 0);

  const resetFilters = () => {
    setSearch('');
    setCareerFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setRows((prev) => prev.filter((row) => row.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      {/* ================= TOP NAV ================= */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
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
        {/* ================= STATISTICS ================= */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-800">สถิติและข้อมูลเชิงลึกของระบบ</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <StatCard label="จำนวนนักศึกษาทั้งหมด" value={rows.length.toLocaleString()} hint={`${analyzedCount} วิเคราะห์แล้ว / ${rows.length - analyzedCount} รอวิเคราะห์`} tone="blue" />
              <StatCard label="พอร์ตโฟลิโอที่วิเคราะห์แล้ว" value={portfolioCount.toLocaleString()} hint="รวมไฟล์ที่ผ่านการวิเคราะห์ทั้งระบบ" tone="green" />
              <StatCard label="ทักษะยอดนิยมสูงสุด" value={topSkill} hint="ทักษะที่พบบ่อยที่สุดจากพอร์ตโฟลิโอ" tone="amber" />
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
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
              <h2 className="text-xl font-extrabold text-slate-800">ตรวจสอบพอร์ตโฟลิโอนักศึกษา</h2>
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                      <td className="px-6 py-4 text-sm text-slate-600">{row.career}</td>
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
              <DetailRow label="สายอาชีพที่ AI แนะนำ" value={viewing.career} />
              <DetailRow label="อัปโหลดล่าสุด" value={`${viewing.latestUpload} · ${viewing.files} ไฟล์`} />
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">ทักษะที่ตรวจพบ</p>
                <div className="flex flex-wrap gap-2">
                  {viewing.skills.map((skill) => (
                    <span key={skill} className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">ผลงานที่ AI วิเคราะห์ ({viewing.files} ไฟล์)</p>
                <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {portfolioOf(viewing).map((file) => (
                    <button
                      key={file.name}
                      onClick={() => setPreview(file)}
                      className="group text-left rounded-xl overflow-hidden border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <PortfolioThumb file={file} className="h-20" />
                      <p className="text-[10px] font-bold text-slate-500 px-2 py-1.5 truncate group-hover:text-blue-600">{file.kind}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewing(null)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-sm transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMAGE PREVIEW ================= */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
        >
          <div onClick={(event) => event.stopPropagation()} className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-800 truncate">{preview.kind}</h3>
                <p className="text-xs font-medium text-slate-400 truncate">{preview.name}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <PortfolioThumb file={preview} className="h-72" large />
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
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

function PortfolioThumb({ file, className, large }: { file: PortfolioFile; className: string; large?: boolean }) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center gap-1 ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${file.hue} 85% 92%), hsl(${(file.hue + 40) % 360} 85% 80%))` }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={`hsl(${file.hue} 60% 35%)`} className={large ? 'w-14 h-14' : 'w-7 h-7'}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 9h.008v.008H18V9zm2.25 9.75H3.75A2.25 2.25 0 011.5 16.5V7.5a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 7.5v9a2.25 2.25 0 01-2.25 2.25z" />
      </svg>
      {large && <p className="text-sm font-extrabold" style={{ color: `hsl(${file.hue} 60% 30%)` }}>{file.kind}</p>}
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