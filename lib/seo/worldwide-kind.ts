// lib/seo/worldwide-kind.ts
//
// 30.09.2026 (Александр: «Worldwide надо как-то лучше понять -- у многих
// вакансий явно по описанию видно, что это Украина»).
//
// Откуда «Worldwide». Локация «весь мир» (country "WW") ставится двум разным
// группам вакансий, и подпись «Worldwide» правдива только для одной:
//   1) Конкистадор (external) -- удалённые вакансии мировых компаний, открытые
//      для любой страны. Это честный Worldwide.
//   2) Казак (DOU) -- украинские компании без указанного города. Замер по ленте
//      «Україна» 30.09: таких 1 804; у 1 128 (63%) текст кириллицей или есть
//      слова Украина/Київ/бронювання и т.п., остальные 676 -- англоязычные
//      удалёнки украинских компаний. «Worldwide» им не подходит.
//
// Поэтому в подписи места (не в данных -- бэкенд и разметка для Google не
// трогаются):
//   "world"  -- Конкистадор: «🌏 Worldwide»;
//   "ua"     -- Казак, по тексту это Украина: «🇺🇦 Україна»;
//   "remote" -- Казак, гео неясно: «🌏 Віддалено».

import type { WebPost } from "@/types/web-post";

export type WorldwideKind = "world" | "ua" | "remote";

const UA_WORDS =
  /ukrain|україн|украин|kyiv|kiev|київ|киев|lviv|львів|dnipro|kharkiv|odesa|🇺🇦|бронюван|reservation|\bдія\b/i;

function cyrillicShare(s: string): number {
  const cyr = (s.match(/[А-Яа-яІіЇїЄєҐґ]/g) ?? []).length;
  const lat = (s.match(/[A-Za-z]/g) ?? []).length;
  return cyr / (cyr + lat + 1);
}

/** null -- у вакансии обычная локация, подпись не меняем. */
export function worldwideKind(post: Pick<WebPost, "location" | "author" | "title" | "contentText">): WorldwideKind | null {
  if (post.location?.country?.trim().toUpperCase() !== "WW") return null;
  if (post.author.external) return "world";
  const text = `${post.title} ${post.contentText}`;
  return cyrillicShare(text) > 0.3 || UA_WORDS.test(text) ? "ua" : "remote";
}
