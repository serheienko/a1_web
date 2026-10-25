// lib/seo/role-texts.ts
//
// 01.10.2026. Тексты посадочных по профессии (/jobs/role/<slug>). Отбор
// вакансий -- lib/a1/segment-index.ts, правила профессий -- lib/seo/job-role.ts.
// Аудитория -- как у главной: Украина и удалённые «отовсюду».
//
// 10.10.2026. Тексты собираются из полей самой профессии (job-role.ts), а
// не из справочников Record<JobRole, string> здесь. При девяти профессиях
// справочники были нормальны, при сорока четырёх это сорок четыре строки
// в каждом, и новая профессия требовала правки в трёх местах вместо одного.

import type { Locale } from "@/components/t";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import { countryName, type Country } from "@/lib/seo/countries";

type L = Record<Locale, string>;

export function roleH1(role: JobRole): L {
  const info = roleInfo(role)!;
  const en = `${info.en} jobs`;
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
  const en = `{n} open ${roleInfo(role)!.en} jobs`;
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
  const en = `${info.en} jobs from Ukraine and remote roles open to any country. Updated daily.`;
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
    title: `${info.titleUk} | A1 Jobs`,
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

// ---------- 25.10.2026: профессия + страна (/jobs/role/<role>/<cc>) ----------
// «QA вакансії в Польщі», «DevOps jobs in Germany». Подпись профессии --
// короткая, из ROLE_LABELS, на всех девяти языках; страна -- на языке страницы.

export function roleCountryH1(role: JobRole, c: Country): L {
  const r = ROLE_LABELS[role];
  const n = (l: keyof L) => countryName(c, l);
  return {
    uk: `Вакансії ${r.uk}: ${n("uk")}`,
    en: `${r.en} jobs in ${n("en")}`,
    ru: `Вакансии ${r.ru}: ${n("ru")}`,
    de: `${r.de} Jobs in ${n("de")}`,
    es: `Empleos de ${r.es} en ${n("es")}`,
    fr: `Offres ${r.fr} : ${n("fr")}`,
    pl: `Oferty ${r.pl}: ${n("pl")}`,
    ptBR: `Vagas de ${r.ptBR} em ${n("ptBR")}`,
    zh: `${n("zh")}${r.zh}职位`,
  };
}

export function roleCountryCountLine(): L {
  return {
    uk: "{n} відкритих вакансій",
    en: "{n} open jobs",
    ru: "{n} открытых вакансий",
    de: "{n} offene Stellen",
    es: "{n} vacantes abiertas",
    fr: "{n} offres ouvertes",
    pl: "{n} otwartych ofert",
    ptBR: "{n} vagas abertas",
    zh: "{n} 个在招职位",
  };
}

export function roleCountryLead(role: JobRole, c: Country): L {
  const info = roleInfo(role)!;
  const r = ROLE_LABELS[role];
  const n = (l: keyof L) => countryName(c, l);
  return {
    uk: `Свіжі вакансії ${r.uk} у країні ${n("uk")}: ${info.uk_hint}. Офіс, гібрид і віддалена робота, список оновлюється щодня.`,
    en: `Fresh ${r.en} jobs in ${n("en")}: office, hybrid and remote. Updated daily.`,
    ru: `Свежие вакансии ${r.ru} в стране ${n("ru")}: офис, гибрид и удалёнка. Обновляется ежедневно.`,
    de: `Aktuelle ${r.de} Jobs in ${n("de")}: Büro, hybrid und remote. Täglich aktualisiert.`,
    es: `Vacantes recientes de ${r.es} en ${n("es")}: oficina, híbrido y remoto. Actualizado a diario.`,
    fr: `Offres récentes ${r.fr} en ${n("fr")} : bureau, hybride et télétravail. Mis à jour chaque jour.`,
    pl: `Najnowsze oferty ${r.pl} w kraju ${n("pl")}: biuro, hybryda i praca zdalna. Aktualizowane codziennie.`,
    ptBR: `Vagas recentes de ${r.ptBR} em ${n("ptBR")}: escritório, híbrido e remoto. Atualizado diariamente.`,
    zh: `${n("zh")}最新${r.zh}职位：办公室、混合与远程，每日更新。`,
  };
}

export function roleCountryMeta(role: JobRole, c: Country, count: number): { title: string; description: string } {
  const r = ROLE_LABELS[role];
  const info = roleInfo(role)!;
  return {
    title: `Вакансії ${r.uk} — ${countryName(c, "uk")} (${count}) | A1 Jobs`,
    description: `${count} відкритих вакансій ${r.uk} у країні ${countryName(c, "uk")}: ${info.uk_hint}. ${r.en} jobs in ${c.en}. Оновлюється щодня.`,
  };
}
