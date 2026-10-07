// lib/seo/city-search.ts
//
// 07.10.2026 (Александр: «в Вене вакансии есть? поиск ищет по городам?»).
// Поиск по ленте смотрел только в заголовок и текст вакансии, поэтому «Vienna»
// находил 11 вакансий из ~27 в Вене, а «Wien» и «Відень» -- ещё меньше.
// Теперь запрос, похожий на название города, расширяется всеми названиями этого
// города (Vienna / Wien / Відень / Вена / ...) и сверяется с полем «место»
// вакансии. Словарь -- тот же, что у карты (app/game-map/city-names.json),
// ничего нового не подключается и не оплачивается.

import cityNames from "@/app/game-map/city-names.json";

const DICT = cityNames as Record<string, Record<string, string>>;

let index: Map<string, string[]> | null = null;

function build(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [en, names] of Object.entries(DICT)) {
    const all = [...new Set([en, ...Object.values(names)].map((s) => s.toLowerCase()))];
    for (const n of all) m.set(n, all);
  }
  return m;
}

/** Все названия города, если запрос -- точное название (на любом языке); иначе []. */
export function cityTerms(needle: string): string[] {
  const q = needle.trim().toLowerCase();
  if (q.length < 3) return [];
  index ??= build();
  return index.get(q) ?? [];
}

/** Совпадает ли место вакансии с запросом (с учётом названий города на других языках). */
export function locationMatches(
  loc: { city: string; display: string } | null,
  needle: string,
): boolean {
  if (!loc) return false;
  const hay = `${loc.city} ${loc.display}`.toLowerCase();
  if (hay.includes(needle)) return true;
  return cityTerms(needle).some((t) => hay.includes(t));
}
