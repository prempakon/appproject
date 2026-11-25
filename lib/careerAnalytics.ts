import { CAREER_OPTIONS } from './careers';
import type { JobMatch, ResumeData, ScoreDimensions } from './platform.types';

export interface AnalysisLike {
  skills: string[];
  career: string | null;
  career_en: string | null;
  technical: number;
  soft: number;
  management: number;
  accuracy: number;
  communication?: number;
  creativity?: number;
  radar_scores?: Partial<ScoreDimensions> | null;
}

export interface ScoreSnapshot extends ScoreDimensions {
  career: string | null;
  careerEn: string | null;
  source: 'analysis' | 'resume';
}

export function latestAnalysis(analyses: AnalysisLike[]): AnalysisLike | null {
  return analyses.length > 0 ? analyses[0] : null;
}

export function buildScoreSnapshot(analyses: AnalysisLike[], resume: ResumeData | null): ScoreSnapshot {
  const latest = latestAnalysis(analyses);
  if (latest) {
    const radar = latest.radar_scores ?? null;
    const pick = (value: unknown, fallback: number) => {
      const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
      return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
    };
    const technical = pick(radar?.technical, latest.technical ?? 0);
    const soft = pick(radar?.soft, latest.soft ?? 0);
    const management = pick(radar?.management, latest.management ?? 0);
    const accuracy = pick(radar?.accuracy, latest.accuracy ?? 0);
    return {
      technical,
      soft,
      management,
      accuracy,
      communication: pick(radar?.communication, latest.communication === undefined ? Math.round((technical + soft) / 2) : latest.communication),
      creativity: pick(radar?.creativity, latest.creativity === undefined ? Math.round((soft + management) / 2) : latest.creativity),
      career: latest.career,
      careerEn: latest.career_en,
      source: 'analysis',
    };
  }

  const skillCount = resume?.skills.length ?? 0;
  const experienceCount = resume?.experiences.length ?? 0;
  const projectCount = resume?.projects.length ?? 0;
  const certCount = resume?.certifications.length ?? 0;

  return {
    technical: Math.min(90, 20 + skillCount * 8 + projectCount * 4),
    soft: Math.min(90, 35 + experienceCount * 8 + (resume?.summary ? 10 : 0)),
    management: Math.min(90, 25 + experienceCount * 10 + certCount * 3),
    accuracy: skillCount >= 3 ? 40 : 20,
    communication: Math.min(90, 30 + experienceCount * 6 + projectCount * 3),
    creativity: Math.min(90, 25 + projectCount * 5 + (resume?.summary ? 10 : 0)),
    career: null,
    careerEn: null,
    source: 'resume',
  };
}

export function buildSkillFrequency(
  analyses: AnalysisLike[],
  resume: ResumeData | null,
): { skill: string; count: number; documents: number }[] {
  // Unique-skill union: a skill detected in N history records counts once,
  // with `documents` recording how many distinct sources evidenced it —
  // repeated runs of the same analysis no longer inflate the tally.
  const tally = new Map<string, { label: string; docs: Set<number> }>();
  const add = (skill: string, docId: number) => {
    const clean = skill.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    const current = tally.get(key);
    if (current) {
      current.docs.add(docId);
    } else {
      tally.set(key, { label: clean, docs: new Set([docId]) });
    }
  };

  analyses.slice(0, 10).forEach((analysis, index) => {
    const seenInRecord = new Set<string>();
    (analysis.skills ?? []).forEach((skill) => {
      const key = skill.trim().toLowerCase();
      if (!key || seenInRecord.has(key)) return;
      seenInRecord.add(key);
      add(skill, index);
    });
  });
  // The resume draft counts as one additional evidence source.
  (resume?.skills ?? []).forEach((skill) => add(skill, 100));

  return [...tally.values()]
    .map((entry) => ({ skill: entry.label, count: entry.docs.size, documents: entry.docs.size }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, 8);
}

export interface CareerReadiness {
  career: string;
  label: string;
  value: number;
  jobCount: number;
}

export function buildCareerReadiness(matches: JobMatch[]): CareerReadiness[] {
  return CAREER_OPTIONS.map((career) => {
    const related = matches.filter((match) => match.job.career_en === career.value);
    const value = related.length
      ? Math.round(related.reduce((sum, match) => sum + match.score, 0) / related.length)
      : 0;
    return { career: career.value, label: career.label, value, jobCount: related.length };
  });
}

export function readinessSummary(matches: JobMatch[]): {
  topMatch: JobMatch | null;
  strongMatches: number;
  averageScore: number;
} {
  const topMatch = matches.length > 0 ? matches[0] : null;
  const strongMatches = matches.filter((m) => m.score >= 60).length;
  const averageScore = matches.length
    ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
    : 0;
  return { topMatch, strongMatches, averageScore };
}

export function collectUserSkills(
  analyses: AnalysisLike[],
  resume: ResumeData | null,
  manual: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (skill: string) => {
    const clean = skill.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  };
  (analyses[0]?.skills ?? []).forEach(push);
  (resume?.skills ?? []).forEach(push);
  manual.forEach(push);
  return result;
}
