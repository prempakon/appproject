'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import ResultModal from '../components/ResultModal'; 
import { AnalysisRadarGrid, CareerMatchBanner, DetectedSkillsCloud } from '../components/AnalysisResultTiers';
import { supabase } from '../../lib/supabaseClient';
import type { ScoreDimensions } from '../../lib/platform.types';
import {
  ALL_PORTFOLIO_CATEGORY,
  MAX_PORTFOLIO_FILE_BYTES,
  PORTFOLIO_BUCKET,
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_CATEGORY_OPTIONS,
  computeFileSha256,
  inferPortfolioCategory,
  isPortfolioCategory,
  storagePathFromPortfolioUrl,
  type PortfolioCategory,
  type PortfolioCategoryFilter,
} from '../../lib/portfolio';

type UserProfile = {
  name: string;
  avatar?: string;
  institution?: string;
  major?: string;
  bio?: string;
  githubLink?: string;
};

type CloudFile = {
  id: string | number;
  title: string;
  type: string;
  imageUrl: string;
};

type PortfolioRow = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
  category?: string | null;
  file_hash?: string | null;
};

type SkillAnalysis = {
  skills: string[];
  career: string | null;
  careerEn: string | null;
  careerCategory: string | null;
  radarScores: ScoreDimensions;
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: { title: string; detail: string }[];
  warnings: string[];
  rawInput: string | null;
  textWarning: string | null;
  skillNotes: {
    technical: string | null;
    soft: string | null;
    management: string | null;
    communication?: string | null;
    creativity?: string | null;
  };
  model: string | null;
};

type AnalysisView = {
  analysis: SkillAnalysis;
  files: File[];
  analyzedAt: string | null;
  title: string;
};

type AnalysisHistoryItem = {
  id: string;
  portfolioId: string;
  title: string;
  analyzedAt: string;
  skillsLabel: string;
  analysis: SkillAnalysis;
};

// หมวดหมู่ + ตัวกรองทั้งหมดมาจาก lib/portfolio.ts (single source of truth)
const GALLERY_CATEGORIES = PORTFOLIO_CATEGORY_OPTIONS;
type GalleryCategory = PortfolioCategory;
const ALL_CATEGORY = ALL_PORTFOLIO_CATEGORY;
type CategoryFilter = PortfolioCategoryFilter;
const CATEGORY_FILTERS: readonly CategoryFilter[] = PORTFOLIO_CATEGORIES;

const CATEGORY_STORAGE_KEY = 'lru_portfolio_categories_v1';
const MAX_FILE_BYTES = MAX_PORTFOLIO_FILE_BYTES;

function inferCategory(title: string, fileType: string): GalleryCategory {
  return inferPortfolioCategory(title, fileType);
}


function readCategoryMap(): Record<string, GalleryCategory> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, GalleryCategory> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && (GALLERY_CATEGORIES as readonly string[]).includes(value)) {
        result[id] = value as GalleryCategory;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeCategoryMap(map: Record<string, GalleryCategory>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Category persistence is best-effort.
  }
}

function asGalleryCategory(value: unknown): GalleryCategory | null {
  return isPortfolioCategory(value) ? value : null;
}

const HASH_STORAGE_KEY = 'lru_portfolio_hashes_v1';

function readLocalHashes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HASH_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') result[id] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function writeLocalHash(id: string, hash: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalHashes();
    map[id] = hash;
    window.localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Fallback hash registry is best-effort.
  }
}

function extOf(name: string, fallback = 'jpg') {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : fallback;
}

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

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

async function fetchPortfolioRows(userId: string): Promise<PortfolioRow[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PortfolioRow[];
}

async function uploadPortfolioRow(
  userId: string,
  file: File,
  hash: string,
  options: { includeHash: boolean; includeCategory: boolean; category: GalleryCategory },
) {
  const path = `${userId}/${Date.now()}-${safeStorageName(file.name)}`;
  const { error: storageError } = await supabase.storage.from('portfolios').upload(path, file);
  if (storageError) throw storageError;

  const { data: urlData } = supabase.storage.from('portfolios').getPublicUrl(path);
  const payload: Record<string, unknown> = {
    user_id: userId,
    title: file.name,
    file_url: urlData.publicUrl,
    file_type: extOf(file.name, 'PDF').toUpperCase(),
    file_size: file.size,
  };
  if (options.includeHash) payload.file_hash = hash;
  if (options.includeCategory) payload.category = options.category;

  const { data, error } = await supabase.from('portfolios').insert(payload).select().single();
  if (error) {
    try {
      await supabase.storage.from('portfolios').remove([path]);
    } catch {
      // Orphan cleanup is best-effort; the DB error below is the important one.
    }
    throw error;
  }
  return data as { id: string };
}

function findDuplicate(rows: PortfolioRow[], localHashes: Record<string, string>, file: File, hash: string) {
  const byHash = rows.find(
    (row) => (row.file_hash && row.file_hash === hash) || localHashes[row.id] === hash,
  );
  if (byHash) return byHash;
  const targetName = file.name.trim().toLowerCase();
  return rows.find((row) => row.title.trim().toLowerCase() === targetName) ?? null;
}

