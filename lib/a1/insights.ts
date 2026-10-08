// lib/a1/insights.ts
//
// 08.10.2026 (Александр: «страничка со статистикой: какие у нас вакансии,
// по стекам, по гео, карта, анимации, чтобы цифры жили»). Все цифры
// страницы /stats считаются здесь из того же списка живых вакансий, что и
// SEO-сегменты (lib/a1/facts-index.ts: один обход, кэш на час). Отдельного
// хранилища нет -- страница всегда показывает то, что сейчас на сайте.
//
// Правила честности те же, что у статей блога (lib/a1/stats-index.ts):
// зарплаты -- только указанные в вакансии, в долларах за год, и только где
// выборка не меньше MIN_SALARY_SAMPLE; технологии -- по словарю каталога.

import type { WebPost } from "@/types/web-post";
import { LOCALES, type Locale } from "@/components/t";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { annualUsd, MIN_SALARY_SAMPLE } from "@/lib/a1/stats-index";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { extractLevel, JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { extractRoles, ROLES, type JobRole } from "@/lib/seo/job-role";
import { TECH_CATALOG, TECH_GROUPS } from "@/lib/seo/tech-catalog";
import { techLandingHref } from "@/lib/seo/tech-landings";
import { countryByCode, countryName } from "@/lib/seo/countries";
import { worldwideKind } from "@/lib/seo/worldwide-kind";
import { profileHref } from "@/lib/profile-href";

export type Named = Record<Locale, string>;

export type Insights = {
  updatedAt: string;
  total: number;
  companies: number;
  countries: number;
  cities: number;
  fresh24h: number;
  fresh7d: number;
  withSalary: number;
  worldwide: number;
  ua: number;
  /** Регионы мира: доля рынка на одной полосе. */
  regions: { id: string; n: number }[];
  byCountry: { cc: string; n: number; fresh: number }[];
  names: Record<string, Named>;
  cities_top: { city: string; cc: string; n: number }[];
  tech: { tech: string; n: number; href: string | null; group: string }[];
  techGroups: { id: string; title: Named; n: number }[];
  roles: { slug: JobRole; label: string; n: number; href: string }[];
  format: { remote: number; hybrid: number; office: number };
  levels: { level: JobLevel; n: number }[];
  salary: { tech: string; href: string | null; n: number; median: number; p25: number; p75: number }[];
  salaryOverall: { n: number; median: number; p25: number; p75: number } | null;
  daily: { d: string; n: number }[];
  companiesTop: { name: string; href: string | null; n: number; avatar: string | null }[];
  segments: { role: JobRole; label: string; cc: string; n: number; href: string }[];
  latest: { title: string; company: string; cc: string; city: string; href: string; at: string }[];
};

// Регионы -- по коду страны (WW отдельно, это «удалённо откуда угодно»).
const EUROPE = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB CH NO IS LI AL BA ME MK RS XK MD GE AM AZ TR AD MC SM".split(" "),
);
const NORTH_AMERICA = new Set(["US", "CA"]);
const LATAM = new Set("MX BR AR CL CO PE UY PY BO EC VE CR PA GT HN SV NI DO CU PR JM".split(" "));
const ASIA = new Set("IN SG JP KR CN HK TW MY TH VN ID PH PK BD LK NP KZ UZ KG".split(" "));
const OCEANIA = new Set(["AU", "NZ"]);
const MIDEAST_AFRICA = new Set("IL AE SA QA BH KW OM JO LB EG MA TN DZ NG KE ZA GH ET UG RW".split(" "));

export const REGION_IDS = ["ua", "europe", "na", "latam", "asia", "oceania", "mea", "ww"] as const;

function regionOf(cc: string): string {
  if (cc === "UA") return "ua";
  if (cc === "WW") return "ww";
  if (EUROPE.has(cc)) return "europe";
  if (NORTH_AMERICA.has(cc)) return "na";
  if (LATAM.has(cc)) return "latam";
  if (ASIA.has(cc)) return "asia";
  if (OCEANIA.has(cc)) return "oceania";
  if (MIDEAST_AFRICA.has(cc)) return "mea";
  return "mea";
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}

