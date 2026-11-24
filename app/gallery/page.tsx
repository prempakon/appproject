'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { MyPortfolioRow } from '../../lib/profiles';
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

// หมวดหมู่ + ตัวกรองทั้งหมดมาจาก lib/portfolio.ts (single source of truth)
const GALLERY_CATEGORIES = PORTFOLIO_CATEGORY_OPTIONS;
type GalleryCategory = PortfolioCategory;
const ALL_CATEGORY = ALL_PORTFOLIO_CATEGORY;
type CategoryFilter = PortfolioCategoryFilter;
const CATEGORY_FILTERS: readonly CategoryFilter[] = PORTFOLIO_CATEGORIES;

const CATEGORY_STORAGE_KEY = 'lru_portfolio_categories_v1';
const HASH_STORAGE_KEY = 'lru_portfolio_hashes_v1';
const MAX_FILE_BYTES = MAX_PORTFOLIO_FILE_BYTES;

type GalleryRow = MyPortfolioRow & {
  category?: string | null;
  file_hash?: string | null;
};

type Notice = { type: 'success' | 'error'; message: string } | null;

function asGalleryCategory(value: unknown): GalleryCategory | null {
  return isPortfolioCategory(value) ? value : null;
}

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
      const category = asGalleryCategory(value);
      if (category) result[id] = category;
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

