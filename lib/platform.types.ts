// Shared types for the career platform features (jobs, resumes, analytics).
// These are intentionally additive and do not change the existing portfolio types.

export type WorkMode = 'onsite' | 'hybrid' | 'remote';

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  website: string | null;
  description: string;
  logo_url?: string | null;
  created_at?: string;
  isDemo?: boolean;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  responsibilities?: string[];
  location: string;
  work_mode: WorkMode;
  employment_type: string;
  required_skills: string[];
  nice_to_have?: string[];
  career_en: string | null;
  career_category?: string | null;
  salary_range: string | null;
  apply_url: string | null;
  is_active: boolean;
  created_at?: string;
  company?: Company | null;
  isDemo?: boolean;
}

export interface ResumeExperience {
  id: string;
  role: string;
  company: string;
  start: string;
  end: string;
  details: string;
}

export interface ResumeEducation {
  id: string;
  degree: string;
  institution: string;
  year: string;
  gpa: string;
}

export interface ResumeProject {
  id: string;
  name: string;
  detail: string;
  link: string;
}

export interface ResumeData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  github: string;
  summary: string;
  skills: string[];
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: string[];
}

export interface MatchResult {
  score: number;
  skillScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedNiceToHave: string[];
  reasons: string[];
}

export interface JobMatch extends MatchResult {
  job: Job;
}

// 6-dimension career skill profile (expanded from 4 dimensions)
export interface ScoreDimensions {
  technical: number;
  soft: number;
  management: number;
  accuracy: number;
  communication: number;
  creativity: number;
}

export interface ScoreSnapshot {
  technical: number;
  soft: number;
  management: number;
  accuracy: number;
  communication: number;
  creativity: number;
  career: string | null;
  careerEn: string | null;
  source: 'analysis' | 'resume';
}
