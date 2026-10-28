// lib/cv-landing/types.ts -- тексты страницы «CV Builder» (28.10.2026).
// Одна страница на язык: /cv-builder (uk) и /cv-builder/<lang>. Структура по
// SEO-разведке (claude/cv-builder-seo-razvedka-2026-10-28.md): шаги, что внутри,
// подтверждённая статистика, роли, «честно бесплатно», ATS, языки, вакансии, FAQ.
// Правила текстов сайта: без длинного тире, к человеку на «Вы».

export type CvLandingLang = "uk" | "en" | "ru" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";

export type CvLandingContent = {
  /** <title>, до ~60 символов. */
  title: string;
  /** meta description, до ~155 символов. */
  description: string;
  breadcrumbHome: string;
  breadcrumb: string;
  /** Плашка над заголовком. */
  eyebrow: string;
  h1: string;
  lead: string;
  /** Три коротких «галочки» под кнопкой. */
  badges: [string, string, string];
  ctaCreate: string;
  ctaDownload: string;
  ctaFill: string;
  /** Подпись под кнопкой у вошедшего. */
  signedInHint: string;
  sampleAlt: string;

  stepsTitle: string;
  steps: [StepT, StepT, StepT];

  insideTitle: string;
  insideLead: string;
  inside: FeatureT[];

  verifiedTitle: string;
  verifiedText: string[];

  rolesTitle: string;
  rolesLead: string;
  roles: string[];

  freeTitle: string;
  freeText: string;
  compareHead: [string, string, string];
  compare: [string, string, string][];

  atsTitle: string;
  atsText: string[];

  langsTitle: string;
  langsText: string[];

  jobsTitle: string;
  jobsText: string;
  jobsCta: string;

  faqTitle: string;
  faq: { q: string; a: string }[];

  finalTitle: string;
  finalText: string;
};

export type StepT = { title: string; text: string };
export type FeatureT = { title: string; text: string };
