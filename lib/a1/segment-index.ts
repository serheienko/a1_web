// lib/a1/segment-index.ts
//
// 30.09.2026. Какие вакансии попадают в какой SEO-сегмент: город, уровень,
// страна + технология / уровень / удалёнка. Тексты и адреса -- в
// lib/seo/segments.ts, здесь только отбор.
//
// Отдельного обхода бэкенда нет: берём готовый список всех живых вакансий
// из lib/a1/facts-index.ts (тот же обход, тот же кэш на час). Сегменты
// пересчитываются, только когда список обновился, -- по ссылке на массив.

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { extractLevel, JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { MIN_SEGMENT_POSTS, slugifyCity } from "@/lib/seo/segments";
import { worldwideKind } from "@/lib/seo/worldwide-kind";

export type CitySegment = { slug: string; city: string; cc: string; posts: WebPost[] };

export type SegIndex = {
  source: WebPost[];
  cities: Map<string, CitySegment>;
  /** ключ: «de/python» */
  countryTech: Map<string, WebPost[]>;
  /** ключ: «de/junior» */
  countryLevel: Map<string, WebPost[]>;
  /** ключ: «de» */
  countryRemote: Map<string, WebPost[]>;
  /** Украина + удалённые «отовсюду»: аудитория главной. */
  globalLevel: Map<JobLevel, WebPost[]>;
  /** ключ: «kyiv/python» (адрес города + адрес технологии). */
  cityTech: Map<string, WebPost[]>;
  /** Удалённые вакансии (украинские и «отовсюду») по технологии: ключ «python». */
  remoteTech: Map<string, WebPost[]>;
};

let cached: SegIndex | null = null;

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();
const byDate = (a: WebPost, b: WebPost) => time(b) - time(a);

function push<K>(map: Map<K, WebPost[]>, key: K, post: WebPost) {
  const list = map.get(key);
  if (list) list.push(post);
  else map.set(key, [post]);
}

/** Экспорт -- для проверки на живых данных без запросов к бэкенду. */
export function buildSegmentIndex(posts: WebPost[]): SegIndex {
  const techSlugByName = new Map(TECH_LANDINGS.map((t) => [t.tech, t.slug] as const));

  // Города: ключ «страна|город» → вакансии, потом раздаём адреса с разбором
  // совпадений («Cambridge» есть и в GB, и в US).
  const cityBuckets = new Map<string, { cc: string; city: string; posts: WebPost[] }>();
  const countryTech = new Map<string, WebPost[]>();
  const countryLevel = new Map<string, WebPost[]>();
  const countryRemote = new Map<string, WebPost[]>();
  const globalLevel = new Map<JobLevel, WebPost[]>();
  const remoteTech = new Map<string, WebPost[]>();

  for (const post of posts) {
    const cc = post.location?.country?.trim().toUpperCase() || "";
    const city = post.location?.city?.trim() || "";
    const level = extractLevel(post.title);

    if (cc && cc !== "WW" && city) {
      const key = `${cc}|${city}`;
      const bucket = cityBuckets.get(key);
      if (bucket) bucket.posts.push(post);
      else cityBuckets.set(key, { cc, city, posts: [post] });
    }

    if (cc && cc !== "WW" && cc !== "UA") {
      const lc = cc.toLowerCase();
      for (const tech of extractTechTags(post.title, post.contentText)) {
        const slug = techSlugByName.get(tech);
        if (slug) push(countryTech, `${lc}/${slug}`, post);
      }
      if (level) push(countryLevel, `${lc}/${level}`, post);
      if (post.tags.includes("remote")) push(countryRemote, lc, post); // тег формата работы; isRemote у вакансий с локацией всегда false
    }

    // Удалённые для аудитории главной: украинские с тегом remote и «отовсюду».
    {
      const kind = worldwideKind(post);
      if ((cc === "UA" && post.tags.includes("remote")) || kind === "world" || kind === "remote") {
        for (const tech of new Set(extractTechTags(post.title, post.contentText))) {
          const slug = techSlugByName.get(tech);
          if (slug) push(remoteTech, slug, post);
        }
      }
    }

    // Главная-аудитория: Украина и удалённые «отовсюду».
    if (level) {
      const kind = worldwideKind(post);
      if (cc === "UA" || kind === "world" || kind === "remote") push(globalLevel, level, post);
    }
  }

  const buckets = [...cityBuckets.values()]
    .filter((b) => b.posts.length >= MIN_SEGMENT_POSTS)
    .sort((a, b) => b.posts.length - a.posts.length);
  const cities = new Map<string, CitySegment>();
  for (const b of buckets) {
    let slug = slugifyCity(b.city);
    if (!slug) continue;
    if (cities.has(slug)) slug = `${slug}-${b.cc.toLowerCase()}`;
    if (cities.has(slug)) continue;
    cities.set(slug, { slug, city: b.city, cc: b.cc, posts: b.posts });
  }

  // Город + технология (только для городов, у которых уже есть своя страница).
  const cityTech = new Map<string, WebPost[]>();
  for (const seg of cities.values()) {
    for (const post of seg.posts) {
      for (const tech of new Set(extractTechTags(post.title, post.contentText))) {
        const slug = techSlugByName.get(tech);
        if (slug) push(cityTech, `${seg.slug}/${slug}`, post);
      }
    }
  }

  return { source: posts, cities, countryTech, countryLevel, countryRemote, globalLevel, cityTech, remoteTech };
}

async function index(): Promise<SegIndex> {
  const posts = await allIndexedPosts();
  if (cached && cached.source === posts) return cached;
  cached = buildSegmentIndex(posts);
  return cached;
}

const enough = (list: WebPost[] | undefined): list is WebPost[] => !!list && list.length >= MIN_SEGMENT_POSTS;

export async function cityPosts(slug: string): Promise<CitySegment | null> {
  const seg = (await index()).cities.get(slug);
  return seg ? { ...seg, posts: [...seg.posts].sort(byDate) } : null;
}

export async function listCities(): Promise<CitySegment[]> {
  return [...(await index()).cities.values()];
}

export async function globalLevelPosts(level: JobLevel): Promise<WebPost[] | null> {
  const list = (await index()).globalLevel.get(level);
  return enough(list) ? [...list].sort(byDate) : null;
}

export async function countryTechPosts(cc: string, techSlug: string): Promise<WebPost[] | null> {
  const tech = TECH_LANDINGS.find((t) => t.slug === techSlug)?.tech;
  const list = (await index()).countryTech.get(`${cc.toLowerCase()}/${techSlug}`);
  if (!enough(list)) return null;
  // Как на странице стека: сначала вакансии, где технология в заголовке.
  const inTitle = (p: WebPost) => (tech && p.title.toLowerCase().includes(tech.toLowerCase()) ? 1 : 0);
  return [...list].sort((a, b) => inTitle(b) - inTitle(a) || byDate(a, b));
}

export async function countryLevelPosts(cc: string, level: JobLevel): Promise<WebPost[] | null> {
  const list = (await index()).countryLevel.get(`${cc.toLowerCase()}/${level}`);
  return enough(list) ? [...list].sort(byDate) : null;
}

export async function countryRemotePosts(cc: string): Promise<WebPost[] | null> {
  const list = (await index()).countryRemote.get(cc.toLowerCase());
  return enough(list) ? [...list].sort(byDate) : null;
}

/** Все живые сегменты страны: что показывать ссылками и класть в карту сайта. */
export async function countrySegments(cc: string): Promise<{
  stacks: { slug: string; count: number }[];
  levels: { level: JobLevel; count: number }[];
  remote: number;
  cities: CitySegment[];
}> {
  const idx = await index();
  const lc = cc.toLowerCase();
  const stacks = TECH_LANDINGS.map((t) => ({ slug: t.slug, count: idx.countryTech.get(`${lc}/${t.slug}`)?.length ?? 0 }))
    .filter((s) => s.count >= MIN_SEGMENT_POSTS)
    .sort((a, b) => b.count - a.count);
  const levels = JOB_LEVELS.map((level) => ({ level, count: idx.countryLevel.get(`${lc}/${level}`)?.length ?? 0 })).filter(
    (l) => l.count >= MIN_SEGMENT_POSTS,
  );
  const remote = idx.countryRemote.get(lc)?.length ?? 0;
  const cities = [...idx.cities.values()].filter((c) => c.cc === cc.toUpperCase());
  return { stacks, levels, remote: remote >= MIN_SEGMENT_POSTS ? remote : 0, cities };
}

/** Страны, у которых есть хоть один сегмент стека/уровня/удалёнки. */
export async function segmentCountries(): Promise<string[]> {
  const idx = await index();
  const set = new Set<string>();
  for (const [key, list] of idx.countryTech) if (list.length >= MIN_SEGMENT_POSTS) set.add(key.split("/")[0] ?? "");
  for (const [key, list] of idx.countryLevel) if (list.length >= MIN_SEGMENT_POSTS) set.add(key.split("/")[0] ?? "");
  for (const [key, list] of idx.countryRemote) if (list.length >= MIN_SEGMENT_POSTS) set.add(key);
  return [...set];
}

/** Где есть эта технология с 10+ вакансиями: для блока «по странам» на странице стека. */
export async function countriesForTech(techSlug: string): Promise<{ cc: string; count: number }[]> {
  const idx = await index();
  const out: { cc: string; count: number }[] = [];
  for (const [key, list] of idx.countryTech) {
    const [cc = "", slug] = key.split("/");
    if (slug === techSlug && list.length >= MIN_SEGMENT_POSTS) out.push({ cc, count: list.length });
  }
  return out.sort((a, b) => b.count - a.count);
}

export async function globalLevelCounts(): Promise<{ level: JobLevel; count: number }[]> {
  const idx = await index();
  return JOB_LEVELS.map((level) => ({ level, count: idx.globalLevel.get(level)?.length ?? 0 })).filter(
    (l) => l.count >= MIN_SEGMENT_POSTS,
  );
}

// ───────── 01.10.2026: город + технология, удалённо + технология ─────────

export async function cityTechPosts(citySlug: string, techSlug: string): Promise<WebPost[] | null> {
  const list = (await index()).cityTech.get(`${citySlug}/${techSlug}`);
  return enough(list) ? [...list].sort(byDate) : null;
}

/** Технологии города с 10+ вакансий: ссылки и карта сайта. */
export async function cityTechList(citySlug: string): Promise<{ slug: string; count: number }[]> {
  const idx = await index();
  return TECH_LANDINGS.map((t) => ({ slug: t.slug, count: idx.cityTech.get(`${citySlug}/${t.slug}`)?.length ?? 0 }))
    .filter((x) => x.count >= MIN_SEGMENT_POSTS)
    .sort((a, b) => b.count - a.count);
}

export async function remoteTechPosts(techSlug: string): Promise<WebPost[] | null> {
  const list = (await index()).remoteTech.get(techSlug);
  return enough(list) ? [...list].sort(byDate) : null;
}

export async function remoteTechList(): Promise<{ slug: string; count: number }[]> {
  const idx = await index();
  return TECH_LANDINGS.map((t) => ({ slug: t.slug, count: idx.remoteTech.get(t.slug)?.length ?? 0 }))
    .filter((x) => x.count >= MIN_SEGMENT_POSTS)
    .sort((a, b) => b.count - a.count);
}

/** Города, где эта технология набирает 10+ вакансий: блок «по городам» на странице стека. */
export async function citiesForTech(techSlug: string): Promise<{ slug: string; city: string; cc: string; count: number }[]> {
  const idx = await index();
  const out: { slug: string; city: string; cc: string; count: number }[] = [];
  for (const [key, list] of idx.cityTech) {
    const [citySlug = "", slug] = key.split("/");
    if (slug !== techSlug || list.length < MIN_SEGMENT_POSTS) continue;
    const c = idx.cities.get(citySlug);
    if (c) out.push({ slug: citySlug, city: c.city, cc: c.cc, count: list.length });
  }
  return out.sort((a, b) => b.count - a.count);
}
