# Current State — ProjectApp (LRU Portfolio)

> Snapshot date: 2026-11-14 (analysis baseline)
> Last updated: 2026-11-25 — Module N 3-tier AI analysis UI, RadarChart audit, production verification
> Scope: living status document — baseline analysis plus implemented modules.
> Repository: `D:\appproject\projectapp`

---

## 1. What this project is

A Thai-language web application for **Loei Rajabhat University (มหาวิทยาลัยราชภัฏเลย)** students to:

1. Register / sign in (email+password or Google).
2. Upload portfolio evidence (certificates, transcripts, project screenshots, reports, PDFs).
3. Have Google Gemini analyze the files and extract skills, a suggested career, skill scores, warnings, and course recommendations.
4. Browse/manage uploaded files and past analyses.
5. Let administrators view all students, aggregated statistics, and individual portfolios/analyses.

The UI is almost entirely in Thai. It is a prototype/MVP: authentication guards and role checks are mostly client-side, and documentation/type definitions are partially duplicated or stale.

---

## 2. Tech stack

| Layer | Technology | Version / notes |
|---|---|---|
| Framework | Next.js (App Router) | `16.3.6` |
| UI | React | `19.2.8` |
| Language | TypeScript | `^5`, `strict: true` |
| Styling | Tailwind CSS v4 + `@tailwindcss/postcss` | Global CSS in `app/globals.css`; utility classes inline |
| Auth / DB / Storage | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | Browser client only; no server SDK usage |
| AI | Google Gemini via `@google/genai` | `^2.24.0`, server-side API route |
| PDF export | `html2canvas-pro` + `jspdf` | Client-side, dynamically imported |
| Linting | ESLint 9 flat config + `eslint-config-next` | `npm run lint` |
| Fonts | `next/font/google` (Geist, Geist Mono) | Latin subset |
| Runtime target | Node.js (API route `runtime = 'nodejs'`) | `maxDuration = 60` |

Notable config:

- `next.config.ts` is empty (defaults).
- No middleware/proxy file exists (git history shows cookie middleware was deliberately removed).
- Path alias `@/*` → repo root, although most imports use relative paths.
- `.env` is git-ignored; required variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `GEMINI_API_KEY` (server only)

---

## 3. System architecture

### 3.1 High-level shape

```
Browser (React client components)
  │
  ├─ Supabase JS client ──► Supabase Auth
  │                     ──► Postgres (profiles, portfolios, analysis_results) with RLS
  │                     ──► Storage (avatars, portfolios buckets, public URLs)
  │
  └─ POST /api/analyze (multipart FormData)
        └─ Next.js Route Handler (Node runtime)
              └─ Google Gemini API (multimodal: images/PDF + prompt)
                    └─ JSON result returned to browser
```

There is **no server-side data layer, no API for CRUD, and no middleware**. Pages are client components that call Supabase directly from the browser using the anon key and the logged-in user's session. The only backend endpoint is the Gemini analysis route.

### 3.2 Directory / file map

```
app/
  layout.tsx                  Root layout (Geist fonts, metadata still "Create Next App")
  globals.css                 Tailwind import, theme vars, scrollbar styling
  page.tsx                    Login page (email/password + Google) with Suspense
  auth/callback/page.tsx      OAuth return handler (PKCE code exchange + implicit flow)
  setup/page.tsx              Registration / Google profile completion
  main/page.tsx               Main student dashboard: upload, analyze, gallery, history
  gallery/page.tsx            All uploaded files, download and delete
  profile/page.tsx            Read-only profile view
  profile/edit/page.tsx       Profile edit (localStorage first, then Supabase)
  admin/page.tsx              Admin dashboard: stats, student table, detail/edit/delete modals
  components/ResultModal.tsx  Analysis result modal + PDF export
  api/analyze/route.ts        Gemini analysis endpoint

lib/
  supabaseClient.ts           Singleton browser Supabase client (throws if env missing)
  auth.ts                     signUp / signIn / signOut / getSessionUser / Google OAuth
  profiles.ts                 Profile and admin queries; my portfolios/analyses
  storage.ts                  Avatar/portfolio upload, analysis insert, portfolio delete
  database.types.ts           Profile/Portfolio/AnalysisResult types + role resolution

supabase/
  schema.sql                  Base tables, trigger, RLS, storage buckets/policies
  add_career_en.sql           Adds analysis_results.career_en
  add_raw_input.sql           Adds raw_input and warnings
  add_skill_notes.sql         Adds technical_note / soft_note / management_note
  fix_rls_admin.sql           Broadens RLS for the admin dashboard
  fix_storage_delete.sql      Allows owners to delete their storage objects

public/                       Default create-next-app SVGs only
```

### 3.3 Data flow summary

1. Browser authenticates with Supabase Auth; the session is cached by the Supabase client and mirrored into `localStorage` for UI fallbacks.
2. Student selects files, optionally adds free text, and the browser posts `multipart/form-data` to `/api/analyze`.
3. The route handler calls Gemini, validates/sanitizes the JSON, and returns the result.
4. The browser uploads the original files to Supabase Storage, inserts `portfolios` rows, then inserts one `analysis_results` row per file.
5. Dashboard/gallery/history read the same tables through the Supabase client; admins read all rows subject to RLS.

---

