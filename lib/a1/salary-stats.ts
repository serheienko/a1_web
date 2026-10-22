// lib/a1/salary-stats.ts
//
// 22.10.2026 (Разведчик: «сторінки Зарплати: роль, країна»). Арифметика
// зарплатных страниц и ничего кроме неё: ни запросов, ни React. Отдельный
// файл, потому что ровно это место обязано быть правильным -- страница
// называет человеку число, на которое он будет смотреть, решая, идти ли
// на собеседование.
//
// ТРИ РЕШЕНИЯ, КОТОРЫЕ ЗДЕСЬ ПРИНЯТЫ.
//
// 1. Считаем В МЕСЯЦ. Замер 22.10.2026 по живой ленте: из 773 вакансий с
//    вилкой у 771 период -- месяц (поле money у нас месячное), годовых
//    две. Приводить всё к году значило бы умножать месячные на 12 и
//    показывать числа, которых никто в вакансии не писал.
//
// 2. Валюты НЕ конвертируем. Курса у нас нет, а зашитый курс устаревает
//    молча -- и страница начинает врать, не ломаясь. Вместо этого берём
//    валюту, в которой в этой выборке больше всего вакансий, и считаем
//    только по ней; сколько вакансий осталось за бортом, страница
//    говорит вслух. По тому же замеру: USD 758, UAH 11, EUR 4 -- почти
//    всегда вся выборка и так в одной валюте.
//
// 3. «Вилка» на странице -- это КВАРТИЛИ (p25-p75), а не минимум и
//    максимум. Минимум и максимум -- это две случайные вакансии: одна
//    стажёрская, одна директорская, и «от 300 до 15 000» не говорит
//    человеку ничего. Между четвертью и тремя четвертями лежит половина
//    рынка -- это и есть ответ на вопрос «сколько тут платят».

/** Одна зарплата, приведённая к месяцу. */
export type SalaryPoint = { amount: number; currency: string };

export type SalaryStats = {
  currency: string;
  /** Сколько вакансий попало в расчёт (только эта валюта). */
  count: number;
  /** Сколько вакансий с вилкой осталось за бортом -- другая валюта. */
  skipped: number;
  p25: number;
  median: number;
  p75: number;
  min: number;
  max: number;
};

export type RawSalary = {
  min: number | null;
  max: number | null;
  currency: string;
  /** MONTH -- как есть, YEAR -- делим на 12, HOUR -- 160 часов в месяц. */
  period: "HOUR" | "MONTH" | "YEAR";
};

/** 160 часов -- это 40 часов в неделю на четыре недели. */
const HOURS_PER_MONTH = 160;

/**
 * Вакансия -> одно число в месяц. У вилки берём середину: это ровно то,
 * на что человек может рассчитывать «в среднем», а крайние значения всё
 * равно попадут в квартили через соседние вакансии.
 */
export function monthlyAmount(salary: RawSalary): SalaryPoint | null {
  const lo = salary.min ?? salary.max;
  const hi = salary.max ?? salary.min;
  if (lo == null || hi == null) return null;
  const mid = (lo + hi) / 2;
  if (!Number.isFinite(mid) || mid <= 0) return null;
  const perMonth =
    salary.period === "YEAR" ? mid / 12 : salary.period === "HOUR" ? mid * HOURS_PER_MONTH : mid;
  const currency = salary.currency.trim().toUpperCase();
  if (!currency) return null;
  return { amount: Math.round(perMonth), currency };
}

/**
 * Квантиль по уже отсортированному массиву, с линейной интерполяцией
 * между соседями (метод R-7, он же у numpy и Excel по умолчанию).
 */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  return a + (b - a) * (pos - lo);
}

/**
 * Статистика по выборке вакансий. null -- если в самой многочисленной
 * валюте набралось меньше minCount вакансий: показывать медиану по трём
 * вакансиям нельзя, это не медиана, а три вакансии.
 */
export function salaryStats(points: SalaryPoint[], minCount: number): SalaryStats | null {
  if (points.length === 0) return null;
  const byCurrency = new Map<string, number[]>();
  for (const p of points) {
    const list = byCurrency.get(p.currency);
    if (list) list.push(p.amount);
    else byCurrency.set(p.currency, [p.amount]);
  }
  let currency = "";
  let amounts: number[] = [];
  for (const [cur, list] of byCurrency) {
    // При равенстве побеждает первая встреченная -- порядок вставки
    // повторяет порядок ленты, он же одинаковый при каждой сборке.
    if (list.length > amounts.length) {
      currency = cur;
      amounts = list;
    }
  }
  if (amounts.length < minCount) return null;
  const sorted = [...amounts].sort((a, b) => a - b);
  return {
    currency,
    count: sorted.length,
    skipped: points.length - sorted.length,
    p25: Math.round(quantile(sorted, 0.25)),
    median: Math.round(quantile(sorted, 0.5)),
    p75: Math.round(quantile(sorted, 0.75)),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}
