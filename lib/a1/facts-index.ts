// lib/a1/facts-index.ts
//
// 2026-09-19 (Александр: «Без досвіду» и «Бронювання» отдельными
// страницами; «не изобретай велосипед, повторяй идентично»). Какие
// вакансии относятся к признакам, которых у бэкенда нет.
//
// Признаки считаются из текста вакансии (lib/a1/job-facts.ts), поэтому
// отфильтровать по ним одним запросом к бэкенду нельзя -- надо прочитать
// все вакансии и разложить у себя. Это ровно та же задача, что у стека,
// и решается она тем же способом: см. lib/a1/tech-index.ts, здесь
// сознательная копия его устройства, а не новая выдумка.
//
// СНАЧАЛА ХОТЕЛИ ИНАЧЕ. Первая мысль была записать признак тегом в базу
// (парсер + прогон по всем уже опубликованным вакансиям). Это дороже и
// необратимо: тег пришлось бы чинить прогоном же, если правило разбора
// изменится. Здесь правило живёт в одном файле, и его правка сразу
// меняет все страницы -- ничего перезаливать не нужно.
//
// Обход всех вакансий стоит дорого (несколько запросов подряд с
// курсором), поэтому обход ровно один, результат лежит в памяти
// процесса час, и обе страницы берут готовое. Параллельные вызовы
// схлопываются в один обход.

import type { WebPost } from "@/types/web-post";
import { fetchAllSitemapJobPosts } from "./sitemap-posts";
import { extractJobFacts } from "@/lib/a1/job-facts";

/** Признаки, по которым есть отдельная посадочная. */
export type JobFactKey = "no-experience" | "reservation";

const TTL_MS = 60 * 60 * 1000;

type Index = { builtAt: number; byFact: Map<JobFactKey, WebPost[]> };

let cached: Index | null = null;
let building: Promise<Index> | null = null;

async function build(): Promise<Index> {
  const posts = await fetchAllSitemapJobPosts();
  const byFact = new Map<JobFactKey, WebPost[]>([
    ["no-experience", []],
    ["reservation", []],
  ]);

  for (const post of posts) {
    const facts = extractJobFacts(post.title, post.contentText);
    if (facts.firstJob) byFact.get("no-experience")?.push(post);
    if (facts.reservation) byFact.get("reservation")?.push(post);
  }

  return { builtAt: Date.now(), byFact };
}

async function index(): Promise<Index> {
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached;
  if (building) return building;

  building = build()
    .then((fresh) => {
      cached = fresh;
      return fresh;
    })
    .finally(() => {
      building = null;
    });

  return building;
}

/**
 * Вакансии с этим признаком, свежие сверху.
 *
 * Порядок проще, чем у стека: там заголовок отделял «вакансия ПРО
 * технологию» от «технология упомянута в требованиях», а здесь признак
 * либо есть, либо нет -- делить не на что. Дата -- та же, что видит
 * человек на карточке и Google в разметке.
 */
export async function postsForFact(fact: JobFactKey): Promise<WebPost[]> {
  const { byFact } = await index();
  const posts = byFact.get(fact) ?? [];
  return [...posts].sort(
    (a, b) =>
      (b.sourcePublishedAt ?? b.publishedAt).getTime() -
      (a.sourcePublishedAt ?? a.publishedAt).getTime(),
  );
}
