// lib/interview/registry.ts
//
// 16.10.2026 (Александр: «сделаем страницу с частыми вопросами для
// собеседования, но целевыми, не придуманными»). Раздел «Питання на
// співбесіді»: по странице на профессию, украинская и английская версии
// на разных адресах (у каждой свой canonical и hreflang друг на друга).
//
// Откуда вопросы: темы взяты из того, что работодатели реально требуют в
// наших живых вакансиях этой профессии (замер 16.10.2026, а на самой
// странице -- живой блок с процентами), ответы сверены с официальной
// документацией, ссылка на источник под каждым вопросом.

import type { WebPost } from "@/types/web-post";
import type { InterviewContent, InterviewLang } from "./types";
import { QA_INTERVIEW } from "./qa";
import { FRONTEND_INTERVIEW } from "./frontend";
import { PM_INTERVIEW } from "./pm";
import { PYTHON_INTERVIEW } from "./python";
import { globalRolePosts } from "@/lib/a1/segment-index";
import { postsForTech } from "@/lib/a1/tech-index";
import type { JobRole } from "@/lib/seo/job-role";

export type InterviewSource = { kind: "role"; role: JobRole } | { kind: "tech"; tech: string; slug: string };

export type InterviewEntry = {
  /** Часть адреса после /pytannia-na-spivbesidi/ и /interview-questions/. */
  slug: string;
  /** Короткое имя профессии в ссылках и хлебных крошках. */
  label: Record<InterviewLang, string>;
  content: InterviewContent;
  source: InterviewSource;
};

export const INTERVIEW_ENTRIES: InterviewEntry[] = [
  { slug: "qa", label: { uk: "QA", en: "QA" }, content: QA_INTERVIEW, source: { kind: "role", role: "qa" } },
  { slug: "python", label: { uk: "Python", en: "Python" }, content: PYTHON_INTERVIEW, source: { kind: "tech", tech: "Python", slug: "python" } },
  { slug: "frontend", label: { uk: "Frontend", en: "Frontend" }, content: FRONTEND_INTERVIEW, source: { kind: "role", role: "frontend" } },
  {
    slug: "project-manager",
    label: { uk: "Project / Product Manager", en: "Project / Product Manager" },
    content: PM_INTERVIEW,
    source: { kind: "role", role: "pm" },
  },
];

export const SITE_URL = "https://jobs.a1appp.com";

/** Корень раздела для языка. */
export const INTERVIEW_BASE: Record<InterviewLang, string> = {
  uk: "/pytannia-na-spivbesidi",
  en: "/interview-questions",
};

export function interviewPath(lang: InterviewLang, slug?: string): string {
  return slug ? `${INTERVIEW_BASE[lang]}/${slug}` : INTERVIEW_BASE[lang];
}

/** hreflang: обе версии ссылаются друг на друга, украинская -- по умолчанию. */
export function interviewAlternates(lang: InterviewLang, slug?: string) {
  return {
    canonical: `${SITE_URL}${interviewPath(lang, slug)}`,
    languages: {
      uk: `${SITE_URL}${interviewPath("uk", slug)}`,
      en: `${SITE_URL}${interviewPath("en", slug)}`,
      "x-default": `${SITE_URL}${interviewPath("uk", slug)}`,
    },
  };
}

export function findInterview(slug: string): InterviewEntry | undefined {
  return INTERVIEW_ENTRIES.find((e) => e.slug === slug);
}

/** Куда ведёт «Усі вакансії». */
export function jobsHref(entry: InterviewEntry): string {
  return entry.source.kind === "role" ? `/jobs/role/${entry.source.role}` : `/jobs/stack/${entry.source.slug}`;
}

/** Живые вакансии этой профессии (тот же список, что на её странице вакансий). */
export async function interviewPosts(entry: InterviewEntry): Promise<WebPost[]> {
  try {
    if (entry.source.kind === "role") return (await globalRolePosts(entry.source.role)) ?? [];
    return await postsForTech(entry.source.tech);
  } catch {
    return [];
  }
}

/** Ссылка на раздел со страниц вакансий профессии. */
export function interviewForRole(role: string): InterviewEntry | undefined {
  return INTERVIEW_ENTRIES.find((e) => e.source.kind === "role" && e.source.role === role);
}

export function interviewForTechSlug(slug: string): InterviewEntry | undefined {
  return INTERVIEW_ENTRIES.find((e) => e.source.kind === "tech" && e.source.slug === slug);
}
