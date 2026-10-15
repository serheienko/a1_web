// lib/seo/hiring-ukraine.ts
//
// 15.10.2026 (Александр: «А почему у нас нет страницы по Украине?» -- «Да»). «Хто наймає в IT в Україні:
// <місяць>» -- /jobs/hiring/ukraine/<YYYY-MM>. Те же цифры, что в колонке для украинских медиа: армия и
// оборонка, бронирование, кто нанимает, города, уровни, английский, опыт, зарплаты, стеки.
//
// Украина = место работы в Украине ИЛИ вакансия воинской части (у них часто нет города). Как и общий
// месяц (lib/seo/hiring-month.ts): идущий месяц считаем по живому списку и раз в час пишем итог в
// хранилище (a1/hiring-ua/<YYYY-MM>.json), прошлые месяцы показываем из хранилища.
//
// Бронирование, английский, опыт -- только если прямо написано в вакансии (lib/a1/job-facts.ts).

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { extractJobFacts } from "@/lib/a1/job-facts";
import { techsOfPost } from "@/lib/a1/tech-tags-cache";
import { extractLevel, type JobLevel } from "@/lib/seo/job-level";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { kvConfigured, kvGetJson, kvList, kvPutJson } from "@/lib/kv/store";
import { currentMonthKey, isLive, isMonthKey, monthKeyOf, monthStart, nextMonthStart } from "@/lib/seo/hiring-month";

export const UA_MIN_MONTH_POSTS = 50;
const TOP_COMPANIES = 30;
const PREFIX = "a1/hiring-ua/";
const SAVE_EVERY_MS = 60 * 60_000;

/** Воинские части: бригады, полки, батальоны, ЗСУ, Нацгвардия, Силы беспилотных систем... */
const ARMY_RE =
  /бригад|(^|[^а-яіїєґ])полк|батальйон|\bЗСУ\b|Нацгвард|Національн\w* гвард|Збройн\w* Сил|Сил\w* оборони|Сил\w* безпілотн|\bДШВ\b|\bОВМБр\b|\bОМБр\b|\bОШБр\b|\bОМПБр\b|кіберцентр|Brigade\b|Regiment\b|Battalion\b|Armed Forces of Ukraine/i;

/** Оборонные компании (дроны, робототехника, РЭБ, ассоциации производителей). Только по названию работодателя. */
const DEFENSE_RE =
  /the fourth law|frontline robotics|\bvyriy\b|вирій|association of ukrainian defen[cs]e|асоціація українських виробників зброї|\bAUDM\b|атлон|athlon avia|\bseagull\b|ugv robotics|генерал черешня|general cherry|airlogix|arx robotics|infozahyst|інфозахист|taf industries|\btaf drones\b|skyeton|ukrspecsystems|fire point|tencore|skyfall|brave1|swarmer|kvertus|roboneers|escadrone|ескадрон|piranha tech|himera|bavovna|twist robotics|\bdevdroid\b|\bwarbirds?\b|укроборонпром|ukroboronprom|аеророзвідка|aerorozvidka|quantum[- ]systems|helsing|\bsine\.?engineering\b|defen[cs]e tech|defen[cs]e systems/i;

export type UaCompany = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  count: number;
  /** army -- воинская часть, defense -- оборонная компания. */
  side: "army" | "defense" | null;
};

export type HiringUkraine = {
  v: 1;
  month: string;
  updatedAt: string;
  total: number;
  companies: number;
  army: { posts: number; units: number; withSalary: number };
  defense: { posts: number; companies: number };
  civil: { posts: number; withSalary: number };
  withSalary: number;
  reservation: number;
  firstJob: number;
  top: UaCompany[];
  cities: { city: string; count: number }[];
  levels: Record<JobLevel, number>;
  english: { known: number; B1: number; B2: number; C1: number; C2: number; low: number };
  experience: { known: number; median: number | null };
  stacks: { slug: string; label: string; count: number }[];
};

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();

export function isArmy(p: WebPost): boolean {
  return ARMY_RE.test(p.author.name);
}

export function isDefense(p: WebPost): boolean {
  return !isArmy(p) && DEFENSE_RE.test(p.author.name);
}

