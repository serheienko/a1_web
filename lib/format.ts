// lib/format.ts
//
// Presentation-only formatting helpers for the UI. Nothing here touches
// the API — lib/a1/ is the only boundary allowed to do that (PLAN.md §5
// rule 3), and this file is safe to import from client components.

import type { WebPostSalary } from "@/types/web-post";
import { LOCALE_TAG, type Locale } from "@/components/t";

const RELATIVE_UNITS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 2592000, divisor: 86400, unit: "day" },
  { limit: 31536000, divisor: 2592000, unit: "month" },
];

// 2026-08-30, live-testing feedback ("Время в посте почему то сделано без
// локализации"): formatRelativeTime used to hard-code a single
// module-level `new Intl.RelativeTimeFormat("ru", ...)`, so every post's
// timestamp came out in Russian regardless of the visitor's chosen
// language. One formatter per locale, built lazily and cached (these are
// small, cheap-to-construct Intl objects, but no reason to rebuild one on
// every single post render either) -- see components/locale-format.tsx
// for how this gets rendered per-locale server-side, same trick
// components/t.tsx already uses for static chrome strings.
const rtfByLocale = new Map<Locale, Intl.RelativeTimeFormat>();

function getRtf(locale: Locale): Intl.RelativeTimeFormat {
  let rtf = rtfByLocale.get(locale);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: "auto" });
    rtfByLocale.set(locale, rtf);
  }
  return rtf;
}

// Language codes from the backend (e.g. "ja", "el", "da", "hr" — ISO 639-1,
// lowercase) come through as bare codes with no name attached (confirmed
// 2026-08-26: no such mapping exists in the API response or anywhere in
// this repo). Rather than hand-authoring a code->Russian-name dictionary,
// Intl.DisplayNames does exactly this natively and correctly ("ja" ->
// "японский", "hr" -> "хорватский", etc) — Aleksandr asked for language
// names spelled out in full instead of the raw 2-letter code.
const languageDisplayNames = new Intl.DisplayNames(["ru"], { type: "language" });

/** "ja" -> "Японский". Falls back to the raw (uppercased) code if unrecognized. */
export function formatLanguageName(code: string): string {
  try {
    const name = languageDisplayNames.of(code.toLowerCase());
    if (!name) return code.toUpperCase();
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code.toUpperCase();
  }
}

/** "3 hours ago" / "2 days ago", etc — in the given locale, relative to
 *  now. See getRtf's own comment above for why this takes a locale
 *  instead of hard-coding one. */
// Daily upload quota message (Aleksandr, 2026-09-02) -- binary units
// (1024, not 1000, matching every OS's own "MB" for a byte count), no
// decimals under 1MB for readability, one decimal place once it rounds
// to a single-digit MB figure (matches the reference screenshot's own
// "94 KB" style -- "9.4 MB" reads better than a bare "9 MB" when the
// true figure could be anywhere from 8.5 to 9.49).
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatRelativeTime(date: Date, locale: Locale): string {
  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSeconds);
  const rtf = getRtf(locale);

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (abs < limit) {
      return rtf.format(Math.round(diffSeconds / divisor), unit);
    }
  }
  return rtf.format(Math.round(diffSeconds / 31536000), "year");
}

// Countdown duration -- "8 годин 32 хвилини" / "8h 32min" style, hours
// AND minutes together when both are non-zero. NOT built on
// formatRelativeTime above: that helper hands its whole phrase to
// Intl.RelativeTimeFormat, which already bakes its OWN "in"/"через"
// word into the result ("через 8 часов") -- fine standalone, but
// components/daily-uploads-modal.tsx prepends its own localized
// "resetsIn" label ("Знову доступно через") right before it, producing
// a visible double "через через 8 годин" (2026-09-03, Aleksandr live
// screenshot). It also only ever names ONE unit (whichever
// RELATIVE_UNITS bracket the whole diff falls into), so an 8h32m
// countdown collapsed to a bare "8 годин" -- Aleksandr's own reference
// screenshot shows the native app's version keeping minutes too
// ("Available again in 3m"), so this always surfaces both units once
// there's more than an hour left, not just the coarser one.
// Intl.NumberFormat's `style: "unit"` (not RelativeTimeFormat) is what
// gets each language's own correct plural form ("1 година" vs "8
// годин") without hand-writing plural-rule tables.
function formatUnitPart(value: number, unit: "hour" | "minute", locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], { style: "unit", unit, unitDisplay: "long" }).format(value);
}

export function formatCountdownDuration(totalSeconds: number, locale: Locale): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) {
    // Under an hour left -- minutes only (floored to at least 1 so a
    // near-zero countdown never misleadingly reads as already reset).
    return formatUnitPart(Math.max(1, minutes), "minute", locale);
  }
  if (minutes <= 0) return formatUnitPart(hours, "hour", locale);
  return `${formatUnitPart(hours, "hour", locale)} ${formatUnitPart(minutes, "minute", locale)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
  uah: "₴",
};

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase() + " ";
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

// 2026-08-30, live-testing feedback ("Зп тоже должна локализироваться под
// выбор языка, yr / mo"): the "/год" (year) and "/мес" (month) period
// suffix used to be hard-coded Russian too, same underlying issue as
// formatRelativeTime above. Abbreviations chosen to match how each
// language's own job boards typically shorten "per year"/"per month".
const PERIOD_SUFFIX: Record<Locale, { year: string; month: string }> = {
  uk: { year: "рік", month: "міс" },
  en: { year: "yr", month: "mo" },
  ru: { year: "год", month: "мес" },
  de: { year: "Jahr", month: "Monat" },
  es: { year: "año", month: "mes" },
  fr: { year: "an", month: "mois" },
  pl: { year: "rok", month: "mies." },
  ptBR: { year: "ano", month: "mês" },
  zh: { year: "年", month: "月" },
};

export function formatSalary(salary: WebPostSalary, locale: Locale): string {
  const suffix = PERIOD_SUFFIX[locale];
  const period = "/" + (salary.period === "YEAR" ? suffix.year : suffix.month);
  if (salary.min != null && salary.max != null && salary.min !== salary.max) {
    return `${formatAmount(salary.min, salary.currency)}–${formatAmount(salary.max, salary.currency)}${period}`;
  }
  const single = salary.min ?? salary.max;
  if (single == null) return "";
  return `${formatAmount(single, salary.currency)}${period}`;
}

/** Truncate to maxLength, backing off to the last whole word rather than
 *  cutting mid-word (PLAN.md §3.2: page titles must break on a word
 *  boundary). */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * dataset.postCategories returns `text` as HTML-entity-encoded strings —
 * e.g. "&#x1F33E; Agriculture" — confirmed against the live endpoint on
 * 2026-08-26, not documented in PLAN.md. Decodes numeric entities
 * (decimal `&#128290;` and hex `&#x1F33E;`, both seen in real data) plus
 * the handful of named ones worth covering defensively.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity: string) => {
    // .charAt()/.startsWith() rather than entity[0] — safe under
    // noUncheckedIndexedAccess regardless of how it treats string index
    // signatures (bit us twice already on array indexing; not worth
    // finding out the hard way a third time for strings).
    if (entity.startsWith("#")) {
      const isHex = entity.charAt(1) === "x" || entity.charAt(1) === "X";
      const codePoint = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_HTML_ENTITIES[entity] ?? match;
  });
}
