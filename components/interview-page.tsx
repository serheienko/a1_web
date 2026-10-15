// components/interview-page.tsx
//
// 16.10.2026. Страница «Питання на співбесіді <професія>» (lib/interview).
// Текст страницы -- на одном языке (адрес и есть язык), поэтому здесь нет
// <T>: девять языков в одном HTML размывают страницу для поиска.

import Link from "next/link";
import type { InterviewLang, InterviewQ } from "@/lib/interview/types";
import {
  INTERVIEW_ENTRIES,
  SITE_URL,
  interviewPath,
  jobsHref,
  type InterviewEntry,
} from "@/lib/interview/registry";
import { techJobsHref, type InterviewStats } from "@/lib/interview/stats";
import type { WebPost } from "@/types/web-post";

const TXT = {
  jobs: { uk: "Вакансії", en: "Jobs" },
  section: { uk: "Питання на співбесіді", en: "Interview questions" },
  other: { uk: "English version", en: "Українська версія" },
  demandTitle: { uk: "Що зараз вимагають роботодавці", en: "What employers ask for right now" },
  demandLead: {
    uk: "Найчастіші технології у {n} відкритих вакансіях «{role}» на A1. Рахується з живих вакансій і оновлюється щогодини.",
    en: "The most frequent technologies across {n} open “{role}” vacancies on A1. Counted from live vacancies, refreshed hourly.",
  },
  contents: { uk: "Зміст", en: "Contents" },
  wants: { uk: "Що хоче почути інтерв’юер", en: "What the interviewer wants to hear" },
  answer: { uk: "Відповідь", en: "Answer" },
  source: { uk: "Джерело", en: "Source" },
  techJobs: { uk: "Вакансії {tech}", en: "{tech} jobs" },
  freshTitle: { uk: "Свіжі вакансії «{role}»", en: "Fresh “{role}” vacancies" },
  allJobs: { uk: "Усі вакансії «{role}» →", en: "All “{role}” vacancies →" },
  ctaTitle: { uk: "Готові до співбесіди?", en: "Ready for the interview?" },
  ctaText: {
    uk: "Створіть профіль на A1 — роботодавці пишуть напряму, а відгук займає один клік.",
    en: "Create a profile on A1 — employers message you directly and applying takes one tap.",
  },
  signUp: { uk: "Створити профіль", en: "Create a profile" },
  getApp: { uk: "Завантажити застосунок", en: "Get the app" },
  more: { uk: "Питання для інших професій", en: "Questions for other roles" },
  how: {
    uk: "Як зроблено: теми підібрано за вимогами в актуальних вакансіях на A1, кожну відповідь звірено з офіційною документацією або стандартом — посилання під питанням.",
    en: "How this is made: topics follow the requirements in live vacancies on A1, and every answer is checked against official documentation or a standard — linked under each question.",
  },
} as const;

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

