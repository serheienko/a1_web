// lib/seo/landing-insights.ts
//
// 29.10.2026 (идея Разведчика «на посадочных у конкурентов есть Top companies hiring / in-demand skills»,
// Александр: «давай»). Три среза по ТЕМ ЖЕ вакансиям, что и в списке ниже: кто нанимает, что просят,
// формат и уровень. Всё считается из наших данных, без ИИ и без шаблонной воды: если цифры не набрались,
// блок просто не показывается.
//
// Разметку FAQPage намеренно НЕ делаем: Google с 2023 года показывает FAQ-сниппеты только
// государственным и медицинским сайтам, а разметка без эффекта -- лишний вес страницы.
import type { WebPost } from "@/types/web-post";
import { extractLevel, JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { techLandingHref } from "@/lib/seo/tech-landings";
import { profileHref } from "@/lib/profile-href";

export type LandingInsights = {
  total: number;
  companies: { name: string; href: string | null; count: number }[];
  skills: { tech: string; href: string | null; count: number }[];
  /** Доля удалённых, в процентах (целое). */
  remotePercent: number;
  levels: { level: JobLevel; count: number }[];
};

/** Разбор текстов -- самая дорогая часть, поэтому навыки считаем по свежим вакансиям, а не по всем. */
const SKILL_SAMPLE = 400;

export function buildLandingInsights(posts: WebPost[], skipTech?: string): LandingInsights | null {
  const total = posts.length;
  if (total < 10) return null;

  const byCompany = new Map<string, { name: string; href: string | null; count: number }>();
  let remote = 0;
  const byLevel = new Map<JobLevel, number>();
  for (const post of posts) {
    if (post.isRemote) remote += 1;
    const level = extractLevel(post.title);
    if (level) byLevel.set(level, (byLevel.get(level) ?? 0) + 1);
    const name = (post.author.name || "").trim();
    if (!name || post.author.isAnonymous) continue;
    const key = name.toLowerCase();
    const prev = byCompany.get(key);
    if (prev) prev.count += 1;
    else byCompany.set(key, { name, href: post.author.username ? profileHref(post.author.username) : null, count: 1 });
  }

  const bySkill = new Map<string, number>();
  for (const post of posts.slice(0, SKILL_SAMPLE)) {
    for (const tech of extractTechTags(post.title, post.contentText)) {
      if (skipTech && tech === skipTech) continue;
      bySkill.set(tech, (bySkill.get(tech) ?? 0) + 1);
    }
  }

  const companies = [...byCompany.values()].filter((c) => c.count > 1).sort((a, b) => b.count - a.count).slice(0, 5);
  const skills = [...bySkill.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tech, count]) => ({ tech, href: techLandingHref(tech), count }));
  const levels = JOB_LEVELS.map((level) => ({ level, count: byLevel.get(level) ?? 0 })).filter((l) => l.count > 0);

  if (companies.length === 0 && skills.length === 0) return null;
  return { total, companies, skills, remotePercent: Math.round((remote / total) * 100), levels };
}