## 4. Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Server page | Public landing page; introduces features and CTAs to `/login` and `/setup` |
| `/login` | Client page | Login; detects existing session; routes by role |
| `/auth/callback` | Client page | Completes Google OAuth, then `/setup` or `/main`/`/admin` |
| `/setup` | Client page | Sign-up or OAuth profile completion + avatar upload |
| `/main` | Client page | Upload/analyze workflow, portfolio gallery, history |
| `/gallery` | Client page | Full file library with download/delete |
| `/jobs` | Client page | Job board + company directory + profile-based matching |
| `/` | Server page | Public landing page; introduces features and CTAs to `/login` and `/setup` |
| `/login` | Client page | Login; detects existing session; routes by role |
| `/auth/callback` | Client page | Completes Google OAuth, then `/setup` or `/main`/`/admin` |
| `/setup` | Client page | Sign-up or OAuth profile completion + avatar upload |
| `/main` | Client page | Upload/analyze workflow, portfolio gallery, history |
| `/gallery` | Client page | Full file library with download/delete |
| `/jobs` | Client page | Job board + company directory + profile-based matching (fetches from `/api/jobs`) |
| `/resume` | Client page | Resume builder, printable preview, PDF, share link + QR Code |
| `/resume/demo` | Client page | Public resume demo for exploration mode (example resume + QR) |
| `/resume/[id]` | Client page (dynamic) | Public resume viewer by ID (real QR Code page, server-rendered on demand) |
| `/resume/view` | Client page (Suspense) | Public resume viewer for `?slug=` or `?d=` links (legacy fallback) |
| `/analytics` | Client page | Career analytics dashboard (6-dimension radar chart, readiness, skill frequency) |
| `/profile` | Client page | Profile summary |
| `/profile/edit` | Client page | Edit profile and avatar |
| `/admin` | Client page | Admin dashboard (dynamic career category grouping) |
| `/admin/jobs` | Client page | Admin company/job management |
| `/api/analyze` | Route handler (POST) | Gemini multimodal analysis (auth required, rate-limited, 6-dimension radar_scores + career_category) |
| `/api/jobs` | Route handler (GET/POST) | Job listings (GET public, POST admin-only create) |

The `/` landing page and `/layout.tsx` root layout are server components; the feature pages (`/jobs`, `/resume`, `/analytics`, `/admin/jobs`) are client components. `/resume/[id]` is a dynamic route segment. The root layout renders the `Navbar` client component (`components/Navbar.tsx`) on every page.

---

## 5. Data model (Supabase)

Defined in `supabase/schema.sql` plus additive migrations.

### `profiles`
- `id uuid PK` → `auth.users(id)` (cascade)
- `email text unique`
- `name`, `avatar_url`, `institution` (default "มหาวิทยาลัยราชภัฏเลย"), `major` (default `-`), `bio`, `github_link`
- `role text` — `student` | `admin`
- `created_at`, `updated_at` (trigger `handle_updated_at`)

### `portfolios`
- `id uuid PK`
- `user_id` → `profiles(id)` (cascade)
- `title`, `file_url`, `file_type`, `file_size`, `created_at`
- Indexed on `user_id`

### `analysis_results`
- `id uuid PK`
- `portfolio_id` → `portfolios(id)` (cascade)
- `user_id` → `profiles(id)` (cascade)
- `skills text[]`
- `career text` (free-form Thai)
- `career_en text` (one of 6 canonical English careers, for admin stats)
- `career_category text` (broad industry category, e.g. "เทคโนโลยีสารสนเทศ")
- `radar_scores jsonb` (6 dimensions: technical, soft, management, accuracy, communication, creativity)
- `accuracy`, `technical`, `soft`, `management` (ints)
- `recommendations jsonb`
- `raw_input text`
- `warnings text[]`
- `technical_note`, `soft_note`, `management_note`
- `analyzed_at`
- Indexed on `user_id` and `portfolio_id`

### `job_categories` (new in upgrade_v2.sql)
- `id uuid PK`
- `name text` (unique, e.g. "เทคโนโลยีสารสนเทศ")
- `description text`
- `color text` (hex color for UI)
- `is_active boolean`
- `created_at`, `updated_at`

### `companies`, `jobs`, `resumes`
(unchanged from career platform upgrade; see `supabase/add_career_platform.sql`)

### Storage
- Buckets `avatars` and `portfolios`, both **public read**.
- Upload allowed to authenticated users; delete is restricted to the owner's folder (`<user_id>/...`).

### RLS state
- Base schema limits rows to the owner.
- `fix_rls_admin.sql` then broadens **select/update/delete on profiles, select on portfolios and analysis_results to every authenticated user** (explicitly marked as prototype-level). Admin role is not enforced in the database.
- Consequently, any authenticated client can read all students' data; the `/admin` gate is only a `localStorage.userRole` check.

---

## 6. Key features and flows

### 6.1 Authentication and roles
- Email/password via `supabase.auth.signInWithPassword`.
- Google OAuth via `signInWithOAuth` with redirect to `/auth/callback`.
- Callback handles both PKCE (`exchangeCodeForSession`) and implicit (session already in hash).
- Registration (`/setup`) calls `auth.signUp`, then upserts a `profiles` row; avatars are uploaded to the `avatars` bucket.
- Google-first users are sent to `/setup?email=...&oauth=1` to complete name/institution/major and optionally set a password.
- Role resolution (`resolveRole`):
  - `admin@lru.ac.th`, `superadmin@lru.ac.th` → admin
  - any `*@admin.com` → admin
  - everyone else → student
