import { supabase } from './supabaseClient';
import type { Profile, UserStatus } from './database.types';
import type { ScoreDimensions } from './platform.types';

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Profile;
}

export async function upsertMyProfile(userId: string, patch: Partial<Profile> & { email: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function upsertMyProfileWithStatus(
  userId: string,
  patch: Partial<Profile> & { email: string; user_status?: UserStatus | null },
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// แอดมิน: ดึงโปรไฟล์ทั้งหมดพร้อมไฟล์พอร์ต (ต้องรัน supabase/fix_rls_admin.sql ก่อน ไม่งั้น RLS บล็อก)
export async function listProfilesForAdmin() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { data: portfolios, error: pfErr } = await supabase
    .from('portfolios')
    .select('id,user_id,title,file_url,file_type,created_at')
    .order('created_at', { ascending: false });
  if (pfErr) throw pfErr;
  const { data: analyses, error: anErr } = await supabase
    .from('analysis_results')
    .select('portfolio_id,user_id,skills,career,career_en,accuracy,technical,soft,management,recommendations,warnings,raw_input,analyzed_at')
    .order('analyzed_at', { ascending: false });
  if (anErr) throw anErr;
  return {
    profiles: (profiles ?? []) as Profile[],
    portfolios: (portfolios ?? []) as { id: string; user_id: string; title: string; file_url: string; file_type: string; created_at: string }[],
    analyses: (analyses ?? []) as {
      portfolio_id: string;
      user_id: string;
      skills: string[];
      career: string | null;
      career_en: string | null;
      accuracy: number;
      technical: number;
      soft: number;
      management: number;
      recommendations: { title: string; detail: string }[];
      warnings: string[];
      raw_input: string | null;
      analyzed_at: string;
    }[],
  };
}

export async function deleteProfileForAdmin(userId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

export async function adminUpdateProfile(userId: string, patch: {
  name: string;
  institution: string | null;
  major: string | null;
  user_status: UserStatus | null;
  role: 'student' | 'admin';
}) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export interface MyPortfolioRow {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface MyAnalysisRow {
  id: string;
  portfolio_id: string;
  portfolio_title: string;
  skills: string[];
  career: string | null;
  career_en: string | null;
  career_category: string | null;
  radar_scores: ScoreDimensions | null;
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: { title: string; detail: string }[];
  analyzed_at: string;
  raw_input: string | null;
  warnings: string[];
  skill_notes: { technical: string | null; soft: string | null; management: string | null };
}

export async function listMyAnalyses(userId: string): Promise<MyAnalysisRow[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('id,portfolio_id,skills,career,career_en,career_category,radar_scores,accuracy,technical,soft,management,recommendations,analyzed_at,raw_input,warnings,technical_note,soft_note,management_note,portfolios(title)')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  const score = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
  };
  const rows = (data ?? []) as unknown as (Omit<MyAnalysisRow, 'portfolio_title' | 'career_category' | 'radar_scores'> & {
    career_category?: string | null;
    radar_scores?: Partial<ScoreDimensions> | null;
    portfolios: { title: string } | null;
  })[];
  return rows.map((r) => {
    const technical = r.technical ?? 0;
    const soft = r.soft ?? 0;
    const management = r.management ?? 0;
    const accuracy = r.accuracy ?? 0;
    const radar: ScoreDimensions = {
      technical: score(r.radar_scores?.technical, technical),
      soft: score(r.radar_scores?.soft, soft),
      management: score(r.radar_scores?.management, management),
      accuracy: score(r.radar_scores?.accuracy, accuracy),
      communication: score(r.radar_scores?.communication, Math.round((technical + soft) / 2)),
      creativity: score(r.radar_scores?.creativity, Math.round((soft + management) / 2)),
    };
    return {
      id: r.id,
      portfolio_id: r.portfolio_id,
      portfolio_title: r.portfolios?.title ?? 'ไม่ทราบชื่อไฟล์',
      skills: r.skills ?? [],
      career: r.career ?? null,
      career_en: (r as { career_en?: string | null }).career_en ?? null,
      career_category: r.career_category ?? null,
      radar_scores: radar,
      accuracy: radar.accuracy,
      technical: radar.technical,
      soft: radar.soft,
      management: radar.management,
      recommendations: (r.recommendations ?? []) as { title: string; detail: string }[],
      analyzed_at: r.analyzed_at,
      raw_input: (r as { raw_input?: string | null }).raw_input ?? null,
      warnings: (r as { warnings?: string[] }).warnings ?? [],
      skill_notes: {
        technical: (r as { technical_note?: string | null }).technical_note ?? null,
        soft: (r as { soft_note?: string | null }).soft_note ?? null,
        management: (r as { management_note?: string | null }).management_note ?? null,
      },
    };
  });
}

export async function listMyPortfolios(userId: string): Promise<MyPortfolioRow[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('id,title,file_url,file_type,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyPortfolioRow[];
}
