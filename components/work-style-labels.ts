// components/work-style-labels.ts
//
// Split out of app/u/[username]/page.tsx (2026-08-30, same reasoning as
// components/occupation-labels.ts's own header comment) so the new full
// profile editor (components/profile-editor.tsx — a client component)
// can render the same 14 work-style-preference section labels the
// public profile page already shows, without pulling that page's
// server-only data-fetching imports (lib/a1/users, lib/a1/datasets) into
// the client bundle.
import type { Locale } from "./t";
// A client-safe standalone module (no lib/a1/client.ts import chain) —
// see its own header comment for why this can't come from
// lib/a1/datasets.ts directly here.
import { WORK_STYLE_DATASET_KEYS } from "@/lib/work-style-keys";

export const WORK_STYLE_PREFERENCE_SECTIONS: Array<{ key: keyof typeof WORK_STYLE_DATASET_KEYS } & Record<Locale, string>> = [
  {
    key: "workEnvironment",
    uk: "Середовище роботи", en: "Work environment", ru: "Рабочая среда", de: "Arbeitsumgebung",
    es: "Entorno de trabajo", fr: "Environnement de travail", pl: "Środowisko pracy",
    ptBR: "Ambiente de trabalho", zh: "工作环境",
  },
  {
    key: "personalityType",
    uk: "Тип особистості", en: "Personality type", ru: "Тип личности", de: "Persönlichkeitstyp",
    es: "Tipo de personalidad", fr: "Type de personnalité", pl: "Typ osobowości",
    ptBR: "Tipo de personalidade", zh: "性格类型",
  },
  {
    key: "workLifeBalance",
    uk: "Баланс роботи і життя", en: "Work-life balance", ru: "Баланс работы и жизни",
    de: "Work-Life-Balance", es: "Equilibrio entre vida y trabajo", fr: "Équilibre vie pro/perso",
    pl: "Równowaga między pracą a życiem", ptBR: "Equilíbrio entre vida e trabalho", zh: "工作与生活平衡",
  },
  {
    key: "workStyle",
    uk: "Стиль роботи", en: "Work style", ru: "Стиль работы", de: "Arbeitsstil",
    es: "Estilo de trabajo", fr: "Style de travail", pl: "Styl pracy", ptBR: "Estilo de trabalho", zh: "工作风格",
  },
  {
    key: "workAvailability",
    uk: "Доступність", en: "Availability", ru: "Доступность", de: "Verfügbarkeit",
    es: "Disponibilidad", fr: "Disponibilité", pl: "Dostępność", ptBR: "Disponibilidade", zh: "可用时间",
  },
  {
    key: "projectType",
    uk: "Тип проєктів", en: "Project type", ru: "Тип проектов", de: "Projektart",
    es: "Tipo de proyecto", fr: "Type de projet", pl: "Typ projektów", ptBR: "Tipo de projeto", zh: "项目类型",
  },
  {
    key: "leadershipStyle",
    uk: "Стиль лідерства", en: "Leadership style", ru: "Стиль лидерства", de: "Führungsstil",
    es: "Estilo de liderazgo", fr: "Style de leadership", pl: "Styl przywództwa",
    ptBR: "Estilo de liderança", zh: "领导风格",
  },
  {
    key: "riskTolerance",
    uk: "Ставлення до ризику", en: "Risk tolerance", ru: "Отношение к риску", de: "Risikobereitschaft",
    es: "Tolerancia al riesgo", fr: "Tolérance au risque", pl: "Tolerancja ryzyka",
    ptBR: "Tolerância a riscos", zh: "风险承受度",
  },
  {
    key: "workloadAndTaskDelegation",
    uk: "Розподіл завдань", en: "Task delegation", ru: "Распределение задач", de: "Aufgabenverteilung",
    es: "Delegación de tareas", fr: "Délégation des tâches", pl: "Delegowanie zadań",
    ptBR: "Delegação de tarefas", zh: "任务分配",
  },
  {
    key: "decisionMakingStyle",
    uk: "Стиль прийняття рішень", en: "Decision-making style", ru: "Стиль принятия решений",
    de: "Entscheidungsstil", es: "Estilo de toma de decisiones", fr: "Style de prise de décision",
    pl: "Styl podejmowania decyzji", ptBR: "Estilo de tomada de decisão", zh: "决策风格",
  },
  {
    key: "preferredCollaborationStyle",
    uk: "Стиль співпраці", en: "Collaboration style", ru: "Стиль сотрудничества",
    de: "Zusammenarbeitsstil", es: "Estilo de colaboración", fr: "Style de collaboration",
    pl: "Styl współpracy", ptBR: "Estilo de colaboração", zh: "协作风格",
  },
  {
    key: "partnershipPreference",
    uk: "Партнерство", en: "Partnership", ru: "Партнёрство", de: "Partnerschaft",
    es: "Asociación", fr: "Partenariat", pl: "Partnerstwo", ptBR: "Parceria", zh: "合作方式",
  },
  {
    key: "preferredWorkingEnvironment",
    uk: "Бажане робоче середовище", en: "Preferred work environment", ru: "Желаемая рабочая среда",
    de: "Bevorzugte Arbeitsumgebung", es: "Entorno de trabajo preferido",
    fr: "Environnement de travail préféré", pl: "Preferowane środowisko pracy",
    ptBR: "Ambiente de trabalho preferido", zh: "理想工作环境",
  },
  {
    key: "learningStyle",
    uk: "Стиль навчання", en: "Learning style", ru: "Стиль обучения", de: "Lernstil",
    es: "Estilo de aprendizaje", fr: "Style d'apprentissage", pl: "Styl uczenia się",
    ptBR: "Estilo de aprendizagem", zh: "学习风格",
  },
];