- Login writes `userRole`, `userEmail`, and (students) `userProfile` to `localStorage`; this cache is used as a fallback throughout the app.
- Main and admin pages redirect to `/` based on `localStorage` and/or session; there is no route-level server guard.
- Sign-out clears both Supabase session and localStorage.

### 6.2 Student dashboard (`/main`)
- Drag-and-drop or file picker (PDF/JPG/PNG, max 10 MB each).
- Import from the user's existing Supabase gallery (multi-select modal, or click-to-select cards).
- Preview selected files, then enter optional free text: extra skills, details, and desired career.
- Client-side downscaling of images to max 1024 px, JPEG quality 0.8 (to stay under request-size limits).
- Analysis is sent in batches of up to 5 files (up to 10 files total) to `/api/analyze`.
- Batch results are merged: skills union/dedupe (max 12), 6-dimension `radar_scores` averaged, `career_category` taken from the first non-empty batch, recommendations/warnings concatenated.
- Scores are read from `/api/analyze` → `radar_scores` (`technical`, `soft`, `management`, `accuracy`, `communication`, `creativity`), clamped to 0–100, and persisted to `analysis_results.radar_scores` / `career_category` together with the legacy `technical`/`soft`/`management`/`accuracy` columns.
- Each file is persisted:
  - New file → upload to `portfolios` bucket + insert `portfolios` row.
  - Existing gallery file → reuse the existing `portfolio_id`.
  - Then insert one `analysis_results` row per file.
- Failures are partially tolerated: one file failing to save is skipped; analysis result can still be shown, and a save failure surfaces a Thai notice.
- Results appear inline as the **Unified 3-Tier AI Analysis Layout** — Tier 1 `สรุปสายงานที่สอดคล้อง` Career Match Banner (recommended role + `วิเคราะห์เมื่อ`/file metadata + `ดูผลฉบับเต็ม`), Tier 2 2-column RadarChart (6 axes, unclipped Thai labels) + 2x3 grid of 6 skill cards (`X/100` badges, mini bars, notes), Tier 3 `ทักษะที่ตรวจพบจากเอกสาร` tag cloud — all shared via `components/AnalysisResultView.tsx`; `ResultModal` renders the identical tiers with a `ดาวน์โหลด PDF` action in the banner. **"ประวัติการวิเคราะห์"** opens a slide-over drawer that lists the 20 most recent analyses with loading/error states, and clicking an item loads it into the same 3-tier view.
- Gallery header is a single-row toolbar: title + `ดูรูปทั้งหมด (N) →` on the left; `หมวดหมู่:` select, `เลือกรายการ`, and `+ เพิ่มรูปสู่คลัง` on the right. The gallery section shows the 6 newest files, supports selecting several and sending them to analysis, and direct upload to the gallery without analysis.

### 6.3 AI analysis (`POST /api/analyze`)
- Accepts multipart `files`, `interestText`, `major`, `institution`.
- Rejects missing `GEMINI_API_KEY`, invalid form data, all-files-oversized, and empty input.
- Up to 6 files per request, each ≤ 10 MB; files become base64 `inlineData`.
- Sends a long Thai/English system prompt instructing the model to:
  - Classify each file as CERTIFICATE / TRANSCRIPT / PROJECT / REPORT / IRRELEVANT.
  - Extract 6–12 skills in Thai (with English terms where useful).
  - Suggest a free-form Thai career (max 60 chars), plus one of 6 canonical English careers or `null`.
  - Score technical/soft/management and confidence (0–100), with consistency rules.
  - Produce exactly 2 evidence-citing recommendations, per-file warnings for irrelevant files, and skill notes.
  - Return strict JSON only.
- Model fallback chain (quota/overload aware):
  `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-2.5-flash-lite`.
  Primary model uses `thinkingBudget: 4096` and `temperature: 0.2`; fallbacks use temperature only.
- Retries transient 503/timeouts once (1.5 s backoff); quota (429) skips to the next model.
- Output is sanitized/validated: JSON fences stripped, numbers clamped, arrays truncated.
- Honesty rule: if confidence < 30 and fewer than 3 skills, career is forced to `null`.
- Errors return Thai messages (`429` for quota, `500` otherwise).

**Response shape (sanitized):**
```json
{
  "skills": ["..."],
  "career": "สายอาชีพภาษาไทย",
  "career_category": "หมวดอาชีพกว้าง",
  "careerEn": "Software Engineer | Data Scientist | UX Designer | Cybersecurity Analyst | Marketing Strategist | Finance Analyst | null",
  "radar_scores": { "technical": 0, "soft": 0, "management": 0, "accuracy": 0, "communication": 0, "creativity": 0 },
  "accuracy": 0,
  "technical": 0,
  "soft": 0,
  "management": 0,
  "recommendations": [{ "title": "...", "detail": "..." }],
  "warnings": ["ชื่อไฟล์: เหตุผล"],
  "textWarning": "string | null",
  "skillNotes": { "technical": "string | null", "soft": "string | null", "management": "string | null", "communication": "string | null", "creativity": "string | null" },
  "_model": "gemini-..."
}
```

### 6.4 Result modal (`ResultModal.tsx`)
- Career summary (maps the 6 English careers to Thai labels).
- Unified 3-tier layout shared with `/main` via `components/AnalysisResultView.tsx`: Career Match Banner (with `ดาวน์โหลด PDF` action), 6-axis RadarChart + 6 skill cards, and the detected-skills tag cloud. The legacy 3-bar horizontal progress layout is removed.
- Skill chips, raw input + text warning, irrelevant-file warnings, low-confidence banner.
- Model badge, including a hint when a `lite` fallback model was used.
- **PDF export** renders the modal with `html2canvas-pro` at 2× and slices it into A4 pages with `jsPDF`, hiding buttons, temporarily expanding scroll containers, and waiting for fonts.

