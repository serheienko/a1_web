// app/api/filters/bootstrap/route.ts
//
// 2026-09-19 (Александр, скриншот страницы вакансии: «везде, где мы
// подобавляли фильтры, они показываются не совсем корректно, корректно
// только на главной... категорию IT везде дефолтно показываем с самого
// верха... а в других категориях пока нет вакансий, поэтому их надо
// сделать сереньким»).
//
// ЧТО БЫЛО. Панель фильтров в шапке (components/nav-filters.tsx) брала
// справочники из /api/post-editor/bootstrap -- то есть из ручки для
// РЕДАКТОРА поста. Там категории идут как пришли с бэкенда и никакой
// «пустоты» не считается, поэтому на всех страницах кроме ленты список
// выглядел иначе: IT где-то в середине, пустые категории чёрным.
//
// ЧТО ТЕПЕРЬ. Своя ручка ровно для фильтров, отдающая то же самое, что
// серверный components/filters.tsx считает для ленты: категории с IT
// наверху (общая withItFirst из lib/a1/datasets.ts) и список пустых
// категорий (общая fetchEmptyCategoryValues из lib/a1/feed.ts). Никакой
// второй реализации -- те же функции.
//
// ПРО ЦЕНУ. fetchEmptyCategoryValues -- это по одному запросу на
// категорию (их около тридцати), а ручку дёргает каждый, кто наведётся
// на шапку. Поэтому результат лежит в общем кеше Next на полчаса:
// «в категории есть хоть одна вакансия» -- величина, которая так часто
// не меняется. Сами справочники дешёвые и мемоизируются внутри запроса
// (lib/a1/datasets.ts).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchCategories, fetchTagsForKind, withItFirst } from "@/lib/a1/datasets";
import { fetchEmptyCategoryValues } from "@/lib/a1/feed";

const cachedEmptyCategoryValues = unstable_cache(
  async (values: number[]) => fetchEmptyCategoryValues("hiring", values),
  ["filters-empty-categories-hiring-v1"],
  { revalidate: 1800 },
);

export async function GET() {
  try {
    const [categoriesRaw, tags] = await Promise.all([
      fetchCategories(),
      fetchTagsForKind("hiring"),
    ]);
    const categories = withItFirst(categoriesRaw);
    const emptyCategoryValues = await cachedEmptyCategoryValues(categories.map((c) => c.value));
    return NextResponse.json({ ok: true, categories, tags, emptyCategoryValues });
  } catch (err) {
    console.error("[api/filters/bootstrap] failed:", err);
    // Пустые списки лучше сломанной шапки: поиск и кнопка фильтров
    // останутся на месте, просто без справочников.
    return NextResponse.json(
      { ok: true, categories: [], tags: [], emptyCategoryValues: [] },
      { status: 200 },
    );
  }
}
