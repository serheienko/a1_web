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
// Список короткий намеренно: только то, что реально спрашивают и чего у
// нас заведомо больше десятка вакансий. Страница с тремя вакансиями
// Google не нужна, а нам -- тем более.

import type { Locale } from "@/components/t";

export type TechLanding = {
  /** Часть адреса: /jobs/stack/<slug>. */
  slug: string;
  /** Каноническое имя из словаря lib/seo/job-tech-tags.ts, буква в букву. */
  tech: string;
  /** Как пишем в заголовке. */
  label: string;
};

export const TECH_LANDINGS: TechLanding[] = [
  { slug: "javascript", tech: "JavaScript", label: "JavaScript" },
  { slug: "typescript", tech: "TypeScript", label: "TypeScript" },
  { slug: "react", tech: "React", label: "React" },
  { slug: "nodejs", tech: "Node.js", label: "Node.js" },
  { slug: "python", tech: "Python", label: "Python" },
  { slug: "java", tech: "Java", label: "Java" },
  { slug: "php", tech: "PHP", label: "PHP" },
  { slug: "dotnet", tech: ".NET", label: ".NET" },
  { slug: "golang", tech: "Go", label: "Go" },
  { slug: "flutter", tech: "Flutter", label: "Flutter" },
  { slug: "swift", tech: "Swift", label: "Swift" },
  { slug: "kotlin", tech: "Kotlin", label: "Kotlin" },
  { slug: "aws", tech: "AWS", label: "AWS" },
  { slug: "kubernetes", tech: "Kubernetes", label: "Kubernetes" },
  { slug: "sql", tech: "SQL", label: "SQL" },
  { slug: "figma", tech: "Figma", label: "Figma" },
];

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
