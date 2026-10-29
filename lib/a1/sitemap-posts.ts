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

import { callWithRetry } from "./client";
import { mapPosts } from "./mappers";
import { PostsSearchOutputSchema } from "./schemas";
import { isJobPostingExpired } from "../seo/jsonld";
import type { WebPost } from "@/types/web-post";
import { loadJobPostsSnapshot, saveJobPostsSnapshot } from "./posts-snapshot";

const PAGE_SIZE = 100; // posts.search's documented max (PLAN.md §0.2)

// PLAN.md §3.1: each chunked sitemap file caps at 45,000 URLs. Exported so
// app/sitemap.ts and app/robots.ts derive the same chunk count from the
// same number — robots.txt has to list every /sitemap/<id>.xml URL by hand
// (see app/robots.ts for why: generateSitemaps() does not serve an index
// at /sitemap.xml, confirmed live).
export const SITEMAP_CHUNK_SIZE = 45_000;

/**
 * 14.10.2026 (SEO-проверка по аудиту). Google принимает в одном файле карты не больше 50 000
 * адресов -- больше файл не читает вовсе. Живая /sitemap/0.xml дошла до 52 716: в первый чанк
 * ехали и все посадочные, события, профили компаний (~16 тысяч), и все вакансии (до 45 тысяч).
 * Теперь чанк 0 -- только посадочные, события и профили, а вакансии -- с чанка 1, по 40 000.
 */
export const SITEMAP_JOBS_PER_CHUNK = 40_000;

/** Сколько файлов карты: 1 (посадочные) + чанки вакансий (минимум один). */
export function sitemapChunkCount(postCount: number): number {
  return 1 + Math.max(1, Math.ceil(postCount / SITEMAP_JOBS_PER_CHUNK));
}

// A hard safety stop across ALL chunks combined, well above any volume
// this site will plausibly reach for a long while — it exists so a
// backend bug (e.g. a cursor that never terminates) can't spin this into
// an infinite loop, not because we expect to hit it.
const MAX_TOTAL_POSTS = SITEMAP_CHUNK_SIZE * 5;

// Сколько страниц тянем одновременно. То же число, что у обхода в
// lib/a1/feed.ts (SCAN_CONCURRENCY) -- сознательно одно и то же, чтобы
// два обхода не нагружали бэкенд по-разному.
// 02.10.2026 (Александр: «сайт став люто довго вантажитись»). 12 сторінок
// одночасно разом із кількома такими ж обходами після кожного перезапуску
// забивали бекенд, і звичайні сторінки чекали в черзі по 5-30 с. Тепер
// обхід один на весь процес (див. fetchAllSitemapJobPosts нижче) і тихіший.
const SCAN_CONCURRENCY = 4;

// 16.10.2026 (счёт Railway: память jobs-web -- 2 ГБ, дороже всего
// остального сайта вместе взятого). Этот список живёт в памяти процесса
// сутки и держит ВСЕ живые вакансии -- десятки тысяч штук. Самое тяжёлое
// в вакансии -- её текст, и он лежал тут ДВАЖДЫ: contentText (чистый) и
// contentHtml (он же с разметкой, обычно даже длиннее).
//
// Вторая копия в этом списке не нужна никому. Единственный потребитель
// contentHtml -- описание JobPosting в разметке для Google
// (lib/seo/jsonld.ts), а туда вакансия приходит отдельным свежим
// запросом на своей странице (app/jobs/[slug]/page.tsx), не отсюда. По
// той же причине не нужны картинки, ссылки и вопросы к отклику: всё это
// рисуется только на самой странице вакансии и на странице таланта.
//
// Что ОСТАЁТСЯ нетронутым: contentText -- по нему работают поиск
// подстрокой (lib/a1/feed.ts), стек (extractTechTags), признаки
// (lib/a1/job-facts.ts), «Військо» и worldwide-разбор. externalUrl к
// этому моменту уже вычислен из links в lib/a1/mappers.ts, так что
// кнопка «Відкрити вакансію» не страдает.
const NO_IMAGES: WebPost["images"] = [];
const NO_LINKS: WebPost["links"] = [];
const NO_QUESTIONS: WebPost["applyQuestions"] = [];

function liteJobPost(post: WebPost): WebPost {
  if (!post.contentHtml && post.images.length === 0 && post.links.length === 0 && post.applyQuestions.length === 0) {
    return post;
  }
  return { ...post, contentHtml: "", images: NO_IMAGES, links: NO_LINKS, applyQuestions: NO_QUESTIONS };
}

