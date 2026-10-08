// lib/seo/paged.ts
//
// 08.10.2026 (Александр: «страницы блоками, как на главной: 1 2 3 ... далее, потом 20, 30, 40 --
// разные страницы лучше для SEO; и везде по всем фильтрам, мы себя кастрировали, показывая чуть-чуть»).
// Раньше посадочные (стек, тег, город, уровень, роль, страна×сегмент) показывали только первые 40
// вакансий без продолжения. Теперь это обычные страницы по 20 с той же нумерацией, что у ленты
// (components/pagination.tsx). Каждая страница -- свой адрес ?page=N: индексируется, каноническая
// ссылка на саму себя, свой заголовок. Первая страница -- по-прежнему основной адрес без ?page=.
import type { Metadata } from "next";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";

export const LANDING_PAGE_SIZE = 20;

export function pageOf(sp: { [key: string]: string | string[] | undefined } | undefined): number {
  return sp ? parsePageParam(toURLSearchParams(sp)) : 1;
}

/** Метаданные страницы списка: со 2-й страницы свой адрес, заголовок и описание. */
export function pagedMeta(meta: Metadata, baseUrl: string, page: number): Metadata {
  if (page <= 1) return meta;
  const url = `${baseUrl}?page=${page}`;
  const title = typeof meta.title === "string" ? meta.title : undefined;
  const word = title && /[А-Яа-яІіЇїЄєҐґ]/.test(title) ? "стор." : "page";
  const newTitle = title ? title.replace(/( \| A1 Jobs)?$/, ` — ${word} ${page}$1`) : undefined;
  const desc = typeof meta.description === "string" ? `${word} ${page}. ${meta.description}` : undefined;
  return {
    ...meta,
    ...(newTitle ? { title: newTitle } : {}),
    ...(desc ? { description: desc } : {}),
    alternates: { ...(meta.alternates ?? {}), canonical: url },
    openGraph: meta.openGraph ? { ...meta.openGraph, ...(newTitle ? { title: newTitle } : {}), ...(desc ? { description: desc } : {}), url } : meta.openGraph,
    twitter: meta.twitter
      ? { ...meta.twitter, ...(newTitle ? { title: newTitle } : {}), ...(desc ? { description: desc } : {}) }
      : meta.twitter,
  } as Metadata;
}
