import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AIRecommendation {
  title: string;
  detail: string;
}

interface AIResult {
  skills: string[];
  career: string | null;
  accuracy: number;
  technical: number;
  soft: number;
  management: number;
  recommendations: AIRecommendation[];
  warnings: string[];
  textWarning: string | null;
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
RULE: IRRELEVANT files contribute ZERO skills. Every skill must trace to a CERTIFICATE/TRANSCRIPT/PROJECT/REPORT file. Quote or describe the exact evidence per skill in your reasoning.

Synthesize:
- skills: 6-12 items, English names, ordered by strength of evidence. Each skill must trace to at least one file below. NEVER return generic ["Python","SQL"] unless those are genuinely the strongest evidence.
- career: one of Software Engineer, Data Scientist, UX Designer, Cybersecurity Analyst, Marketing Strategist, Finance Analyst (nearest match; use the student's stated interest only if the evidence supports it at least partially).
- Scores 0-100 consistent with evidence: strong matching evidence 75+, weak/mixed 40-70, almost none below 40. accuracy = your honest confidence.
- recommendations: exactly 2 items in Thai, each naming the biggest gap between the evidence and the suggested career and a concrete way to fill it (course/activity).
- warnings: one Thai line per IRRELEVANT file as "ชื่อไฟล์: เหตุผล".
- textWarning: one short Thai sentence if the student's extra text is gibberish/off-topic/empty of useful info (else null). Skills may only use extra text that is study/work/career related.

Respond with ONLY valid JSON (no markdown, no code fences) in this exact schema:
{
  "skills": ["Skill1", "Skill2"],
  "career": "...",
  "accuracy": 0-100,
  "technical": 0-100,
  "soft": 0-100,
  "management": 0-100,
  "recommendations": [
    { "title": "specific course/activity in Thai", "detail": "which gap it fills, in Thai" },
    { "title": "...", "detail": "..." }
  ],
  "warnings": ["ชื่อไฟล์: เหตุผล"],
  "textWarning": "one short Thai sentence or null"
}`;

export async function POST(req: NextRequest) {
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

  // ส่งครั้งเดียว (ประหยัดโควต้า): ไฟล์ทั้งหมด + prompt สั่งแยกประเภททีละไฟล์ในรอบเดียว
  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
    {
      text: `${SYSTEM_PROMPT}\n\nStudent profile: major=${major || '(unknown)'}, institution=${institution || '(unknown)'}\nStudent extra context (skills / details / career of interest):\n${interestText || '(none)'}`,
    },
  ];

  const fileNames: string[] = [];
  for (const file of files.slice(0, 6)) {
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    fileNames.push(file.name || 'file');
    parts.push({
      inlineData: { mimeType: file.type || 'image/jpeg', data: buf.toString('base64') },
    });
  }
  if (fileNames.length > 0) {
    parts[0] = {
      text: `${typeof parts[0] === 'object' && 'text' in parts[0] ? parts[0].text : ''}\n\nAttached files in order:\n${fileNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
    };
  }

  const parseJson = (text: string) => {    const clean = text.trim()
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
    // 429 โควต้าไม่ retry ในรุ่นเดิม (ข้ามไปโมเดลถัดไปทันที) — retry แค่ error ชั่วคราวฝั่งเซิร์ฟเวอร์
    const msg = e instanceof Error ? e.message : String(e);
    return /503|UNAVAILABLE|overload|timeout|TRUNCAT/i.test(msg) && !/429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  };

  const callWithRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        console.error(`Gemini ${label} attempt ${attempt} failed:`, e instanceof Error ? e.message.slice(0, 200) : e);
        if (!isRetryable(e) || attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    throw lastErr;
  };

  // โควต้าฟรีนับแยกตามโมเดล: ตัวหลักเต็มให้ตกไปตัวสำรอง (รวม ~3 เท่าของโควต้ารายวัน)
  const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  const isQuotaError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    return /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
  };

  try {
    let res;
    let usedModel = MODELS[0];
    let lastErr: unknown = null;
    for (const model of MODELS) {
      try {
        res = await callWithRetry(() => ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: { temperature: 0.2, thinkingConfig: { thinkingBudget: 4096 } },
        }), `analyze:${model}`);
        usedModel = model;
        break;
      } catch (e) {
        lastErr = e;
        // เต็มโควต้า -> ลองโมเดลถัดไป, error อื่น -> โยนเลย
        if (!isQuotaError(e)) throw e;
      }
    }
    if (!res) throw lastErr;
    const text = (res.text ?? '').trim();
    const parsed = parseJson(text) as Partial<AIResult>;
    if (!Array.isArray(parsed.skills)) {
      throw new Error('model returned no skills array');
    }
    const result: AIResult = {
      skills: parsed.skills.map(String).slice(0, 12),
      career: typeof parsed.career === 'string' ? parsed.career : null,
      accuracy: clampNum(parsed.accuracy, 0),
      technical: clampNum(parsed.technical, 0),
      soft: clampNum(parsed.soft, 0),
      management: clampNum(parsed.management, 0),
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
      _model: usedModel,
    };
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

function clampNum(v: unknown, fallback: number) {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}
