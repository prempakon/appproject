// Shared source of truth for `public.portfolios` categories + deduplication.
// ใช้ร่วมกันทุกหน้า/ทุก modal เพื่อไม่ให้แต่ละที่มีรายการหมวดหมู่หรือสูตร SHA-256 ต่างกัน

export const ALL_PORTFOLIO_CATEGORY = 'ทั้งหมด' as const;

// หมวดหมู่จริงที่บันทึกลงคอลัมน์ `category` (ไม่รวมตัวกรอง "ทั้งหมด")
export const PORTFOLIO_CATEGORY_OPTIONS = [
  'เกียรติบัตร / ใบรับรอง',
  'ผลงาน / โปรเจกต์',
  'กิจกรรม / อบรม',
  'เอกสารอื่นๆ',
] as const;

// ลำดับแท็บตัวกรองมาตรฐาน: "ทั้งหมด" + 4 หมวดจริง
export const PORTFOLIO_CATEGORIES = [
  ALL_PORTFOLIO_CATEGORY,
  ...PORTFOLIO_CATEGORY_OPTIONS,
] as const;

export type PortfolioCategory = (typeof PORTFOLIO_CATEGORY_OPTIONS)[number];
export type PortfolioCategoryFilter = (typeof PORTFOLIO_CATEGORIES)[number];

export const PORTFOLIO_BUCKET = 'portfolios';
export const MAX_PORTFOLIO_FILE_BYTES = 5 * 1024 * 1024;

export function isPortfolioCategory(value: unknown): value is PortfolioCategory {
  return (
    typeof value === 'string' &&
    (PORTFOLIO_CATEGORY_OPTIONS as readonly string[]).includes(value)
  );
}

export function inferPortfolioCategory(title: string, fileType = ''): PortfolioCategory {
  const text = `${title} ${fileType}`.toLowerCase();
  if (/เกียรติบัตร|ใบรับรอง|ประกาศนียบัตร|certificate|certification|award|รางวัล/.test(text)) {
    return 'เกียรติบัตร / ใบรับรอง';
  }
  if (/อบรม|กิจกรรม|training|workshop|seminar|activity|event/.test(text)) {
    return 'กิจกรรม / อบรม';
  }
  if (/เอกสาร|ใบผ่าน|transcript|resume|เรซูเม่|ใบสมัคร|report/.test(text)) {
    return 'เอกสารอื่นๆ';
  }
  return 'ผลงาน / โปรเจกต์';
}

// ดึง storage path ของ object ใน bucket `portfolios` จาก public URL
export function storagePathFromPortfolioUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${PORTFOLIO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const raw = url.slice(index + marker.length).split('?')[0].split('#')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// SHA-256 hex digest ของไฟล์ — ใช้ตรวจไฟล์ซ้ำทั้งก่อนอัปโหลดและก่อนบันทึกผลวิเคราะห์
export async function computeFileSha256(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับการตรวจไฟล์ซ้ำ (ต้องใช้งานผ่าน HTTPS)');
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
