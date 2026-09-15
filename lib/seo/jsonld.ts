// lib/seo/jsonld.ts
//
// JobPosting JSON-LD for /jobs/<slug> pages ONLY (PLAN.md §3.3). Never call
// this for a Talents post — a candidate is a person, not a job; emitting
// JobPosting there is a structured-data policy violation.

import type { WebPost } from "@/types/web-post";
import { profileHref } from "@/lib/profile-href";

const SITE_URL = "https://jobs.a1appp.com";

const VALID_THROUGH_DAYS = 60;

/**
 * `published + 60 days` — PLAN.md §3.4's policy pending an answer to
 * OPEN QUESTIONS #7 ("is there any concept of a vacancy closing?").
 */
export function jobPostingValidThrough(post: WebPost): Date {
  return new Date(post.publishedAt.getTime() + VALID_THROUGH_DAYS * 24 * 60 * 60 * 1000);
}

export function isJobPostingExpired(post: WebPost): boolean {
  return jobPostingValidThrough(post).getTime() < Date.now();
}

/** post.title, stripped of decorative emoji per §3.3 ("no emoji"). Good
 *  enough for v1.0 — a fully correct emoji-strip regex (flags, ZWJ
 *  sequences) is a rabbit hole; revisit if titles still slip through. */
function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Тег вакансии -> employmentType из словаря Google.
 *
 * 2026-09-14. Раньше поле не отдавалось вовсе, и в комментарии ниже
 * значилось «нужна таблица тег -> enum, которой пока нет». Таблица
 * маленькая и строится не из догадок: значения тегов у бэкенда -- это
 * английские подписи в нижнем регистре через дефис, тот же ключ, по
 * которому их переводит components/label-translations.ts
 * (TAG_LABEL_TRANSLATIONS_BY_LOWER_KEY). Оттуда же известно
 * исключение: «On-site» хранится как "no-site" -- но это формат
 * работы, а не тип занятости, и сюда всё равно не попадает.
 *
 * employmentType -- это ЧАСТОТА/характер занятости, поэтому remote,
 * hybrid и on-site здесь намеренно отсутствуют: они описывают место
 * работы, для него у Google есть отдельное jobLocationType.
 *
 * Незнакомый тег просто игнорируется -- поле необязательное, и лучше
 * не отдать его, чем отдать неверно.
 */
const TAG_TO_EMPLOYMENT_TYPE: Record<string, string> = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  freelance: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  intern: "INTERN",
  volunteer: "VOLUNTEER",
};

/** Приводит тег к тому же виду, в каком лежат ключи выше. */
function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function employmentTypesFor(post: WebPost): string[] {
  const seen = new Set<string>();
  for (const tag of post.tags) {
    const mapped = TAG_TO_EMPLOYMENT_TYPE[normalizeTag(tag)];
    if (mapped) seen.add(mapped);
  }
  return [...seen];
}

export function buildJobPostingJsonLd(post: WebPost): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: cleanTitle(post.title),
    description: post.contentHtml,
    // 2026-09-12: the DATE GOOGLE SEES must be the date the vacancy really
    // went live on its source, not the moment we imported it -- the visible
    // date on the page already uses sourcePublishedAt (app/jobs/[slug]/page.tsx),
    // and a JobPosting whose datePosted disagrees with the rendered date is
    // exactly what Search Console flags. validThrough stays anchored to
    // publishedAt on purpose: it is our listing window, and anchoring it to an
    // older source date would mark freshly imported vacancies as expired.
    datePosted: (post.sourcePublishedAt ?? post.publishedAt).toISOString(),
    validThrough: jobPostingValidThrough(post).toISOString(),
    identifier: {
      "@type": "PropertyValue",
      name: "A1",
      value: post.id,
    },
    // A1 authors are individual users, not verified companies (PLAN.md
    // §3.3 "hiringOrganization" row flags this as acceptable-but-open).
    // `sameAs`: 2026-08-28 — app/u/[username]/page.tsx now exists and is
    // indexable (Aleksandr: "если завели профиль — готовы его
    // показать"), so this finally has somewhere real to point instead of
    // a guessed URL that 404s. Anonymous authors and hidden usernames
    // have no profile page at all, so they get no sameAs.
    hiringOrganization: {
      "@type": "Organization",
      name: post.author.name,
      ...(post.author.username ? { sameAs: `${SITE_URL}${profileHref(post.author.username)}` } : {}),
    },
    // We don't have a web application flow (PLAN.md §3.3 "directApply" row).
    directApply: false,
  };

  if (post.location) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: post.location.city,
        addressRegion: post.location.region,
        addressCountry: post.location.country,
      },
    };
  }

  if (post.isRemote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    // Google requires >=1 Country in applicantLocationRequirements whenever
    // jobLocationType is TELECOMMUTE. NULL_LOCATION_MEANS_REMOTE (see
    // lib/a1/config.ts) means we reach this branch with zero real country
    // data — post.location is always null here. Fabricating a country (or
    // a fake "Worldwide" placeholder, which isn't a valid schema.org
    // Country anyway) would be worse than omitting the field: Google may
    // warn this recommended field is missing, which is honest. Revisit
    // once OPEN QUESTIONS "Is location === null the same as remote?" has a
    // real answer.
  }

  if (post.salary) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: post.salary.currency.toUpperCase(),
      value: {
        "@type": "QuantitativeValue",
        ...(post.salary.min != null ? { minValue: post.salary.min } : {}),
        ...(post.salary.max != null ? { maxValue: post.salary.max } : {}),
        unitText: post.salary.period,
      },
    };
  }

  // 2026-09-14: employmentType больше не пропускается -- см.
  // TAG_TO_EMPLOYMENT_TYPE выше. Это один из фильтров в Google Jobs
  // («повна зайнятість», «part-time»), и без него вакансия из этих
  // фильтров просто выпадала. Массивом, а не строкой: у вакансии может
  // быть и «full-time», и «contract» одновременно, схема это
  // допускает. Пусто -- поле не отдаём вовсе.
  const employmentTypes = employmentTypesFor(post);
  if (employmentTypes.length > 0) {
    jsonLd.employmentType = employmentTypes.length === 1 ? employmentTypes[0] : employmentTypes;
  }

  return jsonLd;
}

