// Shared helpers for the Google Jobs engine (/api/jobs role/keywords mode)
// and the JobRecommendationsSection UI on /main.

export type JobLevel = 'all' | 'internship' | 'junior' | 'remote';

export const JOB_LEVELS: { value: JobLevel; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'internship', label: 'ฝึกงาน (Internship)' },
  { value: 'junior', label: 'เด็กจบใหม่ (Junior)' },
  { value: 'remote', label: 'Remote' },
];

export function normalizeJobLevel(value: string | null | undefined): JobLevel {
  return value === 'internship' || value === 'junior' || value === 'remote' ? value : 'all';
}

function pushUnique(target: string[], values: string[], max: number) {
  const seen = new Set(target.map((v) => v.toLowerCase()));
  for (const value of values) {
    const clean = value.trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    target.push(clean);
    if (target.length >= max) return;
  }
}

/**
 * Resolve a prioritized keyword list for job matching — works for ANY domain
 * (business, design, engineering, education, healthcare, etc.). Order:
 * AI `job_keywords` → detected `skills`. No industry dictionaries.
 */
export function resolveJobKeywords(input: {
  role?: string | null;
  careerEn?: string | null;
  skills?: string[];
  jobKeywords?: string[];
}): string[] {
  const result: string[] = [];
  pushUnique(result, input.jobKeywords ?? [], 8);
  pushUnique(result, input.skills ?? [], 8);
  return result.slice(0, 8);
}

/** First usable search term — may be Thai or English, any industry. */
export function primaryEnglishRole(role: string, keywords: string[]): string {
  const candidate = (keywords[0] ?? role ?? '').trim();
  return candidate || 'งาน';
}

/**
 * Sanitize free-text job queries before they reach SerpApi or portal URLs:
 * strips parentheses/brackets/quotes (course names, certificates, explanations)
 * and caps the result at `maxWords` concise words. Thai text is preserved.
 */
export function sanitizeJobQuery(input: string | null | undefined, maxWords = 4): string {
  return (input ?? '')
    .replace(/[()（）\[\]{}<>"'“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ');
}

export function buildQueryKey(role: string, keywords: string[], level: JobLevel): string {
  return `${primaryEnglishRole(role, keywords)}:${level}`;
}

// Common tech/office skill vocabulary used to extract real required skills
// from live job posting text (title + description) when the source API does
// not provide a structured skills/tags field.
const COMMON_JOB_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Vue.js', 'Angular',
  'React Native', 'Flutter', 'Python', 'Java', 'C#', '.NET', 'PHP', 'Laravel',
  'HTML', 'CSS', 'Tailwind', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Supabase',
  'Firebase', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Git',
  'REST API', 'GraphQL', 'WordPress', 'Excel', 'Power BI', 'Tableau',
  'Data Analysis', 'Data Visualization', 'Machine Learning', 'Statistics',
  'Figma', 'UI/UX', 'UX Design', 'UI Design', 'Prototyping', 'User Research',
  'Digital Marketing', 'SEO', 'Google Analytics', 'Content Marketing',
  'Social Media', 'Copywriting', 'Accounting', 'Financial Analysis',
  'Cybersecurity', 'Network Security', 'Incident Response', 'SIEM',
  'Project Management', 'Scrum', 'Agile',
];

/**
 * Extract real skill terms present in a job posting's text. `candidates`
 * (user skills / resolved keywords) are checked first, then the common
 * vocabulary — only terms literally found in the text are returned.
 */
export function extractJobSkills(text: string, candidates: string[] = []): string[] {
  const hay = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  const seen = new Set<string>();
  const consider = (skill: string) => {
    const clean = skill.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key) || !hay.includes(key)) return;
    seen.add(key);
    found.push(clean);
  };
  candidates.forEach(consider);
  COMMON_JOB_SKILLS.forEach(consider);
  return found.slice(0, 10);
}

export interface FallbackLink {
  id: 'google' | 'linkedin' | 'jobsdb' | 'jobthai' | 'blognone';
  name: string;
  tagline: string;
  url: string;
}

/** Pre-filled search URLs on the 5 major Thai/global job platforms. */
export function buildFallbackLinks(query: string): FallbackLink[] {
  const q = (query || 'งาน').trim();
  const enc = encodeURIComponent;
  return [
    {
      id: 'google',
      name: 'Google Jobs',
      tagline: 'รวมประกาศงานจากทุกเว็บไซต์',
      url: `https://www.google.com/search?q=${enc(`${q} งาน Thailand`)}&ibp=htl;jobs`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      tagline: 'งานในไทยและงานรีโมท',
      url: `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}&location=Thailand`,
    },
    {
      id: 'jobsdb',
      name: 'JobsDB Thailand',
      tagline: 'งานจากบริษัทชั้นนำทั่วไทย',
      url: `https://th.jobsdb.com/th/jobs?keywords=${enc(q)}`,
    },
    {
      id: 'jobthai',
      name: 'JobThai',
      tagline: 'เว็บหางานไทยโดยตรงจากบริษัท',
      url: `https://jobthai.com/th/jobs?keyword=${enc(q)}`,
    },
    {
      id: 'blognone',
      name: 'Blognone Jobs',
      tagline: 'ชุมชนและประกาศงานสายเทคโนโลยี',
      url: `https://www.blognone.com/jobs?q=${enc(q)}`,
    },
  ];
}
