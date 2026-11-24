// Canonical career names used by the AI analysis and platform analytics.

export const CAREER_OPTIONS = [
  { value: 'Software Engineer', label: 'วิศวกรซอฟต์แวร์' },
  { value: 'Data Scientist', label: 'นักวิทยาศาสตร์ข้อมูล' },
  { value: 'UX Designer', label: 'นักออกแบบประสบการณ์ผู้ใช้' },
  { value: 'Cybersecurity Analyst', label: 'นักวิเคราะห์ความมั่นคงปลอดภัยไซเบอร์' },
  { value: 'Marketing Strategist', label: 'นักกลยุทธ์การตลาด' },
  { value: 'Finance Analyst', label: 'นักวิเคราะห์การเงิน' },
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
