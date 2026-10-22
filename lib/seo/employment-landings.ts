// lib/seo/employment-landings.ts
//
// 22.10.2026 (Разведчик: «Фільтр за типом зайнятості»; Александр: «эти
// 2 идеи делаем»). Посадочные по ТИПУ ЗАНЯТОСТИ -- полная ставка,
// неповний день, контракт. Ось другая, чем у lib/seo/job-landings.ts:
// там ГДЕ человек работает (віддалено / в офісі / гібрид), здесь --
// СКОЛЬКО и НА КАКИХ УСЛОВИЯХ. Две оси не смешиваются в один файл
// намеренно: у них разные страницы, разные запросы в Google и разная
// судьба (формат работы у вакансии есть всегда, тип занятости -- нет).
//
// ПОЧЕМУ ЭТО СТАЛО ВОЗМОЖНО ТОЛЬКО СЕЙЧАС. В шапке job-landings.ts
// (14.09.2026) записано: «тип занятости -- Full-time у всех 60 из 60,
// делить нечего». Это была не правда о рынке, а баг сборщика: он ставил
// full-time всем, у кого тип не распознан, и даже стажировкам. Правило
// переехало в _konk2/employment.py и больше не угадывает: не понял --
// тега нет. С этого момента «частичная» и «контракт» наконец означают
// то, что написано.
//
// ПРО АДРЕС. Отдельный сегмент /jobs/type/, а не /jobs/<slug> -- по той
// же причине, что /jobs/tag/ и /jobs/stack/: страница вакансии живёт
// прямо под /jobs, и каждое новое статическое имя там пришлось бы
// держать в голове вечно. Три существующих (remote, office, hybrid)
// остаются как есть -- адреса уже в индексе Google, переезд стоил бы
// позиций.

import type { JobLanding } from "@/lib/seo/job-landings";

/** Теги занятости у бэкенда. Совпадают с тем, что кладёт _konk2/employment.py. */
export const EMPLOYMENT_TAGS = ["full-time", "part-time", "contract"] as const;

