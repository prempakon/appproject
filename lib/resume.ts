import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { ResumeData, ResumeEducation, ResumeExperience, ResumeProject } from './platform.types';

export const RESUME_STORAGE_KEY = 'lru_resume_draft';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    github: '',
    summary: '',
    skills: [],
    experiences: [],
    education: [],
    projects: [],
    certifications: [],
    ...overrides,
  };
}

function text(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeExperiences(value: unknown): ResumeExperience[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .slice(0, 8)
    .map((item) => ({
      id: text(item.id, 80) || newId(),
      role: text(item.role, 120),
      company: text(item.company, 120),
      start: text(item.start, 40),
      end: text(item.end, 40),
      details: text(item.details, 1200),
    }));
}

function normalizeEducation(value: unknown): ResumeEducation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .slice(0, 6)
    .map((item) => ({
      id: text(item.id, 80) || newId(),
      degree: text(item.degree, 160),
      institution: text(item.institution, 160),
      year: text(item.year, 40),
      gpa: text(item.gpa, 20),
    }));
}

function normalizeProjects(value: unknown): ResumeProject[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .slice(0, 8)
    .map((item) => ({
      id: text(item.id, 80) || newId(),
      name: text(item.name, 160),
      detail: text(item.detail, 1200),
      link: text(item.link, 300),
    }));
}

export function normalizeResume(value: unknown): ResumeData {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return emptyResume({
    fullName: text(data.fullName, 120),
    headline: text(data.headline, 160),
    email: text(data.email, 160),
    phone: text(data.phone, 60),
    location: text(data.location, 120),
    website: text(data.website, 300),
    github: text(data.github, 300),
    summary: text(data.summary, 1600),
    skills: Array.isArray(data.skills)
      ? data.skills.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 40)
      : [],
    experiences: normalizeExperiences(data.experiences),
    education: normalizeEducation(data.education),
    projects: normalizeProjects(data.projects),
    certifications: Array.isArray(data.certifications)
      ? data.certifications.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : [],
  });
}

export function loadResumeDraft(): ResumeData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
    return raw ? normalizeResume(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveResumeDraft(data: ResumeData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Draft is a convenience; ignore quota errors.
  }
}

export function encodeResumePayload(data: ResumeData): string {
  return compressToEncodedURIComponent(JSON.stringify(normalizeResume(data)));
}

export function decodeResumePayload(payload: string): ResumeData | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    return normalizeResume(JSON.parse(json));
  } catch {
    return null;
  }
}

export function makeResumeSlug(): string {
  return `cv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export interface SavedResume {
  id: string;
  user_id: string;
  slug: string;
  data: ResumeData;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function savePublicResume(
  userId: string,
  data: ResumeData,
  slug: string,
): Promise<SavedResume> {
  const { supabase } = await import('./supabaseClient');
  const { data: row, error } = await supabase
    .from('resumes')
    .upsert(
      {
        user_id: userId,
        slug,
        data: normalizeResume(data),
        is_public: true,
      },
      { onConflict: 'slug' },
    )
    .select('id,user_id,slug,data,is_public,created_at,updated_at')
    .single();
  if (error) throw error;
  return { ...row, data: normalizeResume(row.data) } as SavedResume;
}

export async function loadPublicResume(slug: string): Promise<ResumeData | null> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase
      .from('resumes')
      .select('data,is_public')
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle();
    if (error) throw error;
    return data ? normalizeResume(data.data) : null;
  } catch {
    return null;
  }
}

export async function loadResumeById(id: string): Promise<ResumeData | null> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase
      .from('resumes')
      .select('data,is_public,user_id')
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();
    if (error) throw error;
    return data ? normalizeResume(data.data) : null;
  } catch {
    return null;
  }
}

export function resumeSharePath(data: ResumeData, slug?: string | null, id?: string | null): string {
  if (id) return `/resume/${encodeURIComponent(id)}`;
  if (slug) return `/resume/view?slug=${encodeURIComponent(slug)}`;
  return `/resume/view?d=${encodeURIComponent(encodeResumePayload(data))}`;
}

export function resumeSkillList(data: ResumeData | null): string[] {
  return data?.skills?.filter(Boolean) ?? [];
}
