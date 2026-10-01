// lib/a1/stats-index.ts
//
// 01.10.2026. Цифры для статей блога (/blog): сколько вакансий, какие
// технологии и города лидируют, какие зарплаты называют. Считается из того
// же списка всех живых вакансий, что и SEO-сегменты (lib/a1/facts-index.ts,
// обход один, кэш на час), поэтому статья всегда показывает живые числа, а
// не те, что были на момент написания.
//
// Правило честности: зарплаты берём только там, где они указаны в
// вакансии (поле salary), только в долларах за год (месяц × 12), и
// показываем технологию только если таких вакансий с зарплатой не меньше
// MIN_SALARY_SAMPLE -- иначе «медиана» из трёх вакансий вводит в
// заблуждение. Вакансии без зарплаты в расчёт не идут.

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts, postsForFact } from "@/lib/a1/facts-index";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { extractLevel, JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { TECH_CATALOG, slugForTech } from "@/lib/seo/tech-catalog";
import { techLandingHref } from "@/lib/seo/tech-landings";
import { worldwideKind } from "@/lib/seo/worldwide-kind";
import { profileHref } from "@/lib/profile-href";

export const MIN_SALARY_SAMPLE = 15;

export type TechCount = { tech: string; slug: string | null; href: string | null; count: number };
export type TechSalary = { tech: string; href: string | null; n: number; median: number; p25: number; p75: number };

export type MarketStats = {
  total: number;
  ua: number;
  world: number;
  worldwide: number;
  withSalary: number;
  noExperience: number;
  reservation: number;
  uaLevels: { level: JobLevel; count: number }[];
  worldLevels: { level: JobLevel; count: number }[];
  uaFormat: { remote: number; hybrid: number; office: number };
  uaTech: TechCount[];
  worldTech: TechCount[];
  uaCities: { city: string; count: number }[];
  worldCountries: { cc: string; count: number }[];
  salaryByTech: TechSalary[];
  salaryOverall: { n: number; median: number } | null;
};

function isUa(post: WebPost): boolean {
  const cc = post.location?.country?.trim().toUpperCase() || "";
  return cc === "UA" || worldwideKind(post) === "ua";
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}

/** Годовая зарплата в USD (середина вилки), либо null. Выбросы отсекаем. */
export function annualUsd(post: WebPost): number | null {
  const s = post.salary;
  if (!s || s.currency?.toUpperCase() !== "USD") return null;
  const a = s.min ?? s.max;
  const b = s.max ?? s.min;
  if (a == null || b == null) return null;
  const mid = (a + b) / 2;
  const year = s.period === "MONTH" ? mid * 12 : mid;
  return year >= 20_000 && year <= 600_000 ? year : null;
}

function topTech(posts: WebPost[], limit: number): TechCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tech of extractTechTags(post.title, post.contentText)) counts.set(tech, (counts.get(tech) ?? 0) + 1);
  }
  const known = new Set(TECH_CATALOG.map((t) => t.tech));
  return [...counts]
    .filter(([tech]) => known.has(tech))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tech, count]) => ({ tech, slug: slugForTech(tech) ?? null, href: techLandingHref(tech), count }));
}

function levelCounts(posts: WebPost[]): { level: JobLevel; count: number }[] {
  const m = new Map<JobLevel, number>();
  for (const post of posts) {
    const level = extractLevel(post.title);
    if (level) m.set(level, (m.get(level) ?? 0) + 1);
  }
  return JOB_LEVELS.map((level) => ({ level, count: m.get(level) ?? 0 }));
}

