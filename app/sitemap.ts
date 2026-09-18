// app/sitemap.ts
//
// Next.js's built-in sitemap convention (generateSitemaps() + a default
// sitemap({id}) function) instead of a hand-rolled XML route — this is
// the framework-native way to chunk a large sitemap and it's what Next
// itself validates the shape of, rather than us guessing at the XML.
//
// IMPORTANT, confirmed live (2026-08-26): using generateSitemaps() means
// there is no sitemap index served at /sitemap.xml — that path 404s.
// Every chunk lives at /sitemap/<id>.xml instead (0-indexed), even when
// there's only one chunk. app/robots.ts lists each chunk's URL explicitly
// because of this — see the comment there.
//
// Jobs only (PLAN.md §3.4): expired/deleted posts are excluded by
// fetchAllSitemapJobPosts() itself. Talents is deliberately never
// included here — the whole /talents tree is noindex (still-open privacy
// question in PLAN.md's OPEN QUESTIONS), and a noindex URL has no
// business in a sitemap regardless of how big or small the industry norm
// for sitemap coverage is elsewhere.

import type { MetadataRoute } from "next";
import { fetchAllSitemapJobPosts, SITEMAP_CHUNK_SIZE } from "@/lib/a1/sitemap-posts";
import { profileHref } from "@/lib/profile-href";
import { JOB_LANDINGS } from "@/lib/seo/job-landings";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";

const SITE_URL = "https://jobs.a1appp.com";

export const revalidate = 3600;

export async function generateSitemaps() {
  const posts = await fetchAllSitemapJobPosts();
  const chunkCount = Math.max(1, Math.ceil(posts.length / SITEMAP_CHUNK_SIZE));
  return Array.from({ length: chunkCount }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number | string }): Promise<MetadataRoute.Sitemap> {
  // 2026-09-15: Next отдаёт id из сегмента URL СТРОКОЙ ("0"), а не числом,
  // хотя тип говорит number. Из-за этого `id === 0` было всегда false, и
  // всё, что должно ехать только в первом чанке (корень, посадочные,
  // профили компаний), не попадало в карту сайта вообще. Слайс чанка при
  // этом работал: "0" * 5000 JS приводит к числу сам. Проверено на живой
  // /sitemap/0.xml -- 1821 URL и ни одного лишнего.
  const chunkId = Number(id);
  const isFirstChunk = chunkId === 0;

  const posts = await fetchAllSitemapJobPosts();
  const start = chunkId * SITEMAP_CHUNK_SIZE;
  const chunk = posts.slice(start, start + SITEMAP_CHUNK_SIZE);

  const entries: MetadataRoute.Sitemap = [];

  // The root URL rides along in the first chunk rather than getting a
  // whole separate sitemap file for one URL. /jobs is a redirect stub as
  // of 2026-08-26 (the feed now lives at the root, see app/page.tsx) so
  // it no longer gets its own sitemap entry.
  if (isFirstChunk) {
    entries.push({ url: SITE_URL });
    // 2026-09-14: посадочные по формату работы (lib/seo/job-landings.ts).
    // Их три, поэтому едут вместе с корнем, а не отдельным чанком.
    for (const landing of JOB_LANDINGS) {
      entries.push({ url: `${SITE_URL}/jobs/${landing.slug}` });
    }
    // 2026-09-18: посадочные по стеку (lib/seo/tech-landings.ts). Их
    // шестнадцать -- тоже вместе с корнем, отдельного чанка не стоят.
    for (const landing of TECH_LANDINGS) {
      entries.push({ url: `${SITE_URL}/jobs/stack/${landing.slug}` });
    }
    // 2026-09-18: страница сравнения с Djinni и DOU (app/compare).
    entries.push({ url: `${SITE_URL}/compare` });
  }

  for (const post of chunk) {
    entries.push({
      url: `${SITE_URL}/jobs/${post.slug}`,
      lastModified: post.updatedAt ?? post.publishedAt,
    });
  }

  // 2026-09-14 (Александр, SEO-разбор): страницы компаний.
  //
  // Профили работодателей (app/u/[username]/page.tsx) индексируемы с
  // 2026-08-26, но в карте сайта их не было -- то есть Google узнавал о
  // них только случайно, по ссылке с вакансии. А это ровно те страницы,
  // которые ищут запросом «робота в SoftServe»: у каждой свой заголовок,
  // описание компании и список её вакансий.
  //
  // Кто попадает: ТОЛЬКО авторы опубликованных вакансий, то есть
  // работодатели. Обычные профили соискателей сюда не берутся намеренно
  // -- вопрос приватности живых людей в PLAN.md до сих пор открыт (по
  // нему же вся лента «Фахівці» стоит под noindex), и класть их в карту
  // сайта значило бы активно проталкивать в индекс то, по чему решения
  // ещё нет. Публикация вакансии -- это уже заявление «я работодатель и
  // хочу, чтобы меня нашли».
  //
  // Ездят в chunk 0 вместе с корнем: их сотни, а не десятки тысяч, и
  // размазывать их по чанкам смысла нет.
  if (isFirstChunk) {
    const seen = new Set<string>();
    for (const post of posts) {
      const username = post.author.username;
      if (!username || post.author.isAnonymous) continue;
      if (seen.has(username)) continue;
      seen.add(username);
      entries.push({ url: `${SITE_URL}${profileHref(username)}` });
    }
  }

  return entries;
}