### 6.5 Gallery (`/gallery`)
- Lists the logged-in user's portfolios from Supabase.
- Image previews; non-image types show a file icon and link to the original.
- Download button; two-step delete ("ยืนยันลบ?") that removes the storage object and the DB row (analysis rows cascade).

### 6.6 Profile
- `/profile` reads localStorage immediately, then overwrites with the Supabase profile if a session exists.
- `/profile/edit` writes localStorage first (always), then uploads a new avatar and upserts the `profiles` row. DB failures are swallowed so the user still reaches `/main`.

### 6.7 Admin dashboard (`/admin`)
- Entirely client-rendered; guarded by `localStorage.userRole === 'admin'`.
- Loads all profiles, portfolios, and analyses via `listProfilesForAdmin()`.
- Filters out admin accounts, builds one row per student with file count, latest analysis, skills, and status.
- KPI cards: total students, analyzed portfolios / total files, most common skill.
- Career-distribution bar chart over the 6 canonical English careers plus "other".
- Student table: search (name/ID/email), career filter, status filter, pagination (7 per page).
- Detail modal: student metadata, skills, file grid filtered by analyzed/pending, image preview, analysis history → full `ResultModal`.
- Edit modal: name, institution, major, role.
- Delete confirmation; deletion of the profile cascades to portfolios and analyses. Failures surface an RLS hint.

---

## 7. Project conventions and quirks

- Client components use dynamic `import()` inside handlers/effects to pull in Supabase helpers, apparently to keep the initial bundle small.
- The app is “local-first, DB-second”: localStorage is written before network calls and used as a fallback on nearly every page.
- Thai comments throughout explain product decisions (quota saving, OAuth edge cases, PDF handling).
- Root metadata is now the LRU Portfolio title/description with `lang="th"`; `README.md` is still the default create-next-app text.
- Types for the same analysis result are redeclared inline in `main/page.tsx`, `admin/page.tsx`, `ResultModal.tsx`, and `lib/storage.ts` rather than shared.
- `lib/database.types.ts` describes the base schema; later columns (`career_en`, `raw_input`, `warnings`, notes) are handled with local casts.

---

## 8. Known weaknesses / risks

1. **Authorization is partly client-side.** `/admin` and `/main` still trust `localStorage.userRole` for UI gating; `/api/analyze` and `/api/jobs` (POST) have server-side session checks but other pages do not have middleware.
2. **RLS hardened** in `supabase/upgrade_v2.sql`: base tables now have owner-only and admin-only policies; `job_categories` has public read + admin write. Career platform tables (`companies`, `jobs`, `resumes`) hardened in `add_career_platform.sql`.
3. **Public storage buckets** expose portfolio files and avatars to anyone with a URL.
4. **Rate limiting** on `/api/analyze` (10 req/min per IP); `/api/jobs` GET is public (no rate limit).
5. **File-size limits**: 5 MB PDF output limit enforced in `lib/pdf.ts`. Dashboard/gallery uploads (`/main`, `/gallery`) are capped at **5 MB** per file in the UI; `POST /api/analyze` still accepts up to 10 MB per request file, so the API ceiling is looser than the UI.
6. **No tests, no CI config, no error boundary**, and lint-only quality checks.
7. **Duplicated domain types** increase drift risk (e.g. `AnalysisResult` in types vs. query shapes).
8. **Stale scaffolding**: default README/metadata, unused `public/*.svg`.
9. **Silent `catch {}` blocks** remain in some legacy flows (e.g. Supabase connection failures); new code paths return explicit errors.
10. **`admin@lru.ac.th` is hard-coded both in code and UI text**, and any `@admin.com` email becomes an admin by convention.

---

## 9. How to run (from `package.json`)

```bash
npm install
npm run dev     # next dev
npm run build   # next build
npm start       # next start
npm run lint    # eslint
```

Required environment variables (in `.env`, not committed):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.

Supabase setup order: run `supabase/schema.sql`, then the additive migrations (`add_career_en.sql`, `add_raw_input.sql`, `add_skill_notes.sql`, `add_career_platform.sql`, `upgrade_v2.sql`, `fix_rls_admin.sql`, `fix_storage_delete.sql`) in the SQL Editor.

---

## 10. Career platform upgrade (2026-11-14)

Scope: landing page, resume + QR, job matching, and career analytics. **No payment, subscription, or checkout code exists in any module.**

### 10.1 Routes and entry points
- `/` — public landing page. Sections: hero with interactive 6-axis Radar Chart career switcher (IT / Business / Creative), 4 real highlights, 3-step flow, employer QR section, final CTA. CTAs go to `/login` and `/setup`. Removed vanity stats bar and payment copy.
- `/login` — previous `/` login page moved here. All existing auth flows are unchanged.
- `/main` — gained a secondary feature navigation bar (`/jobs`, `/resume`, `/analytics`, `/gallery`).
- `/admin` — gained a header link to `/admin/jobs`; dynamic career category grouping from `job_categories` table.
- Guards and sign-out redirects that previously pointed to `/` now point to `/login`; signing out from `/main`/`/admin` returns to `/login`.
- `/resume/demo` — public resume demo page for exploration mode (example resume + QR Code).
- `/api/jobs` — public GET for job listings; admin-only POST for job creation.

