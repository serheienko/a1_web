// lib/seo/level-words.ts
//
// 29.10.2026: названия уровней на девяти языках -- для среза «Формат і рівень»
// (components/landing-insights.tsx). Junior/Middle/Senior/Lead во многих языках
// пишут английскими словами, поэтому переводов немного.
import type { Locale } from "@/components/t";
import type { JobLevel } from "@/lib/seo/job-level";

export const LEVEL_WORDS: Record<JobLevel, Record<Locale, string>> = {
  junior: { uk: "Junior", en: "Junior", ru: "Junior", de: "Junior", es: "Junior", fr: "Junior", pl: "Junior", ptBR: "Júnior", zh: "初级" },
  middle: { uk: "Middle", en: "Middle", ru: "Middle", de: "Middle", es: "Middle", fr: "Middle", pl: "Middle", ptBR: "Pleno", zh: "中级" },
  senior: { uk: "Senior", en: "Senior", ru: "Senior", de: "Senior", es: "Senior", fr: "Senior", pl: "Senior", ptBR: "Sênior", zh: "高级" },
  lead: { uk: "Lead", en: "Lead", ru: "Lead", de: "Lead", es: "Lead", fr: "Lead", pl: "Lead", ptBR: "Lead", zh: "负责人" },
};
