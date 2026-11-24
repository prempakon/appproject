import React from 'react';
import type { ResumeData } from '../../lib/platform.types';

function hasItems<T>(items: T[] | undefined | null): items is T[] {
  return Array.isArray(items) && items.length > 0;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="border-b border-slate-200 pb-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ResumePreview({ data }: { data: ResumeData }) {
  const contact = [data.email, data.phone, data.location].filter(Boolean);

  return (
    <article
      data-print-area
      className="resume-sheet mx-auto w-full max-w-[210mm] rounded-2xl border border-slate-200 bg-white px-8 py-8 text-slate-800 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:px-10 sm:py-10"
    >
      <header className="border-b-2 border-slate-900 pb-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          {data.fullName || 'ชื่อ-นามสกุลของคุณ'}
        </h1>
        <p className="mt-1 text-sm font-bold text-blue-700">
          {data.headline || 'ตำแหน่งหรือสายอาชีพที่สนใจ'}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-600">
          {contact.map((item) => (
            <span key={item}>{item}</span>
          ))}
          {data.website && <span>{data.website}</span>}
          {data.github && <span>{data.github}</span>}
        </div>
      </header>

      {data.summary && (
        <Section title="เกี่ยวกับฉัน">
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{data.summary}</p>
        </Section>
      )}

      {hasItems(data.skills) && (
        <Section title="ทักษะ">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill) => (
              <span key={skill} className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}

      {hasItems(data.experiences) && (
        <Section title="ประสบการณ์">
          <div className="space-y-4">
            {data.experiences.map((item) => (
              <div key={item.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-xs font-black text-slate-900">
                    {item.role || 'ตำแหน่ง'}
                    {item.company ? ` · ${item.company}` : ''}
                  </h3>
                  {(item.start || item.end) && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {[item.start, item.end].filter(Boolean).join(' – ')}
                    </span>
                  )}
                </div>
                {item.details && (
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{item.details}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasItems(data.education) && (
        <Section title="การศึกษา">
          <div className="space-y-3">
            {data.education.map((item) => (
              <div key={item.id} className="flex flex-wrap items-baseline justify-between gap-1">
                <div>
                  <h3 className="text-xs font-black text-slate-900">{item.degree || 'สาขาวิชา'}</h3>
                  <p className="text-[11px] font-medium text-slate-600">{item.institution || 'สถานศึกษา'}</p>
                </div>
                <div className="text-right text-[10px] font-bold text-slate-400">
                  {item.year && <p>{item.year}</p>}
                  {item.gpa && <p>GPA {item.gpa}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasItems(data.projects) && (
        <Section title="ผลงาน / โปรเจกต์">
          <div className="space-y-3">
            {data.projects.map((item) => (
              <div key={item.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-xs font-black text-slate-900">{item.name || 'ชื่อโปรเจกต์'}</h3>
                  {item.link && <span className="text-[10px] font-bold text-blue-600">{item.link}</span>}
                </div>
                {item.detail && (
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{item.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasItems(data.certifications) && (
        <Section title="ใบรับรอง / การอบรม">
          <ul className="grid gap-1.5 text-[11px] font-medium text-slate-700 sm:grid-cols-2">
            {data.certifications.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!data.summary && !hasItems(data.skills) && !hasItems(data.experiences) && !hasItems(data.education) && (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs font-bold text-slate-400">
          กรอกข้อมูลด้านซ้ายเพื่อดูตัวอย่างเรซูเม่แบบทันที
        </p>
      )}
    </article>
  );
}