### 10.2 Resume + QR (`/resume`, `/resume/[id]`, `/resume/view`)
- Form fields: personal info, summary, skills, certifications, experience, education, projects.
- Draft persists to `localStorage` under `lru_resume_draft`; profile data from Supabase/localStorage seeds empty fields.
- Preview is a printable A4 sheet (`app/components/ResumePreview.tsx`).
- PDF export uses `html2canvas-pro` + `jspdf` (`lib/pdf.ts`), slicing long content into A4 pages, with a **5 MB output size limit** enforced before download.
- Share flow:
  - Logged in: upserts `resumes` row (`id`, `slug`, `data`, `is_public`) and shares **`/resume/[id]`** (real dynamic QR Code page).
  - Fallback/not signed in: compresses resume JSON with `lz-string` into `/resume/view?d=...` (legacy).
  - Legacy `/resume/view?slug=...` still supported for backward compatibility.
  - QR codes are rendered with `qrcode.react` and can be downloaded as PNG.
  - Links longer than 1,800 characters are refused for QR generation and the user is prompted to sign in for a short slug link.
- `/resume/[id]` is a dynamic route (server-rendered on demand) for viewing public resumes by ID.
- `/resume/view` is public (no auth) and wrapped in `Suspense` because it uses `useSearchParams`.
- Print CSS (`app/globals.css`) hides `[data-print-hide]`, removes sheet chrome, sets A4 page margins, and adds PDF thumbnail preview styles.

### 10.3 Job matching and company directory (`/jobs`)
- `/api/jobs` (GET) loads `jobs` joined with `companies` from Supabase; falls back to curated demo data from `lib/demoData.ts` labeled “ข้อมูลตัวอย่าง”.
- Admin POST to `/api/jobs` creates new job listings (admin email required).
- Matching (`lib/jobMatching.ts`):
  - Skill normalization + synonym groups (e.g. React/React.js, SQL/PostgreSQL).
  - Score = required-skill coverage (65%) + career alignment (20%) + location/remote preference (12%) + nice-to-have skills (8%), capped at 100.
  - Each match exposes matched/missing skills and human-readable reasons.
- Dynamic skill matching: user skills are collected from resume draft + latest Supabase analysis + manual skills entered on the page; matches update in real time as preferences change.
- Dynamic `% Match` calculation per job based on user skills and job requirements.
- Filters: search, career, location, work mode, company, saved-only, sort by match/newest.
- Preferences and saved jobs persist in `localStorage` (`lru_job_prefs`, `lru_saved_jobs`).
- Company directory sidebar filters the board by company.
- Public Exploration Mode badge shown when not signed in; full matching requires login for personalized results.

### 10.4 Career analytics (`/analytics`)
- Reads `listMyAnalyses()` + resume draft; falls back to resume-only estimates when no analysis exists.
- Six-axis dependency-free SVG radar chart (`app/components/RadarChart.tsx`): technical, soft, management, accuracy, communication, creativity.
- KPI cards for all 6 dimensions, top match, strong-match count, average match score, missing skills.
- Career readiness bars for the 6 canonical careers.
- Skill-frequency bars and a recent-analysis table.
- Public Exploration Mode badge shown when not signed in; links to `/main` and `/resume` for full access.
- Clear empty state linking to `/main` and `/resume`.

### 10.5 Admin company/job management (`/admin/jobs`)
- Guarded by `localStorage.userRole === 'admin'`.
- Tabs for companies and jobs; create company, create job, delete company/job, toggle job active.
- Shows a targeted error with the migration filename if `companies`/`jobs` do not exist.
- New SQL: `supabase/add_career_platform.sql`
  - `companies` (`id`, `name`, `industry`, `location`, `website`, `description`, `logo_url`, timestamps).
  - `jobs` (`company_id` cascade, title/description, `responsibilities text[]`, location, `work_mode` check, employment type, `required_skills text[]`, `nice_to_have text[]`, `career_en`, salary, apply URL, `is_active`, timestamps).
  - `resumes` (`user_id` cascade, unique `slug`, `data jsonb`, `is_public`, timestamps).
  - RLS security hardened: companies/jobs public read only for `is_active = true`; write restricted to admin emails (`*@admin.com`, `admin@lru.ac.th`, `superadmin@lru.ac.th`) via JWT claim check; resumes owner-only CRUD + public read when `is_public = true`. Grants included.

### 10.6 Global Navbar (`components/Navbar.tsx`)
- Rendered in `app/layout.tsx` so it appears on **every page** including landing, login, and dashboard.
- Five clean center links: `หน้าแรก` (`/`), `วิเคราะห์พอร์ต` (`/main`), `จับคู่งาน` (`/jobs`), `เรซูเม่` (`/resume`), `วิเคราะห์อาชีพ` (`/analytics`). `คลังผลงาน` was intentionally removed from the top bar to reduce clutter (the gallery is still reachable from `/main` and directly at `/gallery`).
- Unauthenticated state: `เข้าสู่ระบบ` (`/login`) and `สมัครฟรี` (`/setup`).
- Authenticated state (right side): profile pill with a `w-4 h-4` user icon and the user's display name (or `โปรไฟล์`) linking to `/profile`; `แอดมิน` pill linking to `/admin` **only when `profile.role === 'admin'`**; and the `ออกจากระบบ` button.
- Mobile: the five center links collapse into a hamburger drawer that also contains the `/profile` entry, the role-gated `/admin` entry, and sign-out/login actions.
- Active route highlighting for all links, including `/profile` and `/admin`.
- Replaced the older `app/components/GlobalNavbar.tsx`, which remains in the tree for reference but is no longer mounted.