export function buildMarketStats(
  posts: WebPost[],
  facts: { noExperience: number; reservation: number },
): MarketStats {
  const ua = posts.filter(isUa);
  const world = posts.filter((p) => {
    const cc = p.location?.country?.trim().toUpperCase() || "";
    return cc !== "" && cc !== "WW" && cc !== "UA";
  });
  const worldwide = posts.filter((p) => worldwideKind(p) === "world" || worldwideKind(p) === "remote");

  const uaCities = new Map<string, number>();
  const fmt = { remote: 0, hybrid: 0, office: 0 };
  for (const p of ua) {
    const city = p.location?.city?.trim();
    if (city && p.location?.country?.toUpperCase() === "UA") uaCities.set(city, (uaCities.get(city) ?? 0) + 1);
    if (p.tags.includes("remote") || (p.isRemote && !p.location?.city)) fmt.remote++;
    else if (p.tags.includes("hybrid")) fmt.hybrid++;
    else fmt.office++;
  }

  const countries = new Map<string, number>();
  for (const p of world) {
    const cc = p.location!.country.trim().toUpperCase();
    countries.set(cc, (countries.get(cc) ?? 0) + 1);
  }

  // Зарплаты: все вакансии мира (аудитория статьи -- украинцы, которые смотрят на международный рынок).
  const bucket = new Map<string, number[]>();
  const overall: number[] = [];
  for (const p of posts) {
    const v = annualUsd(p);
    if (v == null) continue;
    overall.push(v);
    for (const tech of new Set(extractTechTags(p.title, p.contentText))) {
      const list = bucket.get(tech);
      if (list) list.push(v);
      else bucket.set(tech, [v]);
    }
  }
  const known = new Set(TECH_CATALOG.map((t) => t.tech));
  const salaryByTech: TechSalary[] = [...bucket]
    .filter(([tech, list]) => known.has(tech) && list.length >= MIN_SALARY_SAMPLE)
    .map(([tech, list]) => {
      const sorted = [...list].sort((a, b) => a - b);
      return {
        tech,
        href: techLandingHref(tech),
        n: sorted.length,
        median: quantile(sorted, 0.5),
        p25: quantile(sorted, 0.25),
        p75: quantile(sorted, 0.75),
      };
    })
    .sort((a, b) => b.median - a.median);
  overall.sort((a, b) => a - b);

  return {
    total: posts.length,
    ua: ua.length,
    world: world.length,
    worldwide: worldwide.length,
    withSalary: posts.filter((p) => p.salary).length,
    noExperience: facts.noExperience,
    reservation: facts.reservation,
    uaLevels: levelCounts(ua),
    worldLevels: levelCounts(world),
    uaFormat: fmt,
    uaTech: topTech(ua, 20),
    worldTech: topTech(world, 20),
    uaCities: [...uaCities].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ city, count })),
    worldCountries: [...countries].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cc, count]) => ({ cc, count })),
    salaryByTech,
    salaryOverall: overall.length >= MIN_SALARY_SAMPLE ? { n: overall.length, median: quantile(overall, 0.5) } : null,
  };
}

let cached: { source: WebPost[]; stats: MarketStats } | null = null;

export async function marketStats(): Promise<MarketStats> {
  const posts = await allIndexedPosts();
  if (cached && cached.source === posts) return cached.stats;
  const [noExp, reservation] = await Promise.all([postsForFact("no-experience"), postsForFact("reservation")]);
  const stats = buildMarketStats(posts, { noExperience: noExp.length, reservation: reservation.length });
  cached = { source: posts, stats };
  return stats;
}

// ───────── Страна: живые цифры для английских гайдов (/blog/...-<страна>) ─────────

export type CountryStats = {
  cc: string;
  total: number;
  remote: number;
  hybrid: number;
  levels: { level: JobLevel; count: number }[];
  tech: TechCount[];
  cities: { city: string; count: number }[];
  employers: { name: string; href: string | null; count: number }[];
  /** Медиана годовой зарплаты в USD -- только если вилок в долларах хватает. */
  salaryUsd: { n: number; median: number; p25: number; p75: number } | null;
};

export function buildCountryStats(posts: WebPost[], cc: string): CountryStats {
  const code = cc.toUpperCase();
  const mine = posts.filter((p) => p.location?.country?.trim().toUpperCase() === code);
  const cities = new Map<string, number>();
  const employers = new Map<string, { name: string; href: string | null; count: number }>();
  let remote = 0;
  let hybrid = 0;
  const usd: number[] = [];
  for (const p of mine) {
    const city = p.location?.city?.trim();
    if (city) cities.set(city, (cities.get(city) ?? 0) + 1);
    if (p.tags.includes("remote")) remote++;
    else if (p.tags.includes("hybrid")) hybrid++;
    const key = p.author.username ?? p.author.name;
    const e = employers.get(key);
    if (e) e.count++;
    else employers.set(key, { name: p.author.name, href: p.author.username ? profileHref(p.author.username) : null, count: 1 });
    const v = annualUsd(p);
    if (v != null) usd.push(v);
  }
  usd.sort((a, b) => a - b);
  return {
    cc: code,
    total: mine.length,
    remote,
    hybrid,
    levels: levelCounts(mine),
    tech: topTech(mine, 20).filter((t) => !SKIP.has(t.tech)),
    cities: [...cities].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ city, count })),
    employers: [...employers.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    salaryUsd: usd.length >= MIN_SALARY_SAMPLE ? { n: usd.length, median: quantile(usd, 0.5), p25: quantile(usd, 0.25), p75: quantile(usd, 0.75) } : null,
  };
}

const SKIP = new Set(["Jira", "Excel", "REST", "Git"]);

const countryCache = new Map<string, { source: WebPost[]; stats: CountryStats }>();

export async function countryStats(cc: string): Promise<CountryStats> {
  const posts = await allIndexedPosts();
  const hit = countryCache.get(cc);
  if (hit && hit.source === posts) return hit.stats;
  const stats = buildCountryStats(posts, cc);
  countryCache.set(cc, { source: posts, stats });
  return stats;
}
