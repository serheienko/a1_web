// lib/a1/stack-index.ts
//
// 2026-09-20 (Александр, про фильтр по стеку: «это всё равно очень долго»).
//
// ЧТО БЫЛО. Стек вытаскивается из текста вакансии (lib/seo/job-tech-tags.ts),
// у бэкенда такого признака нет. Поэтому первая версия на каждый клик читала
// всю ленту -- две с лишним тысячи вакансий -- и отбирала подходящие. Сначала
// это занимало одиннадцать секунд (страницы шли по курсору, одна за другой),
// потом около семи (страницы пошли параллельно). Семь секунд на клик -- всё
// равно не фильтр.
//
// ЧТО ТЕПЕРЬ. Обход остался, но он больше не висит на клике и не повторяется
// в каждом процессе. Отдельно лежит УКАЗАТЕЛЬ: для каждой вакансии только её
// id и найденные технологии -- без заголовка, без текста, без картинок. На
// две тысячи вакансий это около сотни килобайт, и он помещается в общий кеш
// данных Next (unstable_cache), тот же, которым уже пользуются размытия
// аватарок (lib/avatar-blur.ts) и список непустых категорий
// (app/api/filters/bootstrap). Общий -- значит один на все серверные
// процессы Vercel и переживающий их перезапуск, в отличие от обычной
// переменной в памяти.
//
// Клик после этого стоит двух дешёвых шагов: прочитать указатель и забрать
// ПО ИМЕНАМ двадцать вакансий нужной страницы одним запросом posts.get.
// Полный текст всей ленты для этого больше не нужен.
//
// ЦЕНА. Указатель живёт полчаса. Первый заход после этого срока строит его
// заново -- те же несколько секунд, но один раз на всех, а не на каждого; и
// пока он строится, Next продолжает отдавать прежний. Вакансия, появившаяся
// только что, попадёт в фильтр по стеку в пределах получаса -- сама лента
// при этом обновляется каждые 15 секунд, как и раньше.

import { unstable_cache } from "next/cache";
import { call } from "./client";
import { PostsSearchOutputSchema } from "./schemas";
import { mapPosts } from "./mappers";
import { extractTechTags } from "@/lib/seo/job-tech-tags";

/** Одна строка указателя: какая вакансия и какие технологии в ней нашлись. */
export type StackIndexEntry = { id: string; techs: string[] };

const PAGE_SIZE = 100; // posts.search's documented max per request
const CONCURRENCY = 12; // страниц за раз; см. ниже, почему не все сразу
const MAX_PAGES = 30; // 3 000 вакансий -- предел, дальше указатель обрывается
const TTL_SECONDS = 30 * 60;

async function buildIndex(searchParams: Record<string, unknown>): Promise<StackIndexEntry[]> {
  const fetchPage = async (offset: number, withCount: boolean) => {
    const raw = await call<unknown>("posts.search", {
      limit: PAGE_SIZE,
      ...(offset > 0 ? { offset } : {}),
      ...searchParams,
      ...(withCount ? { expand: "count" } : {}),
    });
    return PostsSearchOutputSchema.parse(raw);
  };

  // Первая страница приносит общее число: без него неизвестно, сколько
  // страниц вообще запрашивать.
  const first = await fetchPage(0, true);
  const total = first.count?.total ?? 0;
  const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(total / PAGE_SIZE)));

  // Пачками, а не все тридцать разом: это запросы к собственному бэкенду, и
  // выигрыш после дюжины уже небольшой, а нагрузка растёт линейно.
  const byPage = [first.items];
  for (let from = 1; from < pages; from += CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pages - from) }, (_, i) =>
        fetchPage((from + i) * PAGE_SIZE, false).then((parsed) => parsed.items),
      ),
    );
    byPage.push(...batch);
  }

  // Порядок страниц сохранён, значит и порядок ленты: выдача со стеком
  // читается так же, как нефильтрованная. Дедупликация -- подстраховка:
  // лента живая, и пока идут запросы, offset может сдвинуться.
  const out: StackIndexEntry[] = [];
  const seen = new Set<string>();
  for (const items of byPage) {
    for (const post of mapPosts(items)) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push({ id: post.id, techs: extractTechTags(post.title, post.contentText) });
    }
  }
  return out;
}

/**
 * Указатель для одной комбинации фильтров бэкенда.
 *
 * `cacheKey` описывает эту комбинацию и уходит в ключ кеша; `searchParams` --
 * то, что реально отправляется в posts.search. Две вещи вместо одной потому,
 * что ключ должен быть коротким и стабильным, а параметры -- полными.
 */
export function fetchStackIndex(
  cacheKey: string,
  searchParams: Record<string, unknown>,
): Promise<StackIndexEntry[]> {
  return unstable_cache(() => buildIndex(searchParams), ["stack-index-v1", cacheKey], {
    revalidate: TTL_SECONDS,
  })();
}
