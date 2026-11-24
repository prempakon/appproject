# QA & Security Audit Specification (`qa_spec.md`)

> **Role:** Lead QA Engineer & Application Security Auditor (Read-Only Audit Mode)
> **Target:** `D:\appproject\projectapp`
> **Reference Specs:** `upgrade_spec.md` + `current_state.md`

## 1. กฎเหล็กในการตรวจ (Audit Rules)
- ห้ามเข้าข้างโค้ดเดิม ให้ตรวจแบบจับผิดเชิงลึก (Zero-Trust Audit)
- ตรวจสอบทุกไฟล์ใน `app/`, `components/`, `lib/` และ `supabase/` เทียบกับ Requirement ใน `upgrade_spec.md`
- รายงานผลลงในไฟล์ `qa_report.md` โดยแบ่งสถานะเป็น `[PASS]` หรือ `[FAIL]` พร้อมระบุ **ชื่อไฟล์ + เลขบรรทัด + สาเหตุที่พัง** อย่างชัดเจน

## 2. รายการตรวจสอบบังคับ (Mandatory Test Cases)
1. **Authentication & Route Protection (Module J):**
   - Route `/main`, `/analytics`, `/resume`, `/gallery`, `/profile` ต้องมี Auth Guard บังคับ Redirect ไป `/login` ทันทีหากยังไม่ล็อกอิน
   - Route `/admin` และทุก Sub-route ต้องตรวจทั้ง Auth และ `role === 'admin'`
   - API Route `/api/analyze` ต้องตรวจสอบ Bearer Token / Session ก่อนเรียก Gemini API
2. **Data Isolation & RLS (Module J):**
   - ทุกคำสั่ง `.from(...)` ที่ดึงข้อมูลส่วนตัว (`analysis_results`, `resumes`, `portfolios`, `saved_jobs`, `job_applications`) ต้องมีเงื่อนไข `.eq('user_id', user.id)` เสมอ (ยกเว้น `/resume/[id]` ที่เช็ก `is_public = true`)
   - ไฟล์ `supabase/fix_rls_strict.sql` ต้องปิดสิทธิ์ Public Read บนตารางข้อมูลส่วนตัวทั้งหมด
3. **Zero Mock Data Policy (Module I):**
   - ต้องไม่พบข้อมูลจำลอง (`Nova Software Studio`, `DataWise Analytics`, `Loei Creative House`, `ข้อมูลตัวอย่าง`) ในโค้ดส่วนใดของโปรเจกต์
   - หน้า `/jobs` ต้องไม่มีแถบป้าย `ทักษะของคุณ:` รกหน้าจอ และปุ่มสมัครงานต้องเชื่อม `apply_url` หรือค้นหางานจริงบน Google Jobs / JobThai / JobsDB ได้จริง
4. **Architecture & UI Consistency (Module A, B, E, G):**
   - ต้องมี Global Navbar เดียวทั้งแอป ห้ามมี `<header>` ซ้ำซ้อนใน `app/page.tsx` หรือ `app/resume/demo/page.tsx`
   - กราฟ Radar Chart ในหน้า `/analytics` ต้องแสดงหัวข้อ `6 มิติ` และป้ายชื่อแกนต้องไม่โดนขอบ SVG ตัดขาด
   - ทุกจุดอัปโหลดไฟล์จำกัดขนาดไม่เกิน 5MB และไม่มี `catch {}` เงียบๆ
# End-to-End QA Test Specification (`qa_spec.md`)

## กฎการทดสอบ (Execution Rules)
- ตรวจสอบโค้ดและจำลองการใช้งานจริงครบทุกเส้นทาง (User Journeys) ตั้งแต่ Guest → Register/Login → Profile → Upload/Gallery → AI Analysis → Radar Analytics → Resume & QR → Job Recommender → Admin
- หากพบข้อบกพร่อง (Defect) ในข้อใด ให้แก้ไขให้ผ่านตาม `upgrade_spec.md` ทันที แล้วทดสอบซ้ำก่อนบันทึกผลเป็น `PASS`
- บันทึกผลลัพธ์ละเอียดทุกข้อลงใน `qa_report.md` และอัปเดตสถานะล่าสุดใน `current_state.md`

## รายการทดสอบครบทุกฟังก์ชัน (Test Cases: TC-01 ถึง TC-10)

- [ ] **TC-01: Global Navbar & โครงสร้างเมนู (`components/Navbar.tsx`, `app/main/page.tsx`)**
  - ตรวจสอบเมนูกลางมีครบ 5 รายการ: `หน้าแรก (/)`, `วิเคราะห์พอร์ต (/main)`, `จับคู่งาน (/jobs)`, `เรซูเม่ (/resume)`, `วิเคราะห์อาชีพ (/analytics)`
  - เมื่อล็อกอินแล้ว มุมขวาต้องมีปุ่ม `โปรไฟล์ (/profile)`, ปุ่ม `แอดมิน (/admin)` (แสดงเฉพาะ `role === 'admin'`), และ `ออกจากระบบ`
  - หน้า `/main` ต้องไม่มีแถบ Header รองหรือแถบเมนูซ้ำซ้อน

