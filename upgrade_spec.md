# Upgrade Feature: Core Platform Features (Job Matching, Resume, & Analytics)

## 1. Context & Objective
- **เป้าหมาย:** พัฒนาแพลตฟอร์มเชื่อมโยงคนหางาน/นักศึกษากับบริษัท[cite: 15, 17], ระบบสร้างเรซูเม่[cite: 16], และระบบวิเคราะห์ข้อมูลเพื่อแนะนำอาชีพ[cite: 17, 21] โดย **ไม่รวมระบบการชำระเงินหรือการซื้อขายใดๆ**

## 2. Core Modules to Implement (ฟีเจอร์หลักที่จะสร้าง)

### Module A: Landing & Welcome Page (หน้าแรกของระบบ)
- [ ] แสดงหน้าแนะนำแพลตฟอร์ม (อธิบายระบบจับคู่งาน, เรซูเม่, และการวิเคราะห์อาชีพ) ก่อนเข้าสู่ระบบ
- [ ] ปุ่ม Call-to-Action ไปยังหน้า Login / Register

### Module B: Resume & QR Code Generator (สร้างเรซูเม่และแชร์)
- [ ] ฟอร์มกรอกข้อมูลส่วนตัว ประสบการณ์ทำงาน ทักษะ และการศึกษา
- [ ] ระบบสร้างเรซูเม่สำเร็จรูป และสร้าง QR Code สำหรับให้ผู้ประกอบการสแกนดูโปรไฟล์ได้ทันที[cite: 16]

### Module C: Job Matching & Company Directory (ระบบจับคู่งานและบริษัท)
- [ ] หน้าแสดงประกาศรับสมัครงาน (ดึงข้อมูลจากบริษัทในเครือข่ายหลักสูตร หรือบริษัทที่ระบบรวบรวมไว้)[cite: 17, 23, 24]
- [ ] ระบบแนะนำงานหรือบริษัทที่เหมาะสมกับโปรไฟล์ของผู้ใช้งาน (เช่น ตามทักษะหรือภูมิลำเนา)[cite: 17, 24]
- [ ] ช่องทางให้ Admin สามารถจัดการ เพิ่ม/ลบ ข้อมูลบริษัทในเครือได้[cite: 23]

### Module D: Career & Student Analytics (ระบบวิเคราะห์อาชีพและข้อมูลผู้ใช้)
- [ ] หน้าแดชบอร์ดวิเคราะห์ข้อมูล (เช่น เกรดเฉลี่ย, ทักษะ, หรือผลอบรม)[cite: 17, 21]
- [ ] ระบบประเมินและแสดงผลอาชีพหรือสาขาที่เหมาะสมกับผู้ใช้ (แสดงผลในรูปแบบกราฟ เช่น Radar Chart ตามที่ระบุในบันทึกประชุม)[cite: 17, 21]

## 3. Constraints & Rules (ข้อจำกัดสำคัญ)
- **ตัดระบบชำระเงินออกทั้งหมด:** ห้ามมีระบบตัดเงิน หรือค่าบริการรายสัปดาห์ (เช่น 7 วัน 50 บาท) ตามที่ตัดทิ้งไป[cite: 18]
- **การจัดการไฟล์:** การอัปโหลดรูปภาพหรือเรซูเม่ (PDF) ต้องมีการจำกัดขนาดไฟล์เพื่อป้องกัน Error ตอนนำเสนอ[cite: 22]
- โค้ดต้องสะอาด เขียนต่อยอดจากโครงสร้างเดิมใน `current_state.md` ได้อย่างราบรื่น

