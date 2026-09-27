import { supabase } from './supabaseClient';
import type { Profile } from './database.types';

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
    .select('user_id,skills,career,analyzed_at')
    .order('analyzed_at', { ascending: false });
  if (anErr) throw anErr;
  return {
    profiles: (profiles ?? []) as Profile[],
    portfolios: (portfolios ?? []) as { id: string; user_id: string; title: string; file_url: string; file_type: string; created_at: string }[],
    analyses: (analyses ?? []) as { user_id: string; skills: string[]; career: string | null; analyzed_at: string }[],
  };
}

export async function deleteProfileForAdmin(userId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
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
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: { title: string; detail: string }[];
  analyzed_at: string;
  raw_input: string | null;
  warnings: string[];
}

export async function listMyAnalyses(userId: string): Promise<MyAnalysisRow[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('id,portfolio_id,skills,career,accuracy,technical,soft,management,recommendations,analyzed_at,raw_input,warnings,portfolios(title)')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<MyAnalysisRow, 'portfolio_title'> & { portfolios: { title: string } | null })[]).map((r) => ({
    id: r.id,
    portfolio_id: r.portfolio_id,
    portfolio_title: r.portfolios?.title ?? 'ไม่ทราบชื่อไฟล์',
    skills: r.skills ?? [],
    career: r.career ?? null,
    accuracy: r.accuracy ?? 85,
    technical: r.technical ?? 90,
    soft: r.soft ?? 65,
    management: r.management ?? 50,
    recommendations: (r.recommendations ?? []) as { title: string; detail: string }[],
    analyzed_at: r.analyzed_at,
    raw_input: (r as { raw_input?: string | null }).raw_input ?? null,
    warnings: (r as { warnings?: string[] }).warnings ?? [],
  }));
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
