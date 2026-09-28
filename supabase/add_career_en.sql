-- เก็บสายอาชีพอังกฤษสำหรับสถิติหลักสูตร (career หลักเป็นข้อความอิสระภาษาไทย)
alter table public.analysis_results
  add column if not exists career_en text;
