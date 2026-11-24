// Types ตรงกับ supabase/schema.sql — ไฟล์เสริมเท่านั้น ไม่แตะโค้ดเดิม
// ใช้ตอนย้ายจาก localStorage มา Supabase ในขั้นถัดไป

export type UserRole = 'student' | 'admin';

export type UserStatus =
  | 'นักศึกษา / บัณฑิตจบใหม่'
  | 'พนักงานประจำ / คนทำงาน'
  | 'ฟรีแลนซ์ / อาชีพอิสระ'
  | 'ผู้หางาน / บุคคลทั่วไป';

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'นักศึกษา / บัณฑิตจบใหม่', label: 'นักศึกษา / บัณฑิตจบใหม่' },
  { value: 'พนักงานประจำ / คนทำงาน', label: 'พนักงานประจำ / คนทำงาน' },
  { value: 'ฟรีแลนซ์ / อาชีพอิสระ', label: 'ฟรีแลนซ์ / อาชีพอิสระ' },
  { value: 'ผู้หางาน / บุคคลทั่วไป', label: 'ผู้หางาน / บุคคลทั่วไป' },
];

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  institution: string | null;
  major: string | null;
  user_status: UserStatus | null;
  bio: string;
  github_link: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  portfolio_id: string;
  user_id: string;
  skills: string[];
  career: string | null;
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: { title: string; detail: string }[];
  analyzed_at: string;
}

// รายชื่อแอดมินเดิม (คงไว้ให้บัญชีเก่า) + กติกาใหม่: เมล @admin.com = แอดมิน
export const ADMIN_EMAILS = ['admin@lru.ac.th', 'superadmin@lru.ac.th'];

export function resolveRole(email: string): UserRole {
  const clean = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(clean)) return 'admin';
  if (clean.endsWith('@admin.com')) return 'admin';
  return 'student';
}
