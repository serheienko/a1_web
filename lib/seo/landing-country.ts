// lib/seo/landing-country.ts
//
// 30.09.2026 (Александр, запись экрана: выбрана страна «США», нажимает
// «З зарплатою» -- и попадает на общую страницу «2 454 вакансії» со
// всего мира: «я хотел, чтобы теги отрабатывали выбранный регион»).
//
// Чипы на главной -- это ссылки на посадочные (/jobs/remote, /jobs/tag/...,
// /jobs/top-100), а посадочные про страну ничего не знали. Теперь чип
// переносит выбранную страну в адрес (?country=us), а посадочная
// показывает вакансии только этой страны. Такой вариант страницы --
// это фильтр, а не витрина для поиска: он закрыт от индексации, а
// канонический адрес остаётся чистым (без ?country).

import { parseFeedFilters, toURLSearchParams } from "@/lib/a1/feed";

/** Страна из адреса посадочной: ISO-код или undefined (Украина -- режим по умолчанию, не фильтр). */
export function landingCountry(
  searchParams: { [key: string]: string | string[] | undefined },
): string | undefined {
  return parseFeedFilters(toURLSearchParams(searchParams)).country;
}

/** Добавляет ?country=xx к адресу, если страна выбрана. */
export function withCountry(href: string, country?: string | null): string {
  if (!country) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}country=${country.toLowerCase()}`;
}