export function isUkrainian(p: WebPost): boolean {
  return p.location?.country?.trim().toLowerCase() === "ua" || isArmy(p);
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Считает месяц по живому списку. Экспорт -- для проверки на живых данных. */
export function buildHiringUkraine(all: WebPost[], key: string, now: Date = new Date()): HiringUkraine {
  const from = monthStart(key);
  const to = nextMonthStart(key);
  const posts = all.filter((p) => p.kind === "hiring" && time(p) >= from && time(p) < to && isUkrainian(p));
  const techMap = new Map(TECH_LANDINGS.map((t) => [t.tech, { slug: t.slug, label: t.label }] as const));

  const companies = new Map<string, UaCompany>();
  const armyUnits = new Set<string>();
  const defenseCos = new Set<string>();
  const cities = new Map<string, number>();
  const stacks = new Map<string, { slug: string; label: string; count: number }>();
  const levels: Record<JobLevel, number> = { junior: 0, middle: 0, senior: 0, lead: 0 };
  const english = { known: 0, B1: 0, B2: 0, C1: 0, C2: 0, low: 0 };
  const exp: number[] = [];
  let armyPosts = 0;
  let armySalary = 0;
  let defensePosts = 0;
  let civilSalary = 0;
  let withSalary = 0;
  let reservation = 0;
  let firstJob = 0;

  for (const p of posts) {
    const army = isArmy(p);
    const defense = !army && isDefense(p);
    const ckey = (p.author.username ?? p.author.name).toLowerCase();
    if (army) {
      armyPosts++;
      armyUnits.add(ckey);
      if (p.salary) armySalary++;
    } else if (p.salary) civilSalary++;
    if (defense) {
      defensePosts++;
      defenseCos.add(ckey);
    }
    if (p.salary) withSalary++;

    const city = p.location?.country?.toLowerCase() === "ua" ? p.location.city?.trim() : "";
    if (city) cities.set(city, (cities.get(city) ?? 0) + 1);

    const level = extractLevel(p.title);
    if (level) levels[level]++;

    const facts = extractJobFacts(p.title, p.contentText);
    if (facts.reservation) reservation++;
    if (facts.firstJob) firstJob++;
    if (facts.experienceYears != null) exp.push(facts.experienceYears);
    const cefr = facts.english?.cefr;
    if (cefr) {
      english.known++;
      if (cefr === "A1" || cefr === "A2") english.low++;
      else english[cefr]++;
    }

    for (const tech of techsOfPost(p)) {
      const t = techMap.get(tech);
      if (!t) continue;
      const s = stacks.get(t.slug) ?? { slug: t.slug, label: t.label, count: 0 };
      s.count++;
      stacks.set(t.slug, s);
    }

    if (p.author.isAnonymous || /^https?:\/\//i.test(p.author.name.trim())) continue;
    const c = companies.get(ckey) ?? {
      name: p.author.name,
      username: p.author.username,
      avatarUrl: p.author.avatarUrl,
      count: 0,
      side: army ? "army" : defense ? "defense" : null,
    };
    c.count++;
    companies.set(ckey, c);
  }

  return {
    v: 1,
    month: key,
    updatedAt: now.toISOString(),
    total: posts.length,
    companies: companies.size,
    army: { posts: armyPosts, units: armyUnits.size, withSalary: armySalary },
    defense: { posts: defensePosts, companies: defenseCos.size },
    civil: { posts: posts.length - armyPosts, withSalary: civilSalary },
    withSalary,
    reservation,
    firstJob,
    top: [...companies.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, TOP_COMPANIES),
    cities: [...cities.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
    levels,
    english,
    experience: { known: exp.length, median: median(exp) },
    stacks: [...stacks.values()].sort((a, b) => b.count - a.count),
  };
}

let live: { source: WebPost[]; key: string; data: HiringUkraine } | null = null;
let lastSave = 0;

/** Итог месяца по Украине: идущий -- по живым данным (и раз в час в хранилище), прошлый -- из хранилища. */
export async function hiringUkraine(key: string, now: Date = new Date()): Promise<HiringUkraine | null> {
  if (!isMonthKey(key)) return null;
  if (isLive(key, now)) {
    const posts = await allIndexedPosts();
    if (!live || live.source !== posts || live.key !== key) {
      live = { source: posts, key, data: buildHiringUkraine(posts, key, now) };
    }
    if (kvConfigured() && Date.now() - lastSave > SAVE_EVERY_MS && live.data.total >= UA_MIN_MONTH_POSTS) {
      lastSave = Date.now();
      kvPutJson(`${PREFIX}${key}.json`, live.data).catch(() => {
        lastSave = 0;
      });
    }
    return live.data;
  }
  if (!kvConfigured()) return null;
  try {
    return await kvGetJson<HiringUkraine>(`${PREFIX}${key}.json`);
  } catch {
    return null;
  }
}

/** Месяцы с украинской страницей: сохранённые + текущий. Новые сверху. */
export async function hiringUkraineMonths(now: Date = new Date()): Promise<string[]> {
  const set = new Set<string>();
  const cur = currentMonthKey(now);
  const prev = monthKeyOf(new Date(monthStart(cur) - 86_400_000));
  if (isLive(prev, now)) set.add(prev);
  set.add(cur);
  if (kvConfigured()) {
    try {
      for (const r of await kvList(PREFIX)) {
        const k = r.path.slice(PREFIX.length).replace(/\.json$/, "");
        if (isMonthKey(k)) set.add(k);
      }
    } catch {
      // нет хранилища -- только текущий
    }
  }
  return [...set].sort().reverse();
}

/** Свежие украинские вакансии месяца (ещё открытые). */
export async function hiringUkrainePosts(key: string, limit = 20): Promise<WebPost[]> {
  if (!isMonthKey(key)) return [];
  const from = monthStart(key);
  const to = nextMonthStart(key);
  const out = (await allIndexedPosts()).filter(
    (p) => p.kind === "hiring" && time(p) >= from && time(p) < to && isUkrainian(p),
  );
  return out.sort((a, b) => time(b) - time(a)).slice(0, limit);
}