async function ensurePortfolioHashes(
  userId: string,
  rows: PortfolioRow[],
  includeHash: boolean,
): Promise<PortfolioRow[]> {
  const localHashes = readLocalHashes();
  const next = [...rows];
  for (let index = 0; index < next.length; index += 1) {
    const row = next[index];
    if (row.file_hash || localHashes[row.id] || !row.file_url) continue;
    try {
      const res = await fetch(row.file_url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const hash = await computeFileSha256(
        new File([blob], row.title || 'file.jpg', { type: blob.type || 'image/jpeg' }),
      );
      localHashes[row.id] = hash;
      writeLocalHash(row.id, hash);
      if (includeHash) {
        try {
          await supabase
            .from('portfolios')
            .update({ file_hash: hash })
            .eq('id', row.id)
            .eq('user_id', userId);
        } catch {
          // Backfill is best-effort; the local hash still protects this browser session.
        }
      }
      next[index] = { ...row, file_hash: hash };
    } catch {
      // Leave legacy rows untouched when the blob cannot be fetched.
    }
  }
  return next;
}

function duplicateMessage(fileName: string, category: string) {
  return `ไฟล์ “${fileName}” มีอยู่แล้วในหมวด “${category}” — ไม่ได้อัปโหลดซ้ำ`;
}

function toScore100(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

export default function PortfolioStorage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preview' | 'processing' | 'success'>('idle');
  
  const [additionalSkillsText, setAdditionalSkillsText] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<(string | null)[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, GalleryCategory>>({});
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(ALL_CATEGORY);
  const [uploadCategory, setUploadCategory] = useState<GalleryCategory>('ผลงาน / โปรเจกต์');
  const [selectionMode, setSelectionMode] = useState(false);
  const [moveModalIds, setMoveModalIds] = useState<string[]>([]);
  const [moveModalCategory, setMoveModalCategory] = useState<GalleryCategory | null>(null);
  const [moveModalBusy, setMoveModalBusy] = useState(false);
  const [moveModalError, setMoveModalError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<CategoryFilter>(ALL_CATEGORY);
  const [selectedModalFiles, setSelectedModalFiles] = useState<CloudFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [gallerySaving, setGallerySaving] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const empty: UserProfile = { name: '' };
    try {
      const saved = typeof window === 'undefined' ? null : localStorage.getItem('userProfile');
      if (saved) return { ...empty, ...(JSON.parse(saved) as Partial<UserProfile>) };
    } catch {
      // ใช้ค่าเริ่มต้น
    }
    return empty;
  });
  const [analysisView, setAnalysisView] = useState<AnalysisView | null>(null);
  const [myPortfolios, setMyPortfolios] = useState<PortfolioRow[]>([]);
  const [myHistory, setMyHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [duplicateNotices, setDuplicateNotices] = useState<string[]>([]);
  const [reuseNotices, setReuseNotices] = useState<string[]>([]);
  const [categoryNotice, setCategoryNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const schemaCaps = useRef({ hash: false, category: false });
  const categoryNoticeTimer = useRef<number | null>(null);

  const showCategoryNotice = (type: 'success' | 'error', message: string) => {
    setCategoryNotice({ type, message });
    if (categoryNoticeTimer.current) window.clearTimeout(categoryNoticeTimer.current);
    categoryNoticeTimer.current = window.setTimeout(() => setCategoryNotice(null), 3500);
  };

  const errText = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'object' && err !== null && typeof (err as { message?: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    try {
      const s = JSON.stringify(err);
      return s && s !== '{}' ? s.slice(0, 300) : fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    return () => {
      if (categoryNoticeTimer.current) window.clearTimeout(categoryNoticeTimer.current);
    };
  }, []);

  const refreshMyPortfolios = async () => {
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { getMyProfile } = await import('../../lib/profiles');
      const user = await getSessionUser();
      if (!user) return;

      const rows = await fetchPortfolioRows(user.id);
      setMyPortfolios(rows);

      // Keep category assignments stable across pages and reloads (DB category wins when present).
      const stored = readCategoryMap();
      let changed = false;
      for (const row of rows) {
        const dbCategory = asGalleryCategory(row.category);
        if (dbCategory) {
          if (stored[row.id] !== dbCategory) {
            stored[row.id] = dbCategory;
            changed = true;
          }
        } else if (!stored[row.id]) {
          stored[row.id] = inferCategory(row.title, row.file_type);
          changed = true;
        }
      }
      if (changed) writeCategoryMap(stored);
      setCategoryMap({ ...stored });

      // โปรไฟล์เอาจาก DB เป็นหลัก (local เป็นแค่สำรอง)
      try {
        const db = await getMyProfile(user.id);
        if (db) {
          setUserProfile((prev) => ({
            ...prev,
            name: db.name || prev.name,
            avatar: db.avatar_url || prev.avatar,
            institution: db.institution || prev.institution,
            major: db.major || prev.major,
            bio: (db as { bio?: string }).bio || prev.bio,
          }));
        }
      } catch {
        // เงียบไว้ ใช้ local ต่อ
      }

    } catch {
      // เงียบไว้ ใช้ข้อมูลเดิม
    }
  };

  const loadAnalysisHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const { listMyAnalyses } = await import('../../lib/profiles');
      const user = await getSessionUser();
      if (!user) {
        setMyHistory([]);
        return;
      }
      const analyses = await listMyAnalyses(user.id);
      setMyHistory(
        analyses.map((a) => ({
          id: a.id,
          portfolioId: a.portfolio_id,
          title: a.portfolio_title,
          analyzedAt: new Date(a.analyzed_at).toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          skillsLabel: `พบ ${a.skills.length} ทักษะ`,
          analysis: {
            skills: a.skills,
            career: a.career,
            careerEn: a.career_en,
            careerCategory: a.career_category,
            radarScores: a.radar_scores ?? {
              technical: a.technical,
              soft: a.soft,
              management: a.management,
              accuracy: a.accuracy,
              communication: Math.round((a.technical + a.soft) / 2),
              creativity: Math.round((a.soft + a.management) / 2),
            },
            accuracy: a.accuracy,
            technical: a.technical,
            soft: a.soft,
            management: a.management,
            recommendations: a.recommendations,
            warnings: a.warnings ?? [],
            rawInput: a.raw_input ?? null,
            textWarning: null,
            skillNotes: a.skill_notes,
            model: null,
          },
        }))
      );
    } catch (err) {
      setMyHistory([]);
      setHistoryError(errText(err, 'โหลดประวัติการวิเคราะห์ไม่สำเร็จ'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDrawer = () => {
    setIsHistoryDrawerOpen(true);
    void loadAnalysisHistory();
  };

  const categoryFor = (file: { id: string; title: string; file_type: string; category?: string | null }): GalleryCategory =>
    categoryMap[file.id] ?? asGalleryCategory(file.category) ?? inferCategory(file.title, file.file_type);

  const assignCategories = (ids: string[], category: GalleryCategory) => {
    if (ids.length === 0) return;
    const map = readCategoryMap();
    for (const id of ids) map[id] = category;
    writeCategoryMap(map);
    setCategoryMap({ ...map });
  };

  const openMoveModal = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      showCategoryNotice('error', 'กรุณาเลือกรายการก่อนย้ายหมวดหมู่');
      return;
    }
    setMoveModalIds(uniqueIds);
    setMoveModalCategory(null);
    setMoveModalError(null);
    setMoveModalBusy(false);
  };

  const openSingleMoveModal = (file: PortfolioRow) => {
    openMoveModal([file.id]);
  };

  const closeMoveModal = () => {
    if (moveModalBusy) return;
    setMoveModalIds([]);
    setMoveModalCategory(null);
    setMoveModalError(null);
  };

  const confirmMoveCategories = async () => {
    const ids = moveModalIds;
    const category = moveModalCategory;
    if (!category || ids.length === 0) return;

    setMoveModalBusy(true);
    setMoveModalError(null);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const user = await getSessionUser();
      if (!user) {
        setMoveModalIds([]);
        setMoveModalCategory(null);
        router.replace('/login?redirect=/main');
        return;
      }

      if (schemaCaps.current.category) {
        const { error: updateError } = await supabase
          .from('portfolios')
          .update({ category })
          .in('id', ids)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
      }

      assignCategories(ids, category);
      setMoveModalIds([]);
      setMoveModalCategory(null);
      showCategoryNotice('success', `ย้าย ${ids.length} รายการไปยังหมวด “${category}” แล้ว`);
    } catch (err) {
      setMoveModalError(`ย้ายหมวดหมู่ไม่สำเร็จ: ${errText(err, 'ไม่ทราบสาเหตุ')}`);
    } finally {
      setMoveModalBusy(false);
    }
  };

  const filteredPortfolios = myPortfolios.filter(
    (file) => activeCategory === ALL_CATEGORY || categoryFor(file) === activeCategory,
  );

  // รายการใน modal "เลือกจากคลัง" ใช้ state เดียวกับคลัง → ย้าย/ลบแล้วอัปเดตทันที
  const modalFiles = myPortfolios.filter(
    (file) => modalCategory === ALL_CATEGORY || categoryFor(file) === modalCategory,
  );

  const countByCategory = (category: CategoryFilter) =>
    category === ALL_CATEGORY
      ? myPortfolios.length
      : myPortfolios.filter((file) => categoryFor(file) === category).length;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getSessionUser } = await import('../../lib/auth');
        const user = await getSessionUser();
        if (cancelled) return;

        if (!user) {
          router.replace('/login?redirect=/main');
          return;
        }

        setAuthReady(true);

        // Detect whether the live `portfolios` table already has file_hash / category columns.
        const [hashProbe, categoryProbe] = await Promise.all([
          supabase.from('portfolios').select('id,file_hash').limit(1),
          supabase.from('portfolios').select('id,category').limit(1),
        ]);
        if (cancelled) return;
        schemaCaps.current.hash = !hashProbe.error;
        schemaCaps.current.category = !categoryProbe.error;

        await refreshMyPortfolios();
      } catch {
        if (!cancelled) router.replace('/login?redirect=/main');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const openMediaModal = () => {
    setSelectedModalFiles([]);
    setModalError(null);
    setModalCategory(ALL_CATEGORY);
    setIsMediaModalOpen(true);
  };

  useEffect(() => {
    return () => { previewUrls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }); };
  }, [previewUrls]);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [selectedIds]);

  const handleFilesSelected = (files: File[], urls: string[], existingIds: (string | null)[] = []) => {
    setIsMediaModalOpen(false);
    setSelectedFiles(files);
    setPreviewUrls(urls);
    setSelectedExistingIds(existingIds);
    setAdditionalSkillsText('');
    setAnalysisError(null);
    setUploadStatus('preview');
  };

  const startAIProcessing = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user: liveUser } } = await supabase.auth.getUser();
    if (!session?.access_token || !liveUser) {
      setAnalysisError('ต้องเข้าสู่ระบบก่อนใช้งานฟีเจอร์นี้');
      return;
    }

    setAnalysisError(null);
    setUploadStatus('processing');
    setAnalysisView(null);
    setAnalysisError(null);
    setBatchProgress(null);
    setDuplicateNotices([]);
    setReuseNotices([]);
    // 1) เรียก Gemini วิเคราะห์ (ไฟล์จริง + ข้อความอาชีพที่สนใจ)
    let ai: SkillAnalysis | null = null;
    // ย่อรูปก่อนส่งให้ AI (ประหยัดโควต้า token + เร็วขึ้น ไฟล์ต้นฉบับยังอัปโหลดเต็มขนาด)
    // เอกสารตัวหนังสือใช้ 1600px เพื่อให้ AI อ่านข้อความในใบเซอร์ได้ชัด
    // หมายเหตุ: Vercel รับ body ได้ไม่เกิน ~4.5MB เลยย่อเหลือ 1024px คุณภาพ 0.8
    const downscaleImage = (file: File, maxSide = 1024): Promise<File> => {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          resolve(file);
          return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          if (scale >= 1) {
            URL.revokeObjectURL(url);
            resolve(file);
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(
            (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file),
            'image/jpeg',
            0.8,
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });
    };

    try {
      // แบ่งส่งทีละไม่เกิน 5 ไฟล์/รอบ (เลี่ยงลิมิต body ~4.5MB) แล้วรวมผล — รองรับสูงสุด 10 รูป
      const analyzable = selectedFiles.filter((f) => f.size > 0).slice(0, 10);
      const chunks: File[][] = [];
      for (let i = 0; i < analyzable.length; i += 5) chunks.push(analyzable.slice(i, i + 5));
      const batchResults: SkillAnalysis[] = [];
      for (const [ci, chunk] of chunks.entries()) {
        if (chunks.length > 1) setBatchProgress(`กำลังวิเคราะห์รอบที่ ${ci + 1}/${chunks.length}...`);
        const form = new FormData();
        // ส่งข้อความบริบทเฉพาะรอบแรก (กัน AI นับซ้ำ)
        form.append('interestText', ci === 0 ? additionalSkillsText : '');
        form.append('major', ci === 0 ? userProfile.major || '' : '');
        form.append('institution', ci === 0 ? userProfile.institution || '' : '');
        for (const f of chunk) {
          form.append('files', await downscaleImage(f), f.name);
        }
        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: form,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.status === 413) {
          throw new Error('ไฟล์รวมใหญ่เกินไป ลองลดจำนวนไฟล์ต่อรอบแล้วลองใหม่');
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as { error?: string; detail?: string };
          if (errBody.detail) console.error('AI analyze detail:', errBody.detail);
          throw new Error(errBody.error || `AI วิเคราะห์ไม่สำเร็จ (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!Array.isArray(data.skills)) {
          throw new Error('AI ตอบกลับไม่ถูกต้อง ลองใหม่อีกครั้ง');
        }
        const radarIn = (data.radar_scores ?? {}) as Partial<ScoreDimensions>;
        const technical = toScore100(radarIn.technical, toScore100(data.technical, 0));
        const soft = toScore100(radarIn.soft, toScore100(data.soft, 0));
        const management = toScore100(radarIn.management, toScore100(data.management, 0));
        const accuracy = toScore100(radarIn.accuracy, toScore100(data.accuracy, 0));
        const communication = toScore100(radarIn.communication, Math.round((technical + soft) / 2));
        const creativity = toScore100(radarIn.creativity, Math.round((soft + management) / 2));
        batchResults.push({
          skills: data.skills,
          career: data.career ?? null,
          careerEn: typeof data.careerEn === 'string' ? data.careerEn : null,
          careerCategory: typeof data.career_category === 'string' && data.career_category.trim() ? data.career_category.trim() : null,
          radarScores: { technical, soft, management, accuracy, communication, creativity },
          accuracy,
          technical,
          soft,
          management,
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          rawInput: null,
          textWarning: typeof data.textWarning === 'string' ? data.textWarning : null,
          skillNotes: {
            technical: typeof data.skillNotes?.technical === 'string' ? data.skillNotes.technical : null,
            soft: typeof data.skillNotes?.soft === 'string' ? data.skillNotes.soft : null,
            management: typeof data.skillNotes?.management === 'string' ? data.skillNotes.management : null,
            communication: typeof data.skillNotes?.communication === 'string' ? data.skillNotes.communication : null,
            creativity: typeof data.skillNotes?.creativity === 'string' ? data.skillNotes.creativity : null,
          },
          model: typeof data._model === 'string' ? data._model : null,
        });
      }
      // รวมผลทุกรอบ: ทักษะ union, คะแนนเฉลี่ย, คำแนะนำ/คำเตือนต่อกัน
      const avg = (nums: number[]) => (nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);
      const skillSeen = new Set<string>();
      ai = {
        skills: batchResults.flatMap((r) => r.skills).filter((s) => {
          const k = s.trim().toLowerCase();
          if (!k || skillSeen.has(k)) return false;
          skillSeen.add(k);
          return true;
        }).slice(0, 12),
        career: batchResults.map((r) => r.career).find((c) => !!c) ?? null,
        careerEn: batchResults.map((r) => r.careerEn).find((c) => !!c) ?? null,
        careerCategory: batchResults.map((r) => r.careerCategory).find((c) => !!c) ?? null,
        radarScores: {
          technical: avg(batchResults.map((r) => r.radarScores.technical)),
          soft: avg(batchResults.map((r) => r.radarScores.soft)),
          management: avg(batchResults.map((r) => r.radarScores.management)),
          accuracy: avg(batchResults.map((r) => r.radarScores.accuracy)),
          communication: avg(batchResults.map((r) => r.radarScores.communication)),
          creativity: avg(batchResults.map((r) => r.radarScores.creativity)),
        },
        accuracy: avg(batchResults.map((r) => r.accuracy)),
        technical: avg(batchResults.map((r) => r.technical)),
        soft: avg(batchResults.map((r) => r.soft)),
        management: avg(batchResults.map((r) => r.management)),
        recommendations: batchResults.flatMap((r) => r.recommendations).slice(0, 4),
        warnings: batchResults.flatMap((r) => r.warnings).slice(0, 6),
        rawInput: additionalSkillsText.trim() ? additionalSkillsText.trim() : null,
        textWarning: batchResults.map((r) => r.textWarning).find((t) => !!t) ?? null,
        skillNotes: {
          technical: batchResults.map((r) => r.skillNotes.technical).find((t) => !!t) ?? null,
          soft: batchResults.map((r) => r.skillNotes.soft).find((t) => !!t) ?? null,
          management: batchResults.map((r) => r.skillNotes.management).find((t) => !!t) ?? null,
          communication: batchResults.map((r) => r.skillNotes.communication ?? null).find((t) => !!t) ?? null,
          creativity: batchResults.map((r) => r.skillNotes.creativity ?? null).find((t) => !!t) ?? null,
        },
        model: batchResults.map((r) => r.model).find((m) => !!m) ?? null,
      };
    } catch (err) {
      // AI ล้มเหลว: กลับไปหน้า preview พร้อมข้อความ error — ไม่โชว์ mock ไม่เซฟค่าปลอม
      setUploadStatus('preview');
      setAnalysisError(err instanceof Error ? err.message : 'AI วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง');
      return;
    }
    // 2) บันทึกผลจริงลง DB (ai เป็น null ไม่ได้แล้วเพราะ return ไปก่อนถ้า AI ล้มเหลว)
    try {
      const { saveAnalysisReal } = await import('../../lib/storage');
      if (selectedFiles.length > 0 && ai) {
        let rows: PortfolioRow[] = [];
        try {
          rows = await fetchPortfolioRows(liveUser.id);
        } catch {
          rows = [];
        }
        rows = await ensurePortfolioHashes(liveUser.id, rows, schemaCaps.current.hash);
        const analysisPayload = {
          skills: ai.skills,
          career: ai.career,
          careerEn: ai.careerEn,
          careerCategory: ai.careerCategory,
          radarScores: ai.radarScores,
          accuracy: ai.accuracy,
          technical: ai.technical,
          soft: ai.soft,
          management: ai.management,
          recommendations: ai.recommendations,
          rawInput: ai.rawInput,
          warnings: ai.warnings,
          skillNotes: ai.skillNotes,
        };
        const handledHashes = new Set<string>();
        const duplicates: string[] = [];
        const reused: string[] = [];

        for (let idx = 0; idx < selectedFiles.length; idx++) {
          const f = selectedFiles[idx];
          const existingId = selectedExistingIds[idx] ?? null;
          try {
            if (existingId) {
              await saveAnalysisReal(liveUser.id, existingId, analysisPayload);
              continue;
            }

            if (f.size <= 0) continue;

            const hash = await computeFileSha256(f);

            if (handledHashes.has(hash)) {
              duplicates.push(`ไฟล์ “${f.name}” ซ้ำกับไฟล์อื่นในชุดที่เลือก — วิเคราะห์ครั้งเดียวพอ`);
              continue;
            }
            handledHashes.add(hash);

            // ไฟล์นี้มีอยู่ในคลังแล้ว (hash หรือชื่อไฟล์ตรงกัน) → ใช้รายการเดิม ไม่ insert แถวซ้ำ
            const localHashes = readLocalHashes();
            const existing = findDuplicate(rows, localHashes, f, hash);
            if (existing) {
              await saveAnalysisReal(liveUser.id, existing.id, analysisPayload);
              reused.push(
                `“${f.name}” มีอยู่ในคลังแล้ว (หมวด “${categoryFor(existing)}”) — ใช้ไฟล์เดิมในการวิเคราะห์`,
              );
              continue;
            }

            const row = await uploadPortfolioRow(liveUser.id, f, hash, {
              includeHash: schemaCaps.current.hash,
              includeCategory: schemaCaps.current.category,
              category: uploadCategory,
            });
            if (!schemaCaps.current.hash) writeLocalHash(row.id, hash);

            assignCategories([row.id], uploadCategory);
            rows = [
              {
                id: row.id,
                title: f.name,
                file_url: '',
                file_type: extOf(f.name, 'PDF').toUpperCase(),
                created_at: new Date().toISOString(),
                file_hash: schemaCaps.current.hash ? hash : null,
                category: uploadCategory,
              },
              ...rows,
            ];

            await saveAnalysisReal(liveUser.id, row.id, analysisPayload);
          } catch (err) {
            if (isUniqueViolation(err)) {
              let conflict: PortfolioRow | null = null;
              try {
                const freshRows = await fetchPortfolioRows(liveUser.id);
                rows = freshRows;
                conflict = findDuplicate(freshRows, readLocalHashes(), f, await computeFileSha256(f));
              } catch {
                conflict = null;
              }
              if (conflict) {
                // unique constraint ชนะการเช็คของเรา → ใช้แถวที่มีอยู่แล้วแทนการเพิ่มซ้ำ
                try {
                  await saveAnalysisReal(liveUser.id, conflict.id, analysisPayload);
                  reused.push(
                    `“${f.name}” มีอยู่ในคลังแล้ว (หมวด “${categoryFor(conflict)}”) — ใช้ไฟล์เดิมในการวิเคราะห์`,
                  );
                } catch {
                  duplicates.push(duplicateMessage(f.name, categoryFor(conflict)));
                }
              } else {
                duplicates.push(duplicateMessage(f.name, uploadCategory));
              }
            }
            // ไฟล์เดียวพัง ข้ามไปไฟล์ต่อไป
          }
        }

        setDuplicateNotices(duplicates);
        setReuseNotices(reused);
      }
    } catch {
      showCategoryNotice('error', 'บันทึกผลการวิเคราะห์ลงคลังไม่สำเร็จ — ยังดูผลวิเคราะห์ได้ตามปกติ');
    }
    const analyzedAt = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    if (ai) {
      setAnalysisView({
        analysis: ai,
        files: selectedFiles,
        analyzedAt,
        title: selectedFiles.length > 1 ? `${selectedFiles.length} ไฟล์` : selectedFiles[0]?.name ?? 'ผลการวิเคราะห์',
      });
    }
    setUploadStatus('success');
    setShowResultModal(true);
    refreshMyPortfolios();
    void loadAnalysisHistory();
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((f) => f.size <= MAX_FILE_BYTES);
      if (validFiles.length > 0) {
        const urls = validFiles.map(f => URL.createObjectURL(f));
        handleFilesSelected(validFiles, urls);
      } else {
        setDropError('ไฟล์ใหญ่เกิน 5MB ไม่รองรับ');
        setTimeout(() => setDropError(''), 5000);
      }
    }
  };

  const [dropError, setDropError] = useState('');

  const toggleGallerySelection = (fileData: CloudFile) => {
    setSelectedModalFiles((prev) => {
      const isAlreadySelected = prev.some((f) => f.id === fileData.id);
      return isAlreadySelected ? prev.filter((f) => f.id !== fileData.id) : [...prev, fileData];
    });
  };

  // เลือกทั้งหมวดที่กำลังดูอยู่ (ใน modal) เพื่อนำไปวิเคราะห์ทีเดียว
  const selectAllInModalCategory = () => {
    const cards: CloudFile[] = modalFiles.map((p) => ({
      id: `db-${p.id}`,
      title: p.title,
      type: p.file_type,
      imageUrl: p.file_url,
    }));
    if (cards.length === 0) return;

    setSelectedModalFiles((prev) => {
      const allSelected = cards.every((card) => prev.some((f) => f.id === card.id));
      if (allSelected) {
        return prev.filter((f) => !cards.some((card) => card.id === f.id));
      }
      const merged = [...prev];
      for (const card of cards) {
        if (!merged.some((f) => f.id === card.id)) merged.push(card);
      }
      return merged;
    });
  };

  const dbIdOf = (id: string | number): string | null => {
    const s = String(id);
    return s.startsWith('db-') ? s.slice(3) : null;
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const confirmGallerySelection = async () => {
    setModalError(null);
    // ดึงไฟล์จริงจาก URL ในคลัง (ห้ามส่ง File เปล่า ไม่งั้น AI ได้ 0 ไฟล์แล้วมโนทักษะจากสาขา)
    const files: File[] = [];
    const urls: string[] = [];
    const ids: (string | null)[] = [];
    for (const f of selectedModalFiles) {
      const real = await fetchUrlAsFile(f.imageUrl, f.title);
      if (real) {
        files.push(real);
        urls.push(f.imageUrl);
        ids.push(dbIdOf(f.id));
      }
    }
    if (files.length === 0) {
      setModalError('ดึงไฟล์จากคลังไม่สำเร็จ (ติด CORS หรือลิงก์เสีย) ลองเลือกไฟล์อื่น');
      return;
    }
    handleFilesSelected(files, urls, ids);
  };

  // ลากการ์ดจากคลัง: แนบข้อมูลรูปไปกับ drag event (รองรับหลายรูปที่เลือกไว้)
  const [gallerySelected, setGallerySelected] = useState<{ id: string; title: string; imageUrl: string; type: string }[]>([]);

  const toggleGalleryCard = (file: { id: string; title: string; imageUrl: string; type: string }) => {
    setGallerySelected((prev) =>
      prev.some((f) => f.id === file.id) ? prev.filter((f) => f.id !== file.id) : [...prev, file]
    );
  };

  // ส่งรูปที่เลือกในคลังเข้าขั้นตอนวิเคราะห์ (ดึง URL กลับมาเป็นไฟล์ + จำ id แถวเดิมไว้กันอัปโหลดซ้ำ)
  const sendGalleryToAnalysis = async (list: { id: string; title: string; imageUrl: string; type: string }[]) => {
    if (list.length === 0) return;
    setDropError('');
    const files: File[] = [];
    const urls: string[] = [];
    const ids: (string | null)[] = [];
    for (const item of list) {
      const f = await fetchUrlAsFile(item.imageUrl, item.title);
      if (f) {
        files.push(f);
        urls.push(item.imageUrl);
        ids.push(dbIdOf(item.id));
      }
    }
    if (files.length > 0) {
      setGallerySelected([]);
      handleFilesSelected(files, urls, ids);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setDropError('ดึงรูปจากคลังไม่สำเร็จ (ติด CORS) ให้กด “เลือกจากคลัง” แทน');
      setTimeout(() => setDropError(''), 5000);
    }
  };

  // ดึงรูปจาก URL (คลังของตัวเอง/unsplash ตัวอย่าง) กลับมาเป็น File เพื่อเข้าขั้นตอนวิเคราะห์
  const fetchUrlAsFile = async (imageUrl: string, title: string): Promise<File | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size > MAX_FILE_BYTES) return null;
      return new File([blob], title || 'gallery-image.jpg', { type: blob.type || 'image/jpeg' });
    } catch {
      return null;
    }
  };

  const handleMainDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDropError('');
    // รวมไฟล์จากทั้ง files และ items (บางเบราว์เซอร์ส่งมาทาง items)
    const fromFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0
      ? Array.from(e.dataTransfer.files)
      : [];
    const fromItems: File[] = [];
    if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) fromItems.push(f);
        }
      }
    }
    const seen = new Set<string>();
    const filesArray = [...fromFiles, ...fromItems].filter((f) => {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (filesArray.length === 0) {
      // วาง URL รูปจากเว็บ: ดึงกลับมาเป็นไฟล์ (รูปในคลังใช้วิธีคลิกเลือก + ปุ่มนำไปวิเคราะห์แทน)
      const metaRaw = e.dataTransfer.getData('application/x-portfolio');
      const uriList = e.dataTransfer.getData('text/uri-list');
      let meta: { title?: string; imageUrl?: string } = {};
      try {
        if (metaRaw) meta = JSON.parse(metaRaw);
      } catch {
        // ไม่ใช่การ์ดคลัง ข้ามไปใช้ URL ตรงๆ
      }
      const imageUrl = meta.imageUrl || (uriList ? uriList.split('\n')[0].trim() : '');
      if (imageUrl) {
        const file = await fetchUrlAsFile(imageUrl, meta.title || 'gallery-image.jpg');
        if (file) {
          handleFilesSelected([file], [imageUrl]);
          return;
        }
        setDropError('ดึงรูปจากคลังไม่สำเร็จ (ติด CORS) ให้กด “เลือกจากคลัง” แทน');
        setTimeout(() => setDropError(''), 5000);
        return;
      }
      setDropError('ลากรูปจากเว็บโดยตรงไม่ได้ ให้คลิกขวา > บันทึกรูปลงเครื่องก่อน แล้วค่อยลากไฟล์มาใส่');
      setTimeout(() => setDropError(''), 5000);
      return;
    }
    const validFiles = filesArray.filter((f) => f.size <= MAX_FILE_BYTES);
    if (validFiles.length > 0) {
      const urls = validFiles.map(f => URL.createObjectURL(f));
      handleFilesSelected(validFiles, urls);
    } else {
      setDropError('ไฟล์ใหญ่เกิน 5MB ไม่รองรับ');
      setTimeout(() => setDropError(''), 5000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // เพิ่มรูปจากเครื่องสู่คลังโดยตรง (ไม่ผ่านขั้นตอนวิเคราะห์)
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const handleGalleryDirectSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files).filter((f) => f.size <= MAX_FILE_BYTES);
    if (filesArray.length === 0) {
      setGalleryError('ไฟล์ใหญ่เกิน 5MB ไม่รองรับ');
      return;
    }
    setGallerySaving(true);
    setGalleryError(null);
    setDuplicateNotices([]);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const user = await getSessionUser();
      if (!user) {
        setGalleryError('ยังไม่ได้เข้าสู่ระบบจริง (บัญชีทดลอง) — ออกจากระบบแล้วสมัคร/เข้าสู่ระบบด้วยอีเมลรหัสผ่านก่อนเพิ่มรูป');
        return;
      }

      let rows = await fetchPortfolioRows(user.id);
      rows = await ensurePortfolioHashes(user.id, rows, schemaCaps.current.hash);
      const localHashes = readLocalHashes();
      const batchHashes = new Set<string>();
      const duplicates: string[] = [];
      let failed = 0;
      let firstErr = '';
      const newIds: string[] = [];

      for (const f of filesArray) {
        try {
          const hash = await computeFileSha256(f);

          if (batchHashes.has(hash)) {
            duplicates.push(`ไฟล์ “${f.name}” ซ้ำกับไฟล์อื่นในชุดที่เลือก — ไม่ได้อัปโหลดซ้ำ`);
            continue;
          }

          const duplicate = findDuplicate(rows, localHashes, f, hash);
          if (duplicate) {
            duplicates.push(duplicateMessage(f.name, categoryFor(duplicate)));
            continue;
          }

          batchHashes.add(hash);
          const row = await uploadPortfolioRow(user.id, f, hash, {
            includeHash: schemaCaps.current.hash,
            includeCategory: schemaCaps.current.category,
            category: uploadCategory,
          });
          if (!schemaCaps.current.hash) writeLocalHash(row.id, hash);
          newIds.push(row.id);
          rows = [
            {
              id: row.id,
              title: f.name,
              file_url: '',
              file_type: extOf(f.name, 'PDF').toUpperCase(),
              created_at: new Date().toISOString(),
              file_hash: schemaCaps.current.hash ? hash : null,
              category: uploadCategory,
            },
            ...rows,
          ];
        } catch (err) {
          if (isUniqueViolation(err)) {
            let conflict: PortfolioRow | null = null;
            try {
              const freshRows = await fetchPortfolioRows(user.id);
              conflict = findDuplicate(freshRows, readLocalHashes(), f, await computeFileSha256(f));
            } catch {
              conflict = null;
            }
            duplicates.push(duplicateMessage(f.name, conflict ? categoryFor(conflict) : uploadCategory));
          } else {
            if (!firstErr) firstErr = errText(err, 'ไม่ทราบสาเหตุ');
            failed++;
          }
        }
      }

      if (newIds.length > 0) {
        assignCategories(newIds, uploadCategory);
        setActiveCategory(uploadCategory);
      }
      setDuplicateNotices(duplicates);
      if (failed > 0) {
        setGalleryError(
          `เพิ่มได้บางไฟล์ (${filesArray.length - failed - duplicates.length}/${filesArray.length}) ที่เหลืออัปโหลดไม่สำเร็จ` +
          (firstErr ? ` — สาเหตุ: ${firstErr}` : ''),
        );
      }
      await refreshMyPortfolios();
    } catch (err) {
      setGalleryError(errText(err, 'เพิ่มรูปไม่สำเร็จ ลองใหม่อีกครั้ง'));
    } finally {
      setGallerySaving(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const removeLocalFiles = (ids: string[]) => {
    if (ids.length === 0) return;
    setMyPortfolios((prev) => prev.filter((file) => !ids.includes(file.id)));
    setCategoryMap((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    const stored = readCategoryMap();
    for (const id of ids) delete stored[id];
    writeCategoryMap(stored);
    setGallerySelected((prev) => prev.filter((item) => {
      const realId = dbIdOf(item.id);
      return !realId || !ids.includes(realId);
    }));
    setSelectedModalFiles((prev) => prev.filter((item) => {
      const realId = dbIdOf(item.id);
      return !realId || !ids.includes(realId);
    }));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const deletePortfolioFile = async (userId: string, file: PortfolioRow) => {
    const { error: rowError } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', file.id)
      .eq('user_id', userId);
    if (rowError) throw rowError;

    const path = storagePathFromPortfolioUrl(file.file_url);
    if (path) {
      const { error: storageError } = await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
      if (storageError) {
        throw new Error(`ลบข้อมูลแล้วแต่ลบไฟล์ใน Storage ไม่สำเร็จ: ${storageError.message}`);
      }
    }
  };

  const handleDeletePortfolio = async (file: PortfolioRow) => {
    if (!window.confirm(
      `ต้องการลบ “${file.title}” ออกจากคลังหรือไม่?\nการลบจะลบทั้งข้อมูลและไฟล์จริงและไม่สามารถย้อนกลับได้`,
    )) {
      return;
    }

    setBusyId(file.id);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const user = await getSessionUser();
      if (!user) {
        router.replace('/login?redirect=/main');
        return;
      }
      await deletePortfolioFile(user.id, file);
      removeLocalFiles([file.id]);
      showCategoryNotice('success', `ลบ “${file.title}” แล้ว`);
    } catch (err) {
      showCategoryNotice('error', `ลบไฟล์ไม่สำเร็จ: ${errText(err, 'ไม่ทราบสาเหตุ')}`);
    } finally {
      setBusyId(null);
    }
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSelectedExistingIds([]);
    setAnalysisError(null);
    setBatchProgress(null);
    setAnalysisView(null);
    setAdditionalSkillsText('');
    setUploadStatus('idle');
    setShowResultModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analysisViewForHistory = (item: AnalysisHistoryItem): AnalysisView => ({
    analysis: item.analysis,
    files: [new File([''], item.title, { type: 'application/octet-stream' })],
    analyzedAt: item.analyzedAt,
    title: item.title,
  });

  const selectHistoryItem = (item: AnalysisHistoryItem) => {
    setAnalysisView(analysisViewForHistory(item));
    setIsHistoryDrawerOpen(false);
  };

  const openHistoryFullModal = (item: AnalysisHistoryItem) => {
    setAnalysisView(analysisViewForHistory(item));
    setShowResultModal(true);
    setIsHistoryDrawerOpen(false);
  };

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAllVisibleItems = () => {
    const visibleIds = filteredPortfolios.slice(0, 6).map((file) => file.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const openBatchMoveModalWithSelectedIds = () => {
    const ids = selectedIds.filter((id): id is string => !!id);
    if (ids.length > 0) {
      openMoveModal(ids);
    }
  };

  const confirmDeleteSelectedIds = async () => {
    if (selectedIds.length === 0) return;
    const targets = myPortfolios.filter((file) => selectedIds.includes(file.id));
    if (targets.length === 0) {
      showCategoryNotice('error', 'กรุณาเลือกรายการก่อนลบ');
      return;
    }
    if (!window.confirm(
      `ต้องการลบ ${targets.length} รายการที่เลือกหรือไม่?\nการลบจะลบทั้งข้อมูลและไฟล์จริงและไม่สามารถย้อนกลับได้`,
    )) {
      return;
    }
    setBatchBusy(true);
    try {
      const { getSessionUser } = await import('../../lib/auth');
      const user = await getSessionUser();
      if (!user) {
        router.replace('/login?redirect=/main');
        return;
      }
      const deleted: string[] = [];
      let failed = 0;
      let firstError = '';
      for (const file of targets) {
        try {
          await deletePortfolioFile(user.id, file);
          deleted.push(file.id);
        } catch (err) {
          failed += 1;
          if (!firstError) firstError = errText(err, 'ไม่ทราบสาเหตุ');
        }
      }
      if (deleted.length > 0) removeLocalFiles(deleted);
      if (failed > 0) {
        showCategoryNotice('error', `ลบสำเร็จ ${deleted.length}/${targets.length} รายการ — ${firstError}`);
      } else {
        showCategoryNotice('success', `ลบ ${deleted.length} รายการออกจากคลังแล้ว`);
      }
      setSelectedIds([]);
    } catch (err) {
      showCategoryNotice('error', `ลบไฟล์ไม่สำเร็จ: ${errText(err, 'ไม่ทราบสาเหตุ')}`);
    } finally {
      setBatchBusy(false);
    }
  };

  const clearSelectedIds = () => {
    setSelectedIds([]);
    // Also close Escape key handling by resetting state
  };

  if (!authReady) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#f8f9fa]">
        <p className="text-sm font-bold text-slate-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </main>
    );
  }

  const activeAnalysis = analysisView?.analysis ?? null;
  const activeRadarScores = activeAnalysis?.radarScores ?? null;

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans relative overflow-x-hidden flex flex-col">
      <input type="file" multiple ref={fileInputRef} onChange={handleLocalFileSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
      <input type="file" multiple ref={galleryFileInputRef} onChange={handleGalleryDirectSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />

      <ResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        files={analysisView?.files ?? []}
        analysis={analysisView?.analysis ?? null}
        analyzedAt={analysisView?.analyzedAt ?? null}
      />

      {/* SLIDE-OVER DRAWER: ประวัติการวิเคราะห์ */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            type="button"
            aria-label="ปิดประวัติการวิเคราะห์"
            onClick={() => setIsHistoryDrawerOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">ประวัติการวิเคราะห์</h3>
                <p className="text-xs font-medium text-slate-500">ผลวิเคราะห์ 20 รายการล่าสุดจาก Supabase</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="ปิด"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
                  <p className="text-sm font-bold text-slate-600">กำลังโหลดประวัติการวิเคราะห์...</p>
                </div>
              ) : historyError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-red-700">⚠ {historyError}</p>
                  <button
                    type="button"
                    onClick={() => void loadAnalysisHistory()}
                    className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
                  >
                    ลองใหม่
                  </button>
                </div>
              ) : myHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                  <p className="text-sm font-bold text-slate-600">ยังไม่มีประวัติการวิเคราะห์</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">อัปโหลดผลงานแล้วกด “ให้ AI วิเคราะห์ทักษะ” เพื่อสร้างประวัติแรก</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {myHistory.map((item) => {
                    const a = item.analysis;
                    const careerLabel = a.career ?? a.careerEn ?? 'ไม่ระบุสายงาน';
                    return (
                      <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <button type="button" onClick={() => selectHistoryItem(item)} className="block w-full text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">{item.title}</p>
                              <p className="mt-0.5 truncate text-xs font-bold text-blue-700">{careerLabel}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">{item.skillsLabel}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">เทคนิค {a.radarScores.technical}/100</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">ทั่วไป {a.radarScores.soft}/100</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">บริหาร {a.radarScores.management}/100</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">แม่นยำ {a.radarScores.accuracy}/100</span>
                          </div>
                          <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item.analyzedAt}
                          </p>
                        </button>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => openHistoryFullModal(item)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
                          >
                            ดูฉบับเต็ม →
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MODAL เลือกไฟล์จากคลาวด์ */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[700px] max-h-[90vh]">
            <div className="px-6 pt-6 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-800">เลือกไฟล์จากคลาวด์</h3>
                  <p className="text-slate-500 text-sm mt-1">ดึงผลงานเดิมที่คุณเคยอัปโหลดไว้ มาวิเคราะห์ซ้ำได้ทันที (เลือกได้หลายไฟล์)</p>
                </div>
                <button onClick={() => { setModalError(null); setIsMediaModalOpen(false); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pb-4">
                {CATEGORY_FILTERS.map((category) => {
                  const count = countByCategory(category);
                  const active = modalCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setModalCategory(category)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {category} <span className={active ? 'text-blue-100' : 'text-slate-400'}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50 relative">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllInModalCategory}
                  disabled={modalFiles.length === 0}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                >
                  เลือกทั้งหมดในหมวดนี้ ({modalFiles.length})
                </button>
                {selectedModalFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedModalFiles([])}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-500 transition-colors hover:border-red-200 hover:text-red-600"
                  >
                    ล้างที่เลือก ({selectedModalFiles.length})
                  </button>
                )}
              </div>

              {myPortfolios.length === 0 ? (
                <p className="py-16 text-sm font-bold text-slate-400 text-center">ยังไม่มีไฟล์ในคลัง<br />เพิ่มรูปจากเครื่องก่อน แล้วค่อยกลับมาเลือกที่นี่</p>
              ) : modalFiles.length === 0 ? (
                <p className="py-16 text-sm font-bold text-slate-400 text-center">
                  ยังไม่มีไฟล์ในหมวด “{modalCategory}”<br />เลือกหมวดอื่น หรือย้ายไฟล์เข้าหมวดนี้ก่อน
                </p>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                {modalFiles.map((p) => {
                  const file = { id: `db-${p.id}`, title: p.title, type: p.file_type, imageUrl: p.file_url };
                  const isSelected = selectedModalFiles.some((f) => f.id === file.id);
                  const category = categoryFor(p);
                  return (
                    <div key={file.id} onClick={() => toggleGallerySelection(file)} className={`group cursor-pointer bg-white rounded-xl border-2 transition-all overflow-hidden relative ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'}`}>
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white p-1 rounded-full shadow-md animate-in zoom-in duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                        <div className="absolute top-2 left-2 z-10 bg-white/95 px-2 py-1 rounded text-[10px] font-extrabold text-slate-800 shadow-sm">{file.type}</div>
                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <span className="inline-block max-w-full truncate rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-extrabold text-white backdrop-blur">
                            {category}
                          </span>
                        </div>
                        {/^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.type) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.imageUrl} alt={file.title} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105 opacity-90' : 'group-hover:scale-105'}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <h4 className={`font-bold text-xs truncate transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{file.title}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
              {modalError && (
                <p className="mb-4 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">⚠ {modalError}</p>
              )}
              {selectedModalFiles.length > 0 && (
                <div className="sticky bottom-6 mx-auto w-fit bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
                  <span className="text-white font-medium text-sm whitespace-nowrap">เลือกแล้ว <span className="font-extrabold text-blue-400">{selectedModalFiles.length}</span> รายการ</span>
                  <button onClick={confirmGallerySelection} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-sm transition-all active:scale-95 whitespace-nowrap">ยืนยันการนำเข้า</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {moveModalIds.length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
          onClick={closeMoveModal}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-category-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="move-category-modal-title" className="text-xl font-black text-slate-900">
                  ย้ายหมวดหมู่ไฟล์
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  กำลังย้าย {moveModalIds.length} รายการ
                </p>
              </div>
              <button
                type="button"
                onClick={closeMoveModal}
                disabled={moveModalBusy}
                aria-label="ปิดหน้าต่างย้ายหมวดหมู่"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {moveModalError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {moveModalError}
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="เลือกหมวดหมู่ปลายทาง">
              {GALLERY_CATEGORIES.map((category) => {
                const selected = moveModalCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMoveModalCategory(category)}
                    disabled={moveModalBusy}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/15'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <span className="text-sm font-extrabold text-slate-700">{category}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeMoveModal}
                disabled={moveModalBusy}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => { void confirmMoveCategories(); }}
                disabled={!moveModalCategory || moveModalBusy}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {moveModalBusy ? 'กำลังย้าย...' : 'ยืนยันการย้ายหมวดหมู่'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= เนื้อหาหลัก (Main Content) ================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 flex flex-col h-full w-full py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">วิเคราะห์ทักษะด้วย AI</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">อัปโหลดผลงานแล้วให้ AI สรุปทักษะ 6 มิติและสายอาชีพที่เหมาะกับคุณ</p>
          </div>
          <button
            type="button"
            onClick={openHistoryDrawer}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ประวัติการวิเคราะห์
          </button>
        </div>

        <section className="relative w-full flex-shrink-0">
          <div
            onDragOver={uploadStatus === 'idle' ? handleDragOver : undefined}
            onDragLeave={uploadStatus === 'idle' ? handleDragLeave : undefined}
            onDrop={uploadStatus === 'idle' ? handleMainDrop : undefined}
            className={`relative z-10 rounded-[2rem] px-6 py-10 flex flex-col items-center justify-center transition-all duration-500 ease-out border-[3px] border-dashed w-full ${uploadStatus === 'idle' ? (isDragging ? 'bg-blue-50/90 border-blue-500 scale-[1.01] shadow-[0_20px_50px_-20px_rgba(37,99,235,0.45)]' : 'bg-white border-slate-300/80 hover:border-blue-400 shadow-[0_8px_30px_rgba(15,23,42,0.04)]') : 'bg-white border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.05)] border-solid'}`}
          >
            {uploadStatus === 'idle' && (
              <>
                <div className={`w-16 h-16 flex items-center justify-center rounded-full mb-6 transition-all duration-300 flex-shrink-0 ${isDragging ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-blue-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                </div>
                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">นำเข้าผลงานของคุณเพื่อวิเคราะห์ทักษะ</h3>
                <p className="text-base text-slate-500 mb-8 text-center flex-shrink-0">{isDragging ? 'ปล่อยเมาส์เพื่ออัปโหลดไฟล์เลย!' : 'ลากไฟล์มาวางที่นี่ หรือเลือกวิธีนำเข้าด้านล่าง'}</p>

                <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    อัปโหลดจากคอมพิวเตอร์ของคุณ
                  </button>
                  <button onClick={openMediaModal} className="px-6 py-3.5 bg-white text-blue-600 border border-slate-200 hover:bg-slate-50 rounded-full font-bold text-base transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    เลือกจากคลัง
                  </button>
                </div>
                <span className="mt-8 text-sm font-medium text-slate-400">รองรับการเลือกไฟล์ PDF, JPG, PNG (Max 5MB)</span>
                {dropError && <p className="mt-3 text-sm font-bold text-red-500 text-center max-w-lg">{dropError}</p>}
              </>
            )}

            {uploadStatus === 'preview' && (
              <div className="flex flex-col items-center animate-in fade-in duration-300 w-full px-4 sm:px-8 py-4">
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center">ตรวจสอบและให้ข้อมูลเพิ่มเติม</h3>
                <p className="text-base text-slate-500 mb-8 text-center max-w-lg">พิมพ์ทักษะที่เกี่ยวข้องกับผลงานนี้ เพื่อให้ AI วิเคราะห์ทักษะได้แม่นยำยิ่งขึ้นแม้ไม่มีในเอกสาร</p>

                <div className="flex gap-4 overflow-x-auto w-full max-w-3xl mb-8 pb-4 px-2 justify-center custom-scrollbar">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-2xl mb-10">
                  <label className="block text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" /><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" /></svg>
                    เพิ่มทักษะ รายละเอียด หรืออาชีพที่คุณสนใจ (ถ้ามี)
                  </label>
                  <textarea
                    value={additionalSkillsText}
                    onChange={(e) => setAdditionalSkillsText(e.target.value)}
                    placeholder="เช่น อยากเป็น Data Scientist มีทักษะเขียนโปรแกรม React, Node.js จากการทำโปรเจกต์ แต่ยังไม่มีใบเซอร์รับรอง... AI จะใช้เป้าหมายนี้ประเมินความพร้อมให้"
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none h-32 text-slate-700 placeholder:text-slate-400 transition-all shadow-inner"
                  />
                  <p className="text-xs font-medium text-slate-400 mt-2">AI จะอ่านอาชีพที่สนใจจากช่องนี้ไปประเมินร่วมกับผลงานที่อัปโหลด</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                  <button onClick={resetUpload} className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-base transition-all active:scale-95">ยกเลิก</button>
                  <button onClick={startAIProcessing} className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    ให้ AI วิเคราะห์ทักษะ
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                </div>
                {analysisError && (
                  <p className="mt-4 max-w-md text-center text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠ {analysisError}</p>
                )}
              </div>
            )}

            {uploadStatus === 'processing' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 overflow-hidden flex-shrink-0 w-full py-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">AI กำลังวิเคราะห์เอกสาร {selectedFiles.length} รายการ...</h3>
                {batchProgress && <p className="text-sm font-bold text-blue-600 text-center">{batchProgress}</p>}
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 flex-shrink-0 w-full py-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-6 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 text-center flex-shrink-0">วิเคราะห์ {selectedFiles.length} รายการเสร็จสมบูรณ์!</h3>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                  <button onClick={() => setShowResultModal(true)} className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-lg active:scale-95">
                    ดูผลการวิเคราะห์อีกครั้ง
                  </button>
                  <button onClick={resetUpload} className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-base transition-all active:scale-95">
                    วิเคราะห์ไฟล์เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {duplicateNotices.length > 0 && (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <div className="flex items-start justify-between gap-3">
              <ul className="space-y-1">
                {duplicateNotices.map((message, index) => (
                  <li key={`${message}-${index}`}>⚠ {message}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setDuplicateNotices([])}
                className="shrink-0 rounded-full px-2 py-0.5 text-amber-900/70 hover:bg-amber-100"
                aria-label="ปิดข้อความแจ้งเตือนไฟล์ซ้ำ"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {reuseNotices.length > 0 && (
          <div className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            <div className="flex items-start justify-between gap-3">
              <ul className="space-y-1">
                {reuseNotices.map((message, index) => (
                  <li key={`${message}-${index}`}>♻ {message}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setReuseNotices([])}
                className="shrink-0 rounded-full px-2 py-0.5 text-blue-900/70 hover:bg-blue-100"
                aria-label="ปิดข้อความแจ้งเตือนการใช้ไฟล์เดิม"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {analysisView && activeAnalysis && activeRadarScores && (
          <section className="w-full space-y-6">
            <CareerMatchBanner
              career={activeAnalysis.career}
              careerEn={activeAnalysis.careerEn}
              meta={[
                analysisView.analyzedAt ? `วิเคราะห์เมื่อ ${analysisView.analyzedAt}` : null,
                `${analysisView.files.length} ไฟล์: ${analysisView.files.map((f) => f.name).join(', ')}`,
              ].filter(Boolean).join(' · ')}
              action={
                <button
                  type="button"
                  onClick={() => setShowResultModal(true)}
                  className="inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  ดูผลฉบับเต็ม
                </button>
              }
            />
            <AnalysisRadarGrid scores={activeRadarScores} skillNotes={activeAnalysis.skillNotes} chartSize={380} />
            <DetectedSkillsCloud skills={activeAnalysis.skills} />
          </section>
        )}

        {/* --- คลังผลงาน --- */}
        <section className="flex flex-col flex-grow pb-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex-shrink-0">คลังรูปภาพของฉัน</h2>
              <Link href="/gallery" className="text-sm font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap">
                ดูรูปทั้งหมด ({myPortfolios.length}) →
              </Link>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-xs">
                <span className="text-xs sm:text-sm font-semibold text-slate-700">หมวดหมู่:</span>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as GalleryCategory)}
                  className="h-full cursor-pointer appearance-auto bg-transparent text-sm font-semibold text-blue-700 focus:outline-none"
                >
                  {PORTFOLIO_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode((value) => !value);
                  setGallerySelected([]);
                  setSelectedIds([]);
                }}
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-bold transition-all shadow-sm whitespace-nowrap border ${
                  selectionMode
                    ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {selectionMode ? 'เสร็จสิ้น' : 'เลือกรายการ'}
              </button>
              <button onClick={() => galleryFileInputRef.current?.click()} disabled={gallerySaving} className="inline-flex h-10 items-center rounded-full bg-blue-600 px-4 text-sm font-bold text-white transition-all shadow-sm whitespace-nowrap hover:bg-blue-700 disabled:opacity-60">
                {gallerySaving ? 'กำลังเพิ่มลงคลัง...' : '+ เพิ่มรูปสู่คลัง'}
              </button>
            </div>
          </div>
          {categoryNotice && (
            <p
              role="status"
              aria-live="polite"
              className={`mb-6 rounded-xl border px-4 py-3 text-xs font-bold ${
                categoryNotice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {categoryNotice.message}
            </p>
          )}
          {galleryError && (
            <p className="mb-6 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠ {galleryError}</p>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((category) => {
              const count = category === ALL_CATEGORY
                ? myPortfolios.length
                : myPortfolios.filter((file) => categoryFor(file) === category).length;
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-xs font-extrabold transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {category} <span className={active ? 'text-blue-100' : 'text-slate-400'}>({count})</span>
                </button>
              );
            })}
          </div>

          {selectedIds.length > 0 && (
            <div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 sm:gap-4"
            >
              <span className="text-white font-medium text-sm whitespace-nowrap">เลือกอยู่ {selectedIds.length} รายการ</span>
              <button
                type="button"
                onClick={selectAllVisibleItems}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors hover:bg-white/10"
                aria-label="เลือกทั้งหมดในหน้านี้"
              >
                เลือกทั้งหมดในหน้านี้
              </button>
              <button
                type="button"
                onClick={openBatchMoveModalWithSelectedIds}
                disabled={batchBusy}
                className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                aria-label="ย้ายหมวดหมู่ที่เลือก"
              >
                ย้ายหมวดหมู่ที่เลือก ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={confirmDeleteSelectedIds}
                disabled={batchBusy}
                className="px-4 py-2 rounded-full border border-red-200 bg-white text-red-600 font-bold text-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                aria-label="ลบรูปที่เลือก"
              >
                ลบรูปที่เลือก ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={clearSelectedIds}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="ล้างการเลือก"
              >
                ✕
              </button>
            </div>
          )}

          {!selectionMode && gallerySelected.length > 0 && (
            <div className="mb-6 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4">
              <span className="text-white font-medium text-sm whitespace-nowrap">เลือกแล้ว <span className="font-extrabold text-blue-400">{gallerySelected.length}</span> รายการ (คลิกการ์ดเพื่อเลือกเพิ่ม)</span>
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setGallerySelected([])} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm transition-all whitespace-nowrap">ล้าง</button>
                <button onClick={() => sendGalleryToAnalysis(gallerySelected)} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-sm transition-all active:scale-95 whitespace-nowrap">นำไปวิเคราะห์ →</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredPortfolios.length > 0 ? (
              filteredPortfolios.slice(0, 6).map((file) => {
              const card = { id: `db-${file.id}`, title: file.title, imageUrl: file.file_url, type: file.file_type };
              const analysisSelected = gallerySelected.some((f) => f.id === card.id);
              const manageSelected = selectedIds.includes(file.id);
              const highlighted = selectionMode ? manageSelected : analysisSelected;
              return (
              <div key={file.id} onClick={() => (selectionMode ? toggleSelectedId(file.id) : toggleGalleryCard(card))} title={selectionMode ? 'คลิกเพื่อเลือก/ยกเลิกรายการ' : 'คลิกเพื่อเลือกหลายรูป'} className={`group bg-white rounded-3xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)] border-2 transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0 cursor-pointer relative ${highlighted ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100'}`}>
                {highlighted && (
                  <div className="absolute top-3 right-3 z-20 bg-blue-600 text-white p-1.5 rounded-full shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  </div>
                )}
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-extrabold text-slate-800 shadow-sm flex-shrink-0">{file.file_type}</div>
                  {/^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.file_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.file_url} alt={file.title} draggable={false} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out flex-shrink-0 pointer-events-none" />
                  ) : (
                    <a href={file.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-[10px] font-extrabold text-slate-400">แตะเพื่อเปิดไฟล์</span>
                    </a>
                  )}
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-grow flex-shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-xl truncate flex-shrink-0" title={file.title}>{file.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 mb-3 flex-shrink-0">Uploaded on {new Date(file.created_at).toLocaleDateString()}</p>

                  {selectionMode && (
                    <label
                      className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-extrabold text-slate-600"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={manageSelected}
                        onChange={() => toggleSelectedId(file.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      เลือกรายการนี้
                    </label>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    <span
                      className="max-w-full truncate rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700"
                      title={`หมวดหมู่ปัจจุบัน: ${categoryFor(file)}`}
                    >
                      {categoryFor(file)}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openSingleMoveModal(file)}
                        aria-label={`ย้ายหมวดหมู่ของ ${file.title}`}
                        title="ย้ายหมวดหมู่"
                        className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-blue-700 transition-colors hover:bg-blue-50"
                      >
                        ย้ายหมวด
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDeletePortfolio(file); }}
                        disabled={busyId === file.id}
                        aria-label={`ลบ ${file.title}`}
                        title="ลบไฟล์นี้"
                        className="shrink-0 rounded-full border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
              })
            ) : (
              <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">
                  {myPortfolios.length === 0
                    ? 'ยังไม่มีไฟล์ในคลัง — กด “+ เพิ่มรูปจากเครื่องสู่คลัง” หรืออัปโหลดด้านบนเพื่อเริ่มต้น'
                    : `ยังไม่มีไฟล์ในหมวด “${activeCategory}” — เลือกหมวดอื่นหรือย้ายไฟล์เข้าหมวดนี้`}
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}