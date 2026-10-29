// lib/seo/hreflang.ts
//
// 29.10.2026 (мастер-план «Языковые версии сайта»). Украинские адреса остаются как есть, языковые
// версии живут с приставкой: /jobs/role/qa и /en/jobs/role/qa. hreflang работает только взаимно --
// каждая версия обязана назвать и себя, и остальные, иначе Google метки игнорирует.
//
// Языки включаем по очереди (см. мастер-план): пока в LIVE_LOCALES только английский. Добавить
// следующий язык -- это одна строка здесь плюс каталог страниц app/<lang>/.
import type { Locale } from "@/components/t";

export const SITE_URL = "https://jobs.a1appp.com";

/** Языки, у которых уже есть свои адреса. Украинский -- на корне, без приставки. */
export const LIVE_LOCALES: Locale[] = ["en", "de", "pl"];

/** Адрес этого же пути на нужном языке: ("/jobs/role/qa", "en") -> "/en/jobs/role/qa". */
export function localizedPath(path: string, locale?: Locale): string {
  if (!locale || !LIVE_LOCALES.includes(locale)) return path;
  return `/${locale}${path}`;
}

/** Готовый набор для alternates.languages: украинская версия, живые языки и x-default. */
export function altLanguages(ukPath: string): Record<string, string> {
  const uk = `${SITE_URL}${ukPath}`;
  const out: Record<string, string> = { uk, "x-default": uk };
  for (const locale of LIVE_LOCALES) out[locale] = `${SITE_URL}/${locale}${ukPath}`;
  return out;
}
