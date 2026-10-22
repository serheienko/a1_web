// lib/seo/landing-for-tag.ts
//
// 22.10.2026. Один вопрос -- «есть ли у этого тега своя страница?» --
// и один ответ на два набора посадочных: формат работы
// (lib/seo/job-landings.ts) и тип занятости
// (lib/seo/employment-landings.ts). Раньше жило в job-landings.ts, но
// после появления второго набора функция перестала быть про один файл:
// страница вакансии спрашивает про ЛЮБОЙ свой тег, а не про формат.
//
// Здесь же landingHref(): адрес посадочной собирается в одном месте,
// потому что сегмент у наборов разный («/jobs» против «/jobs/type»).

import { JOB_LANDINGS, type JobLanding } from "@/lib/seo/job-landings";
import { EMPLOYMENT_LANDINGS } from "@/lib/seo/employment-landings";

/** Адрес посадочной. base по умолчанию «/jobs» -- так живут remote/office/hybrid. */
export function landingHref(landing: JobLanding): string {
  return `${landing.base ?? "/jobs"}/${landing.slug}`;
}

/**
 * Посадочная по тегу вакансии, если такая есть.
 *
 * 2026-09-15: страница вакансии показывает теги обычными плашками, и
 * тег формата работы («remote», «no-site», «hybrid») никуда не вёл --
 * хотя ровно под него у нас есть отдельная страница со списком. Теперь
 * такая плашка становится ссылкой: человеку это «покажи мне все
 * удалённые», а посадочной -- входящие ссылки с полутора тысяч страниц
 * вакансий вместо трёх ссылок с главной. 22.10.2026: то же самое теперь
 * работает для «full-time», «part-time» и «contract».
 *
 * Сравнение нормализованное: бэкенд хранит теги строчными через дефис,
 * но руками созданная вакансия может принести «Remote» или «full time».
 */
export function findLandingByTag(tag: string): JobLanding | undefined {
  const normalized = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return [...JOB_LANDINGS, ...EMPLOYMENT_LANDINGS].find((landing) => landing.tag === normalized);
}