/** mapPosts + выкидывание полей, которые этому списку не нужны (см. liteJobPost). */
function mapLitePosts(items: Parameters<typeof mapPosts>[0]): WebPost[] {
  return mapPosts(items).map(liteJobPost);
}

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
async function scanAllSitemapJobPosts(): Promise<WebPost[]> {
  const fetchPage = async (offset: number, withCount: boolean) => {
    const raw = await callWithRetry<unknown>("posts.search", {
      limit: PAGE_SIZE,
      object: "post-job-employing",
      // 30.09.2026 (Конкистадор, SEO): по умолчанию бэкенд НЕ отдаёт
      // внешние вакансии (external: exclude), и в карту сайта они не
      // попадали бы вовсе -- Google не узнал бы о десятках тысяч страниц.
      external: "include",
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

  // 16.10.2026: страницы раскладываем СРАЗУ, а не копим массив массивов.
  // Раньше до конца обхода в памяти жили все страницы целиком, включая
  // просроченные вакансии, которые потом всё равно выбрасывались, -- на
  // десятках тысяч вакансий это и давало всплески памяти при пересчёте.
  // Порядок прежний: пачки идут по порядку, внутри пачки -- тоже.
  const posts: WebPost[] = [];
  const seen = new Set<string>();
  const take = (page: WebPost[]) => {
    for (const mapped of page) {
      if (seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      if (!isJobPostingExpired(mapped)) posts.push(mapped);
    }
  };

  take(mapLitePosts(first.items));
  for (let from = 1; from < pages; from += SCAN_CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(SCAN_CONCURRENCY, pages - from) }, (_, i) =>
        fetchPage((from + i) * PAGE_SIZE, false).then((parsed) => mapLitePosts(parsed.items)),
      ),
    );
    for (const page of batch) take(page);
  }

  if (posts.length >= MAX_TOTAL_POSTS) {
    console.warn(
      `[lib/a1/sitemap-posts] hit the ${MAX_TOTAL_POSTS}-post safety cap — sitemap is truncated, not exhaustive`,
    );
  }

  return posts;
}

// 02.10.2026: ОДИН спільний обхід на весь процес. Раніше його незалежно
// запускали карта сайту, стеки (tech-index), признаки (facts-index → SEO,
// статистика, карта всесвіту) -- кожен свій, одночасно, і після кожного
// деплою бекенд отримував кілька сотень запитів разом. Тепер: результат
// живе годину; паралельні виклики чекають той самий обхід; коли година
// минула -- віддаємо старе одразу й тихо оновлюємо у фоні.
// 09.10.2026 (Александр, счёт Railway вырос в 2,5 раза): полный обход -- раз в
// СУТКИ, а не раз в час. На 31 тысяче вакансий один проход тянет из базы около
// ста мегабайт, и это была самая дорогая регулярная вещь на сайте.
//
// Чтобы свежие вакансии при этом не ждали сутки, рядом живёт «догон»: раз в
// полчаса берём только первые TOPUP_PAGES страниц ленты (самые новые) и
// подмешиваем в начало то, чего ещё нет. Это ~300 вакансий вместо 31 тысячи,
// то есть примерно сотая часть прежней цены, а лента, поиск и карта сайта
// видят новое почти сразу.
const SHARED_TTL_MS = 24 * 60 * 60 * 1000;
const TOPUP_TTL_MS = 30 * 60 * 1000;
const TOPUP_PAGES = 3;

let shared: { at: number; toppedAt: number; posts: WebPost[] } | null = null;
let sharedBuilding: Promise<WebPost[]> | null = null;
let topping: Promise<void> | null = null;
let version = 0;

/** Меняется при каждом обновлении списка: по нему производные указатели понимают, что пора пересчитаться. */
export function sitemapPostsVersion(): number {
  return version;
}

function refreshShared(): Promise<WebPost[]> {
  sharedBuilding ??= scanAllSitemapJobPosts()
    .then((posts) => {
      shared = { at: Date.now(), toppedAt: Date.now(), posts };
      version += 1;
      saveJobPostsSnapshot(shared.at, posts);
      return posts;
    })
    .finally(() => {
      sharedBuilding = null;
    });
  return sharedBuilding;
}

/** Догон: только самые новые страницы ленты, новое -- в начало списка. */
async function topUp(): Promise<void> {
  const base = shared;
  if (!base) return;
  const fetchPage = async (offset: number) => {
    const raw = await callWithRetry<unknown>("posts.search", {
      limit: PAGE_SIZE,
      object: "post-job-employing",
      external: "include",
      ...(offset > 0 ? { offset } : {}),
    });
    return mapLitePosts(PostsSearchOutputSchema.parse(raw).items);
  };
  const pages = await Promise.all(Array.from({ length: TOPUP_PAGES }, (_, i) => fetchPage(i * PAGE_SIZE)));
  const known = new Set(base.posts.map((p) => p.id));
  const fresh: WebPost[] = [];
  for (const page of pages) {
    for (const post of page) {
      if (known.has(post.id) || isJobPostingExpired(post)) continue;
      known.add(post.id);
      fresh.push(post);
    }
  }
  shared = { at: base.at, toppedAt: Date.now(), posts: fresh.length ? [...fresh, ...base.posts] : base.posts };
  if (fresh.length) {
    version += 1;
    saveJobPostsSnapshot(shared.at, shared.posts);
  }
}

// 29.10.2026: первый запрос после старта -- сначала копия из базы (lib/a1/posts-snapshot.ts),
// полный обход только если копии нет. Копия старше получаса сразу догоняется свежим.
let bootstrapping: Promise<WebPost[]> | null = null;

function bootstrap(): Promise<WebPost[]> {
  bootstrapping ??= loadJobPostsSnapshot()
    .then((snap) => {
      if (!snap || snap.posts.length === 0) return refreshShared();
      shared = { at: snap.at, toppedAt: 0, posts: snap.posts };
      version += 1;
      topping ??= topUp()
        .catch(() => {})
        .finally(() => {
          topping = null;
        });
      return snap.posts;
    })
    .finally(() => {
      bootstrapping = null;
    });
  return bootstrapping;
}

export async function fetchAllSitemapJobPosts(): Promise<WebPost[]> {
  if (shared) {
    const now = Date.now();
    if (now - shared.at > SHARED_TTL_MS) {
      void refreshShared().catch(() => {});
    } else if (now - shared.toppedAt > TOPUP_TTL_MS) {
      topping ??= topUp()
        .catch(() => {})
        .finally(() => {
          topping = null;
        });
    }
    return shared.posts;
  }
  return bootstrap();
}