/** Код страны вакансии; "" -- без страны. Казак без города («WW» с украинским текстом) -- это Украина. */
function ccOf(p: WebPost): string {
  const cc = p.location?.country?.trim().toUpperCase() || "";
  if (cc === "WW" && worldwideKind(p) === "ua") return "UA";
  return cc;
}

const KYIV = "Europe/Kyiv";
function dayKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: KYIV }); // 2026-10-08
}

const TECH_GROUP_OF = new Map<string, string>();
for (const g of TECH_GROUPS) for (const it of g.items) TECH_GROUP_OF.set(it.tech, g.id);
const KNOWN_TECH = new Set(TECH_CATALOG.map((t) => t.tech));

export function buildInsights(posts: WebPost[]): Insights {
  const now = Date.now();
  const H24 = now - 24 * 3600e3;
  const D7 = now - 7 * 24 * 3600e3;

  const companies = new Map<string, { name: string; href: string | null; n: number; avatar: string | null }>();
  const countries = new Map<string, { n: number; fresh: number }>();
  const cities = new Map<string, { city: string; cc: string; n: number }>();
  const regions = new Map<string, number>();
  const tech = new Map<string, number>();
  const roles = new Map<JobRole, number>();
  const levels = new Map<JobLevel, number>();
  const segments = new Map<string, number>();
  const daily = new Map<string, number>();
  const salaryByTech = new Map<string, number[]>();
  const salaryAll: number[] = [];
  const fmt = { remote: 0, hybrid: 0, office: 0 };
  let fresh24h = 0;
  let fresh7d = 0;
  let withSalary = 0;
  let worldwide = 0;

  for (const p of posts) {
    const cc = ccOf(p);
    const at = p.publishedAt.getTime();
    const isFresh = at >= H24;
    if (isFresh) fresh24h++;
    if (at >= D7) fresh7d++;
    if (p.salary) withSalary++;

    const key = p.author.username ?? p.author.name;
    const c = companies.get(key);
    if (c) c.n++;
    else
      companies.set(key, {
        name: p.author.name,
        href: p.author.username ? profileHref(p.author.username) : null,
        n: 1,
        avatar: p.author.avatarUrl,
      });

    if (cc) {
      const e = countries.get(cc) ?? { n: 0, fresh: 0 };
      e.n++;
      if (isFresh) e.fresh++;
      countries.set(cc, e);
      regions.set(regionOf(cc), (regions.get(regionOf(cc)) ?? 0) + 1);
      if (cc === "WW") worldwide++;
    }
    const city = p.location?.city?.trim();
    if (city && cc && cc !== "WW") {
      const k = `${cc}|${city.toLowerCase()}`;
      const e = cities.get(k);
      if (e) e.n++;
      else cities.set(k, { city, cc, n: 1 });
    }

    if (p.tags.includes("remote") || cc === "WW" || (p.isRemote && !city)) fmt.remote++;
    else if (p.tags.includes("hybrid")) fmt.hybrid++;
    else fmt.office++;

    const lv = extractLevel(p.title);
    if (lv) levels.set(lv, (levels.get(lv) ?? 0) + 1);

    const rs = extractRoles(p.title);
    for (const r of rs) {
      roles.set(r, (roles.get(r) ?? 0) + 1);
      if (cc && cc !== "WW") segments.set(`${r}|${cc}`, (segments.get(`${r}|${cc}`) ?? 0) + 1);
    }

    const techs = new Set(extractTechTags(p.title, p.contentText));
    for (const t of techs) if (KNOWN_TECH.has(t)) tech.set(t, (tech.get(t) ?? 0) + 1);

    const usd = annualUsd(p);
    if (usd != null) {
      salaryAll.push(usd);
      for (const t of techs) {
        if (!KNOWN_TECH.has(t)) continue;
        const list = salaryByTech.get(t);
        if (list) list.push(usd);
        else salaryByTech.set(t, [usd]);
      }
    }

    const dk = dayKey(p.publishedAt);
    daily.set(dk, (daily.get(dk) ?? 0) + 1);
  }

  // последние 30 дней, включая дни без новых вакансий
  const days: { d: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayKey(new Date(now - i * 24 * 3600e3));
    days.push({ d, n: daily.get(d) ?? 0 });
  }

  const techList = [...tech]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([t, n]) => ({ tech: t, n, href: techLandingHref(t), group: TECH_GROUP_OF.get(t) ?? "other" }));
  const groupTotals = new Map<string, number>();
  for (const [t, n] of tech) {
    const g = TECH_GROUP_OF.get(t);
    if (g) groupTotals.set(g, (groupTotals.get(g) ?? 0) + n);
  }

  const salary = [...salaryByTech]
    .filter(([, list]) => list.length >= MIN_SALARY_SAMPLE)
    .map(([t, list]) => {
      const s = [...list].sort((a, b) => a - b);
      return { tech: t, href: techLandingHref(t), n: s.length, median: quantile(s, 0.5), p25: quantile(s, 0.25), p75: quantile(s, 0.75) };
    })
    .sort((a, b) => b.median - a.median)
    .slice(0, 16);
  salaryAll.sort((a, b) => a - b);

  const byCountry = [...countries]
    .map(([cc, e]) => ({ cc, n: e.n, fresh: e.fresh }))
    .sort((a, b) => b.n - a.n);
  const names: Record<string, Named> = {};
  for (const { cc } of byCountry) {
    const country = countryByCode(cc);
    if (!country) continue;
    const named = {} as Named;
    for (const loc of LOCALES) named[loc] = countryName(country, loc);
    names[cc] = named;
  }

  const roleList = ROLES.map((r) => ({ slug: r.slug, label: r.label, n: roles.get(r.slug) ?? 0, href: `/jobs/role/${r.slug}` }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const roleLabel = new Map(ROLES.map((r) => [r.slug, r.label]));

  const latest = [...posts]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 14)
    .map((p) => ({
      title: p.title,
      company: p.author.name,
      cc: ccOf(p),
      city: p.location?.city?.trim() || "",
      href: `/jobs/${p.slug}`,
      at: p.publishedAt.toISOString(),
    }));

  return {
    updatedAt: new Date().toISOString(),
    total: posts.length,
    companies: companies.size,
    countries: byCountry.filter((c) => c.cc !== "WW").length,
    cities: cities.size,
    fresh24h,
    fresh7d,
    withSalary,
    worldwide,
    ua: countries.get("UA")?.n ?? 0,
    regions: REGION_IDS.map((id) => ({ id, n: regions.get(id) ?? 0 })).filter((r) => r.n > 0),
    byCountry,
    names,
    cities_top: [...cities.values()].sort((a, b) => b.n - a.n).slice(0, 30),
    tech: techList,
    techGroups: TECH_GROUPS.map((g) => ({ id: g.id, title: g.title, n: groupTotals.get(g.id) ?? 0 })).sort((a, b) => b.n - a.n),
    roles: roleList,
    format: fmt,
    levels: JOB_LEVELS.map((level) => ({ level, n: levels.get(level) ?? 0 })),
    salary,
    salaryOverall:
      salaryAll.length >= MIN_SALARY_SAMPLE
        ? { n: salaryAll.length, median: quantile(salaryAll, 0.5), p25: quantile(salaryAll, 0.25), p75: quantile(salaryAll, 0.75) }
        : null,
    daily: days,
    companiesTop: [...companies.values()].sort((a, b) => b.n - a.n).slice(0, 16),
    segments: [...segments]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k, n]) => {
        const [role, cc] = k.split("|") as [JobRole, string];
        return { role, label: roleLabel.get(role) ?? role, cc, n, href: `/jobs/country/${cc.toLowerCase()}` };
      }),
    latest,
  };
}

let cached: { source: WebPost[]; data: Insights } | null = null;

/** Цифры для /stats. Обход вакансий общий с остальными индексами (кэш на час). */
export async function insights(): Promise<Insights> {
  const posts = await allIndexedPosts();
  if (cached && cached.source === posts) return cached.data;
  const data = buildInsights(posts);
  cached = { source: posts, data };
  return data;
}
