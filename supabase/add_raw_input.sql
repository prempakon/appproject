-- เก็บข้อความดิบที่นักศึกษาพิมพ์ + คำเตือนไฟล์ที่ AI ไม่นับ (รันครั้งเดียวใน SQL Editor)
alter table public.analysis_results
  add column if not exists raw_input text;

alter table public.analysis_results
  add column if not exists warnings text[] not null default '{}';
