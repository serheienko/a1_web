// lib/seo/top100-landing.ts
//
// 30.09.2026 (Конкистадор). Имиджевая посадочная «💯 Топ 100»: вакансии
// топ-компаний мира, собранные их же фидами (Greenhouse / Lever / Ashby /
// Workday), все страны сразу. Александр: «можно нажать одну кнопку, и оно
// будет всё аккумулировано в одном месте». Отклик на таких вакансиях -- на
// сайте компании, поэтому и кнопка «Відкрити вакансію», а не «Відгукнутися».
//
// Устроена как посадочные по формату (lib/seo/job-landings.ts) и рисуется
// тем же components/job-landing.tsx, только отбор не по тегу, а по режиму
// external: "only" (lib/a1/feed.ts, FeedFilters.top100).

import type { JobLanding } from "@/lib/seo/job-landings";

export const TOP100_LANDING: JobLanding = {
  slug: "top-100",
  tag: "",
  metaTitle: "Топ-100 компаній світу — вакансії | A1 Jobs",
  metaDescription:
    "Вакансії найкращих технологічних компаній світу в одному місці: Stripe, Spotify, GitLab, Databricks та інші. Оновлюється щодня.",
  h1: {
    uk: "💯 Топ-100 компаній світу", en: "💯 Top 100 companies worldwide", ru: "💯 Топ-100 компаний мира",
    de: "💯 Top 100 Unternehmen weltweit", es: "💯 Top 100 empresas del mundo", fr: "💯 Top 100 des entreprises mondiales",
    pl: "💯 Top 100 firm na świecie", ptBR: "💯 Top 100 empresas do mundo", zh: "💯 全球百强公司",
  },
  countLine: {
    uk: "{n} вакансій від найкращих технологічних компаній світу",
    en: "{n} open jobs at the world's best tech companies",
    ru: "{n} вакансий от лучших технологических компаний мира",
    de: "{n} offene Stellen bei den besten Tech-Unternehmen der Welt",
    es: "{n} vacantes en las mejores empresas tecnológicas del mundo",
    fr: "{n} offres dans les meilleures entreprises tech du monde",
    pl: "{n} ofert w najlepszych firmach technologicznych świata",
    ptBR: "{n} vagas nas melhores empresas de tecnologia do mundo",
    zh: "{n} 个来自全球顶尖科技公司的职位",
  },
  lead: {
    uk: "Вакансії з офіційних сайтів компаній. Відгук — одразу на сторінці вакансії у компанії, без посередників.",
    en: "Jobs straight from the companies' own careers pages. You apply right there, no middlemen.",
    ru: "Вакансии с официальных сайтов компаний. Отклик — сразу на странице вакансии у компании, без посредников.",
    de: "Stellen direkt von den Karriereseiten der Unternehmen. Bewerbung direkt dort, ohne Zwischenhändler.",
    es: "Vacantes directamente de las páginas de empleo de las empresas. Postulas allí mismo, sin intermediarios.",
    fr: "Offres issues des pages carrières des entreprises. Vous postulez directement là-bas, sans intermédiaire.",
    pl: "Oferty prosto ze stron karier firm. Aplikujesz bezpośrednio tam, bez pośredników.",
    ptBR: "Vagas direto das páginas de carreiras das empresas. Você se candidata lá mesmo, sem intermediários.",
    zh: "职位直接来自公司官方招聘页面，在那里直接申请，没有中间环节。",
  },
};
