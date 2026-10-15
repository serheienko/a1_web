// lib/seo/hiring-month.ts
//
// 14.10.2026 (Александр: «ежемесячные страницы, кто нанимает в жовтні -- давай»). Свой контент, которого
// нет у других: какие компании больше всего наймали в IT за месяц, какие стеки и страны. Страницы
// /jobs/hiring/<YYYY-MM> и /jobs/hiring/<YYYY-MM>/<стек>.
//
// Считаем по живому списку вакансий (lib/a1/facts-index.ts): вакансии, опубликованные в этом месяце.
// Закрытые вакансии из живого списка уходят, поэтому прошлый месяц по живым данным посчитать честно
// нельзя -- итог текущего месяца раз в час записываем в хранилище (a1/hiring/<YYYY-MM>.json) и после
// конца месяца (плюс три дня на опоздавшие) показываем уже его. Месяцы до запуска страниц (раньше
// октября 2026) не показываем вовсе: снимка нет -- 404.

import type { WebPost } from "@/types/web-post";
import type { Locale } from "@/components/t";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { techsOfPost } from "@/lib/a1/tech-tags-cache";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { kvConfigured, kvGetJson, kvList, kvPutJson } from "@/lib/kv/store";

export const HIRING_MIN_MONTH_POSTS = 50;
export const HIRING_MIN_STACK_POSTS = 10;
const TOP_COMPANIES = 30;
const PREFIX = "a1/hiring/";
const FREEZE_GRACE_MS = 3 * 86_400_000;
const SAVE_EVERY_MS = 60 * 60_000;

export type HiringCompany = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  count: number;
  /** Главные технологии компании в этом месяце (адреса посадочных стека). */
  stacks: string[];
};

export type HiringStack = { slug: string; label: string; count: number };

export type HiringSummary = {
  total: number;
  companies: number;
  remote: number;
  withSalary: number;
  top: HiringCompany[];
  stacks: HiringStack[];
  countries: { cc: string; count: number }[];
};

