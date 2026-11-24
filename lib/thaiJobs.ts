// Thai-only guards for the job & freelance board.
// The board must never display European/foreign onsite listings or Euro (€) salaries.

export const THAI_PROVINCES = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อำนาจเจริญ',
  'อุดรธานี',
  'อุตรดิตถ์',
  'อุทัยธานี',
  'อุบลราชธานี',
] as const;

// Common English spellings used by Thai job boards.
const THAI_CITY_ALIASES = [
  'thailand',
  'กรุงเทพ',
  'กทม',
  'ปริมณฑล',
  'โคราช',
  'พัทยา',
  'หัวหิน',
  'เกาะสมุย',
  'สมุย',
  'หาดใหญ่',
  'อยุธยา',
  'bangkok',
  'chiang mai',
  'chiang rai',
  'phuket',
  'khon kaen',
  'chonburi',
  'pattaya',
  'rayong',
  'hat yai',
  'songkhla',
  'nonthaburi',
  'pathum thani',
  'samut prakan',
  'nakhon ratchasima',
  'korat',
  'udon thani',
  'ubon ratchathani',
  'surat thani',
  'koh samui',
  'samui',
  'krabi',
  'phitsanulok',
  'hua hin',
  'prachuap',
  'ayutthaya',
  'khonkaen',
];

const REMOTE_MARKERS = [
  'remote',
  'รีโมท',
  'ทำงานจากที่บ้าน',
  'work from home',
  'wfh',
  'ทั่วประเทศ',
  'ออนไลน์',
  'online',
  'ไม่ระบุ',
  'anywhere',
];

// Obvious non-Thai locations. Kept explicit so no European feed can leak in.
const FOREIGN_MARKERS = [
  'germany',
  'deutschland',
  'berlin',
  'munich',
  'münchen',
  'hamburg',
  'frankfurt',
  'cologne',
  'poland',
  'warsaw',
  'netherlands',
  'amsterdam',
  'france',
  'paris',
  'spain',
  'madrid',
  'barcelona',
  'italy',
  'rome',
  'milan',
  'portugal',
  'lisbon',
  'united kingdom',
  'london',
  'manchester',
  'ireland',
  'dublin',
  'united states',
  'usa',
  'new york',
  'san francisco',
  'seattle',
  'austin',
  'canada',
  'toronto',
  'vancouver',
  'australia',
  'sydney',
  'melbourne',
  'india',
  'bangalore',
  'bengaluru',
  'singapore',
  'vietnam',
  'hanoi',
  'japan',
  'tokyo',
  'china',
  'shanghai',
  'europe',
  'emea',
  'uk',
  'uae',
  'dubai',
];

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

/** True when the location is in Thailand or a Thai remote/online role. */
export function isThaiLocation(location: string | null | undefined): boolean {
  const value = (location ?? '').trim().toLowerCase();
  if (!value) return false;

  const hasThai =
    value.includes('ไทย') ||
    value.includes('thailand') ||
    includesAny(value, THAI_PROVINCES) ||
    includesAny(value, THAI_CITY_ALIASES);

  if (hasThai) return true;

  // A foreign city/country always wins over a vague "remote" marker.
  if (includesAny(value, FOREIGN_MARKERS)) return false;

  return includesAny(value, REMOTE_MARKERS);
}

/** True when the salary is missing or expressed in Thai baht. */
export function isThaiSalary(salary: string | null | undefined): boolean {
  const value = (salary ?? '').trim().toLowerCase();
  if (!value) return true;
  if (/[€£]/.test(value)) return false;
  if (/\b(eur|usd|gbp|dollar|euro)s?\b/.test(value)) return false;
  if (value.includes('$')) return false;
  return true;
}

/** Final guard used before a job reaches the board. */
export function isThaiListing(job: {
  location?: string | null;
  salary_range?: string | null;
}): boolean {
  if (!isThaiLocation(job.location)) return false;
  return isThaiSalary(job.salary_range);
}

/** Ensure a user-entered budget is shown in THB. Returns null when it is foreign. */
export function normalizeThaiSalary(salary: string | null | undefined): string | null {
  const value = (salary ?? '').trim();
  if (!value) return null;
  if (!isThaiSalary(value)) return null;
  const hasCurrency = value.includes('บาท') || value.includes('฿') || /thb/i.test(value);
  if (hasCurrency || !/\d/.test(value)) return value;
  return `${value} บาท`;
}
