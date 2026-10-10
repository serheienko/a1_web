// lib/seo/tech-landings.ts
//
// 2026-09-18. Посадочные страницы по стеку: /jobs/stack/python и т.д.
//
// Почему они появились только сейчас. В сентябре, когда делались первые
// три посадочные (lib/seo/job-landings.ts), я специально проверил все
// оси, по которым можно нарезать ленту, и написал там: «стек (java,
// python, react) -- такого признака у вакансий нет вообще». Это было
// правдой: у бэкенда такого тега нет и сейчас. Изменилось другое -- с
// 18.09 мы ВЫТАСКИВАЕМ стек из текста вакансии сами
// (lib/seo/job-tech-tags.ts), то есть признак у нас появился свой.
//
// Зачем это нужно, кроме запросов. В Search Console 1849 наших страниц
// числятся «обнаружена, но не проиндексирована»: Google знает адреса из
// sitemap, но не идёт по ним, потому что внутри сайта на них почти никто
// не ссылается. Эти страницы -- узлы, из которых ведут сотни ссылок
// вглубь. Они лечат обход не меньше, чем приводят людей по запросу
// «python вакансії».
//
// 10.10.2026 (Александр, разбор SEO). Было шестнадцать посадочных на
// семьдесят девять технологий словаря -- то есть шестьдесят три адреса,
// по которым люди ищут («rust вакансії», «terraform робота»), мы просто
// не открывали. Теперь посадочная есть у каждой технологии словаря, а от
// пустых страниц по-прежнему защищает не короткий список, а порог
// MIN_SEGMENT_POSTS: меньше десяти вакансий -- страницы нет (404) и в
// карту сайта она не попадает.
//
// ИСКЛЮЧЕНИЯ -- там, где посадочная по стеку спорила бы за тот же запрос
// с посадочной по профессии (lib/seo/job-role.ts). «SAP», «Salesforce»,
// «1С», «SEO», «PPC» -- это профессии, а не технологии в резюме, и
// запрос «вакансії sap» должна забирать одна наша страница, а не две.
// В фильтре (?stack=) они остаются: см. lib/seo/tech-catalog.ts.

import type { Locale } from "@/components/t";
import { TECH_CATALOG } from "@/lib/seo/tech-catalog";

export type TechLanding = {
  /** Часть адреса: /jobs/stack/<slug>. */
  slug: string;
  /** Каноническое имя из словаря lib/seo/job-tech-tags.ts, буква в букву. */
  tech: string;
  /** Как пишем в заголовке. */
  label: string;
};

/**
 * Технологии, у которых посадочной НЕТ: по этому запросу работает
 * страница профессии (lib/seo/job-role.ts), две своих страницы на один
 * запрос мы не выставляем.
 */
const ROLE_OWNED = new Set(["sap", "salesforce", "1c", "seo", "ppc"]);

export const TECH_LANDINGS: TechLanding[] = TECH_CATALOG.filter((item) => !ROLE_OWNED.has(item.slug)).map((item) => ({
  slug: item.slug,
  tech: item.tech,
  label: item.tech,
}));

/**
 * Короткий список «популярного» -- он и был всем списком посадочных до
 * 10.10.2026. Нужен там, где показывать весь словарь нельзя: свёрнутый
 * ряд чипов в фильтре по стеку (components/stack-picker.tsx).
 */
export const POPULAR_TECH_SLUGS: string[] = [
  "javascript", "typescript", "react", "nodejs", "python", "java", "php", "dotnet",
  "golang", "flutter", "swift", "kotlin", "aws", "kubernetes", "sql", "figma",
];

export const POPULAR_TECH_LANDINGS: TechLanding[] = POPULAR_TECH_SLUGS
  .map((slug) => TECH_LANDINGS.find((item) => item.slug === slug))
  .filter((item): item is TechLanding => !!item);

export function findTechLanding(slug: string): TechLanding | undefined {
  return TECH_LANDINGS.find((item) => item.slug === slug);
}

/** Адрес посадочной по каноническому имени технологии, если она есть. */
export function techLandingHref(tech: string): string | null {
  const landing = TECH_LANDINGS.find((item) => item.tech === tech);
  return landing ? `/jobs/stack/${landing.slug}` : null;
}

/**
 * Тексты страницы. Собираются из шаблона, а не пишутся руками на
 * шестнадцать технологий: фраза одна и та же, меняется одно слово.
 * Порядок слов в каждом языке задан отдельно -- склейкой «слово +
 * фраза» правильного предложения не выходит.
 */
export function techLandingH1(label: string): Record<Locale, string> {
  return {
    uk: `${label} вакансії`,
    en: `${label} jobs`,
    ru: `${label} вакансии`,
    de: `${label} Jobs`,
    es: `Empleos ${label}`,
    fr: `Offres ${label}`,
    pl: `Praca ${label}`,
    ptBR: `Vagas ${label}`,
    zh: `${label} 职位`,
  };
}

export function techLandingCountLine(label: string): Record<Locale, string> {
  return {
    uk: `{n} відкритих вакансій, де потрібен ${label}`,
    en: `{n} open jobs that need ${label}`,
    ru: `{n} открытых вакансий, где нужен ${label}`,
    de: `{n} offene Stellen mit ${label}`,
    es: `{n} vacantes abiertas con ${label}`,
    fr: `{n} offres ouvertes avec ${label}`,
    pl: `{n} otwartych ofert z ${label}`,
    ptBR: `{n} vagas abertas com ${label}`,
    zh: `{n} 个需要 ${label} 的职位`,
  };
}

export function techLandingLead(label: string): Record<Locale, string> {
  return {
    uk: `Вакансії, у тексті яких згадано ${label}. Список збирається з описів вакансій і оновлюється щодня.`,
    en: `Jobs that mention ${label} in the description. The list is built from job descriptions and updated daily.`,
    ru: `Вакансии, в тексте которых упомянут ${label}. Список собирается из описаний и обновляется ежедневно.`,
    de: `Stellen, die ${label} in der Beschreibung nennen. Die Liste wird täglich aktualisiert.`,
    es: `Vacantes que mencionan ${label} en la descripción. La lista se actualiza a diario.`,
    fr: `Offres qui mentionnent ${label} dans la description. La liste est mise à jour chaque jour.`,
    pl: `Oferty, które wymieniają ${label} w opisie. Lista aktualizowana codziennie.`,
    ptBR: `Vagas que mencionam ${label} na descrição. A lista é atualizada diariamente.`,
    zh: `描述中提到 ${label} 的职位。列表每日更新。`,
  };
}

export function techLandingMeta(label: string): { title: string; description: string } {
  return {
    title: `${label} вакансії — робота для розробників | A1 Jobs`,
    description: `Відкриті вакансії, де потрібен ${label}: віддалено, в офісі та гібрид. Список збирається з описів вакансій і оновлюється щодня.`,
  };
}
