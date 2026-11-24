import type { Job, JobMatch } from './platform.types';

// Small synonym map so "React" matches "React.js", "SQL" matches "PostgreSQL", etc.
const SKILL_GROUPS: string[][] = [
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['react', 'react.js', 'reactjs'],
  ['next.js', 'nextjs'],
  ['node.js', 'nodejs', 'node'],
  ['sql', 'mysql', 'postgresql', 'postgres'],
  ['excel', 'microsoft excel', 'google sheets'],
  ['power bi', 'powerbi'],
  ['tableau', 'tableau desktop'],
  ['git', 'github', 'gitlab'],
  ['html', 'html5'],
  ['css', 'css3', 'tailwind', 'tailwind css'],
  ['figma', 'figma design'],
  ['ux research', 'user research'],
  ['wireframing', 'wireframe'],
  ['prototyping', 'prototype'],
  ['data visualization', 'dataviz', 'dashboard', 'แดชบอร์ด'],
  ['digital marketing', 'online marketing'],
  ['social media', 'โซเชียลมีเดีย'],
  ['content strategy', 'content planning'],
  ['google analytics', 'ga4'],
  ['network security', 'cybersecurity', 'ความมั่นคงปลอดภัยไซเบอร์'],
  ['incident response', 'incident handling'],
  ['linux', 'ubuntu', 'unix'],
  ['python', 'py'],
  ['pandas', 'python pandas'],
  ['machine learning', 'ml', 'แมชชีนเลิร์นนิง'],
  ['statistics', 'สถิติ'],
  ['accounting', 'บัญชี'],
  ['financial analysis', 'financial modeling', 'วิเคราะห์การเงิน'],
  ['rest api', 'restful api', 'api'],
  ['react native', 'react-native'],
  ['firebase', 'google firebase'],
  ['ui/ux', 'ui design', 'ux design'],
  ['accessibility', 'a11y'],
  ['seo', 'search engine optimization'],
  ['copywriting', 'copy writing'],
  ['canva', 'canva design'],
];

const CANONICAL = new Map<string, string>();
for (const group of SKILL_GROUPS) {
  for (const term of group) CANONICAL.set(term, group[0]);
}

export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalSkill(skill: string): string {
  const normalized = normalizeSkill(skill);
  return CANONICAL.get(normalized) ?? normalized;
}

export function matchSkills(userSkills: string[], requiredSkills: string[]) {
  const userSet = new Set(userSkills.map(canonicalSkill).filter(Boolean));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of requiredSkills) {
    const key = canonicalSkill(skill);
    if (key && userSet.has(key)) matched.push(skill);
    else missing.push(skill);
  }
  return { matched, missing };
}

export function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const clean = skill.trim();
    const key = canonicalSkill(clean);
    if (!clean || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export interface MatchContext {
  userSkills: string[];
  preferredCareer?: string | null;
  preferredLocation?: string | null;
}

export function computeJobMatch(job: Job, context: MatchContext): JobMatch {
  const userSkills = uniqueSkills(context.userSkills);
  const { matched, missing } = matchSkills(userSkills, job.required_skills ?? []);
  const nice = matchSkills(userSkills, job.nice_to_have ?? []).matched;

  const requiredCount = Math.max(1, job.required_skills?.length ?? 0);
  const skillRatio = matched.length / requiredCount;
  const skillScore = Math.round(skillRatio * 100);

  let score = skillRatio * 65;
  const reasons: string[] = [];

  if (matched.length > 0) {
    reasons.push(`ตรงกับทักษะที่ต้องการ ${matched.length}/${requiredCount} ทักษะ`);
  }
  if (userSkills.length === 0) {
    reasons.push('ยังไม่มีข้อมูลทักษะ — เพิ่มทักษะในเรซูเม่หรือวิเคราะห์พอร์ตโฟลิโอ');
  }

  if (context.preferredCareer && job.career_en === context.preferredCareer) {
    score += 20;
    reasons.push('สายอาชีพตรงกับผลวิเคราะห์/เป้าหมายของคุณ');
  }

  const preferredLocation = (context.preferredLocation ?? '').trim();
  if (!preferredLocation || preferredLocation === 'all') {
    score += 5;
  } else if (job.work_mode === 'remote') {
    score += 12;
    reasons.push('รองรับการทำงานแบบรีโมท');
  } else if (
    normalizeSkill(job.location).includes(normalizeSkill(preferredLocation)) ||
    normalizeSkill(preferredLocation).includes(normalizeSkill(job.location))
  ) {
    score += 12;
    reasons.push(`ทำเลตรงกับที่ต้องการ (${job.location})`);
  }

  score += Math.min(8, nice.length * 2);
  score += 5;

  return {
    job,
    score: Math.max(0, Math.min(100, Math.round(score))),
    skillScore,
    matchedSkills: matched,
    missingSkills: missing,
    matchedNiceToHave: nice,
    reasons,
  };
}

export function rankJobs(jobs: Job[], context: MatchContext): JobMatch[] {
  return jobs
    .filter((job) => job.is_active !== false)
    .map((job) => computeJobMatch(job, context))
    .sort((a, b) => b.score - a.score || a.job.title.localeCompare(b.job.title));
}

export function matchTone(score: number): { label: string; className: string; bar: string } {
  if (score >= 75) {
    return { label: 'เหมาะสมมาก', className: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500' };
  }
  if (score >= 50) {
    return { label: 'เหมาะสม', className: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-500' };
  }
  if (score >= 30) {
    return { label: 'พอเป็นไปได้', className: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-500' };
  }
  return { label: 'ต้องพัฒนาอีก', className: 'text-slate-600 bg-slate-100 border-slate-200', bar: 'bg-slate-400' };
}