export type HiringMonth = HiringSummary & {
  v: 1;
  month: string;
  updatedAt: string;
  /** Срез по стеку: только стеки, где вакансий за месяц не меньше порога. */
  byStack: Record<string, HiringSummary>;
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(s: string): boolean {
  return MONTH_RE.test(s);
}

export function monthKeyOf(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKeyOf(now);
}

export function monthStart(key: string): number {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return Date.UTC(y, m - 1, 1);
}

export function nextMonthStart(key: string): number {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return Date.UTC(y, m, 1);
}

const INTL: Record<Locale, string> = { uk: "uk", en: "en", ru: "ru", de: "de", es: "es", fr: "fr", pl: "pl", ptBR: "pt-BR", zh: "zh-CN" };

/** «жовтень 2026», «October 2026», ... -- на девяти языках. */
export function monthLabel(key: string): Record<Locale, string> {
  const d = new Date(monthStart(key) + 15 * 86_400_000);
  const out = {} as Record<Locale, string>;
  for (const [loc, tag] of Object.entries(INTL) as [Locale, string][]) {
    let s = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
    s = s.replace(/\s*(р\.|г\.)$/u, "");
    if (loc === "es" || loc === "ptBR") s = s.replace(/ de /g, " ");
    out[loc] = s;
  }
  return out;
}

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();

function stackOf(): Map<string, { slug: string; label: string }> {
  return new Map(TECH_LANDINGS.map((t) => [t.tech, { slug: t.slug, label: t.label }] as const));
}

function summarize(posts: WebPost[], techMap: Map<string, { slug: string; label: string }>): HiringSummary {
  const companies = new Map<string, HiringCompany & { stackN: Map<string, number> }>();
  const stacks = new Map<string, HiringStack>();
  const countries = new Map<string, number>();
  let remote = 0;
  let withSalary = 0;
  for (const p of posts) {
    // Удалёнка -- тег формата работы ("remote"); isRemote у вакансий с локацией всегда false.
    if (p.isRemote || p.tags.includes("remote")) remote++;
    if (p.salary) withSalary++;
    const cc = p.location?.country?.trim().toLowerCase();
    if (cc) countries.set(cc, (countries.get(cc) ?? 0) + 1);
    const slugs: string[] = [];
    for (const tech of techsOfPost(p)) {
      const t = techMap.get(tech);
      if (!t) continue;
      slugs.push(t.slug);
      const s = stacks.get(t.slug) ?? { slug: t.slug, label: t.label, count: 0 };
      s.count++;
      stacks.set(t.slug, s);
    }
    // Аноним или имя-ссылка (у части болгарских лент вместо названия компании -- адрес) в рейтинг не идут.
    if (p.author.isAnonymous || /^https?:\/\//i.test(p.author.name.trim())) continue;
    const key = (p.author.username ?? p.author.name).toLowerCase();
    const c = companies.get(key) ?? {
      name: p.author.name,
      username: p.author.username,
      avatarUrl: p.author.avatarUrl,
      count: 0,
      stacks: [],
      stackN: new Map<string, number>(),
    };
    c.count++;
    for (const s of slugs) c.stackN.set(s, (c.stackN.get(s) ?? 0) + 1);
    companies.set(key, c);
  }
  const top = [...companies.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_COMPANIES)
    .map(({ stackN, ...c }) => ({
      ...c,
      stacks: [...stackN.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s),
    }));
  return {
    total: posts.length,
    companies: companies.size,
    remote,
    withSalary,
    top,
    stacks: [...stacks.values()].sort((a, b) => b.count - a.count),
    countries: [...countries.entries()].map(([cc, count]) => ({ cc, count })).sort((a, b) => b.count - a.count),
  };
}

/** Считает месяц по живому списку. Экспорт -- для проверки на живых данных. */
export function buildHiringMonth(all: WebPost[], key: string, now: Date = new Date()): HiringMonth {
  const from = monthStart(key);
  const to = nextMonthStart(key);
  const posts = all.filter((p) => p.kind === "hiring" && time(p) >= from && time(p) < to);
  const techMap = stackOf();
  const base = summarize(posts, techMap);
  const byStack: Record<string, HiringSummary> = {};
  for (const s of base.stacks) {
    if (s.count < HIRING_MIN_STACK_POSTS) continue;
    const tech = TECH_LANDINGS.find((t) => t.slug === s.slug)!.tech;
    byStack[s.slug] = summarize(posts.filter((p) => techsOfPost(p).includes(tech)), techMap);
  }
  return { v: 1, month: key, updatedAt: now.toISOString(), ...base, byStack };
}

// Память: месяц -> итог, пересчитывается, когда обновился живой список.
let live: { source: WebPost[]; key: string; data: HiringMonth } | null = null;
let lastSave = 0;

export function isLive(key: string, now: Date): boolean {
  return now.getTime() < nextMonthStart(key) + FREEZE_GRACE_MS && now.getTime() >= monthStart(key);
}

/** Итог месяца: идущий месяц -- по живым данным (и раз в час в хранилище), прошлый -- из хранилища. */
export async function hiringMonth(key: string, now: Date = new Date()): Promise<HiringMonth | null> {
  if (!isMonthKey(key)) return null;
  if (isLive(key, now)) {
    const posts = await allIndexedPosts();
    if (!live || live.source !== posts || live.key !== key) {
      live = { source: posts, key, data: buildHiringMonth(posts, key, now) };
    }
    if (kvConfigured() && Date.now() - lastSave > SAVE_EVERY_MS && live.data.total >= HIRING_MIN_MONTH_POSTS) {
      lastSave = Date.now();
      kvPutJson(`${PREFIX}${key}.json`, live.data).catch(() => {
        lastSave = 0;
      });
    }
    return live.data;
  }
  if (!kvConfigured()) return null;
  try {
    return await kvGetJson<HiringMonth>(`${PREFIX}${key}.json`);
  } catch {
    return null;
  }
}

/** Месяцы, у которых есть страница: сохранённые + текущий. Новые сверху. */
export async function hiringMonths(now: Date = new Date()): Promise<string[]> {
  const set = new Set<string>();
  const cur = currentMonthKey(now);
  // В первые три дня месяца ещё жив прошлый (опоздавшие вакансии).
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

/** Свежие вакансии месяца (ещё живые) -- список под цифрами. Для прошлых месяцев -- те, что ещё открыты. */
export async function hiringMonthPosts(key: string, techSlug: string | null, limit = 20): Promise<WebPost[]> {
  if (!isMonthKey(key)) return [];
  const from = monthStart(key);
  const to = nextMonthStart(key);
  const tech = techSlug ? TECH_LANDINGS.find((t) => t.slug === techSlug)?.tech : null;
  const out = (await allIndexedPosts()).filter(
    (p) => p.kind === "hiring" && time(p) >= from && time(p) < to && (!tech || techsOfPost(p).includes(tech)),
  );
  return out.sort((a, b) => time(b) - time(a)).slice(0, limit);
}
