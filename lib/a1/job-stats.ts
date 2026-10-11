// lib/a1/job-stats.ts
//
// 11.10.2026 (Александр: «что можно ещё сделать для уникальности, не руиня
// текущую историю?»). Блок «ринок» на странице вакансии: сколько таких
// вакансий у нас сейчас, сколько появилось за неделю, какая вилка в
// объявлениях и что чаще всего просят рядом.
//
// ЗАЧЕМ. Текст спарсенной вакансии слово в слово совпадает с источником, и
// Google такие страницы берёт в индекс неохотно: на 11.10.2026 в индексе
// 2 090 страниц из 28 тысяч, причина у 25 502 -- «обнаружена, не
// проиндексирована». Дописывать к чужому тексту статьи бессмысленно (это
// тысячи AI-текстов ни о чём), а вот цифры по нашей базе из 35 тысяч
// вакансий не повторяются больше нигде -- и считаются кодом, а не пишутся.
// Заодно это перелинковка: каждая вакансия ссылается на посадочные по
// профессии, стране и стеку.
//
// Считается из того же обхода живых вакансий, что и страницы стран и
// /stats (lib/a1/facts-index.ts, один обход на процесс, кэш на час) --
// своего запроса к бэкенду здесь нет.

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { annualUsd, MIN_SALARY_SAMPLE } from "@/lib/a1/stats-index";
import { extractRoles, roleInfo, type JobRole } from "@/lib/seo/job-role";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { TECH_CATALOG } from "@/lib/seo/tech-catalog";
import { techLandingHref } from "@/lib/seo/tech-landings";
import { profileHref } from "@/lib/profile-href";

export type JobStatsTech = { tech: string; href: string | null; count: number };

export type JobStats = {
  /** Профессия: короткая подпись и названия на языках, где они есть. */
  role: { slug: JobRole; label: string; uk: string; ru: string; en: string } | null;
  /** Код страны вакансии, если он есть. */
  cc: string | null;
  /** Вакансий этой профессии в этой стране (или во всём мире, если страны нет). */
  roleHere: number;
  /** Вакансий этой профессии во всём мире. */
  roleWorld: number;
  /** Сколько таких появилось за последние 7 дней. */
  fresh7d: number;
  /** Вакансий в этой стране всего. */
  countryTotal: number;
  /** Вилка в объявлениях: только там, где долларовых вилок хватает на честную медиану. */
  salary: { n: number; median: number; p25: number; p75: number; scope: "country" | "world" } | null;
  /** Что чаще всего просят рядом в вакансиях этой же профессии. */
  tech: JobStatsTech[];
  /** Сколько вакансий у этой компании и в скольких странах. */
  company: { count: number; countries: number; href: string | null } | null;
};

const WEEK_MS = 7 * 24 * 3600 * 1000;
// Ниже этого числа показывать «таких вакансій: 3» стыдно и бесполезно:
// цифра ничего не говорит ни человеку, ни поиску.
const MIN_ROLE_SAMPLE = 8;
// Технологии, которые стоят почти в каждой вакансии и ничего не отличают.
const SKIP_TECH = new Set(["Jira", "Excel", "REST", "Git"]);

function ccOf(post: WebPost): string | null {
  const cc = post.location?.country?.trim().toUpperCase();
  return cc && cc.length === 2 ? cc : null;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}

function salaryOf(posts: WebPost[], scope: "country" | "world"): JobStats["salary"] {
  const usd: number[] = [];
  for (const p of posts) {
    const v = annualUsd(p);
    if (v != null) usd.push(v);
  }
  if (usd.length < MIN_SALARY_SAMPLE) return null;
  usd.sort((a, b) => a - b);
  return { n: usd.length, median: quantile(usd, 0.5), p25: quantile(usd, 0.25), p75: quantile(usd, 0.75), scope };
}