### 10.7 Public Exploration Mode
- Unauthenticated users can browse `/jobs` (demo data), `/analytics` (resume-only estimates), and `/resume` (builder + QR generation).
- Blue “โหมดสำรวจแบบสาธารณะ” badge appears on `/jobs` and `/analytics` when not signed in.
- Full personalized features (saved jobs, analysis history, resume persistence to DB) require login.

### 10.8 API/RLS Security Hardening
- `POST /api/analyze`: requires valid Supabase session (401 if unauthenticated); in-memory rate limiter (10 requests/min per IP, 429 if exceeded). Returns `career_category` and 6-dimension `radar_scores`.
- `POST /api/jobs`: admin-only (email-based JWT claim check); creates job listings.
- `supabase/upgrade_v2.sql`: adds `career_category` and `radar_scores` columns to `analysis_results`; creates `job_categories` table; strict RLS policies (owner-only for profiles/portfolios/analysis_results, admin-only writes).
- `supabase/add_career_platform.sql`: RLS policies restricted — companies/jobs writes limited to admin emails via JWT claim; resumes owner-only; public read only for active jobs and public resumes.

### 10.9 New dependencies
- `qrcode.react@^4.2.0` — QR rendering.
- `lz-string@^1.5.0` — URL-safe resume payload compression.

### 10.10 Verification
- `npx tsc --noEmit` — pass.
- `npm run lint` — pass.
- `npm run build` — pass (Next.js 16.3.6, Turbopack; 19 static pages + `/api/analyze`, `/api/jobs` dynamic routes).

### 10.11 Module F: Universal Registration (`/setup`)
- Registration is universal for all job seekers — not restricted to students or LRU.
- Email placeholder changed from `student@lru.ac.th` to `name@example.com`.
- `user_status` selector with 4 options: `นักศึกษา / บัณฑิตจบใหม่`, `พนักงานประจำ / คนทำงาน`, `ฟรีแลนซ์ / อาชีพอิสระ`, `ผู้หางาน / บุคคลทั่วไป`.
- `มหาวิทยาลัย / สถานศึกษา` renamed to `สถานศึกษา / องค์กรปัจจุบัน (ไม่บังคับ)` — optional, no LRU default.
- `สาขาวิชา` renamed to `สาขาวิชา / สายงานที่เชี่ยวชาญ`.
- Stock person photo replaced with camera/initials avatar upload placeholder (strict 5 MB max validation).
- "สมัครด้วย Google" OAuth button added at top of form.
- Password strength validation: minimum 8 characters, with visual strength indicator.
- PDPA consent checkbox required before submission.
- `lib/database.types.ts`: Added `UserStatus` type, `USER_STATUS_OPTIONS`, `user_status` field on `Profile`, `institution`/`major` now `string | null`.
- `lib/profiles.ts`: Added `upsertMyProfileWithStatus`, updated `adminUpdateProfile` to include `user_status`.
- `lib/auth.ts`: Updated `signUpReal` to accept `string | null` for `institution`/`major` and optional `user_status`.
- `supabase/upgrade_v2.sql`: Required for `user_status` column support on `profiles` table.

---

## 11. Module Completion Tracker (A–M) & Production Status (2026-11-20)

### 11.1 Spec sources

`upgrade_spec.md` formally defines **Module A, B, C, D, and F only** (the file ends at Module F). Modules **I** and **J** are defined operationally in `qa_report.md`. There is **no Module E, G, H, K, or L** anywhere in the repository, and `upgrade_spec.md` contains **no Module M** — the navbar/profile restoration completed on 2026-11-20 is recorded here as Module M per the task request, not as a spec section.

### 11.2 Status matrix

