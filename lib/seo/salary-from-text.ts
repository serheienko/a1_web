// lib/seo/salary-from-text.ts
//
// 07.10.2026 (Александр, разбор Search Console: «берись»). В отчёте
// «Вакансии» у ВСЕХ вакансий замечание «Отсутствует поле baseSalary».
// Поле money у поста заполнено редко, но у внешних вакансий зарплата
// часто прямо написана в тексте: «Pay Range $125,000.00 - $165,000.00»,
// «Salary is $223,560.00 - $245,916.00 per year», «$50.00 per hour».
// Замер на 150 случайных вакансиях: 22 из них (15%) без поля, но с
// суммой в тексте.
//
// Google требует, чтобы зарплата в разметке совпадала с тем, что видит
// человек на странице. Текст вакансии на странице есть целиком, поэтому
// число отсюда -- не выдумка. Но ошибка здесь хуже пропуска, поэтому
// разбор нарочно осторожный:
//   - рядом (до 120 символов перед суммой) обязано стоять слово про оплату
//     (salary, pay range, compensation, зарплата...). «Food waste is a $1
//     trillion issue» и «ventas mínimo $21.000.000» так не проходят;
//   - одиночная сумма берётся только с явным периодом («per hour»);
//   - сумма проверяется на здравый смысл для своего периода;
//   - не уверены -- возвращаем null, и поле просто не отдаётся.

export type TextSalary = {
  min: number;
  max: number;
  currency: string;
  unitText: "HOUR" | "MONTH" | "YEAR";
};

const SYMBOL_CURRENCY: Record<string, string> = {
  $: "USD",
  usd: "USD",
  "€": "EUR",
  eur: "EUR",
  "£": "GBP",
  gbp: "GBP",
  "₴": "UAH",
  "грн": "UAH",
  uah: "UAH",
};

const PAY_WORDS =
  /(salary|salaries|pay range|base pay|pay rate|hourly rate|compensation|wage|pay is|pay:|annual pay|we pay|зарплат|заробітн|з\/п|\bзп\b|оклад|ставка|винагород|дохід)/i;

const HOUR_WORDS = /(per hour|an hour|\/\s?h(ou)?r\b|hourly|на годину|за годину|\/\s?год)/i;
const MONTH_WORDS = /(per month|a month|\/\s?mo(nth)?\b|monthly|на місяць|в місяць|за місяць|\/\s?міс)/i;
const YEAR_WORDS = /(per year|a year|per annum|\/\s?y(ea)?r\b|annual|annually|yearly|на рік|за рік)/i;

const LIMITS: Record<TextSalary["unitText"], [number, number]> = {
  HOUR: [7, 500],
  MONTH: [300, 60_000],
  YEAR: [10_000, 1_500_000],
};

