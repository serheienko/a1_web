// lib/seo/profile-meta.ts
//
// Заголовок и описание страницы /u/<username> для поиска.
//
// 2026-09-15. Повод: в карту сайта наконец попали 584 страницы
// работодателей, и стало видно, что искать их в поиске не по чему.
// Заголовок был «Mind Studios | A1» -- ни слова «вакансії», ни слова
// «робота», то есть страница не отвечала ни на один запрос, по
// которому её могли бы найти. Описанием шла биография компании как
// есть: у известной компании она обычно скопирована с её же сайта,
// и тогда наш сниппет дублирует чужой.
//
// Кто считается работодателем: тот, у кого есть хотя бы одна живая
// вакансия. Отдельного флага «компания» в профиле нет (см.
// types/web-profile.ts), да он и не нужен -- частное лицо, которое
// разместило вакансию, ищут ровно так же.
//
// Профили без вакансий не трогаем: это соискатели, у них своя
// нерешённая история с приватностью (вся лента «Фахівці» под
// noindex), и подтягивать их в поиск заголовком «вакансії» было бы
// неправдой.

import { truncateAtWordBoundary } from "@/lib/format";

const MAX_DESCRIPTION = 155;

/** «2 відкриті вакансії» -- украинские числительные, не «2 вакансій». */
function vacancyCountPhrase(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${n} відкритих вакансій`;
  if (mod10 === 1) return `${n} відкрита вакансія`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} відкриті вакансії`;
  return `${n} відкритих вакансій`;
}

const TITLE_MAX = 60;

/**
 * Заголовок вкладки и синей ссылки в выдаче.
 *
 * Обрезать целиком нельзя: у «Association of Ukrainian Defense
 * Manufacturers» одно название длиннее лимита, и обычная обрезка съела
 * бы ровно ту часть, ради которой всё затевалось -- слово «вакансії».
 * Поэтому сначала пробуем полную формулировку, потом короткую, и лишь
 * в крайнем случае режем САМО НАЗВАНИЕ, оставляя ключевое слово.
 */
export function buildEmployerTitle(fullName: string): string {
  const name = fullName.replace(/\s+/g, " ").trim();
  if (!name) return "Вакансії | A1 Jobs";

  // 29.10.2026 (идея Разведчика «страницы <компания> careers», Александр: «давай»): по запросам вида
  // «wallapop careers» мы уже на 9-й позиции, а слова careers в заголовке не было. Пробуем с ним первым.
  const careers = `${name} careers — вакансії та робота | A1 Jobs`;
  if (careers.length <= TITLE_MAX) return careers;

  const long = `${name} — вакансії та робота | A1 Jobs`;
  if (long.length <= TITLE_MAX) return long;

  const short = `${name} — вакансії | A1 Jobs`;
  if (short.length <= TITLE_MAX) return short;

  const suffix = " — вакансії | A1 Jobs";
  const room = TITLE_MAX - suffix.length;
  return `${truncateAtWordBoundary(name, room)}${suffix}`;
}

export function buildEmployerDescription(fullName: string, openJobs: number, bio: string): string {
  const name = fullName.replace(/\s+/g, " ").trim();
  const lead = !name
    ? "Відкриті вакансії в A1 Jobs."
    : openJobs > 0
      ? `${name}: ${vacancyCountPhrase(openJobs)} в A1 Jobs.`
      : `${name} — вакансії в A1 Jobs.`;

  const tail = bio.replace(/\s+/g, " ").trim();
  const full = tail ? `${lead} ${tail}` : lead;

  return truncateAtWordBoundary(full, MAX_DESCRIPTION).replace(/[\s:;,\-–—(«"']+$/u, "");
}

/**
 * 25.10.2026 (Александр, превью ссылки в Telegram: «не надо дублировать имя
 * в тексте»). Для превью (og/twitter) имя уже стоит заголовком строкой выше,
 * поэтому текст -- без него: «1 відкрита вакансія в A1 Jobs. A1 Soft Dev».
 * Описание для Google (buildEmployerDescription) имя сохраняет.
 */
export function buildEmployerPreviewDescription(openJobs: number, bio: string): string {
  const phrase = vacancyCountPhrase(openJobs);
  const lead = `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} в A1 Jobs.`;
  const tail = bio.replace(/\s+/g, " ").trim();
  const full = tail ? `${lead} ${tail}` : lead;
  return truncateAtWordBoundary(full, MAX_DESCRIPTION).replace(/[\s:;,\-–—(«"']+$/u, "");
}

/**
 * Organization для страницы работодателя. Это описание сайта не самого
 * себя (то на главной), а конкретной компании: имя, логотип, ссылка на
 * её собственный сайт. Из такого Google собирает связь «эта страница --
 * про эту организацию», а не «просто ещё один профиль».
 */
export function buildEmployerJsonLd(input: {
  fullName: string;
  url: string;
  bio: string;
  logoUrl: string | null;
  sameAs: string[];
}): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.fullName,
    url: input.url,
  };

  const bio = input.bio.replace(/\s+/g, " ").trim();
  if (bio) jsonLd.description = truncateAtWordBoundary(bio, 300);
  // Логотип -- абсолютный адрес: относительный Google не принимает.
  if (input.logoUrl) jsonLd.logo = input.logoUrl;
  // Собственный сайт компании и её соцсети, если она их указала.
  if (input.sameAs.length > 0) jsonLd.sameAs = input.sameAs;

  return jsonLd;
}

/** 29.10.2026: список открытых вакансий компании для страницы /u/<компания> (schema.org ItemList). */
export function buildEmployerItemListJsonLd(input: {
  siteUrl: string;
  jobs: { slug: string; title: string }[];
}): Record<string, unknown> | null {
  const jobs = input.jobs.filter((j) => j.slug && j.title).slice(0, 20);
  if (jobs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: jobs.map((j, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${input.siteUrl}/jobs/${j.slug}`,
      name: j.title.replace(/\s+/g, " ").trim(),
    })),
  };
}

/** Хлебные крошки «Вакансії → компания» в разметке (на странице те же крошки видны глазами). */
export function buildEmployerBreadcrumbJsonLd(input: { siteUrl: string; fullName: string; url: string }): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Вакансії", item: input.siteUrl },
      { "@type": "ListItem", position: 2, name: input.fullName, item: input.url },
    ],
  };
}