async function fetchPortfolioRows(userId: string): Promise<GalleryRow[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GalleryRow[];
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

function findDuplicate(rows: GalleryRow[], localHashes: Record<string, string>, file: File, hash: string) {
  const byHash = rows.find(
    (row) => (row.file_hash && row.file_hash === hash) || localHashes[row.id] === hash,
  );
  if (byHash) return byHash;
  const targetName = file.name.trim().toLowerCase();
  return rows.find((row) => row.title.trim().toLowerCase() === targetName) ?? null;
}

function duplicateMessage(fileName: string, category: string) {
  return `ไฟล์ “${fileName}” มีอยู่แล้วในหมวด “${category}” — ไม่ได้อัปโหลดซ้ำ`;
}

export default function GalleryPage() {
  const router = useRouter();
  const [files, setFiles] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');
  const [duplicateNotices, setDuplicateNotices] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [uploading, setUploading] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, GalleryCategory>>({});
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(ALL_CATEGORY);
  const [uploadCategory, setUploadCategory] = useState<GalleryCategory>('ผลงาน / โปรเจกต์');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveModalIds, setMoveModalIds] = useState<string[]>([]);
  const [moveModalCategory, setMoveModalCategory] = useState<GalleryCategory | null>(null);
  const [moveModalBusy, setMoveModalBusy] = useState(false);
  const [moveModalError, setMoveModalError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schemaCaps = useRef({ hash: false, category: false });
  const noticeTimer = useRef<number | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [selectedIds]);

  const hydrateCategories = (rows: GalleryRow[]) => {
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
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getSessionUser } = await import('../../lib/auth');
        const user = await getSessionUser();
        if (cancelled) return;

        if (!user) {
          router.replace('/login?redirect=/gallery');
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

        const rows = await fetchPortfolioRows(user.id);
        if (cancelled) return;

        setFiles(rows);
        hydrateCategories(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'โหลดข้อมูลคลังไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const categoryFor = (file: GalleryRow): GalleryCategory =>
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
      showNotice('error', 'กรุณาเลือกรายการก่อนย้ายหมวดหมู่');
      return;
    }
    setMoveModalIds(uniqueIds);
    setMoveModalCategory(null);
    setMoveModalError(null);
    setMoveModalBusy(false);
  };

  const openSingleMoveModal = (file: GalleryRow) => {
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
        router.replace('/login?redirect=/gallery');
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
      showNotice('success', `ย้าย ${ids.length} รายการไปยังหมวด “${category}” แล้ว`);
    } catch (err) {
      setMoveModalError(`ย้ายหมวดหมู่ไม่สำเร็จ: ${err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ'}`);
    } finally {
      setMoveModalBusy(false);
    }
  };

  const filteredFiles = files.filter(
    (file) => activeCategory === ALL_CATEGORY || categoryFor(file) === activeCategory,
  );

  const removeLocalFiles = (ids: string[]) => {
    if (ids.length === 0) return;
    setFiles((prev) => prev.filter((file) => !ids.includes(file.id)));
    setCategoryMap((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    const stored = readCategoryMap();
    for (const id of ids) delete stored[id];
    writeCategoryMap(stored);
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const deletePortfolioFile = async (userId: string, file: GalleryRow) => {
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

  const handleDelete = async (file: GalleryRow) => {
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
        router.replace('/login?redirect=/gallery');
        return;
      }
      await deletePortfolioFile(user.id, file);
      removeLocalFiles([file.id]);
      showNotice('success', `ลบ “${file.title}” แล้ว`);
    } catch (err) {
      showNotice('error', `ลบไฟล์ไม่สำเร็จ: ${err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ'}`);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    ));
  };

  const selectAllVisible = () => {
    const visibleIds = filteredFiles.map((file) => file.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const openBatchMoveModal = () => {
    openMoveModal(selectedIds);
  };

  const confirmDeleteSelectedIds = async () => {
    if (selectedIds.length === 0) return;
    const targets = files.filter((file) => selectedIds.includes(file.id));
    if (targets.length === 0) {
      showNotice('error', 'กรุณาเลือกรายการก่อนลบ');
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
        router.replace('/login?redirect=/gallery');
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
          if (!firstError) firstError = err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ';
        }
      }
      if (deleted.length > 0) removeLocalFiles(deleted);
      if (failed > 0) {
        showNotice('error', `ลบสำเร็จ ${deleted.length}/${targets.length} รายการ — ${firstError}`);
      } else {
        showNotice('success', `ลบ ${deleted.length} รายการออกจากคลังแล้ว`);
      }
      setSelectedIds([]);
    } catch (err) {
      showNotice('error', `ลบไฟล์ไม่สำเร็จ: ${err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ'}`);
    } finally {
      setBatchBusy(false);
    }
  };

  const clearSelectedIds = () => {
    setSelectedIds([]);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const selected = Array.from(event.target.files);
    const validFiles = selected.filter((file) => file.size <= MAX_FILE_BYTES);
    if (validFiles.length === 0) {
      setError('ไฟล์ใหญ่เกิน 5MB ไม่รองรับ');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    setDuplicateNotices([]);

    try {
      const { getSessionUser } = await import('../../lib/auth');
      const user = await getSessionUser();

      if (!user) {
        router.replace('/login?redirect=/gallery');
        return;
      }

      let rows = await fetchPortfolioRows(user.id);
      const localHashes = readLocalHashes();
      const newFileHashes = new Map<string, string>();
      for (const file of validFiles) {
        if (file.size > 0) {
          newFileHashes.set(file.name, await computeFileSha256(file));
        }
      }

      const legacyHashCache = new Map<string, string>();
      const backfillRowHash = async (row: GalleryRow): Promise<string | null> => {
        if (row.file_hash) return row.file_hash;
        const cached = legacyHashCache.get(row.id);
        if (cached) return cached;
        if (!row.file_url) return null;
        try {
          const res = await fetch(row.file_url);
          if (!res.ok) return null;
          const blob = await res.blob();
          const hash = await computeFileSha256(
            new File([blob], row.title || 'file.jpg', { type: blob.type || 'image/jpeg' }),
          );
          legacyHashCache.set(row.id, hash);
          try {
            await supabase
              .from('portfolios')
              .update({ file_hash: hash })
              .eq('id', row.id)
              .eq('user_id', user.id);
          } catch {
            // ข้ามถ้าอัปเดต DB ล้มเหลว
          }
          const index = rows.findIndex((item) => item.id === row.id);
          if (index >= 0) rows[index] = { ...rows[index], file_hash: hash };
          return hash;
        } catch {
          return null;
        }
      };

      const batchHashes = new Set<string>();
      const duplicates: string[] = [];
      const newIds: string[] = [];
      let failed = 0;
      let firstError = '';

      for (const file of validFiles) {
        const hash = newFileHashes.get(file.name) || (await computeFileSha256(file));

        if (batchHashes.has(hash)) {
          duplicates.push(`ไฟล์ “${file.name}” ซ้ำกับไฟล์อื่นในชุดที่เลือก — ไม่ได้อัปโหลดซ้ำ`);
          continue;
        }

        for (const row of rows) {
          if (!row.file_hash && row.file_url) await backfillRowHash(row);
        }

        const duplicate = findDuplicate(rows, localHashes, file, hash);
        if (duplicate) {
          duplicates.push(duplicateMessage(file.name, categoryFor(duplicate)));
          continue;
        }

        const normalizedNew = file.name.toLowerCase().replace(/^\d+[-_]/, '');
        const nameDuplicate = rows.find(
          (row) =>
            row.category &&
            (row.title || '').toLowerCase().replace(/^\d+[-_]/, '') === normalizedNew,
        );
        if (nameDuplicate) {
          duplicates.push(duplicateMessage(file.name, nameDuplicate.category || categoryFor(nameDuplicate)));
          continue;
        }

        try {
          batchHashes.add(hash);
          const row = await uploadPortfolioRow(user.id, file, hash, {
            includeHash: schemaCaps.current.hash,
            includeCategory: schemaCaps.current.category,
            category: uploadCategory,
          });
          if (!schemaCaps.current.hash) writeLocalHash(row.id, hash);
          newIds.push(row.id);
          rows = [
            {
              id: row.id,
              title: file.name,
              file_url: '',
              file_type: extOf(file.name, 'PDF').toUpperCase(),
              created_at: new Date().toISOString(),
              file_hash: schemaCaps.current.hash ? hash : null,
              category: uploadCategory,
            },
            ...rows,
          ];
        } catch (err) {
          if (isUniqueViolation(err)) {
            let conflict: GalleryRow | null = null;
            try {
              const freshRows = await fetchPortfolioRows(user.id);
              conflict = findDuplicate(freshRows, readLocalHashes(), file, hash);
            } catch {
              conflict = null;
            }
            duplicates.push(duplicateMessage(file.name, conflict ? categoryFor(conflict) : uploadCategory));
          } else {
            failed += 1;
            if (!firstError) firstError = err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ';
          }
        }
      }

      if (newIds.length > 0) {
        assignCategories(newIds, uploadCategory);
        setActiveCategory(uploadCategory);
      }

      setDuplicateNotices(duplicates);

      if (failed > 0) {
        setError(
          `อัปโหลดไม่สำเร็จ ${failed}/${validFiles.length} ไฟล์` +
          (firstError ? ` — สาเหตุ: ${firstError}` : ''),
        );
      }

      const refreshedRows = await fetchPortfolioRows(user.id);
      setFiles(refreshedRows);
      hydrateCategories(refreshedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f9ff]">
        <p className="text-sm font-bold text-slate-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-800">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleUpload}
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />

        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Portfolio Library</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">คลังรูปภาพของฉัน</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              จัดหมวดหมู่เกียรติบัตร ผลงาน กิจกรรม และเอกสารอื่น ๆ ของคุณ — ทั้งหมด {files.length} ไฟล์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4 text-blue-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
              <select
  value={uploadCategory}
  onChange={(e) => setUploadCategory(e.target.value as GalleryCategory)}
  className="appearance-auto cursor-pointer text-sm font-semibold text-blue-700 bg-transparent focus:outline-none"
>
  {GALLERY_CATEGORIES.map((category) => (
    <option key={category} value={category}>{category}</option>
  ))}
</select>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? 'กำลังอัปโหลด...' : '+ เพิ่มไฟล์เข้าคลัง'}
            </button>
            <Link
              href="/main"
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
          </p>
        )}

        {duplicateNotices.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
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

        {notice && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((category) => {
            const count = category === ALL_CATEGORY
              ? files.length
              : files.filter((file) => categoryFor(file) === category).length;
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectionMode((value) => !value);
              setSelectedIds([]);
            }}
            className={`rounded-full border px-4 py-2 text-xs font-extrabold transition-colors ${
              selectionMode
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {selectionMode ? 'เสร็จสิ้น' : 'เลือกรายการ'}
          </button>

        </div>

          {selectedIds.length > 0 && (
            <div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 sm:gap-4"
            >
              <span className="text-white font-medium text-sm whitespace-nowrap">เลือกอยู่ {selectedIds.length} รายการ</span>
              <button
                type="button"
                onClick={selectAllVisible}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors hover:bg-white/10"
                aria-label="เลือกทั้งหมดในหน้านี้"
              >
                เลือกทั้งหมดในหน้านี้
              </button>
              <button
                type="button"
                onClick={openBatchMoveModal}
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

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-black text-slate-700">
              {files.length === 0
                ? 'ยังไม่มีไฟล์ในคลัง — กด “+ เพิ่มไฟล์เข้าคลัง” เพื่อเริ่มต้น'
                : `ยังไม่มีไฟล์ในหมวด “${activeCategory}”`}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              เลือกหมวดหมู่อื่น หรือย้ายไฟล์เข้าหมวดนี้จากตัวเลือกบนการ์ดแต่ละใบ
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => {
              const category = categoryFor(file);
              const isImage = /^(JPG|JPEG|PNG|GIF|WEBP)$/i.test(file.file_type);
              return (
                <article
                  key={file.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-slate-700 shadow-sm">
                      {file.file_type}
                    </span>
                    <span className="absolute bottom-3 left-3 z-10 rounded-full bg-slate-900/80 px-3 py-1.5 text-[10px] font-extrabold text-white backdrop-blur">
                      {category}
                    </span>
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.file_url} alt={file.title} className="h-full w-full object-cover" />
                    ) : (
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 transition-colors hover:bg-blue-50/50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-slate-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="text-[10px] font-extrabold text-slate-400">แตะเพื่อเปิดไฟล์</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="truncate text-base font-black text-slate-900" title={file.title}>
                      {file.title}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      Uploaded on {new Date(file.created_at).toLocaleDateString()}
                    </p>

                    {selectionMode && (
                      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-extrabold text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(file.id)}
                          onChange={() => toggleSelected(file.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />
                        เลือกรายการนี้
                      </label>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className="max-w-full truncate rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700"
                        title={`หมวดหมู่ปัจจุบัน: ${category}`}
                      >
                        {category}
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
                          onClick={() => { void handleDelete(file); }}
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
                </article>
              );
            })}
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
      </main>
    </div>
  );
}