## Module F: Universal Registration (สมัครสมาชิกสากลสำหรับผู้หางานทุกคน)
- [ ] หน้าสมัครสมาชิก (`/setup`) รองรับผู้ใช้ทุกกลุ่ม ไม่จำกัดแค่นักศึกษา
- [ ] เปลี่ยน placeholder อีเมลจาก `student@lru.ac.th` เป็น `name@example.com`
- [ ] เพิ่มตัวเลือกสถานะผู้ใช้ (`user_status`): `นักศึกษา / บัณฑิตจบใหม่`, `พนักงานประจำ / คนทำงาน`, `ฟรีแลนซ์ / อาชีพอิสระ`, `ผู้หางาน / บุคคลทั่วไป`
- [ ] เปลี่ยน `มหาวิทยาลัย / สถานศึกษา` เป็น `สถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ)` โดยไม่ default เป็น มรล.
- [ ] เปลี่ยน `สาขาวิชา` เป็น `สาขาวิชา / สายงานที่เชี่ยวชาญ`
- [ ] แทนที่รูปบุคคลสต็อกด้วย placeholder อัปโหลด avatar กล้อง/ตัวอักษร (จำกัด 5MB สูงสุด)
- [ ] เพิ่มปุ่ม "สมัครด้วย Google" OAuth ที่ด้านบนของฟอร์ม
- [ ] เพิ่มการตรวจสอบความแข็งแกร่งรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)
- [ ] ต้องติ๊กช่องยินยอม PDPA ก่อนส่งแบบฟอร์ม

### Module N: Unified 3-Tier AI Analysis Layout (`/main` & `ResultModal`)
- [ ] **บังคับใช้เลย์เอาต์วิเคราะห์ผล 3 ระดับ (3-Tier Unified AI Analysis Layout) เหมือนกันทุกจุด:** ทั้งส่วนผลวิเคราะห์บนหน้า `/main` และ Popup Modal `"ผลการวิเคราะห์ทักษะด้วยระบบ AI"` (`app/components/ResultModal.tsx`) ต้องแสดงโครงเดียวกัน 3 ชั้น เรียงจากบนลงล่าง:
  - **Tier 1 — Career Match Banner (`สรุปสายงานที่สอดคล้อง`):** การ์ดสีน้ำเงินพร้อมไอคอนกระเป๋าเอกสาร สายอาชีพที่แนะนำ (ภาษาไทย) เมทาดาทา (`วิเคราะห์เมื่อ...`, จำนวน/ชื่อไฟล์ที่วิเคราะห์) และปุ่ม Action (`ดูผลฉบับเต็ม` บนหน้า `/main`; `ดาวน์โหลด PDF` ภายใน Modal)
  - **Tier 2 — 2-Column RadarChart + 6-Axis Grid (`grid-cols-1 lg:grid-cols-12 gap-6`):** ซ้าย `lg:col-span-5` คือ RadarChart 6 แกน (`ทักษะเทคนิค`, `ทักษะทั่วไป`, `การบริหารจัดการ`, `ความแม่นยำของข้อมูล`, `การสื่อสาร`, `ความคิดสร้างสรรค์`) ที่แกนภาษาไทยต้องไม่ถูกขอบ SVG ตัด; ขวา `lg:col-span-7` คือกริด 2x3 ของการ์ดทักษะ 6 ใบ พร้อม badge `X/100`, progress bar สี และคำอธิบายเชิงคุณภาพแต่ละมิติ
  - **Tier 3 — Detected Skills Tag Cloud (`ทักษะที่ตรวจพบจากเอกสาร`):** หัวข้อพร้อม badge `X ทักษะ` และป้าย Tag สีน้ำเงิน (`bg-blue-50 text-blue-600`) เรียงอยู่ด้านล่าง RadarChart + การ์ด 6 ใบพอดี
- [x] **ลบเลย์เอาต์ Legacy 3-Bar ทิ้งทั้งหมด:** ห้ามคงแถบ Progress Bar แนวนอน 3 แท่ง (`ทักษะเฉพาะทาง`, `ทักษะทั่วไป`, `การบริหารจัดการ`) ใน `app/main/page.tsx` และ `ResultModal.tsx` — ให้ใช้ component กลางชุดเดียวกัน (`components/AnalysisResultView.tsx`) render ทั้งสองจุดเพื่อกัน Layout ลอกเลียนแบบคลาดเคลื่อน
- [x] **Single shared entry point:** `components/AnalysisResultView.tsx` export `AnalysisResultView` (Tier 1+2+3) พร้อม named subcomponents (`CareerMatchBanner`, `AnalysisRadarGrid`, `DetectedSkillsCloud`) และ `normalizeScoreDimensions()` สำหรับแปลงแถวประวัติรุ่นเก่า (partial/null `radar_scores`) ให้เป็นคะแนน 0–100 ครบทั้ง 6 แกนโดยไม่แสดง `0%`/`undefined`