function JobsBlock({ entry, lang, stats }: { entry: InterviewEntry; lang: InterviewLang; stats: InterviewStats }) {
  if (stats.recent.length === 0) return null;
  const role = entry.label[lang];
  return (
    <aside className="my-10 rounded-2xl border border-neutral-100 p-4 sm:p-5 dark:border-neutral-800">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{fill(TXT.freshTitle[lang], { role })}</h2>
      <ul className="mt-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {stats.recent.map((p: WebPost) => (
          <li key={p.id} className="py-2.5">
            <Link href={`/jobs/${p.slug}`} className="block no-underline hover:text-accent">
              <span className="block font-medium text-neutral-900 dark:text-neutral-100">{p.title}</span>
              <span className="block text-sm text-neutral-500">
                {p.author.name}
                {p.location?.display ? ` · ${p.location.display}` : ""}
                {p.isRemote ? (lang === "uk" ? " · віддалено" : " · remote") : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={jobsHref(entry)} className="text-sm font-medium text-accent no-underline hover:underline">
          {fill(TXT.allJobs[lang], { role })}
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full bg-[#335ef7] px-4 py-1.5 text-sm font-semibold text-white no-underline transition hover:opacity-90 dark:bg-[#009bff]"
        >
          {TXT.signUp[lang]}
        </Link>
      </div>
    </aside>
  );
}

function Question({ q, lang, n }: { q: InterviewQ; lang: InterviewLang; n: number }) {
  const techHref = techJobsHref(q.tech);
  return (
    <article id={q.id} className="scroll-mt-24 border-t border-neutral-100 pt-6 dark:border-neutral-800">
      <h3 className="text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
        <span className="mr-1.5 tabular-nums text-neutral-400">{n}.</span>
        {q.q}
      </h3>
      <p className="mt-3 rounded-xl bg-accent/5 px-3 py-2 text-[15px] leading-relaxed text-neutral-700 dark:bg-accent/10 dark:text-neutral-300">
        <span className="font-medium">{TXT.wants[lang]}:</span> {q.wants}
      </p>
      <div className="mt-3 whitespace-pre-line text-[16px] leading-relaxed text-neutral-800 dark:text-neutral-200">
        <span className="sr-only">{TXT.answer[lang]}: </span>
        {q.answer}
      </div>
      {q.code ? (
        <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
          <code>{q.code}</code>
        </pre>
      ) : null}
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
        <span>
          {TXT.source[lang]}:{" "}
          <a href={q.source.url} target="_blank" rel="noopener" className="text-accent no-underline hover:underline">
            {q.source.title}
          </a>
        </span>
        {techHref && q.tech ? (
          <Link href={techHref} className="text-accent no-underline hover:underline">
            {fill(TXT.techJobs[lang], { tech: q.tech })} →
          </Link>
        ) : null}
      </p>
    </article>
  );
}

export function interviewJsonLd(entry: InterviewEntry, lang: InterviewLang): Record<string, unknown>[] {
  const g = entry.content[lang];
  const url = `${SITE_URL}${interviewPath(lang, entry.slug)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      url,
      mainEntity: g.categories.flatMap((c) =>
        c.items.map((q) => ({
          "@type": "Question",
          name: q.q,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      ),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: TXT.jobs[lang], item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: TXT.section[lang], item: `${SITE_URL}${interviewPath(lang)}` },
        { "@type": "ListItem", position: 3, name: entry.label[lang], item: url },
      ],
    },
  ];
}

export function InterviewPage({ entry, lang, stats }: { entry: InterviewEntry; lang: InterviewLang; stats: InterviewStats }) {
  const g = entry.content[lang];
  const otherLang: InterviewLang = lang === "uk" ? "en" : "uk";
  const role = entry.label[lang];
  let n = 0;
  return (
    <main lang={lang} className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {interviewJsonLd(entry, lang).map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-neutral-400 dark:text-neutral-500">
        <span>
          <Link href="/" className="transition hover:text-accent">
            {TXT.jobs[lang]}
          </Link>
          <span aria-hidden="true" className="px-1.5">/</span>
          <Link href={interviewPath(lang)} className="transition hover:text-accent">
            {TXT.section[lang]}
          </Link>
          <span aria-hidden="true" className="px-1.5">/</span>
        </span>
        <Link href={interviewPath(otherLang, entry.slug)} hrefLang={otherLang} className="text-accent no-underline hover:underline">
          {TXT.other[lang]}
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-balance text-neutral-900 sm:text-4xl dark:text-neutral-50">{g.h1}</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">{g.lead}</p>

      {stats.techs.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{TXT.demandTitle[lang]}</h2>
          <p className="mt-1 text-sm text-neutral-500">{fill(TXT.demandLead[lang], { n: stats.total, role })}</p>
          <ul className="mt-4 flex max-w-xl flex-col gap-2">
            {stats.techs.map((t) => (
              <li key={t.tech} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-neutral-700 dark:text-neutral-300">
                  {t.href ? (
                    <Link href={t.href} className="no-underline hover:text-accent">
                      {t.label}
                    </Link>
                  ) : (
                    t.label
                  )}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.max(2, t.pct)}%` }} />
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums text-neutral-500">{t.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label={TXT.contents[lang]} className="mt-8 rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{TXT.contents[lang]}</h2>
        <ol className="mt-2 flex flex-col gap-1 text-[15px]">
          {g.categories.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="text-accent no-underline hover:underline">
                {c.title}
              </a>{" "}
              <span className="text-neutral-400">({c.items.length})</span>
            </li>
          ))}
        </ol>
      </nav>

      {g.categories.map((c, ci) => (
        <div key={c.id}>
          <section id={c.id} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{c.title}</h2>
            <div className="mt-4 flex flex-col gap-8">
              {c.items.map((q) => (
                <Question key={q.id} q={q} lang={lang} n={++n} />
              ))}
            </div>
          </section>
          {ci === 1 || ci === 4 ? <JobsBlock entry={entry} lang={lang} stats={stats} /> : null}
        </div>
      ))}

      <section className="mt-14 rounded-2xl bg-accent/5 p-5 dark:bg-accent/10">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{TXT.ctaTitle[lang]}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">{TXT.ctaText[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="rounded-full bg-[#335ef7] px-5 py-2 text-[15px] font-semibold text-white no-underline transition hover:opacity-90 dark:bg-[#009bff]"
          >
            {TXT.signUp[lang]}
          </Link>
          <Link href="/download" className="rounded-full border border-neutral-200 px-5 py-2 text-[15px] font-medium no-underline hover:text-accent dark:border-neutral-700">
            {TXT.getApp[lang]}
          </Link>
          <Link href={jobsHref(entry)} className="self-center text-[15px] font-medium text-accent no-underline hover:underline">
            {fill(TXT.allJobs[lang], { role })}
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{TXT.more[lang]}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {INTERVIEW_ENTRIES.filter((e) => e.slug !== entry.slug).map((e) => (
            <li key={e.slug}>
              <Link
                href={interviewPath(lang, e.slug)}
                className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-sm no-underline hover:text-accent dark:border-neutral-700"
              >
                {e.content[lang].h1}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">{TXT.how[lang]}</p>
    </main>
  );
}

export function InterviewHub({ lang, counts }: { lang: InterviewLang; counts: Record<string, number> }) {
  const otherLang: InterviewLang = lang === "uk" ? "en" : "uk";
  const H1 = { uk: "Питання на співбесіді в IT з відповідями", en: "IT interview questions with answers" };
  const LEAD = {
    uk: "Підбірки питань для технічної співбесіди за професіями. Теми взяті з того, що роботодавці справді вимагають у живих вакансіях, а кожна відповідь звірена з офіційною документацією.",
    en: "Technical interview questions by role. Topics come from what employers actually require in live vacancies, and every answer is checked against official documentation.",
  };
  const QCOUNT = { uk: "питань", en: "questions" };
  const VAC = { uk: "відкритих вакансій", en: "open vacancies" };
  return (
    <main lang={lang} className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-neutral-400 dark:text-neutral-500">
        <span>
          <Link href="/" className="transition hover:text-accent">
            {TXT.jobs[lang]}
          </Link>
          <span aria-hidden="true" className="px-1.5">/</span>
        </span>
        <Link href={interviewPath(otherLang)} hrefLang={otherLang} className="text-accent no-underline hover:underline">
          {TXT.other[lang]}
        </Link>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-balance text-neutral-900 sm:text-4xl dark:text-neutral-50">{H1[lang]}</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">{LEAD[lang]}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {INTERVIEW_ENTRIES.map((e) => {
          const qn = e.content[lang].categories.reduce((s, c) => s + c.items.length, 0);
          return (
            <li key={e.slug}>
              <Link
                href={interviewPath(lang, e.slug)}
                className="block h-full rounded-2xl border border-neutral-100 p-4 no-underline transition hover:border-accent/40 dark:border-neutral-800"
              >
                <span className="block text-lg font-semibold text-neutral-900 dark:text-neutral-50">{e.content[lang].h1}</span>
                <span className="mt-1 block text-sm text-neutral-500">
                  {qn} {QCOUNT[lang]}
                  {counts[e.slug] ? ` · ${counts[e.slug]} ${VAC[lang]}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">{TXT.how[lang]}</p>
    </main>
  );
}

export const INTERVIEW_HUB_META = {
  uk: {
    title: "Питання на співбесіді в IT з відповідями | A1 Jobs",
    description:
      "Питання на технічній співбесіді для QA, Python, Frontend і Project Manager з відповідями: теми з реальних вакансій, відповіді звірені з документацією.",
  },
  en: {
    title: "IT Interview Questions with Answers | A1 Jobs",
    description:
      "Technical interview questions for QA, Python, Frontend and Project Manager roles with answers: topics from real vacancies, answers checked against docs.",
  },
} as const;