| Module | Scope | Status | Evidence |
|---|---|---|---|
| A | Landing & welcome page, CTAs to login/register | ✅ Complete | `app/page.tsx` — hero, radar preview, 3-step flow, QR section, CTAs to `/login` `/setup`; no payment copy |
| B | Resume builder + QR Code generator | ✅ Complete | `app/resume/page.tsx`, `app/resume/[id]/page.tsx`, `app/resume/view/page.tsx`, `app/resume/demo`, `app/components/ResumePreview.tsx`, `app/lib/pdf.ts` (5 MB output cap), `qrcode.react`, `lz-string` |
| C | Job matching & company directory | ✅ Complete (reframed) | AI skill-driven recommender at `app/jobs/page.tsx` + GET-only `app/api/jobs/route.ts`; external apply links (`ไปสมัครที่เว็บไซต์ต้นทาง ↗`); matching in `lib/jobMatching.ts`; admin CRUD at `app/admin/jobs`; no user-generated job posting |
| D | Career & student analytics | ✅ Complete | `app/analytics/page.tsx` + 6-axis `app/components/RadarChart.tsx`; KPI cards, readiness bars, skill frequency, recent analyses |
| E | — | ⚪ Not defined | No Module E exists in `upgrade_spec.md` |
| F | Universal registration | ✅ Complete | `app/setup/page.tsx`: `name@example.com` placeholder, 4 `user_status` options, optional institution/major, 5 MB avatar upload, Google OAuth, 8-char password strength, required PDPA consent |
| G | — | ⚪ Not defined | No Module G exists in the repo |
| H | — | ⚪ Not defined | No Module H exists in the repo |
| I | Mock data elimination + Thai-only external integration | ✅ Complete | `qa_report.md` I1–I11; no demo jobs, no foreign feeds, API returns only real Thai Supabase listings |
| J | Strict RLS + UI bug fixes | 🟡 Code complete, rollout pending | `supabase/fix_rls_strict.sql` exists (owner-only `auth.uid() = user_id` policies + `@admin.com` bypass); must still be executed in the Supabase SQL Editor to take effect |
| K | — | ⚪ Not defined | No Module K exists in the repo |
| L | — | ⚪ Not defined | No Module L exists in the repo |
| M | Unified "ย้ายหมวดหมู่ไฟล์" Popup Modal + category management | ✅ Complete | `app/main/page.tsx`, `app/gallery/page.tsx` — remove inline `<select>` dropdowns, unified `moveModal` dialog with 4 radio-category options from `lib/portfolio.ts`, SHA-256 dedup, 5MB upload limit, Storage + DB deletion with `.eq('user_id', user.id)` RLS filters, `assignCategories` + Thai success notice; batch toolbar: "เลือกทั้งหมด", "ย้ายหมวดหมู่ที่เลือก (N)", "ลบรูปที่เลือก (N)"; image cards: category badge + "ย้ายหมวด" + Delete buttons |
| N | Unified 3-Tier AI Analysis Layout + RadarChart label fix | ✅ Complete | `components/AnalysisResultView.tsx` (shared `AnalysisResultView` composing CareerMatchBanner / AnalysisRadarGrid / DetectedSkillsCloud + `normalizeScoreDimensions`), `app/components/RadarChart.tsx` (symmetric padded viewBox + per-label textLength cap — no clipped Thai axis labels), `app/main/page.tsx`, `app/components/ResultModal.tsx`; legacy 3-bar layout deleted; specs updated in `upgrade_spec.md` Module N and `qa_spec.md` TC-10 |

### 11.3 Module M — Unified "ย้ายหมวดหมู่ไฟล์" Popup Modal (2026-11-24)

