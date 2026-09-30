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

import { COUNTRIES, countryByCode, countryName, flagEmoji, DEFAULT_COUNTRY_CODE, type Country } from "@/lib/seo/countries";
import type { JobLanding } from "@/lib/seo/job-landings";

export function findCountryLanding(code: string): { country: Country; landing: JobLanding } | null {
  const country = countryByCode(code);
  if (!country || country.code === DEFAULT_COUNTRY_CODE) return null;
  const en = country.en;
  const flag = flagEmoji(country.code);
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

/** Страны, для которых есть посадочная (все справочные, кроме Украины). */
export const COUNTRY_LANDING_CODES: string[] = COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY_CODE).map((c) =>
  c.code.toLowerCase(),
);
