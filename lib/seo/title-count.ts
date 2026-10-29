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
