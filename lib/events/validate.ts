// lib/events/validate.ts -- проверка пачки событий от Конкистадора (без внешних библиотек).
import type { EventFormat, EventItem } from "./types";

const FORMATS: EventFormat[] = ["conference", "meetup", "workshop", "course", "other"];
const SLUG = /^[a-z0-9][a-z0-9-]{1,100}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length <= max ? v.trim() : null;
}

function httpUrl(v: unknown, max = 600): string | null {
  const s = str(v, max);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function cleanEvent(raw: unknown): EventItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = str(r.slug, 110);
  const series = str(r.series, 110);
  const name = str(r.name, 200);
  const seriesName = str(r.seriesName, 200);
  const url = httpUrl(r.url);
  const sourceUrl = httpUrl(r.sourceUrl);
  const start = str(r.start, 10);
  const end = str(r.end, 10) || start;
  if (!slug || !SLUG.test(slug) || !series || !SLUG.test(series) || !name || !seriesName || !url || !sourceUrl) return null;
  if (!start || !DATE.test(start) || !end || !DATE.test(end) || end < start) return null;
  if (r.source !== "confs.tech" && r.source !== "dou.ua" && r.source !== "dev.events") return null;
  const sum = r.summary as { uk?: unknown; en?: unknown } | undefined;
  const uk = str(sum?.uk, 900);
  const en = str(sum?.en, 900);
  if (!uk || !en || uk.length < 40 || en.length < 40) return null;
  const tags = Array.isArray(r.tags) ? r.tags.map((t) => str(t, 40)).filter((t): t is string => !!t).slice(0, 12) : [];
  const format = FORMATS.includes(r.format as EventFormat) ? (r.format as EventFormat) : "other";
  const image = r.image ? httpUrl(r.image, 800) : null;
  const cfpUrl = r.cfpUrl ? httpUrl(r.cfpUrl) : null;
  const cfpEnd = typeof r.cfpEnd === "string" && DATE.test(r.cfpEnd) ? r.cfpEnd : undefined;
  return {
    slug,
    series,
    seriesName,
    name,
    url,
    source: r.source,
    sourceUrl,
    start,
    end,
    city: str(r.city, 80) ?? "",
    country: str(r.country, 60) ?? "",
    online: r.online === true,
    format,
    tags,
    ...(str(r.price, 60) ? { price: str(r.price, 60) as string } : {}),
    ...(r.free === true ? { free: true } : {}),
    ...(image ? { image } : {}),
    ...(cfpUrl ? { cfpUrl } : {}),
    ...(cfpEnd ? { cfpEnd } : {}),
    ...(str(r.locales, 20) ? { locales: str(r.locales, 20) as string } : {}),
    summary: { uk, en },
    updated: typeof r.updated === "string" ? r.updated.slice(0, 30) : new Date().toISOString(),
  };
}