export const EMPLOYMENT_LANDINGS: JobLanding[] = [
  {
    slug: "full-time",
    tag: "full-time",
    base: "/jobs/type",
    metaTitle: "Робота на повну ставку — full-time вакансії в IT | A1 Jobs",
    metaDescription:
      "Вакансії на повну ставку в IT: постійна робота на повний тиждень для розробників, QA, дизайнерів, аналітиків і менеджерів. Оновлюється щодня.",
    h1: {
      uk: "Робота на повну ставку", en: "Full-time jobs", ru: "Работа на полную ставку",
      de: "Vollzeitjobs", es: "Trabajo a tiempo completo", fr: "Emplois à temps plein",
      pl: "Praca na pełny etat", ptBR: "Trabalho em tempo integral", zh: "全职职位",
    },
    countLine: {
      uk: "{n} відкритих вакансій на повну ставку",
      en: "{n} open full-time jobs",
      ru: "{n} открытых вакансий на полную ставку",
      de: "{n} offene Vollzeitstellen",
      es: "{n} vacantes a tiempo completo abiertas",
      fr: "{n} offres à temps plein ouvertes",
      pl: "{n} otwartych ofert na pełny etat",
      ptBR: "{n} vagas de tempo integral abertas",
      zh: "{n} 个全职职位",
    },
    lead: {
      uk: "Повна зайнятість: постійна робота на повний тиждень, з оформленням і всіма умовами роботодавця. Список оновлюється щодня.",
      en: "A permanent role for a full working week, on the employer's standard terms. The list is updated daily.",
      ru: "Постоянная работа на полную неделю, с оформлением и всеми условиями работодателя. Список обновляется ежедневно.",
      de: "Eine feste Stelle für die volle Arbeitswoche, zu den üblichen Konditionen des Arbeitgebers. Täglich aktualisiert.",
      es: "Un puesto fijo a jornada completa, con las condiciones habituales del empleador. La lista se actualiza a diario.",
      fr: "Un poste permanent à semaine complète, aux conditions habituelles de l'employeur. Mise à jour quotidienne.",
      pl: "Stałe stanowisko na pełny tydzień pracy, na standardowych warunkach pracodawcy. Lista aktualizowana codziennie.",
      ptBR: "Uma vaga efetiva para a semana completa, nas condições padrão do empregador. Atualizado diariamente.",
      zh: "全周工作的长期岗位，按雇主的标准条件雇用。每日更新。",
    },
    empty: {
      uk: "Поки немає відкритих вакансій на повну ставку.",
      en: "There are no open full-time jobs yet.",
      ru: "Пока нет открытых вакансий на полную ставку.",
      de: "Es gibt noch keine offenen Vollzeitstellen.",
      es: "Todavía no hay vacantes a tiempo completo.",
      fr: "Il n'y a pas encore d'offres à temps plein.",
      pl: "Nie ma jeszcze ofert na pełny etat.",
      ptBR: "Ainda não há vagas de tempo integral.",
      zh: "暂无全职职位。",
    },
  },
  {
    slug: "part-time",
    tag: "part-time",
    base: "/jobs/type",
    metaTitle: "Робота на неповний день — part-time вакансії в IT | A1 Jobs",
    metaDescription:
      "Вакансії на неповний робочий день: part-time в IT для розробників, QA, дизайнерів і менеджерів. Щоб поєднати з навчанням або другим проєктом. Оновлюється щодня.",
    h1: {
      uk: "Робота на неповний день", en: "Part-time jobs", ru: "Работа на неполный день",
      de: "Teilzeitjobs", es: "Trabajo a tiempo parcial", fr: "Emplois à temps partiel",
      pl: "Praca na część etatu", ptBR: "Trabalho de meio período", zh: "兼职职位",
    },
    countLine: {
      uk: "{n} відкритих вакансій на неповний день",
      en: "{n} open part-time jobs",
      ru: "{n} открытых вакансий на неполный день",
      de: "{n} offene Teilzeitstellen",
      es: "{n} vacantes a tiempo parcial abiertas",
      fr: "{n} offres à temps partiel ouvertes",
      pl: "{n} otwartych ofert na część etatu",
      ptBR: "{n} vagas de meio período abertas",
      zh: "{n} 个兼职职位",
    },
    lead: {
      uk: "Неповний робочий день: менше годин на тиждень, ніж на повній ставці. Підходить, щоб поєднати роботу з навчанням, фрилансом або другим проєктом. Список оновлюється щодня.",
      en: "Fewer hours a week than a full-time role — a fit if you are combining work with study, freelance or a second project. The list is updated daily.",
      ru: "Меньше часов в неделю, чем на полной ставке. Подходит, чтобы совместить работу с учёбой, фрилансом или вторым проектом. Список обновляется ежедневно.",
      de: "Weniger Wochenstunden als eine Vollzeitstelle — passend, wenn Sie Arbeit mit Studium, Freelancing oder einem zweiten Projekt verbinden. Täglich aktualisiert.",
      es: "Menos horas por semana que una jornada completa: encaja si combinas el trabajo con estudios, freelance o un segundo proyecto. La lista se actualiza a diario.",
      fr: "Moins d'heures par semaine qu'un temps plein : utile pour combiner le travail avec des études, du freelance ou un second projet. Mise à jour quotidienne.",
      pl: "Mniej godzin w tygodniu niż na pełnym etacie — pasuje, gdy łączysz pracę ze studiami, freelancem lub drugim projektem. Lista aktualizowana codziennie.",
      ptBR: "Menos horas por semana do que um período integral: serve para combinar trabalho com estudos, freelance ou um segundo projeto. Atualizado diariamente.",
      zh: "每周工时少于全职，适合兼顾学业、自由职业或第二个项目。每日更新。",
    },
    empty: {
      uk: "Поки немає відкритих вакансій на неповний день.",
      en: "There are no open part-time jobs yet.",
      ru: "Пока нет открытых вакансий на неполный день.",
      de: "Es gibt noch keine offenen Teilzeitstellen.",
      es: "Todavía no hay vacantes a tiempo parcial.",
      fr: "Il n'y a pas encore d'offres à temps partiel.",
      pl: "Nie ma jeszcze ofert na część etatu.",
      ptBR: "Ainda não há vagas de meio período.",
      zh: "暂无兼职职位。",
    },
  },
  {
    slug: "contract",
    tag: "contract",
    base: "/jobs/type",
    metaTitle: "Робота за контрактом — контрактні та B2B вакансії в IT | A1 Jobs",
    metaDescription:
      "Контрактні вакансії в IT: проєктна робота, B2B і тимчасові контракти для розробників, QA, дизайнерів і менеджерів. Оновлюється щодня.",
    h1: {
      uk: "Робота за контрактом", en: "Contract jobs", ru: "Работа по контракту",
      de: "Jobs auf Vertragsbasis", es: "Trabajo por contrato", fr: "Missions en contrat",
      pl: "Praca kontraktowa (B2B)", ptBR: "Trabalho por contrato", zh: "合同制职位",
    },
    countLine: {
      uk: "{n} відкритих вакансій за контрактом",
      en: "{n} open contract jobs",
      ru: "{n} открытых вакансий по контракту",
      de: "{n} offene Stellen auf Vertragsbasis",
      es: "{n} vacantes por contrato abiertas",
      fr: "{n} missions en contrat ouvertes",
      pl: "{n} otwartych ofert kontraktowych",
      ptBR: "{n} vagas por contrato abertas",
      zh: "{n} 个合同制职位",
    },
    lead: {
      uk: "Робота на строк або на проєкт: контракт, B2B чи тимчасова заміна. Зазвичай вища ставка і зрозумілі межі проєкту замість безстрокового договору. Список оновлюється щодня.",
      en: "Work for a fixed term or a single project: a contract, B2B or temporary cover. Usually a higher rate and a clear end date instead of permanent employment. The list is updated daily.",
      ru: "Работа на срок или на проект: контракт, B2B или временная замена. Обычно выше ставка и понятные границы проекта вместо бессрочного договора. Список обновляется ежедневно.",
      de: "Arbeit auf Zeit oder für ein Projekt: Vertrag, B2B oder befristete Vertretung. Meist ein höherer Satz und ein klares Enddatum statt unbefristeter Anstellung. Täglich aktualisiert.",
      es: "Trabajo por un plazo o por proyecto: contrato, B2B o sustitución temporal. Suele pagar más y tener un final claro en lugar de un empleo indefinido. La lista se actualiza a diario.",
      fr: "Travail à durée déterminée ou au projet : contrat, B2B ou remplacement temporaire. Souvent un tarif plus élevé et une fin claire plutôt qu'un CDI. Mise à jour quotidienne.",
      pl: "Praca na czas określony lub na projekt: kontrakt, B2B albo zastępstwo. Zwykle wyższa stawka i jasny koniec zamiast umowy na stałe. Lista aktualizowana codziennie.",
      ptBR: "Trabalho por prazo ou por projeto: contrato, B2B ou substituição temporária. Costuma pagar mais e ter fim definido em vez de vínculo permanente. Atualizado diariamente.",
      zh: "按期限或按项目工作：合同、B2B 或临时顶岗。通常报酬更高、结束时间明确，而非长期雇佣。每日更新。",
    },
    empty: {
      uk: "Поки немає відкритих вакансій за контрактом.",
      en: "There are no open contract jobs yet.",
      ru: "Пока нет открытых вакансий по контракту.",
      de: "Es gibt noch keine offenen Stellen auf Vertragsbasis.",
      es: "Todavía no hay vacantes por contrato.",
      fr: "Il n'y a pas encore de missions en contrat.",
      pl: "Nie ma jeszcze ofert kontraktowych.",
      ptBR: "Ainda não há vagas por contrato.",
      zh: "暂无合同制职位。",
    },
  },
];

export function findEmploymentLanding(slug: string): JobLanding | undefined {
  return EMPLOYMENT_LANDINGS.find((l) => l.slug === slug);
}
