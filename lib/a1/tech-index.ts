// lib/a1/tech-index.ts
//
// 2026-09-18. Какие вакансии относятся к какой технологии.
//
// Признака «стек» у бэкенда нет -- он вытаскивается из текста
// (lib/seo/job-tech-tags.ts). Значит отфильтровать вакансии по стеку
// одним запросом нельзя: надо прочитать все и разложить у себя.
//
// Обход всех вакансий стоит дорого (несколько запросов подряд с
// курсором), а посадочных по стеку шестнадцать. Поэтому обход ровно
// один, результат лежит в памяти процесса час, и все шестнадцать
// страниц берут готовое. Параллельные вызовы схлопываются в один обход
// -- иначе при прогреве кэша роботом шестнадцать страниц стартовали бы
// шестнадцать обходов одновременно.
//
// Память одного процесса, не общий кэш: на Vercel инстансов несколько и
// живут они недолго. Это не беда -- худшее, что бывает, это лишний
// обход на новом инстансе.

import type { WebPost } from "@/types/web-post";
import { fetchAllSitemapJobPosts } from "./sitemap-posts";
import { extractTechTags } from "@/lib/seo/job-tech-tags";

const TTL_MS = 60 * 60 * 1000;

type Index = { builtAt: number; byTech: Map<string, WebPost[]> };

let cached: Index | null = null;
let building: Promise<Index> | null = null;

async function build(): Promise<Index> {
  const posts = await fetchAllSitemapJobPosts();
  const byTech = new Map<string, WebPost[]>();

  for (const post of posts) {
    for (const tech of extractTechTags(post.title, post.contentText)) {
      const list = byTech.get(tech);
      if (list) list.push(post);
      else byTech.set(tech, [post]);
    }
  }

  return { builtAt: Date.now(), byTech };
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
 * Вакансии, где упомянута эта технология -- свежие сверху.
 *
 * Сортировка по той же дате, что видит человек на карточке и Google в
 * разметке: реальная дата публикации на источнике, если она есть.
 */
export async function postsForTech(tech: string): Promise<WebPost[]> {
  const { byTech } = await index();
  const posts = byTech.get(tech) ?? [];
  return [...posts].sort(
    (a, b) =>
      (b.sourcePublishedAt ?? b.publishedAt).getTime() - (a.sourcePublishedAt ?? a.publishedAt).getTime(),
  );
}
