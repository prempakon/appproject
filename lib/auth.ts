import { supabase } from './supabaseClient';
import { resolveRole } from './database.types';

// สมัครสมาชิกจริง + สร้างโปรไฟล์คู่กัน (ไม่ลบ flow เดิม ฝั่ง UI ยังเขียน localStorage สำรองไว้)
export async function signUpReal(email: string, password: string, profile: {
  name: string;
  institution: string;
  major: string;
  avatar_url?: string | null;
}) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const user = data.user;
  if (user) {
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email,
      name: profile.name,
      institution: profile.institution,
      major: profile.major,
      avatar_url: profile.avatar_url ?? null,
      role: resolveRole(email),
    }, { onConflict: 'id' });
    if (pErr) throw pErr;
  }
  return data;
}

export async function signInReal(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutReal() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export function signInWithGoogleReal() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/main` },
  });
}
