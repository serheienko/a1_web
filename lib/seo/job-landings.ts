// lib/seo/job-landings.ts
//
// 2026-09-14 (Александр, SEO-разбор: посадочные страницы). Люди не гуглят
// «Junior Operations Specialist UPSTARS» -- они гуглят «віддалена робота»,
// «робота в офісі». Под такие запросы ранжируются СПИСКИ, а у нас был
// ровно один список -- главная.
//
// ПОЧЕМУ ИХ ТРИ, А НЕ ПЯТНАДЦАТЬ. Прежде чем строить, я прогнал по живому
// сайту все оси, по которым можно было бы нарезать ленту:
//
//   * категории -- 39 штук, вакансии есть РОВНО в одной («IT»). Парсер
//     вешает всем спарсенным вакансиям её одну. /jobs/it была бы копией
//     главной, Google такое склеивает и выбрасывает;
//   * города -- локация пустая у ВСЕХ проверенных вакансий (60 из 60 на
//     первых трёх страницах ленты показывают «Worldwide»). Фильтр по
//     Києву, Львову, Дніпру возвращает ноль;
//   * тип занятости -- «Full-time» у всех 60 из 60. Делить нечего;
//   * стек (java, python, react) -- такого признака у вакансий нет
//     вообще, только поиск по тексту, а он на живом сайте отвечает 9-10
//     секунд и перебирает до 3000 вакансий за запрос.
//
// Единственная ось, которая реально делит ленту -- формат работы:
// віддалено 34, в офісі 15, гібрид 10 на тех же 60. Проверено и
// количество: у каждого тега больше 200 вакансий (лента фильтруется и
// даёт десять с лишним страниц). Отсюда ровно три страницы.
//
// Остальные оси откроются, когда парсер начнёт класть в вакансию город и
// категорию -- на DOU они есть у каждой вакансии, мы их просто не
// переносим. Это задача парсера, не сайта.

import type { Locale } from "@/components/t";

export type JobLanding = {
  /** Часть адреса: /jobs/<slug>. */
  slug: string;
  /**
   * Значение тега у бэкенда. Совпадает со slug не всегда: «в офісі»
   * хранится как "no-site" (не опечатка -- см. комментарий в
   * components/label-translations.ts), а в адресе такое показывать
   * нельзя.
   */
  tag: string;
  /** Заголовок вкладки и <title>. Одноязычный: разметка страницы одна. */
  metaTitle: string;
  metaDescription: string;
  h1: Record<Locale, string>;
  /** Строка с количеством. {n} подставляется на месте. */
  countLine: Record<Locale, string>;
  lead: Record<Locale, string>;
};

