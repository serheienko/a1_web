// lib/seo/title-count.ts
//
// 29.10.2026 (Александр: идея Разведчика «число вакансий и месяц в title», «давай»). У Arbeitnow, Arc.dev и
// других в названии страницы стоит живое число и месяц: «13.032 open job positions», «(Oct 2026)». Строка в
// выдаче выглядит живой, и по ней кликают охотнее. Число берём из тех же данных, что рисуют сам список,
// месяц -- текущий. Ежедневное «+N за сегодня» в название НЕ кладём: оно меняется каждый день.
// Если число маленькое (меньше 5) или название не влезает в лимит -- остаётся прежнее название.
const MONTHS_UK = ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"];
const TITLE_LIMIT = 66;

export function monthYearUk(d: Date = new Date()): string {
  return `${MONTHS_UK[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** «Python вакансії» + 1240 -> «Python вакансії — 1 240 відкритих · жовтень 2026 | A1 Jobs» (или прежнее название). */
export function titleWithCount(head: string, n: number, fallback: string): string {
  if (!Number.isFinite(n) || n < 5) return fallback;
  const num = String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const withMonth = `${head} — ${num} відкритих · ${monthYearUk()} | A1 Jobs`;
  if (withMonth.length <= TITLE_LIMIT) return withMonth;
  const noMonth = `${head} — ${num} відкритих | A1 Jobs`;
  return noMonth.length <= TITLE_LIMIT ? noMonth : fallback;
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthYearEn(d: Date = new Date()): string {
  return `${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Английский вариант: «QA & testing jobs — 569 open roles · October 2026 | A1 Jobs». */
export function titleWithCountEn(head: string, n: number, fallback: string): string {
  if (!Number.isFinite(n) || n < 5) return fallback;
  const num = String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const withMonth = `${head} — ${num} open roles · ${monthYearEn()} | A1 Jobs`;
  if (withMonth.length <= TITLE_LIMIT) return withMonth;
  const noMonth = `${head} — ${num} open roles | A1 Jobs`;
  return noMonth.length <= TITLE_LIMIT ? noMonth : fallback;
}

// 29.10.2026 (включаем языки по очереди): то же самое для любого языка. Слова взяты те же,
// что в подписях интерфейса, месяц -- родительный падеж там, где он нужен.
const MONTHS_L: Record<string, string[]> = {
  en: MONTHS_EN,
  uk: MONTHS_UK,
  ru: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  ptBR: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

const OPEN_WORD: Record<string, string> = {
  en: "open roles",
  uk: "відкритих",
  ru: "открытых",
  de: "offene Stellen",
  es: "vacantes",
  fr: "offres",
  pl: "otwartych ofert",
  ptBR: "vagas",
  zh: "个职位",
};

/** «Python jobs — 17 968 offene Stellen · Oktober 2026 | A1 Jobs» для любого языка. */
export function titleWithCountL(locale: string, head: string, n: number, fallback: string): string {
  const months = MONTHS_L[locale] ?? MONTHS_EN;
  const word = OPEN_WORD[locale] ?? OPEN_WORD.en;
  if (!Number.isFinite(n) || n < 5) return fallback;
  const sep = locale === "en" ? "," : "\u00a0";
  const num = String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const d = new Date();
  const month = `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const withMonth = `${head} — ${num} ${word} · ${month} | A1 Jobs`;
  if (withMonth.length <= TITLE_LIMIT) return withMonth;
  const noMonth = `${head} — ${num} ${word} | A1 Jobs`;
  return noMonth.length <= TITLE_LIMIT ? noMonth : fallback;
}
