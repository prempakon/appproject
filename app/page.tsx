import Link from 'next/link';
import type { Metadata } from 'next';
import HeroShowcaseCard from '../components/HeroShowcaseCard';

export const metadata: Metadata = {
  title: 'LRU Portfolio — แพลตฟอร์มวิเคราะห์ทักษะและจับคู่อาชีพสำหรับทุกคน',
  description:
    'วิเคราะห์ทักษะ 6 มิติด้วย AI จับคู่งานจริงที่เหมาะสม และสร้างเรซูเม่พร้อม QR Code สาธารณะสำหรับคนหางานและผู้พัฒนาสายอาชีพทุกคน',
};

const features = [
  {
    title: 'วิเคราะห์ทักษะด้วย AI',
    description: 'อัปโหลดใบเซอร์ ทรานสคริปต์ หรือผลงาน แล้วให้ AI สรุปทักษะ จุดแข็ง และคำแนะนำที่อ้างอิงหลักฐานจริง',
    href: '/main',
    cta: 'เริ่มวิเคราะห์พอร์ตโฟลิโอ',
    accent: 'from-blue-600 to-indigo-600',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    ),
  },
  {
    title: 'จับคู่งานและบริษัท',
    description: 'ระบบแนะนำงานจากทักษะ สายอาชีพ และทำเลที่คุณต้องการ พร้อมบอกช่องว่างทักษะที่ควรเสริมก่อนสมัคร',
    href: '/jobs',
    cta: 'ดูงานที่เหมาะกับคุณ',
    accent: 'from-emerald-500 to-teal-600',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 01-1.636 2.176 48.22 48.22 0 01-13.228 0A2.25 2.25 0 013.75 18.223V14.15M16.5 6.75V5.25A2.25 2.25 0 0014.25 3h-4.5A2.25 2.25 0 007.5 5.25v1.5m9 0h-9m9 0h2.25A2.25 2.25 0 0121 9v6.75M3 9v6.75A2.25 2.25 0 005.25 18h13.5A2.25 2.25 0 0021 15.75V9" />
    ),
  },
  {
    title: 'เรซูเม่ + QR Code',
    description: 'กรอกข้อมูลครั้งเดียว ได้เรซูเม่พร้อมพิมพ์ ดาวน์โหลด PDF และ QR Code สำหรับให้ผู้ประกอบการสแกนดูโปรไฟล์ทันที',
    href: '/resume',
    cta: 'สร้างเรซูเม่ของฉัน',
    accent: 'from-violet-600 to-fuchsia-600',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875A2.625 2.625 0 016.375 2.25h5.25A2.625 2.625 0 0114.25 4.875v14.25A2.625 2.625 0 0111.625 21.75h-5.25a2.625 2.625 0 01-2.625-2.625V4.875zM6 6h6M6 9h6M6 12h3.75m6.75 0h1.5m-1.5 3h1.5m-1.5 3h1.5m-1.5-9h1.5" />
    ),
  },
  {
    title: 'วิเคราะห์เส้นทางอาชีพ',
    description: 'แดชบอร์ดสรุปคะแนนทักษะ 6 มิติ ความพร้อมต่อสายอาชีพ และทักษะยอดนิยม ในรูปแบบกราฟที่อ่านง่าย',
    href: '/main#analytics',
    cta: 'ดูแดชบอร์ดอาชีพ',
    accent: 'from-amber-500 to-orange-600',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'สร้างโปรไฟล์และอัปโหลดผลงาน',
    detail: 'สมัครด้วยอีเมลหรือ Google แล้วอัปโหลดใบเซอร์ ทรานสคริปต์ หรือภาพผลงานของคุณ',
  },
  {
    number: '02',
    title: 'ให้ AI สรุปทักษะและเส้นทาง',
    detail: 'ระบบวิเคราะห์หลักฐานทีละไฟล์ สรุปทักษะ คะแนน 6 มิติ และอาชีพที่เหมาะสมพร้อมคำแนะนำ',
  },
  {
    number: '03',
    title: 'จับคู่งานและแชร์เรซูเม่',
    detail: 'เลือกงานที่ตรงกับโปรไฟล์ สร้างเรซูเม่ และแชร์ด้วย QR Code ให้ผู้ประกอบการสแกนดูได้ทันที',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-900">
      <main>
        {/* ================= HERO SECTION (2-COLUMN WITH TILTED SHOWCASE) ================= */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(at 82% 12%, #dbeafe 0px, transparent 55%), radial-gradient(at 12% 82%, #ede9fe 0px, transparent 52%), radial-gradient(at 48% 68%, #fef3c7 0px, transparent 48%)',
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              {/* ฝั่งซ้าย: หัวข้อและปุ่ม CTA */}
              <div className="text-center lg:col-span-7 lg:text-left">
                <h1 className="text-4xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  เปลี่ยนผลงานของคุณ
                  <br />
                  ให้เป็น
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    โอกาสทางอาชีพ
                  </span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg lg:mx-0">
                  รวมพอร์ตโฟลิโอ การวิเคราะห์ทักษะ 6 มิติด้วย AI การจับคู่งานจริง และเรซูเม่พร้อม QR Code
                  ในที่เดียว สำหรับคนหางานและผู้พัฒนาสายอาชีพทุกคน
                </p>
                <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link
                    href="/main"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-base font-extrabold text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95"
                  >
                    เริ่มต้นวิเคราะห์ผลงาน
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/jobs"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-extrabold text-slate-700 shadow-sm transition-all hover:border-blue-400 hover:text-blue-700 active:scale-95"
                  >
                    สำรวจตำแหน่งงานเปิดรับ
                  </Link>
                </div>
              </div>

              {/* ฝั่งขวา: การ์ดตัวอย่างการวิเคราะห์เอียงทำมุม */}
              <div className="lg:col-span-5">
                <HeroShowcaseCard />
              </div>
            </div>
          </div>
        </section>

        {/* ================= HIGHLIGHTS ================= */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">จุดเด่นของแพลตฟอร์ม</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              ออกแบบมาเพื่อคนหางานและผู้พัฒนาสายอาชีพทุกคน
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'วิเคราะห์ทักษะ 6 มิติ',
                desc: 'ประเมินทักษะเฉพาะทาง การแก้ปัญหา การสื่อสาร บริหารจัดการ การปรับตัว และความรับผิดชอบ',
              },
              {
                title: 'รองรับทุกสายอาชีพ',
                desc: 'ไม่จำกัดกรอบสาขาวิชา AI วิเคราะห์และแนะนำตำแหน่งงานที่เหมาะกับหลักฐานจริงของคุณ',
              },
              {
                title: 'จับคู่งานเรียลไทม์',
                desc: 'คำนวณเปอร์เซ็นต์ความเหมาะสมจากทักษะ สายอาชีพ และทำเลที่คุณเลือกพร้อมแนะทักษะที่ควรเสริม',
              },
              {
                title: 'เรซูเม่ + QR Code',
                desc: 'สร้างเรซูเม่พร้อมลิงก์สาธารณะและ QR Code ให้ผู้ประกอบการสแกนดูผลงานได้ทันที',
              },
            ].map((highlight) => (
              <article
                key={highlight.title}
                className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.04)]"
              >
                <h3 className="text-lg font-extrabold text-slate-900">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{highlight.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">แพลตฟอร์มครบวงจร</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              ทุกเครื่องมือที่คนหางานต้องใช้<br className="hidden sm:block" /> เพื่อก้าวสู่สายอาชีพที่ใช่
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
              ตั้งแต่การรวบรวมผลงาน วิเคราะห์จุดแข็ง ไปจนถึงการสร้างเรซูเม่และค้นหางานที่เหมาะสม
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(15,23,42,0.2)]"
              >
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-lg`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                <Link href={feature.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-600 transition-colors hover:text-blue-800">
                  {feature.cta}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="how-it-works" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">เริ่มต้นได้ใน 3 ขั้นตอน</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">จากผลงานสู่โอกาส</h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative rounded-3xl border border-slate-200/80 bg-[#f8faff] p-7">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">{step.number}</span>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EMPLOYERS ================= */}
        <section id="employers" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="grid items-center gap-10 rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(30,64,175,0.25)] md:grid-cols-2 md:p-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">สำหรับผู้ประกอบการ</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">สแกน QR Code ดูโปรไฟล์ได้ทันที</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
                ผู้ใช้สร้างเรซูเม่และแชร์ลิงก์สาธารณะผ่าน QR Code
                ผู้ประกอบการสามารถเปิดดูทักษะ ประสบการณ์ และผลงานได้โดยไม่ต้องติดตั้งแอปเพิ่ม
              </p>
              <ul className="mt-6 space-y-3 text-sm font-semibold text-slate-700">
                {[
                  'เห็นทักษะที่ผ่านการวิเคราะห์จากหลักฐานจริง',
                  'ดูสายอาชีพที่เหมาะสมและช่องว่างทักษะ',
                  'ติดต่อผู้สมัครได้จากช่องทางในเรซูเม่',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative rounded-[2rem] bg-slate-900 p-8 shadow-2xl">
                <div className="grid h-44 w-44 grid-cols-7 gap-1 rounded-xl bg-white p-3">
                  {Array.from({ length: 49 }).map((_, index) => (
                    <span
                      key={index}
                      className={`rounded-[2px] ${
                        [0, 1, 2, 5, 6, 7, 8, 12, 14, 16, 19, 20, 21, 23, 25, 27, 30, 32, 34, 36, 38, 40, 41, 42, 44, 45, 47, 48].includes(index)
                          ? 'bg-slate-900'
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-4 text-center text-[10px] font-bold text-slate-300">สแกนเพื่อดูโปรไฟล์</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 px-6 py-14 text-center text-white shadow-2xl md:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-amber-300/20 blur-2xl" />
            <h2 className="relative text-3xl font-black tracking-tight md:text-4xl">พร้อมเริ่มเส้นทางอาชีพของคุณหรือยัง?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm text-blue-100 md:text-base">
              สร้างโปรไฟล์ วิเคราะห์ทักษะ 6 มิติ ค้นหางานที่ใช่ และให้หลักฐานของคุณพูดแทนตัวคุณ
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/setup" className="rounded-full bg-white px-7 py-3.5 text-base font-extrabold text-blue-700 shadow-lg transition-all hover:bg-blue-50 active:scale-95">
                สมัครสมาชิก
              </Link>
              <Link href="/login" className="rounded-full border border-white/40 px-7 py-3.5 text-base font-extrabold text-white transition-all hover:bg-white/10 active:scale-95">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-center md:flex-row md:px-8 md:text-left">
          <div>
            <p className="text-sm font-black text-slate-900">LRU Portfolio</p>
            <p className="mt-1 text-xs font-medium text-slate-500">แพลตฟอร์มพัฒนาอาชีพสำหรับทุกคน · มหาวิทยาลัยราชภัฏเลย</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
            <Link href="/login" className="hover:text-blue-600">เข้าสู่ระบบ</Link>
            <Link href="/setup" className="hover:text-blue-600">สมัครสมาชิก</Link>
            <Link href="/jobs" className="hover:text-blue-600">งานและบริษัท</Link>
            <Link href="/resume" className="hover:text-blue-600">เรซูเม่</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}