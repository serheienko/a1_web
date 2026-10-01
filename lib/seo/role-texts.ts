// lib/seo/role-texts.ts
//
// 01.10.2026. Тексты посадочных по профессии (/jobs/role/<slug>). Отбор
// вакансий -- lib/a1/segment-index.ts, правила профессий -- lib/seo/job-role.ts.
// Аудитория -- как у главной: Украина и удалённые «отовсюду».

import type { Locale } from "@/components/t";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";

type L = Record<Locale, string>;

const TITLE_UK: Record<JobRole, string> = {
  qa: "Вакансії QA — робота тестувальником (QA, QA automation)",
  frontend: "Frontend вакансії — робота Frontend-розробником",
  backend: "Backend вакансії — робота Backend-розробником",
  fullstack: "Fullstack вакансії — робота Fullstack-розробником",
  mobile: "Мобільна розробка: вакансії iOS, Android, Flutter",
  devops: "DevOps вакансії — робота DevOps, SRE, Cloud",
  data: "Вакансії Data та AI — Data Analyst, Data Scientist, Data Engineer",
  design: "Вакансії UI/UX дизайнера — робота дизайнером в IT",
  pm: "Вакансії Project та Product Manager — робота в IT",
};

const EN: Record<JobRole, string> = {
  qa: "QA & testing",
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  mobile: "Mobile (iOS, Android)",
  devops: "DevOps & infrastructure",
  data: "Data & AI",
  design: "UI/UX design",
  pm: "Project & product management",
};

export function roleH1(role: JobRole): L {
  const info = roleInfo(role)!;
  const en = `${EN[role]} jobs`;
  return {
    uk: `Вакансії: ${info.uk}`,
    en,
    ru: `Вакансии: ${info.ru}`,
    de: en,
    es: en,
    fr: en,
    pl: en,
    ptBR: en,
    zh: en,
  };
}

export function roleCountLine(role: JobRole): L {
  const en = `{n} open ${EN[role]} jobs`;
  return {
    uk: "{n} відкритих вакансій",
    en,
    ru: "{n} открытых вакансий",
    de: en,
    es: en,
    fr: en,
    pl: en,
    ptBR: en,
    zh: en,
  };
}

export function roleLead(role: JobRole): L {
  const info = roleInfo(role)!;
  const en = `${EN[role]} jobs from Ukraine and remote roles open to any country. Updated daily.`;
  return {
    uk: `Вакансії за напрямом: ${info.uk_hint}. Вакансії з України та віддалені з будь-якої країни, оновлюється щодня.`,
    en,
    ru: `Вакансии по направлению: ${info.ru}. Вакансии из Украины и удалённые из любой страны, обновляется ежедневно.`,
    de: en,
    es: en,
    fr: en,
    pl: en,
    ptBR: en,
    zh: en,
  };
}

export function roleMeta(role: JobRole): { title: string; description: string } {
  const info = roleInfo(role)!;
  return {
    title: `${TITLE_UK[role]} | A1 Jobs`,
    description: `Відкриті вакансії: ${info.uk_hint}. В Україні та віддалено з будь-якої країни. Список оновлюється щодня.`,
  };
}

export const ROLE_LINKS_TITLE: L = {
  uk: "За професією",
  en: "By role",
  ru: "По профессии",
  de: "Nach Rolle",
  es: "Por puesto",
  fr: "Par métier",
  pl: "Wg stanowiska",
  ptBR: "Por função",
  zh: "按职位",
};
