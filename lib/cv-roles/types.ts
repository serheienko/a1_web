// lib/cv-roles/types.ts -- страницы «пример резюме» по ролям (28.10.2026).
// 25 ролей x 9 языков. Адреса: /cv-builder/<lang>/<role> (uk тоже: /cv-builder/uk/<role>).
// Уникальное у каждой роли: что ищут рекрутеры, три примера «о себе» (junior/
// middle/senior) и совет. Цифры (навыки и зарплаты) -- из вакансий A1.
import type { CvLandingLang } from "@/lib/cv-landing/types";

export type RoleSlug =
  | "software-engineer"
  | "junior-developer"
  | "frontend-developer"
  | "backend-developer"
  | "full-stack-developer"
  | "python-developer"
  | "java-developer"
  | "javascript-react-developer"
  | "nodejs-developer"
  | "dotnet-developer"
  | "php-developer"
  | "flutter-developer"
  | "ios-developer"
  | "android-developer"
  | "qa-engineer"
  | "qa-automation-engineer"
  | "devops-engineer"
  | "data-analyst"
  | "data-scientist"
  | "data-engineer"
  | "product-manager"
  | "project-manager"
  | "ui-ux-designer"
  | "business-analyst"
  | "it-recruiter";

/** Уникальный текст роли на одном языке. */
export type RoleText = {
  /** Название роли в этом языке, как его ищут: «Flutter-розробник», «Flutter Developer». */
  name: string;
  /** Название роли в родительном/нужном падеже для заголовка «Резюме {roleGen}» (для языков без падежей = name). */
  nameInTitle: string;
  /** 2-3 предложения: что рекрутер смотрит в резюме этой роли в первую очередь. */
  recruiters: string;
  /** Примеры блока «Про себе» для трёх уровней, 2-3 предложения каждый, от первого лица. */
  summaries: { junior: string; middle: string; senior: string };
  /** Один практичный совет именно для этой роли (проекты, портфолио, метрики). */
  tip: string;
  /** 6-8 навыков для примера резюме, если данных из вакансий мало. Названия технологий как есть. */
  skills: string[];
};

/** Общие подписи страницы роли на одном языке. {role} = RoleText.nameInTitle или name, {year}, {n}. */
export type RoleUi = {
  breadcrumbExamples: string;
  titleTpl: string; // ≤ 60 символов после подстановки, например «Резюме {role}: приклад {year} + PDF | A1»
  descriptionTpl: string; // ≤ 155
  h1Tpl: string; // «Резюме {role}: приклад {year}»
  leadTpl: string; // 1-2 предложения
  ctaCreate: string;
  ctaDownload: string;
  ctaFill: string;
  signedInHint: string;
  h2Recruiters: string;
  h2Skills: string; // «Що вимагають у {n} вакансіях A1»
  skillsNote: string; // пояснение: доля вакансий, где навык упомянут
  skillsFallback: string; // если вакансий мало: «Ключові навички для цієї ролі»
  h2Salary: string;
  salaryNote: string; // «Медіана вилок у вакансіях з зарплатою, $ на місяць»
  salaryFrom: string;
  salaryTo: string;
  h2Summaries: string;
  levels: { junior: string; middle: string; senior: string };
  h2Tip: string;
  h2Github: string;
  githubText: string;
  h2Mistakes: string;
  mistakes: string[]; // 5 типовых ошибок в IT-резюме
  h2Faq: string;
  faq: { q: string; a: string }[]; // 4 вопроса с {role}
  h2Related: string;
  h2Jobs: string; // «Свіжі вакансії {role}»
  jobsMore: string;
  hubTitle: string; // заголовок блока со списком ролей на главной CV Builder: «Приклади резюме за професіями»
  hubLead: string;
};

export type RoleSource = { kind: "role"; role: string } | { kind: "tech"; tech: string } | null;

export type RoleDef = { slug: RoleSlug; source: RoleSource; related: RoleSlug[] };

export type { CvLandingLang };