- [ ] **TC-02: ความปลอดภัย Auth Guards & Strict RLS (`middleware.ts`, Protected Routes, Supabase Queries)**
  - ทดสอบเข้า `/main`, `/analytics`, `/resume`, `/gallery`, `/profile` ขณะยังไม่ล็อกอิน: ต้องถูก Redirect ไป `/login?redirect=<path>` ทันทีโดยไม่ดึงข้อมูลค้าง
  - ทดสอบเข้า `/admin` ด้วยบัญชีผู้ใช้ทั่วไป (`role !== 'admin'`): ต้องถูกบล็อก/ดีดออกทันที
  - ตรวจสอบทุก Query ในตาราง `portfolios`, `analysis_results`, `resumes`, `profiles` ต้องผูก `.eq('user_id', user.id)` หรือ `.eq('id', user.id)` เสมอ (ยกเว้น `/resume/[id]` ที่เปิดเฉพาะ `is_public = true`)

- [ ] **TC-03: หน้าเข้าสู่ระบบและสมัครสมาชิก (`app/login/page.tsx`, `app/setup/page.tsx`)**
  - `/login`: การ์ดคู่ 2 คอลัมน์ ฝั่งซ้ายแสดง 3 ขั้นตอนชัดเจน, ฝั่งขวาแสดงแบนเนอร์แจ้งเตือนตามค่า `?redirect=` (ห่อด้วย `<Suspense>`), ช่องกรอกมีระยะห่างไอคอน `pl-10` ไม่ทับตัวหนังสือ, ปุ่ม Google ใช้ `<img src="data:image/svg+xml..." />` 4 สีถูกต้อง ไม่มี SVG วาดเองบิดเบี้ยว
  - `/setup`: รองรับผู้ใช้ทุกกลุ่ม (ไม่ใช่แค่นักศึกษา), Placeholder `name@example.com`, รหัสผ่านขั้นต่ำ 8 ตัวอักษร, มีปุ่มสมัครด้วย Google และ Checkbox ยอมรับ PDPA

- [ ] **TC-04: หน้าจัดการโปรไฟล์ทุกกลุ่มผู้ใช้ (`app/profile/page.tsx`)**
  - การ์ดจัดกึ่งกลางหน้าจอ (`max-w-2xl mx-auto`), ไม่มีรูป Stock Photo คนอื่น (ใช้ Initials Avatar เมื่อยังไม่มีรูปจริง)
  - มีตัวเลือก `สถานะปัจจุบัน`, `สถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ)`, `สาขาวิชา / สายงานที่เชี่ยวชาญ` และจำกัดขนาดอัปโหลดรูปโปรไฟล์ไม่เกิน **5MB**

- [X] **TC-05: คลังรูปภาพแบ่งหมวดหมู่ + กันอัปโหลดซ้ำ + เชื่อมโยงทุกจุด (`lib/portfolio.ts`, `app/main/page.tsx`, `app/gallery/page.tsx`)**
  - ใช้ค่าคงที่ 5 หมวดหมู่จาก `lib/portfolio.ts` ร่วมกันทุกหน้า (`ทั้งหมด`, `เกียรติบัตร / ใบรับรอง`, `ผลงาน / โปรเจกต์`, `กิจกรรม / อบรม`, `เอกสารอื่นๆ`)
  - ทดสอบอัปโหลดไฟล์เดิมซ้ำ (ทั้งกล่องบน `/main` และปุ่มเพิ่มรูปในคลัง): ระบบตรวจจับ `SHA-256` Hash และบล็อกการอัปโหลดซ้ำพร้อมแจ้งหมวดหมู่ที่ไฟล์นั้นอยู่แล้ว
  - ทดสอบอัปโหลดไฟล์เกิน **5MB**: ระบบปฏิเสธและแจ้ง Error ภาษาไทยชัดเจน
  - ทดสอบ **ย้ายหมวดหมู่** และ **ลบรูปภาพ** (ทั้งรายใบและโหมด `เลือกรายการ` หลายใบ): ต้องไม่มี `<select>` หมวดหมู่บนแถบเลือกหลายรายการหรือการ์ดรูป; แถบเลือกหลายรายการมีเฉพาะปุ่ม `เลือกทั้งหมดในหน้านี้`, `ย้ายหมวดหมู่ที่เลือก (N)` และ `ลบรูปที่เลือก (N)`; การ์ดมีป้ายหมวดปัจจุบัน ปุ่ม `ย้ายหมวด` และปุ่มลบ `Trash2`; การกดย้ายต้องเปิด Popup Modal `ย้ายหมวดหมู่ไฟล์` แสดง `N รายการ` พร้อมตัวเลือก 4 หมวดปลายทางแบบการ์ดที่คลิกเลือกได้ และปุ่ม `ยืนยันการย้ายหมวดหมู่` ต้องอัปเดต `portfolios` ด้วย `in('id', targetIds).eq('user_id', user.id)` แล้วอัปเดต Local State/จำนวนหมวดและแจ้งเตือนภาษาไทยทันที; การลบต้องลบทั้งแถวใน `portfolios` และไฟล์จริงใน Supabase Storage พร้อมอัปเดตตัวเลขจำนวนไฟล์ทันที
  - เปิด Modal **"เลือกไฟล์จากคลาวด์"** (`เลือกจากคลัง` ใน `/main`): แสดงแถบ 5 หมวดหมู่พร้อมตัวเลข, ป้ายหมวดหมู่บนการ์ด, ปุ่ม `เลือกทั้งหมดในหมวดนี้` และซิงก์ข้อมูลล่าสุดกับคลังหลัก

