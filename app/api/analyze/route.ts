import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Simple in-memory rate limiter (per IP + per minute)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

interface AIRecommendation {
  title: string;
  detail: string;
}

interface RadarScores {
  technical: number;
  soft: number;
  management: number;
  accuracy: number;
  communication: number;
  creativity: number;
}

interface AIResult {
  skills: string[];
  career: string | null;
  career_category: string | null;
  careerEn: string | null;
  radar_scores: RadarScores;
  recommendations: AIRecommendation[];
  warnings: string[];
  textWarning: string | null;
  skillNotes: {
    technical: string | null;
    soft: string | null;
    management: string | null;
    communication: string | null;
    creativity: string | null;
  };
  _model?: string;
}

const SYSTEM_PROMPT = `You are a skill-analysis engine for a Thai university (Loei Rajabhat University) student portfolio system.
Attached files (in listed order) are portfolio files: certificates, transcripts, project screenshots, posters, reports — images or PDFs — plus the student's own text about extra skills and the career they want.

Go through the files ONE BY ONE in order. For each file, FIRST decide its bucket (CERTIFICATE / TRANSCRIPT / PROJECT / REPORT / IRRELEVANT, definitions below), THEN extract only what you actually see. Be strict and thorough — this is the core of your job.

Bucket definitions:
- CERTIFICATE:ใบเซอร์/รางวัล/เกียรติบัตร (must show issuer + skill/course name to count)
- TRANSCRIPT:ใบเกรด/ทรานสคริปต์ (only subjects with grade B or better imply skills)
- PROJECT:งานโปรเจกต์/ภาพหน้าจอโค้ด/ดีไซน์/prototype/poster ที่มีเนื้อหางานจริง
- REPORT:รายงาน/เอกสารประกอบที่มีเนื้อหาวิชาการ
- IRRELEVANT:selfie, รูปคน, รูปจดโน้ตมั่วๆ ที่อ่านไม่ออกหรือไม่เกี่ยวกับวิชา, meme, ภาพว่าง/เบลอจนดูไม่ออก, ภาพซ้ำ
- NOTE: ตราประทับ "SAMPLE / ตัวอย่าง / SPECIMEN" บนใบเซอร์เป็นแค่ลายน้ำตัวอย่าง ให้นับเป็น CERTIFICATE ตามเนื้อหา ห้ามหักความมั่นใจเพราะลายน้ำ
- NOTE: วิเคราะห์เนื้อหาเอกสารตามที่เห็น ห้ามตั้งคำถามว่าเอกสารจริงหรือ AI สร้าง (เช่น รูปจาก ChatGPT) — ถ้าอ่านเนื้อหาออกให้นับเป็นหลักฐานตามปกติ
RULE: IRRELEVANT files contribute ZERO skills. Every skill must trace to a CERTIFICATE/TRANSCRIPT/PROJECT/REPORT file. Quote or describe the exact evidence per skill in your reasoning.

Synthesize:
- skills: 6-12 items, ordered by strength of evidence, names IN THAI (may append the English term in parentheses, e.g. "การเขียนโปรแกรม (Python)", "การวิเคราะห์ข้อมูล (Data Analysis)"). NEVER return only generic ["Python","SQL"] — extract what is actually in the files.
- career: FREE-FORM Thai text describing the best-fit career or study path based on the evidence AND the student's stated interest (e.g. "วิศวกรซอฟต์แวร์", "นักวิทยาศาสตร์ข้อมูล", "หมอ", "พยาบาล", "ครู"). SHORT: role name only, max 60 characters, NO parentheses, NO explanations — details go in recommendations. Do NOT restrict to any list — respond like a chat AI reading the actual person. If evidence is weak, name the interest but keep scores honest. If your accuracy would be below 30 AND you found fewer than 3 skills, set career to null instead of guessing.
- career_category: the broad industry category this career belongs to. Examples: "เทคโนโลยีสารสนเทศ", "ธุรกิจและการตลาด", "สร้างสรรค์และออกแบบ", "สาธารณสุขและการแพทย์", "การศึกษา", "การเงินและบัญชี", "วิศวกรรม", "อื่นๆ". Choose the most fitting category or "อื่นๆ" if none apply.
- careerEn: the NEAREST of [Software Engineer, Data Scientist, UX Designer, Cybersecurity Analyst, Marketing Strategist, Finance Analyst], or null if none fits (e.g. doctor/nurse/teacher). Used for curriculum statistics.
- radar_scores: 6-dimension scores 0-100:
  - technical: ทักษะเฉพาะทาง/ฮาร์ดสกิล
  - soft: ทักษะทั่วไป/ซอฟต์สกิล
  - management: ทักษะการบริหารจัดการ
  - accuracy: ความแม่นยำของข้อมูลหลักฐาน
  - communication: ทักษะการสื่อสาร
  - creativity: ทักษะความคิดสร้างสรรค์
  Strong matching evidence 75+, weak/mixed 40-70, almost none below 40. NEVER combine accuracy near 0 with high dimension scores.
- recommendations: exactly 2 items in Thai, each MUST cite the specific file/fact it responds to (e.g. start the detail with "จาก[ชื่อไฟล์/สิ่งที่เห็น]..."), naming the biggest gap between the evidence and the suggested career and a concrete way to fill it (course/activity). Generic advice with no file reference is forbidden.
- warnings: one Thai line per IRRELEVANT file as "ชื่อไฟล์: เหตุผล".
- textWarning: one short Thai sentence if the student's extra text is gibberish/off-topic/empty of useful info (else null). Skills may only use extra text that is study/work/career related.
- skillNotes: 1-2 Thai sentences per dimension explaining which file/evidence supports it.

Respond with ONLY valid JSON (no markdown, no code fences) in this exact schema:
{
  "skills": ["ทักษะภาษาไทย", ...],
  "career": "อาชีพที่เหมาะที่สุด ภาษาไทย อิสระ",
  "career_category": "หมวดอาชีพกว้าง เช่น เทคโนโลยีสารสนเทศ",
  "careerEn": "one of the 6 English names above or null",
  "radar_scores": {
    "technical": 0-100,
    "soft": 0-100,
    "management": 0-100,
    "accuracy": 0-100,
    "communication": 0-100,
    "creativity": 0-100
  },
  "recommendations": [
    { "title": "specific course/activity in Thai", "detail": "which gap it fills, in Thai" },
    { "title": "...", "detail": "..." }
  ],
  "warnings": ["ชื่อไฟล์: เหตุผล"],
  "textWarning": "one short Thai sentence or null",
  "skillNotes": {
    "technical": "คำอธิบายทักษะเทคนิค",
    "soft": "คำอธิบายทักษะทั่วไป",
    "management": "คำอธิบายทักษะบริหาร",
    "communication": "คำอธิบายทักษะสื่อสาร",
    "creativity": "คำอธิบายทักษะสร้างสรรค์"
  }
}`;

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const limit = rateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `อัตราการร้องขอสูงเกินไป กรุณารอ ${limit.retryAfter ?? 60} วินาทีแล้วลองใหม่` },
      { status: 429 },
    );
  }

  // Authentication check — accept Supabase SSR cookies or an Authorization Bearer token.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
  let authenticated = false;

  if (bearerToken) {
    const bearerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await bearerSupabase.auth.getUser(bearerToken);
    authenticated = !error && !!data.user;
  } else {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    authenticated = !authError && !!user;
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อนใช้งานฟีเจอร์นี้' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing GEMINI_API_KEY' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }

  const interestText = String(form.get('interestText') ?? '').slice(0, 2000);
  const major = String(form.get('major') ?? '').slice(0, 200);
  const institution = String(form.get('institution') ?? '').slice(0, 200);
  const files = form.getAll('files').filter((f): f is File => f instanceof File);

  const ai = new GoogleGenAI({ apiKey });

  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
    {
      text: `${SYSTEM_PROMPT}\n\nStudent profile: major=${major || '(unknown)'}, institution=${institution || '(unknown)'}\nStudent extra context (skills / details / career of interest):\n${interestText || '(none)'}`,
    },
  ];

  const fileNames: string[] = [];
  let oversized = 0;
  for (const file of files.slice(0, 6)) {
    if (file.size <= 0) continue;
    if (file.size > 10 * 1024 * 1024) {
      oversized++;
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    fileNames.push(file.name || 'file');
    parts.push({
      inlineData: { mimeType: file.type || 'image/jpeg', data: buf.toString('base64') },
    });
  }
  if (files.length > 0 && fileNames.length === 0) {
    return NextResponse.json(
      { error: `ไฟล์ใหญ่เกิน 10MB ทั้งหมด (${oversized} ไฟล์) ลดขนาดไฟล์แล้วลองใหม่` },
      { status: 400 },
    );
  }
  if (fileNames.length === 0 && !interestText.trim() && !major.trim()) {
    return NextResponse.json({ error: 'ไม่มีไฟล์หรือข้อมูลให้วิเคราะห์' }, { status: 400 });
  }
  if (fileNames.length > 0) {
    parts[0] = {
      text: `${typeof parts[0] === 'object' && 'text' in parts[0] ? parts[0].text : ''}\n\nAttached files in order:\n${fileNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
    };
  }

  const parseJson = (text: string) => {
    const clean = text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');
    try {
      return JSON.parse(clean);
    } catch {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(clean.slice(start, end + 1));
      }
      throw new Error('unparseable model output: ' + clean.slice(0, 120));
    }
  };

  const isRetryable = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    return /503|UNAVAILABLE|overload|timeout|TRUNCAT/i.test(msg) && !/429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  };

  const callWithRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        console.error(`Gemini ${label} attempt ${attempt} failed:`, e instanceof Error ? e.message.slice(0, 200) : e);
        if (!isRetryable(e) || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    throw lastErr;
  };

  const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
  const isQuotaError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    return /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  };

  const isOverloaded = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    return /503|UNAVAILABLE|overload/i.test(msg);
  };

  try {
    let res;
    let usedModel = MODELS[0];
    let lastErr: unknown = null;
    for (const [mi, model] of MODELS.entries()) {
      try {
        res = await callWithRetry(() => ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: mi === 0
            ? { temperature: 0.2, thinkingConfig: { thinkingBudget: 4096 } }
            : { temperature: 0.2 },
        }), `analyze:${model}`);
        usedModel = model;
        break;
      } catch (e) {
        lastErr = e;
        if (!isQuotaError(e) && !isOverloaded(e)) throw e;
      }
    }
    if (!res) throw lastErr;
    const text = (res.text ?? '').trim();
    const parsed = parseJson(text) as Partial<AIResult>;
    if (!Array.isArray(parsed.skills)) {
      throw new Error('model returned no skills array');
    }
    const CAREER_EN = ['Software Engineer', 'Data Scientist', 'UX Designer', 'Cybersecurity Analyst', 'Marketing Strategist', 'Finance Analyst'];
    const careerEn = typeof parsed.careerEn === 'string' && CAREER_EN.includes(parsed.careerEn.trim())
      ? parsed.careerEn.trim()
      : null;
    const radar = parsed.radar_scores as Partial<RadarScores> | undefined;
    const result: AIResult = {
      skills: parsed.skills.map(String).slice(0, 12),
      career: typeof parsed.career === 'string' && parsed.career.trim() ? parsed.career.trim().slice(0, 200) : null,
      career_category: typeof parsed.career_category === 'string' && parsed.career_category.trim() ? parsed.career_category.trim().slice(0, 100) : null,
      careerEn,
      radar_scores: {
        technical: clampNum(radar?.technical, 0),
        soft: clampNum(radar?.soft, 0),
        management: clampNum(radar?.management, 0),
        accuracy: clampNum(radar?.accuracy, 0),
        communication: clampNum(radar?.communication, 0),
        creativity: clampNum(radar?.creativity, 0),
      },
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 4).map((r) => ({
            title: String((r as AIRecommendation)?.title ?? ''),
            detail: String((r as AIRecommendation)?.detail ?? ''),
          }))
        : [],
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.map(String).slice(0, 6)
        : [],
      textWarning: typeof parsed.textWarning === 'string' && parsed.textWarning.trim() ? parsed.textWarning.trim().slice(0, 300) : null,
      skillNotes: {
        technical: noteOf((parsed.skillNotes as Record<string, unknown> | undefined)?.technical),
        soft: noteOf((parsed.skillNotes as Record<string, unknown> | undefined)?.soft),
        management: noteOf((parsed.skillNotes as Record<string, unknown> | undefined)?.management),
        communication: noteOf((parsed.skillNotes as Record<string, unknown> | undefined)?.communication),
        creativity: noteOf((parsed.skillNotes as Record<string, unknown> | undefined)?.creativity),
      },
      _model: usedModel,
    };
    // ซื่อสัตย์: มั่นใจต่ำและแทบไม่เจอทักษะเลย ห้ามฟันธงอาชีพ
    if (result.radar_scores.accuracy < 30 && result.skills.length < 3) {
      result.career = null;
      result.careerEn = null;
      result.career_category = null;
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
    console.error('Gemini analyze failed:', err);
    const quota = /429|quota/i.test(msg);
    return NextResponse.json(
      { error: quota ? 'AI quota เต็มชั่วคราว (429) รอ 1-2 นาทีแล้วลองใหม่' : 'AI วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง', detail: msg },
      { status: quota ? 429 : 500 },
    );
  }
}

function noteOf(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : null;
}

function clampNum(v: unknown, fallback: number) {
  const n =
    typeof v === 'number'
      ? Math.round(v)
      : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
        ? Math.round(Number(v))
        : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}
