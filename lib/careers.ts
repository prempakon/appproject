// Canonical career names used by the AI analysis and platform analytics.

export const CAREER_OPTIONS = [
  { value: 'Software Engineer', label: 'วิศวกรซอฟต์แวร์' },
  { value: 'Data Scientist', label: 'นักวิทยาศาสตร์ข้อมูล' },
  { value: 'UX Designer', label: 'นักออกแบบประสบการณ์ผู้ใช้' },
  { value: 'Cybersecurity Analyst', label: 'นักวิเคราะห์ความมั่นคงปลอดภัยไซเบอร์' },
  { value: 'Marketing Strategist', label: 'นักกลยุทธ์การตลาด' },
  { value: 'Finance Analyst', label: 'นักวิเคราะห์การเงิน' },
] as const;

// Broad cross-industry groups for the "จับคู่งาน" สายอาชีพ filter. Values are
// Thai/English search keywords sent to /api/jobs — not DB career_en keys.
export const JOB_GROUP_OPTIONS = [
  { value: '', label: 'ทุกสายอาชีพ' },
  { value: 'บริหาร การจัดการ ทรัพยากรบุคคล HR', label: 'บริหาร / การจัดการ / HR' },
  { value: 'การตลาด การขาย ประชาสัมพันธ์ Marketing Sales', label: 'การตลาด / การขาย / ประชาสัมพันธ์' },
  { value: 'บัญชี การเงิน เศรษฐศาสตร์ Accountant Finance', label: 'บัญชี / การเงิน / เศรษฐศาสตร์' },
  { value: 'ออกแบบ สื่อ ครีเอทีฟ Graphic Design Media Creative', label: 'ออกแบบ / สื่อ / ครีเอทีฟ' },
  { value: 'เทคโนโลยี ไอที ข้อมูล IT Software Data', label: 'เทคโนโลยี / IT / ข้อมูล' },
  { value: 'วิศวกรรม อุตสาหกรรม Engineering Industrial', label: 'วิศวกรรม / อุตสาหกรรม' },
  { value: 'การศึกษา วิชาการ ครู Teacher Education', label: 'การศึกษา / วิชาการ' },
  { value: 'บริการ ท่องเที่ยว โลจิสติกส์ Hospitality Tourism Logistics', label: 'บริการ / ท่องเที่ยว / โลจิสติกส์' },
  { value: 'สุขภาพ วิทยาศาสตร์ พยาบาล Health Science Nursing', label: 'สุขภาพ / วิทยาศาสตร์' },
] as const;

export const CAREER_LABELS: Record<string, string> = Object.fromEntries(
  CAREER_OPTIONS.map((c) => [c.value, c.label]),
);

export function careerLabel(value: string | null | undefined): string {
  if (!value) return 'ยังระบุสายงานไม่ได้';
  return CAREER_LABELS[value] ?? value;
}

export const WORK_MODE_LABELS: Record<string, string> = {
  onsite: 'ทำงานที่ออฟฟิศ',
  hybrid: 'ไฮบริด',
  remote: 'รีโมท',
};
