// lib/a1/sitemap-posts.ts
//
// Walks every live Jobs post for the Phase 4 sitemap (PLAN.md §4 Phase 4,
// §3.4 "expired/deleted posts are excluded from the sitemap"). Talents
// posts are deliberately never included here — the whole /talents tree is
// noindex (PLAN.md OPEN QUESTIONS, still-open privacy question), and a
// noindex URL has no business in a sitemap.
//
// PLAN.md §1 rule 2: no own database in v1.0, so this re-walks
// posts.search from scratch on every call. Bounded by the page-level
// revalidate = 3600 on the sitemap routes that call it — acceptable at
// today's post volume; PLAN.md itself flags revisiting this "only if §5
// sitemap generation becomes too slow at >20k posts."

import { call } from "./client";
import { mapPosts } from "./mappers";
import { PostsSearchOutputSchema } from "./schemas";
import { isJobPostingExpired } from "../seo/jsonld";
import type { WebPost } from "@/types/web-post";

const PAGE_SIZE = 100; // posts.search's documented max (PLAN.md §0.2)

// PLAN.md §3.1: each chunked sitemap file caps at 45,000 URLs. Exported so
// app/sitemap.ts and app/robots.ts derive the same chunk count from the
// same number — robots.txt has to list every /sitemap/<id>.xml URL by hand
// (see app/robots.ts for why: generateSitemaps() does not serve an index
// at /sitemap.xml, confirmed live).
export const SITEMAP_CHUNK_SIZE = 45_000;

// A hard safety stop across ALL chunks combined, well above any volume
// this site will plausibly reach for a long while — it exists so a
// backend bug (e.g. a cursor that never terminates) can't spin this into
// an infinite loop, not because we expect to hit it.
const MAX_TOTAL_POSTS = SITEMAP_CHUNK_SIZE * 5;

// Сколько страниц тянем одновременно. То же число, что у обхода в
// lib/a1/feed.ts (SCAN_CONCURRENCY) -- сознательно одно и то же, чтобы
// два обхода не нагружали бэкенд по-разному.
const SCAN_CONCURRENCY = 12;

/** Every live (non-expired, non-legacy-type, schema-valid), published Jobs
 *  post.
 *
 *  23.09.2026 (Александр: «нажал на главной „Бронювання“ -- заняло секунд
 *  14, это пиздец как долго»). Раньше здесь был обход по курсору:
 *  следующая страница запрашивалась только после ответа на предыдущую.
 *  На живой базе (~2100 вакансий по 100 штук) это двадцать с лишним
 *  запросов ОДИН ЗА ДРУГИМ -- отсюда и четырнадцать секунд.
 *
 *  Ровно эту же болезнь 20.09.2026 уже вылечили у обхода ленты
 *  (lib/a1/feed.ts, scanAllPosts) -- там было одиннадцать секунд на клик
 *  по чипу стека. Лечение повторено буквально, а не придумано заново:
 *  первый запрос приносит общее число вакансий, дальше страницы берутся
 *  по offset, а значит независимы друг от друга, и идут пачками
 *  параллельно.
 *
 *  Порядок страниц сохраняется, поэтому порядок выдачи прежний.
 *  Дедупликация -- подстраховка: лента живая, и пока идут запросы,
 *  offset может сдвинуться на только что опубликованную вакансию. */
export async function fetchAllSitemapJobPosts(): Promise<WebPost[]> {
  const fetchPage = async (offset: number, withCount: boolean) => {
    const raw = await call<unknown>("posts.search", {
      limit: PAGE_SIZE,
      object: "post-job-employing",
      ...(offset > 0 ? { offset } : {}),
      ...(withCount ? { expand: "count" } : {}),
    });
    return PostsSearchOutputSchema.parse(raw);
  };

  // Первая страница идёт отдельно и приносит общее число: без него
  // неизвестно, сколько страниц вообще запрашивать.
  const first = await fetchPage(0, true);
  const total =
    first.count?.object["post-job-employing"] ?? first.count?.total ?? 0;
  const pages = Math.min(
    Math.ceil(MAX_TOTAL_POSTS / PAGE_SIZE),
    Math.max(1, Math.ceil(total / PAGE_SIZE)),
  );

  const byPage: WebPost[][] = [mapPosts(first.items)];
  for (let from = 1; from < pages; from += SCAN_CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(SCAN_CONCURRENCY, pages - from) }, (_, i) =>
        fetchPage((from + i) * PAGE_SIZE, false).then((parsed) => mapPosts(parsed.items)),
      ),
    );
    byPage.push(...batch);
  }

  const posts: WebPost[] = [];
  const seen = new Set<string>();
  for (const page of byPage) {
    for (const mapped of page) {
      if (seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      if (!isJobPostingExpired(mapped)) posts.push(mapped);
    }
  }

  if (posts.length >= MAX_TOTAL_POSTS) {
    console.warn(
      `[lib/a1/sitemap-posts] hit the ${MAX_TOTAL_POSTS}-post safety cap — sitemap is truncated, not exhaustive`,
    );
  }

  return posts;
}
