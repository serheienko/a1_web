// lib/format.ts
//
// Presentation-only formatting helpers for the UI. Nothing here touches
// the API — lib/a1/ is the only boundary allowed to do that (PLAN.md §5
// rule 3), and this file is safe to import from client components.

import type { WebPostSalary } from "@/types/web-post";

const RELATIVE_UNITS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 2592000, divisor: 86400, unit: "day" },
  { limit: 31536000, divisor: 2592000, unit: "month" },
];

const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

/** "3 hours ago" / "2 days ago", etc — in Russian, relative to now. */
export function formatRelativeTime(date: Date): string {
  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSeconds);

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (abs < limit) {
      return rtf.format(Math.round(diffSeconds / divisor), unit);
    }
  }
  return rtf.format(Math.round(diffSeconds / 31536000), "year");
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

export function formatSalary(salary: WebPostSalary): string {
  const period = salary.period === "YEAR" ? "/год" : "/мес";
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
