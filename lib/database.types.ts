// Types ตรงกับ supabase/schema.sql — ไฟล์เสริมเท่านั้น ไม่แตะโค้ดเดิม
// ใช้ตอนย้ายจาก localStorage มา Supabase ในขั้นถัดไป

export type UserRole = 'student' | 'admin';

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  institution: string;
  major: string;
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

// รายชื่อแอดมินเดิมจาก app/page.tsx:13 — ย้ายมาไว้ที่เดียวเพื่อใช้ตอนสมัคร/seed role
export const ADMIN_EMAILS = ['admin@lru.ac.th', 'superadmin@lru.ac.th'];

export function resolveRole(email: string): UserRole {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' : 'student';
}
