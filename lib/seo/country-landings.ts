// lib/seo/country-landings.ts
//
// 30.09.2026 (Конкистадор, SEO). Посадочные «IT-вакансии в <стране>»:
// /jobs/country/de, /jobs/country/gb и так далее. Люди гуглят «python jobs
// germany», «remote developer jobs canada», а у нас страны жили только в
// селекторе (?country=de) -- отфильтрованная выдача закрыта от индексации
// (hasActiveFilters), и искать по стране было нечем.
//
// Устроены как посадочные по формату (components/job-landing.tsx): тот же
// список и нумерация ссылками. Отбор -- filters.country, то есть вакансии
// этой страны: и внешние (топ-компании), и наши.
//
// Украина сюда не входит: её «страница» -- сама главная (лента «для тебе»).

import { COUNTRIES, countryByCode, countryName, flagEmoji, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE, type Country } from "@/lib/seo/countries";
import type { JobLanding } from "@/lib/seo/job-landings";

export function findCountryLanding(code: string): { country: Country; landing: JobLanding } | null {
  const country = countryByCode(code);
  if (!country || country.code === DEFAULT_COUNTRY_CODE) return null;
  const en = country.en;
  const flag = flagEmoji(country.code);
  if (country.code === WORLDWIDE_CODE) return { country, landing: worldwideLanding(flag) };
  return {
    country,
    landing: {
      slug: `country/${country.code.toLowerCase()}`,
      tag: "",
      // Заголовок и описание -- английские: вакансии английские, ищут их
      // по-английски (см. lib/seo/job-meta.ts, buildExternalJobMetaDescription).
      metaTitle: `IT jobs in ${en} — developer, data, product & design vacancies | A1 Jobs`,
      metaDescription: `Open IT jobs in ${en}: software engineering, data, DevOps, product and design roles at top tech companies. Updated daily.`,
      h1: {
        uk: `${flag} IT-вакансії: ${countryName(country, "uk")}`,
        en: `${flag} IT jobs in ${en}`,
        ru: `${flag} IT-вакансии: ${countryName(country, "ru")}`,
        de: `${flag} IT-Jobs: ${en}`,
        es: `${flag} Empleos de TI: ${en}`,
        fr: `${flag} Emplois IT : ${en}`,
        pl: `${flag} Oferty pracy IT: ${en}`,
        ptBR: `${flag} Vagas de TI: ${en}`,
        zh: `${flag} IT 职位：${en}`,
      },
      countLine: {
        uk: `{n} вакансій: ${countryName(country, "uk")}`,
        en: `{n} open jobs in ${en}`,
        ru: `{n} вакансий: ${countryName(country, "ru")}`,
        de: `{n} offene Stellen: ${en}`,
        es: `{n} vacantes: ${en}`,
        fr: `{n} offres : ${en}`,
        pl: `{n} ofert: ${en}`,
        ptBR: `{n} vagas: ${en}`,
        zh: `{n} 个职位：${en}`,
      },
      lead: {
        uk: "Вакансії з офіційних сайтів технологічних компаній та від роботодавців A1. Оновлюється щодня.",
        en: "Jobs from the careers pages of top tech companies and from A1 employers. Updated daily.",
        ru: "Вакансии с официальных сайтов технологических компаний и от работодателей A1. Обновляется ежедневно.",
        de: "Stellen von den Karriereseiten führender Tech-Unternehmen und von A1-Arbeitgebern. Täglich aktualisiert.",
        es: "Vacantes de las páginas de empleo de las principales empresas tecnológicas y de empleadores de A1. Actualizado a diario.",
        fr: "Offres issues des pages carrières des grandes entreprises tech et des employeurs A1. Mis à jour chaque jour.",
        pl: "Oferty ze stron karier czołowych firm technologicznych i od pracodawców A1. Aktualizowane codziennie.",
        ptBR: "Vagas das páginas de carreiras das principais empresas de tecnologia e de empregadores da A1. Atualizado diariamente.",
        zh: "来自顶尖科技公司招聘页面和 A1 雇主的职位，每日更新。",
      },
    },
  };
}

/**
 * /jobs/country/ww -- «Remote IT jobs worldwide». Люди гуглят «remote jobs
 * worldwide», «work from anywhere developer jobs»: это самый широкий запрос
 * по удалёнке, и у нас на него отдельная страница, а не россыпь по странам.
 */
function worldwideLanding(flag: string): JobLanding {
  return {
    slug: "country/ww",
    tag: "",
    metaTitle: "Remote IT jobs worldwide — work from anywhere | A1 Jobs",
    metaDescription:
      "Remote IT jobs open to candidates from any country: software engineering, data, DevOps, product and design roles. Updated daily.",
    h1: {
      uk: `${flag} Віддалена робота по всьому світу`,
      en: `${flag} Remote jobs worldwide`,
      ru: `${flag} Удалённая работа по всему миру`,
      de: `${flag} Remote-Jobs weltweit`,
      es: `${flag} Empleos remotos en todo el mundo`,
      fr: `${flag} Emplois en télétravail dans le monde`,
      pl: `${flag} Praca zdalna na całym świecie`,
      ptBR: `${flag} Vagas remotas no mundo todo`,
      zh: `${flag} 全球远程职位`,
    },
    countLine: {
      uk: "{n} віддалених вакансій з будь-якої країни",
      en: "{n} remote jobs open to any country",
      ru: "{n} удалённых вакансий из любой страны",
      de: "{n} Remote-Stellen aus jedem Land",
      es: "{n} vacantes remotas desde cualquier país",
      fr: "{n} offres en télétravail depuis n'importe quel pays",
      pl: "{n} ofert pracy zdalnej z dowolnego kraju",
      ptBR: "{n} vagas remotas de qualquer país",
      zh: "{n} 个可从任何国家申请的远程职位",
    },
    lead: {
      uk: "Вакансії, на які можна відгукнутися з будь-якої країни: без прив'язки до офісу чи міста. Оновлюється щодня.",
      en: "Jobs you can apply to from any country: no office or city required. Updated daily.",
      ru: "Вакансии, на которые можно откликнуться из любой страны: без привязки к офису или городу. Обновляется ежедневно.",
      de: "Stellen, auf die du dich aus jedem Land bewerben kannst: ohne Büro oder Stadt. Täglich aktualisiert.",
      es: "Vacantes a las que puedes postular desde cualquier país: sin oficina ni ciudad. Actualizado a diario.",
      fr: "Offres auxquelles vous pouvez postuler depuis n'importe quel pays : sans bureau ni ville. Mis à jour chaque jour.",
      pl: "Oferty, na które możesz aplikować z dowolnego kraju: bez biura i miasta. Aktualizowane codziennie.",
      ptBR: "Vagas para as quais você pode se candidatar de qualquer país: sem escritório ou cidade. Atualizado diariamente.",
      zh: "可从任何国家申请的职位，无需固定办公室或城市，每日更新。",
    },
  };
}

/** Страны, для которых есть посадочная (все справочные, кроме Украины). */
export const COUNTRY_LANDING_CODES: string[] = [
  WORLDWIDE_CODE.toLowerCase(),
  ...COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY_CODE).map((c) => c.code.toLowerCase()),
];