- Kept the five clean center links unchanged: `/`, `/main`, `/jobs`, `/resume`, `/analytics`.
- **Move Category Popup Modal** (shared by `/main` and `/gallery`):
  - Clicking "ย้ายหมวดหมู่ที่เลือก (N)" or a card's "ย้ายหมวด" button opens the modal immediately, showing how many items are being moved (`N รายการ`).
  - Inside the modal, render the 4 target categories from `lib/portfolio.ts` (`เกียรติบัตร / ใบรับรอง`, `ผลงาน / โปรเจกต์`, `กิจกรรม / อบรม`, `เอกสารอื่นๆ`) as clear clickable radio/option cards with active highlight styling.
  - Clicking "ยืนยันการย้ายหมวดหมู่" updates `portfolios` (`in('id', targetIds).eq('user_id', user.id)), closes the modal, immediately updates local state and category tab counts, and displays the Thai confirmation banner.
- **Category toolbar** (both pages): inline `<select>` dropdowns removed; replaced with read-only category badge showing current selection.
- **Image cards** (both pages): inline `<select>` removed; each card now has a clean current-category badge, a "ย้ายหมวด" button, and a Delete (`Trash2`) button.
- **SHA-256 duplicate checks**, **5MB upload limit**, **Storage + DB deletion**, and **cloud picker modal sync** remain intact in both pages.
- Mobile: hamburger drawer contains the five links plus `/profile`, the role-gated `/admin`, and sign-out / login-signup actions. It closes automatically on navigation.
- No changes were made to auth gates or 5 MB validation on `/main`; category pills now use shared `lib/portfolio.ts` constants.

### 11.4 Production status

- **Build health:** `npx tsc --noEmit` pass, `npm run build` pass (Next.js 16.3.6 / Turbopack, 22 static routes + dynamic `/api/analyze`, `/api/jobs`, `/resume/[id]`).
- **Routes live:** `/`, `/login`, `/setup`, `/auth/callback`, `/main`, `/gallery`, `/jobs`, `/resume`, `/resume/demo`, `/resume/[id]`, `/resume/view`, `/analytics`, `/profile`, `/profile/edit`, `/admin`, `/admin/jobs`, `/api/analyze`, `/api/jobs`.
- **Auth model:** client-side guards on personal pages; `/api/analyze` requires a Supabase session (401) and rate-limits at 10 req/min per IP; `/api/jobs` is GET-public and admin-only for writes.
- **Upload limits:** `/main` and `/gallery` enforce **5 MB** per file for PDF/JPG/PNG; `/api/analyze` caps at 10 MB per file with up to 6 files per request.
- **Category organization:** the five gallery buckets (`ทั้งหมด`, `เกียรติบัตร / ใบรับรอง`, `ผลงาน / โปรเจกต์`, `กิจกรรม / อบรม`, `เอกสารอื่นๆ`) ใช้ `lib/portfolio.ts` เป็นต้นทางเดียว (single source of truth); hash-based duplicate detection + localStorage fallback เมื่อคอลัมน์ `category` ใน DB ยังไม่มี.
- **Pending manual DB steps:** run `supabase/fix_rls_strict.sql` (Module J) ใน Supabase SQL Editor เพื่อให้มี RLS policies ติดตั้งจริงฐานข้อมูล; หากเคยนำไปใช้ก็รัน `supabase/lockdown_jobs.sql` ด้วย
- **Payment scope:** ไม่มี logic การชำระเงิน, การสมัครสมาชิก, หรือ "7 วัน / 50 บาท" ในโค้ดใดๆ ทั้งสิ้น
- **QA documentation:** `qa_report.md` บันทึกทุกเงื่อนไข TC-01 ถึง TC-25 ครบถ้วน พร้อมหลักฐานทางเทคนิคทุกรายการ; `TC-05` ผ่านการตรวจสอบแล้วสอดคล้องกับ Module M Work — ย้ายหมวดหมู่ผ่าน Popup Modal ทั้งรายการเดียวและหลายรายการ, notมี `<select>` บน toolbar/การ์ด, modal แสดง `N รายการ` + 4 หมวดปลายทาง, confirm อัปเดต DB/local state/counts

### 11.6 Production status (2026-11-24)

- **Build health:** `npx tsc --noEmit` pass, `npm run lint` pass (0 errors, pre-existing warnings only), `npm run build` pass (Next.js 16.3.6 / Turbopack, 19 static routes + dynamic `/api/analyze`, `/api/jobs`, `/resume/[id]`).
- **3-Tier UI entry point:** `components/AnalysisResultView.tsx` is the single shared component rendered by both the `/main` active-analysis section and `app/components/ResultModal.tsx`; `app/components/AnalysisResultTiers.tsx` was removed.
- **Legacy 3-bar layout:** confirmed deleted — no `ทักษะเฉพาะทาง (Technical)` / `ทักษะทั่วไป (Soft Skills)` / `การบริหารจัดการ (Management)` progress rows remain in `/main` or the analysis modal.
- **Normalization:** `normalizeScoreDimensions()` clamps every axis to 0–100 and derives `communication`/`creativity`/`accuracy` for legacy rows whose `radar_scores` JSON is partial or null, preventing `0%`/`undefined`/`NaN` output.

### 11.7 Module N completion (2026-11-25)

- Phase 0 audit confirmed the existing 6-axis `app/components/RadarChart.tsx` and its padded viewBox reuse without new dependencies.
- `components/AnalysisResultView.tsx` now provides Tier 1 (`สรุปสายงานที่สอดคล้อง` banner with role, metadata, action slot), Tier 2 (`grid-cols-1 lg:grid-cols-12 gap-6 items-center`; left `lg:col-span-5` radar, right `lg:col-span-7` `grid-cols-1 sm:grid-cols-2 gap-3` six skill cards), and Tier 3 (`ทักษะที่ตรวจพบจากเอกสาร` with `X ทักษะ` count badge).
- `app/main/page.tsx` passes the `ดูผลฉบับเต็ม` action; `app/components/ResultModal.tsx` passes `ดาวน์โหลด PDF` (same html2canvas-pro/jsPDF pipeline, `data-pdf-hide` footer preserved).
- Verification: `npx tsc --noEmit` exit 0, `npm run lint` 0 errors, `npm run build` exit 0.

### 11.8 Module O completion (2026-11-25)

- Phase 0 audit confirmed existing schemas/types; no silent `catch {}` added, all async UI states (skeleton/loading/error/empty) implemented.
- DB: `supabase/migrations/20261125_job_search_cache.sql` verified complete (`job_search_cache` + RLS + authenticated policies); new `supabase/migrations/20261125_analysis_job_fields.sql` adds `recommended_role`/`job_keywords` to `analysis_results` (manual SQL Editor run required).
- `app/api/analyze/route.ts`: Gemini prompt now emits `recommended_role` (TH) + `job_keywords` (3–5 EN/TH synonyms + stack) with a Thai→English fallback map for legacy rows; duplicate-run guard via `forceReanalyze` + sorted `fileIds`/`portfolio_id` match returns `{ cachedAnalysis: true }` without Gemini call or duplicate insert.
- `app/api/jobs/route.ts`: new `role`/`keywords`/`level`/`forceRefresh` branch — 24h `job_search_cache` lookup (`query_key = primaryEnglishRole:level`), live JSearch RapidAPI fetch with dedupe/normalize/upsert, and unconditional `fallbackLinks` (Google Jobs, LinkedIn, JobsDB TH, JobThai, Blognone); never returns HTTP 500. Shared helpers in `lib/jobSearch.ts`. Existing DB listing GET path preserved.
- UI: `app/components/RadarChart.tsx` rewritten to `viewBox 0 0 460 340` (cx=230, cy=170, maxRadius=115, labels at radius 132, fontSize 13/600, correct anchors); duplicate dark PDF button removed from `AnalysisResultView` banner and `ResultModal`; new `components/JobRecommendationsSection.tsx` (filter pills, keyword chips, cache badge, refresh, skeletons, job cards, 5-platform search bar) wired into `app/main/page.tsx` with un-analyzed Empty State + Quick Explore chips and `วิเคราะห์ใหม่ (บังคับ)` button; `lib/profiles.ts` `listMyAnalyses` now selects `recommended_role`/`job_keywords`.
- Analytics: `/analytics` radar defaults to latest analysis with `คะแนนล่าสุด (Latest)` / `คะแนนสูงสุดรายด้าน (Peak per Axis)` toggle; `buildSkillFrequency` dedupes skills case-insensitively across history with `พบใน N เอกสาร` evidence badge.
- Verification: `npx tsc --noEmit` exit 0, `npm run lint` 0 errors (pre-existing warnings only), `npm run build` exit 0.
- Pending manual step: run both new migrations in Supabase SQL Editor; set `RAPIDAPI_KEY` for live JSearch (fallback links work without it).