export const JOB_LANDINGS: JobLanding[] = [
  {
    slug: "remote",
    tag: "remote",
    metaTitle: "Віддалена робота — вакансії | A1 Jobs",
    metaDescription:
      "Вакансії з віддаленою роботою: розробка, тестування, маркетинг, підтримка. Оновлюється щодня.",
    h1: {
      uk: "Віддалена робота", en: "Remote jobs", ru: "Удалённая работа",
      de: "Remote-Jobs", es: "Trabajo remoto", fr: "Emplois à distance",
      pl: "Praca zdalna", ptBR: "Trabalho remoto", zh: "远程工作",
    },
    countLine: {
      uk: "{n} відкритих вакансій з віддаленою роботою",
      en: "{n} open remote jobs",
      ru: "{n} открытых вакансий с удалённой работой",
      de: "{n} offene Remote-Stellen",
      es: "{n} vacantes remotas abiertas",
      fr: "{n} offres à distance ouvertes",
      pl: "{n} otwartych ofert pracy zdalnej",
      ptBR: "{n} vagas remotas abertas",
      zh: "{n} 个远程职位",
    },
    lead: {
      uk: "Працювати можна звідки завгодно — з дому, з іншого міста або з іншої країни. Список оновлюється щодня.",
      en: "Work from anywhere — from home, another city or another country. The list is updated daily.",
      ru: "Работать можно откуда угодно — из дома, из другого города или другой страны. Список обновляется ежедневно.",
      de: "Arbeiten von überall — von zu Hause, aus einer anderen Stadt oder einem anderen Land. Täglich aktualisiert.",
      es: "Trabaja desde donde quieras: desde casa, otra ciudad u otro país. La lista se actualiza a diario.",
      fr: "Travaillez d'où vous voulez : de chez vous, d'une autre ville ou d'un autre pays. Mise à jour quotidienne.",
      pl: "Pracuj skąd chcesz — z domu, z innego miasta lub kraju. Lista aktualizowana codziennie.",
      ptBR: "Trabalhe de onde quiser: de casa, de outra cidade ou de outro país. Atualizado diariamente.",
      zh: "在任何地方工作——在家、异地或异国。每日更新。",
    },
  },
  {
    slug: "office",
    tag: "no-site",
    metaTitle: "Робота в офісі — вакансії | A1 Jobs",
    metaDescription:
      "Вакансії з роботою в офісі: повний день на місці, жива команда, обладнане робоче місце. Оновлюється щодня.",
    h1: {
      uk: "Робота в офісі", en: "On-site jobs", ru: "Работа в офисе",
      de: "Jobs vor Ort", es: "Trabajo presencial", fr: "Emplois sur site",
      pl: "Praca stacjonarna", ptBR: "Trabalho presencial", zh: "现场办公职位",
    },
    countLine: {
      uk: "{n} відкритих вакансій з роботою в офісі",
      en: "{n} open on-site jobs",
      ru: "{n} открытых вакансий с работой в офисе",
      de: "{n} offene Stellen vor Ort",
      es: "{n} vacantes presenciales abiertas",
      fr: "{n} offres sur site ouvertes",
      pl: "{n} otwartych ofert pracy stacjonarnej",
      ptBR: "{n} vagas presenciais abertas",
      zh: "{n} 个现场办公职位",
    },
    lead: {
      uk: "Робота на місці: жива команда поруч, обладнане робоче місце, чіткий графік. Список оновлюється щодня.",
      en: "Work on site: a team next to you, an equipped workplace, a clear schedule. The list is updated daily.",
      ru: "Работа на месте: живая команда рядом, оборудованное рабочее место, чёткий график. Список обновляется ежедневно.",
      de: "Arbeit vor Ort: Team direkt neben Ihnen, ausgestatteter Arbeitsplatz, klarer Zeitplan. Täglich aktualisiert.",
      es: "Trabajo presencial: equipo al lado, puesto equipado, horario claro. La lista se actualiza a diario.",
      fr: "Travail sur site : une équipe à vos côtés, un poste équipé, un horaire clair. Mise à jour quotidienne.",
      pl: "Praca na miejscu: zespół obok, wyposażone stanowisko, jasny grafik. Lista aktualizowana codziennie.",
      ptBR: "Trabalho no local: equipe ao lado, posto equipado, horário definido. Atualizado diariamente.",
      zh: "现场办公：团队就在身边，工位齐备，作息明确。每日更新。",
    },
  },
  {
    slug: "hybrid",
    tag: "hybrid",
    metaTitle: "Гібридна робота — вакансії | A1 Jobs",
    metaDescription:
      "Вакансії з гібридним форматом: частину тижня в офісі, частину вдома. Оновлюється щодня.",
    h1: {
      uk: "Гібридна робота", en: "Hybrid jobs", ru: "Гибридная работа",
      de: "Hybride Jobs", es: "Trabajo híbrido", fr: "Emplois hybrides",
      pl: "Praca hybrydowa", ptBR: "Trabalho híbrido", zh: "混合办公职位",
    },
    countLine: {
      uk: "{n} відкритих вакансій з гібридним форматом",
      en: "{n} open hybrid jobs",
      ru: "{n} открытых вакансий с гибридным форматом",
      de: "{n} offene hybride Stellen",
      es: "{n} vacantes híbridas abiertas",
      fr: "{n} offres hybrides ouvertes",
      pl: "{n} otwartych ofert hybrydowych",
      ptBR: "{n} vagas híbridas abertas",
      zh: "{n} 个混合办公职位",
    },
    lead: {
      uk: "Частину тижня в офісі, частину вдома — формат, який поєднує живу роботу з командою і власний графік. Список оновлюється щодня.",
      en: "Part of the week in the office, part at home — team time and your own schedule in one. The list is updated daily.",
      ru: "Часть недели в офисе, часть дома — формат, который совмещает живую работу с командой и свой график. Список обновляется ежедневно.",
      de: "Teils im Büro, teils zu Hause — Teamzeit und eigener Zeitplan in einem. Täglich aktualisiert.",
      es: "Parte de la semana en la oficina, parte en casa: equipo y horario propio a la vez. La lista se actualiza a diario.",
      fr: "Une partie de la semaine au bureau, une partie chez soi : équipe et horaires personnels à la fois. Mise à jour quotidienne.",
      pl: "Część tygodnia w biurze, część w domu — zespół i własny grafik naraz. Lista aktualizowana codziennie.",
      ptBR: "Parte da semana no escritório, parte em casa: equipe e horário próprio ao mesmo tempo. Atualizado diariamente.",
      zh: "一部分时间在办公室，一部分时间在家——兼顾团队协作与自主安排。每日更新。",
    },
  },
];

export function findJobLanding(slug: string): JobLanding | undefined {
  return JOB_LANDINGS.find((l) => l.slug === slug);
}

/**
 * Посадочная по тегу вакансии, если такая есть.
 *
 * 2026-09-15: страница вакансии показывает теги обычными плашками, и
 * тег формата работы («remote», «no-site», «hybrid») никуда не вёл --
 * хотя ровно под него у нас есть отдельная страница со списком. Теперь
 * такая плашка становится ссылкой: человеку это «покажи мне все
 * удалённые», а посадочной -- входящие ссылки с полутора тысяч страниц
 * вакансий вместо трёх ссылок с главной.
 *
 * Сравнение нормализованное: бэкенд хранит теги строчными через дефис,
 * но руками созданная вакансия может принести «Remote» или «full time».
 */
export function findLandingByTag(tag: string): JobLanding | undefined {
  const normalized = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return JOB_LANDINGS.find((landing) => landing.tag === normalized);
}