/** «125,000.00» -> 125000, «21.000» -> 21000, «45 000» -> 45000, «120k» -> 120000. */
export function parseAmount(raw: string, k?: string): number | null {
  let s = raw.replace(/[\s  ]/g, "");
  // Десятичная часть -- это ровно две цифры после последнего разделителя
  // («$19.50 hourly» -- это 19.5, а не 19).
  const dec = s.match(/[.,](\d{2})$/);
  if (dec) s = s.slice(0, -3);
  s = s.replace(/[.,]/g, "");
  if (!/^\d+$/.test(s)) return null;
  let n = Number(s) + (dec ? Number(dec[1]) / 100 : 0);
  if (k) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

const NUM = String.raw`(\d{1,3}(?:[,.\s  ]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)\s?([kK])?`;
const SYM = String.raw`(\$|€|£|₴|usd|eur|gbp|uah)`;
// «$123,000 USD and $172,000 USD», «between £45,000 and £55,000»
const DASH = String.raw`\s?(?:usd|eur|gbp)?\s?(?:-|–|—|to|до|and)\s?`;

// «$125,000 - $165,000», «USD 4000–6000»
const PREFIX_RANGE = new RegExp(`${SYM}\\s?${NUM}${DASH}(?:\\$|€|£|₴|usd|eur|gbp|uah)?\\s?${NUM}`, "gi");
// «30 000 – 45 000 грн», «4000-5000$»
const SUFFIX_RANGE = new RegExp(`${NUM}${DASH}${NUM}\\s?(\\$|€|£|₴|грн|usd|eur|gbp|uah)`, "gi");
// «$50.00 per hour» -- только с периодом (проверяется ниже)
const PREFIX_SINGLE = new RegExp(`${SYM}\\s?${NUM}`, "gi");

function periodFrom(after: string, before: string): TextSalary["unitText"] | null {
  for (const text of [after, before]) {
    if (HOUR_WORDS.test(text)) return "HOUR";
    if (MONTH_WORDS.test(text)) return "MONTH";
    if (YEAR_WORDS.test(text)) return "YEAR";
  }
  return null;
}

function guessPeriod(max: number, currency: string): TextSalary["unitText"] | null {
  // Гривневая сумма без периода -- почти всегда за месяц.
  if (currency === "UAH") return max >= 5_000 ? "MONTH" : null;
  if (max >= 15_000) return "YEAR";
  if (max >= 500) return "MONTH";
  // «Pay Range $36.00 - $43.00» без слова «час» -- это почасовая ставка.
  if (max >= 15 && max <= 200) return "HOUR";
  return null;
}

// Гривна примерно в 40 раз «мельче» доллара -- свои пределы.
const UAH_LIMITS: Record<TextSalary["unitText"], [number, number]> = {
  HOUR: [100, 10_000],
  MONTH: [8_000, 1_000_000],
  YEAR: [100_000, 20_000_000],
};

function sane(min: number, max: number, unit: TextSalary["unitText"], currency: string): boolean {
  const [lo, hi] = (currency === "UAH" ? UAH_LIMITS : LIMITS)[unit];
  return min >= lo && max <= hi && min <= max && max / min <= 4;
}

/** Первая уверенно распознанная зарплата в тексте вакансии, или null. */
export function extractSalaryFromText(text: string): TextSalary | null {
  const flat = text.replace(/\s+/g, " ");

  type Hit = { index: number; length: number; min: number; max: number; currency: string | undefined; single: boolean };
  const hits: Hit[] = [];

  for (const m of flat.matchAll(PREFIX_RANGE)) {
    const a = parseAmount(m[2]!, m[3]);
    const b = parseAmount(m[4]!, m[5] ?? m[3]);
    if (a == null || b == null) continue;
    hits.push({ index: m.index!, length: m[0].length, min: a, max: b, currency: SYMBOL_CURRENCY[m[1]!.toLowerCase()], single: false });
  }
  for (const m of flat.matchAll(SUFFIX_RANGE)) {
    const a = parseAmount(m[1]!, m[2] ?? m[4]);
    const b = parseAmount(m[3]!, m[4]);
    if (a == null || b == null) continue;
    hits.push({ index: m.index!, length: m[0].length, min: a, max: b, currency: SYMBOL_CURRENCY[m[5]!.toLowerCase()], single: false });
  }
  for (const m of flat.matchAll(PREFIX_SINGLE)) {
    const a = parseAmount(m[2]!, m[3]);
    if (a == null) continue;
    hits.push({ index: m.index!, length: m[0].length, min: a, max: a, currency: SYMBOL_CURRENCY[m[1]!.toLowerCase()], single: true });
  }

  // Диапазоны раньше одиночных; среди равных -- что раньше в тексте.
  hits.sort((x, y) => Number(x.single) - Number(y.single) || x.index - y.index);

  for (const h of hits) {
    if (!h.currency) continue;
    const before = flat.slice(Math.max(0, h.index - 120), h.index);
    if (!PAY_WORDS.test(before)) continue;
    // У одиночной суммы период должен стоять вплотную: «$55.00 per hour»,
    // «Salary per month -- from $3500». Иначе «£55,000 ... 28 days annual
    // leave» сошло бы за годовую зарплату.
    const after = flat.slice(h.index + h.length, h.index + h.length + (h.single ? 20 : 40));
    const unit = periodFrom(after, before.slice(h.single ? -30 : -60)) ?? (h.single ? null : guessPeriod(h.max, h.currency));
    if (!unit) continue;
    if (!sane(h.min, h.max, unit, h.currency)) continue;
    return { min: h.min, max: h.max, currency: h.currency, unitText: unit };
  }
  return null;
}