### Module O: Google Jobs Engine, RadarChart UI Fix & Analytics Deduplication (2026-11-25)
- [x] **DB migrations:** `supabase/migrations/20261125_job_search_cache.sql` (ตาราง `job_search_cache`: `query_key` unique, `jobs_payload` jsonb, `source`, `updated_at`, RLS enabled + SELECT/INSERT/UPDATE policies สำหรับ `authenticated`) และ `supabase/migrations/20261125_analysis_job_fields.sql` (เพิ่มคอลัมน์ `recommended_role`, `job_keywords` ใน `analysis_results` — ต้องรัน manual ใน Supabase SQL Editor)
- [x] **AI keyword expansion:** prompt + JSON schema ของ `/api/analyze` คืน `recommended_role` (ชื่ออาชีพภาษาไทย) + `job_keywords` (3–5 คำพ้องภาษาอังกฤษ/ไทย + stack terms) พร้อม Thai→English fallback dictionary สำหรับ record รุ่นเก่า
- [x] **Duplicate-run guard:** flag `forceReanalyze` + ตรวจ `analysis_results` ด้วย sorted `fileIds`/`portfolio_id` — ถ้าซ้ำและไม่ force จะคืน record เดิมพร้อม `cachedAnalysis: true` โดยไม่เรียก Gemini และไม่ insert แถวซ้ำ
- [x] **Google Jobs engine (`/api/jobs`):** branch ใหม่เมื่อมี `role`/`keywords`/`level` — cache 24 ชั่วโมงใน `job_search_cache` (`query_key = primaryEnglishRole:level` ผ่าน `lib/jobSearch.ts`), live fetch ผ่าน JSearch RapidAPI (`RAPIDAPI_KEY`) + dedupe + normalize fields + upsert cache; **ไม่มี HTTP 500** — ทุกกรณีคืน `fallbackLinks` (Google Jobs, LinkedIn, JobsDB TH, JobThai, Blognone) พร้อม stale cache เมื่อ API ล่มหรือไม่มี key
- [x] **`/main` wiring:** ผู้ใช้ยังไม่วิเคราะห์ → Empty State + Quick Explore chips (Frontend/Backend/Data Analyst/UX-UI — ไม่ auto-call API); ผู้ใช้มีผลวิเคราะห์ → `AnalysisResultView` render ทันที (ไม่ block) + ปุ่ม `วิเคราะห์ใหม่ (บังคับ)`; `components/JobRecommendationsSection.tsx` โหลด async พร้อม filter pills (`ทั้งหมด`/`ฝึกงาน (Internship)`/`เด็กจบใหม่ (Junior)`/`Remote`), keyword chips, cache badge, refresh, skeleton loaders, job cards และแถบค้นหา 5 แพลตฟอร์ม
- [x] **RadarChart UI fix:** `viewBox="0 0 460 340"` (cx=230, cy=170, maxRadius=115), ป้าย 6 ภาษาไทยที่ radius 132 (`fontSize=13`, `fontWeight=600`, textAnchor `middle`/`start`/`end`) ไม่ถูกขอบ SVG ตัด; wrapper `max-w-[400px] mx-auto`; ลบปุ่ม `ดาวน์โหลด PDF` ซ้ำใน banner (เหลือเฉพาะปุ่ม footer ของ modal)
- [x] **Analytics dedup:** `/analytics` เพิ่ม toggle `คะแนนล่าสุด (Latest)` / `คะแนนสูงสุดรายด้าน (Peak per Axis)` บน radar + stat cards; `buildSkillFrequency` ใน `lib/careerAnalytics.ts` นับ unique-skill แบบ case-insensitive ข้ามทุก history พร้อม badge `พบใน N เอกสาร`
