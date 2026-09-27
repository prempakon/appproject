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

// แอดมิน: ดึงโปรไฟล์ทั้งหมดพร้อมจำนวนพอร์ต (ต้องรัน supabase/fix_rls_admin.sql ก่อน ไม่งั้น RLS บล็อก)
export async function listProfilesForAdmin() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { data: portfolios, error: pfErr } = await supabase
    .from('portfolios')
    .select('id,user_id,title,file_type,created_at');
  if (pfErr) throw pfErr;
  return { profiles: (profiles ?? []) as Profile[], portfolios: portfolios ?? [] };
}

export interface MyPortfolioRow {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
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
