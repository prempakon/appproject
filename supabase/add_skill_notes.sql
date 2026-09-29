-- เก็บคำอธิบายรายด้านที่ AI เขียนจากหลักฐานในไฟล์
alter table public.analysis_results
  add column if not exists technical_note text,
  add column if not exists soft_note text,
  add column if not exists management_note text;