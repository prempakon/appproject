import { supabase } from './supabaseClient';

function extOf(name: string, fallback = 'jpg') {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : fallback;
}

// ชื่อไฟล์จาก AI (ChatGPT ฯลฯ) มักยาวหรือมีอักขระพิเศษจน Storage ปฏิเสธ — ล้างก่อนอัปโหลด
function safeStorageName(name: string) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^\w\-.]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'file';
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg' : '.jpg';
  return `${base}${ext}`;
}

export async function uploadAvatarReal(userId: string, file: File) {
  const path = `${userId}/avatar.${extOf(file.name, 'jpg')}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPortfolioReal(userId: string, file: File) {
  const path = `${userId}/${Date.now()}-${safeStorageName(file.name)}`;
  const { error } = await supabase.storage.from('portfolios').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('portfolios').getPublicUrl(path);
  const { data: row, error: dbErr } = await supabase
    .from('portfolios')
    .insert({
      user_id: userId,
      title: file.name,
      file_url: data.publicUrl,
      file_type: extOf(file.name, 'PDF').toUpperCase(),
      file_size: file.size,
    })
    .select()
    .single();
  if (dbErr) throw dbErr;
  return row;
}

export async function saveAnalysisReal(userId: string, portfolioId: string, input: {
  skills: string[];
  career?: string | null;
  careerEn?: string | null;
  accuracy?: number;
  technical?: number;
  soft?: number;
  management?: number;
  recommendations?: { title: string; detail: string }[];
  rawInput?: string | null;
  warnings?: string[];
  skillNotes?: { technical: string | null; soft: string | null; management: string | null };
}) {
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      user_id: userId,
      portfolio_id: portfolioId,
      skills: input.skills,
      career: input.career ?? null,
      career_en: input.careerEn ?? null,
      accuracy: input.accuracy ?? 85,
      technical: input.technical ?? 90,
      soft: input.soft ?? 65,
      management: input.management ?? 50,
      recommendations: input.recommendations ?? [],
      raw_input: input.rawInput ?? null,
      warnings: input.warnings ?? [],
      technical_note: input.skillNotes?.technical ?? null,
      soft_note: input.skillNotes?.soft ?? null,
      management_note: input.skillNotes?.management ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function storagePathFromUrl(bucket: string, fileUrl: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length).split('?')[0];
}

// ลบไฟล์ของตัวเอง: ลบ object ใน Storage + แถว portfolios (analysis_results ลบตาม cascade)
export async function deletePortfolioReal(userId: string, portfolioId: string, fileUrl: string) {
  const path = storagePathFromUrl('portfolios', fileUrl);
  if (path) {
    const { error: stErr } = await supabase.storage.from('portfolios').remove([path]);
    if (stErr) throw stErr;
  }
  const { error: dbErr } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId)
    .eq('user_id', userId);
  if (dbErr) throw dbErr;
}
