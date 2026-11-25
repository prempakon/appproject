import { supabase } from './supabaseClient';
import type { Profile, UserStatus } from './database.types';
import type { ScoreDimensions } from './platform.types';
import { resolveJobKeywords } from './jobSearch';
import { radarScoresFromRow, rowNumber } from './analysisRows';

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
  // select('*') — optional columns (career_en, radar_scores, recommended_role…)
  // vary per environment; missing names must never break the query.
  const { data: analyses, error: anErr } = await supabase
    .from('analysis_results')
    .select('*')
    .order('analyzed_at', { ascending: false });
  if (anErr) throw anErr;
  return {
    profiles: (profiles ?? []) as Profile[],
    portfolios: (portfolios ?? []) as { id: string; user_id: string; title: string; file_url: string; file_type: string; created_at: string }[],
    analyses: (analyses ?? []) as unknown as {
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
      recommended_role?: string | null;
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
  recommended_role: string | null;
  job_keywords: string[];
}

const MY_ANALYSES_SELECT = '*,portfolios(title)';

export async function listMyAnalyses(userId: string): Promise<MyAnalysisRow[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select(MY_ANALYSES_SELECT)
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as unknown as (Omit<MyAnalysisRow, 'portfolio_title' | 'radar_scores' | 'recommended_role' | 'job_keywords'> & {
    radar_scores?: Partial<ScoreDimensions> | null;
    scores?: unknown;
    result_data?: unknown;
    analysis_data?: unknown;
    recommended_role?: string | null;
    portfolios: { title: string } | null;
  })[];
  return rows.map((r) => {
    const radarIn = radarScoresFromRow(r as unknown as Record<string, unknown>) ?? {};
    const technical = rowNumber(radarIn.technical, r.technical ?? 0);
    const soft = rowNumber(radarIn.soft, r.soft ?? 0);
    const management = rowNumber(radarIn.management, r.management ?? 0);
    const accuracy = rowNumber(radarIn.accuracy, r.accuracy ?? 0);
    const radar: ScoreDimensions = {
      technical,
      soft,
      management,
      accuracy,
      communication: rowNumber(radarIn.communication, Math.round((technical + soft) / 2)),
      creativity: rowNumber(radarIn.creativity, Math.round((soft + management) / 2)),
    };
    return {
      id: r.id,
      portfolio_id: r.portfolio_id,
      portfolio_title: r.portfolios?.title ?? 'ไม่ทราบชื่อไฟล์',
      skills: r.skills ?? [],
      career: r.career ?? null,
      career_en: (r as { career_en?: string | null }).career_en ?? null,
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
      recommended_role: r.recommended_role ?? null,
      // job_keywords is derived in TS — the column does not exist on
      // analysis_results, so keywords come from role + career + skills.
      job_keywords: resolveJobKeywords({
        role: r.recommended_role ?? null,
        careerEn: (r as { career_en?: string | null }).career_en ?? null,
        skills: r.skills ?? [],
      }),
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