/**
 * Хлебные крошки для страницы вакансии: «Вакансії -> <заголовок>».
 *
 * 2026-09-14 (Александр, SEO-разбор). Две вещи сразу. Для Google это
 * BreadcrumbList -- та самая дорожка, которую он рисует в выдаче вместо
 * голого адреса, и ради которой у нас в Search Console уже есть отдельный
 * отчёт «Строки навигации». Для человека и для обхода -- это первая
 * ссылка СО страницы вакансии ОБРАТНО в ленту: до этой правки её не было
 * вовсе, кроме логотипа в шапке.
 *
 * Уровня всего два. Третьего (категория) сознательно нет: страниц
 * категорий у нас пока не существует, а крошка, ведущая в никуда или на
 * закрытую от индексации выдачу с фильтром, хуже, чем её отсутствие.
 * Появятся посадочные страницы -- добавится и уровень.
 */
export function buildJobBreadcrumbJsonLd(post: WebPost, jobsLabel: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: jobsLabel, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: cleanTitle(post.title) },
    ],
  };
}

/**
 * Organization + WebSite для главной (2026-09-15, SEO-разбор с Александром).
 *
 * До этого у сайта не было ни одного описания самого себя: на каждой
 * вакансии лежал JobPosting, но кто такой «A1 Jobs» — нигде. Это та
 * разметка, из которой Google строит панель организации справа от
 * выдачи и связывает домен с приложениями в сторах (через sameAs).
 *
 * Логотип — растровый (webp 400×300), а не brand/a1-logo-blue.svg:
 * SVG в требованиях Google к logo до сих пор не значится.
 *
 * SearchAction (строка поиска в сниппете) намеренно НЕ добавляется:
 * Google отключил sitelinks searchbox, а у нас вдобавок все страницы
 * с ?q= закрыты от индексации — обещать роботу поиск, результаты
 * которого мы сами запретили индексировать, смысла нет.
 */
export function buildSiteJsonLd(): Record<string, unknown>[] {
  const organizationId = `${SITE_URL}/#organization`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: "A1 Jobs",
      alternateName: "A1",
      url: SITE_URL,
      logo: `${SITE_URL}/download/a1-logo.webp`,
      description:
        "Майданчик пошуку роботи: вакансії від компаній та приватних осіб, профілі фахівців і чат із роботодавцем.",
      sameAs: [
        "https://a1appp.com",
        "https://play.google.com/store/apps/details?id=com.aone.aoneapp",
        "https://apps.apple.com/ua/app/a1-job-search-jobs-hiring/id6443859764",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "A1 Jobs",
      url: SITE_URL,
      inLanguage: "uk",
      publisher: { "@id": organizationId },
    },
  ];
}

/**
 * Хлебные крошки для посадочной по формату работы (/jobs/remote и
 * соседи). 2026-09-15: у этих страниц не было никакой разметки вообще,
 * хотя видимая дорожка «Вакансії / Віддалена робота» на них есть с
 * первого дня -- Google просил, чтобы разметка совпадала с тем, что
 * видит человек, а совпадать было нечему.
 *
 * Подпись украинская, как и у вакансии: разметка на страницу одна, а
 * девять языков живут только в вёрстке (см. components/t.tsx).
 */
export function buildLandingBreadcrumbJsonLd(name: string, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Вакансії", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: url },
    ],
  };
}