- [ ] **TC-06: ระบบวิเคราะห์ทักษะ AI และกราฟ 6 มิติ (`app/main/page.tsx`, `app/analytics/page.tsx`)**
  - ส่งไฟล์/รายการจากคลังเข้าวิเคราะห์ทักษะได้จริง บันทึกผลลง `analysis_results`
  - กราฟ Radar Chart ใน `/analytics` แสดงครบ 6 แกน ป้ายชื่อไม่โดนตัดขอบ (`viewBox` สมบูรณ์) และรวมกลุ่มทักษะซ้ำเรียบร้อย

- [ ] **TC-07: ระบบสร้างเรซูเม่พร้อม QR Code (`app/resume/page.tsx`, `app/resume/[id]/page.tsx`)**
  - ดึงข้อมูลโปรไฟล์, ผลวิเคราะห์ทักษะ และผลงานจาก `portfolios` (แบ่งหมวดหมู่ตรงกัน) มาสร้างเรซูเม่ได้จริง
  - สร้าง QR Code ลิงก์ไปยัง `/resume/[id]` และเปิดดูหน้าสาธารณะได้เมื่อเปิด `is_public = true`

- [ ] **TC-08: ระบบแนะนำงานตามทักษะ AI (`app/jobs/page.tsx`, `app/api/jobs/route.ts`)**
  - **ห้ามมี** ปุ่ม/ฟอร์มลงประกาศจ้างงาน, ปุ่มรับงานฟรีแลนซ์ (Fastwork), งานต่างประเทศที่ไม่เกี่ยวกับไทย (เช่น Arbeitnow / สกุลเงิน `€`), หรือ Mock Data
  - ค่าเริ่มต้นตัวกรองสายอาชีพเป็น `ทุกสายอาชีพ`, ปุ่ม `"ค้นหา"` และตัวกรองจังหวัดในไทยทำงานได้จริง, คำนวณ `% Match` และแสดงลิงก์ออกไปสมัครที่เว็บไซต์ภายนอก (Google Jobs ไทย, JobThai, JobsDB, LinkedIn)

- [ ] **TC-09: สุขภาพโค้ดและ Build (`npx tsc --noEmit` & `npm run build`)**
  - ผ่าน `npx tsc --noEmit` และ `npm run build` โดยไม่มี Error หรือ Hydration Warning

- [ ] **TC-10: Unified 3-Tier AI Analysis Layout & Radar Label Integrity (`app/main/page.tsx`, `app/components/ResultModal.tsx`, `app/components/RadarChart.tsx`)**
  - **RadarChart label integrity:** ป้ายชื่อแกนทั้ง 6 ภาษาไทย (`ทักษะเทคนิค`, `ทักษะทั่วไป`, `การบริหารจัดการ`, `ความแม่นยำของข้อมูล`, `การสื่อสาร`, `ความคิดสร้างสรรค์`) ต้อง render ครบทุกตัวอักษรโดยไม่ถูกขอบ SVG ตัดที่ด้านบน ซ้าย หรือขวา ในทุกจุดที่ใช้กราฟ (`/main`, `ResultModal`, `/analytics`, landing preview)
  - **Popup Modal parity:** Modal `"ผลการวิเคราะห์ทักษะด้วยระบบ AI"` (เปิดจากปุ่ม `ดูฉบับเต็ม` ในลิ้นชักประวัติหรือส่วนผลวิเคราะห์) ต้องแสดง 3-Tier Unified Layout เหมือนหน้า `/main` ทุกประการ — Tier 1 Career Match Banner (`สรุปสายงานที่สอดคล้อง` + ปุ่ม `ดาวน์โหลด PDF`), Tier 2 RadarChart + การ์ดทักษะ 6 ใบ, Tier 3 `ทักษะที่ตรวจพบจากเอกสาร` — และต้องไม่มี Legacy 3-Bar horizontal progress layout หลงเหลือ
  - **Skill tag cloud placement:** ป้าย Tag ทักษะสีน้ำเงินต้องอยู่ใต้ RadarChart + กริดการ์ด 6 ใบอย่างเป็นระเบียบ พร้อม badge จำนวน `X ทักษะ` และข้อความ empty state เมื่อไม่พบทักษะ