function topTech(posts: WebPost[], skipTitle: string, limit: number): JobStatsTech[] {
  const known = new Set(TECH_CATALOG.map((t) => t.tech));
  // Технологии из самой вакансии не повторяем: они и так есть на странице.
  const own = new Set(extractTechTags(skipTitle, ""));
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tech of new Set(extractTechTags(p.title, p.contentText))) {
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([tech]) => known.has(tech) && !SKIP_TECH.has(tech) && !own.has(tech))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tech, count]) => ({ tech, href: techLandingHref(tech), count }));
}

export function buildJobStats(all: WebPost[], post: WebPost): JobStats | null {
  const cc = ccOf(post);
  const roleSlug = extractRoles(post.title)[0] ?? null;
  const info = roleSlug ? roleInfo(roleSlug) : null;

  const inCountry = cc ? all.filter((p) => ccOf(p) === cc) : [];
  const roleWorldPosts = roleSlug ? all.filter((p) => extractRoles(p.title).includes(roleSlug)) : [];
  const roleHerePosts = cc ? roleWorldPosts.filter((p) => ccOf(p) === cc) : roleWorldPosts;

  const now = Date.now();
  const fresh7d = roleHerePosts.filter(
    (p) => now - (p.sourcePublishedAt ?? p.publishedAt).getTime() < WEEK_MS,
  ).length;

  // Вилка: сначала по стране, иначе по миру -- лишь бы выборка была честной.
  const salary =
    (roleHerePosts.length >= MIN_SALARY_SAMPLE ? salaryOf(roleHerePosts, "country") : null) ??
    salaryOf(roleWorldPosts, "world");

  const sameCompany = post.author.userId
    ? all.filter((p) => p.author.userId === post.author.userId)
    : [];

  const stats: JobStats = {
    role: info ? { slug: info.slug, label: info.label, uk: info.uk, ru: info.ru, en: info.en } : null,
    cc,
    roleHere: roleHerePosts.length,
    roleWorld: roleWorldPosts.length,
    fresh7d,
    countryTotal: inCountry.length,
    salary,
    tech: topTech(roleHerePosts.length >= MIN_ROLE_SAMPLE ? roleHerePosts : roleWorldPosts, post.title, 6),
    company:
      sameCompany.length > 1
        ? {
            count: sameCompany.length,
            countries: new Set(sameCompany.map(ccOf).filter(Boolean)).size,
            href: post.author.username ? profileHref(post.author.username) : null,
          }
        : null,
  };

  // Пустой блок хуже отсутствующего: если сказать нечего, не говорим.
  const worthShowing =
    (stats.role && stats.roleWorld >= MIN_ROLE_SAMPLE) || !!stats.salary || !!stats.company || stats.countryTotal >= MIN_ROLE_SAMPLE;

  return worthShowing ? stats : null;
}

const cache = new Map<string, { source: WebPost[]; stats: JobStats | null }>();

/**
 * Статистика для страницы вакансии, но НЕ ценой самой страницы.
 *
 * Обход всех живых вакансий занимает секунды, когда кэш холодный (после
 * перезапуска), и страница вакансии не должна его ждать: лучше показать её
 * без блока, чем задержать на пять секунд. Поэтому ждём не дольше `ms`, а
 * обход тем временем продолжается в фоне и достаётся следующему читателю.
 */
export async function jobStatsWithin(post: WebPost, ms = 2500): Promise<JobStats | null> {
  const started = allIndexedPosts();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const all = await Promise.race([
    started,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
      (timer as unknown as { unref?: () => void }).unref?.();
    }),
  ]);
  if (timer) clearTimeout(timer);
  if (!all) {
    void started.catch(() => undefined);
    return null;
  }

  const hit = cache.get(post.id);
  if (hit && hit.source === all) return hit.stats;
  const stats = buildJobStats(all, post);
  // Память не резиновая: вакансий десятки тысяч, держим последние.
  if (cache.size > 3000) cache.clear();
  cache.set(post.id, { source: all, stats });
  return stats;
}
