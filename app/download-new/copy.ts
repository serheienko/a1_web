// app/download-new/copy.ts
//
// Aleksandr, 23.10.2026: черновик новой установочной страницы (идея: прокрутка
// как презентация + живой счётчик вакансий). Тексты только для НОВЫХ блоков;
// заголовок, кнопки и меню берутся из ../download/copy.ts, чтобы при выборе
// этой страницы главной они не разъехались.
import type { Locale } from "@/components/t";

export type NewCopy = {
  /** Подписи под цифрами в плашке живой статистики. */
  statJobs: string;
  statCompanies: string;
  statCountries: string;
  statToday: string;
};

export const NEW_COPY: Record<Locale, NewCopy> = {
  uk: {
    statJobs: "вакансій",
    statCompanies: "компаній",
    statCountries: "країн",
    statToday: "нових за добу",
  },
  en: {
    statJobs: "jobs",
    statCompanies: "companies",
    statCountries: "countries",
    statToday: "new today",
  },
  ru: {
    statJobs: "вакансий",
    statCompanies: "компаний",
    statCountries: "стран",
    statToday: "новых за сутки",
  },
  de: {
    statJobs: "Jobs",
    statCompanies: "Unternehmen",
    statCountries: "Länder",
    statToday: "neu heute",
  },
  es: {
    statJobs: "empleos",
    statCompanies: "empresas",
    statCountries: "países",
    statToday: "nuevos hoy",
  },
  fr: {
    statJobs: "offres",
    statCompanies: "entreprises",
    statCountries: "pays",
    statToday: "nouvelles aujourd’hui",
  },
  pl: {
    statJobs: "ofert",
    statCompanies: "firm",
    statCountries: "krajów",
    statToday: "nowych dziś",
  },
  ptBR: {
    statJobs: "vagas",
    statCompanies: "empresas",
    statCountries: "países",
    statToday: "novas hoje",
  },
  zh: {
    statJobs: "个职位",
    statCompanies: "家公司",
    statCountries: "个国家",
    statToday: "今日新增",
  },
};
