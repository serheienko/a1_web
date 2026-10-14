// lib/metrics/umami.ts
//
// 14.10.2026 (Александр: «кто приходит, сколько остаётся, кто отваливается -- в небольшом окне штаба»).
// Читаем цифры из нашей Umami (Railway) через ссылку «Поделиться» -- она даёт доступ ТОЛЬКО на чтение
// статистики одного сайта, без пароля. Включается в Umami: Settings -> Websites -> jobs.a1appp.com ->
// Edit -> Share URL; часть ссылки после /share/ кладётся в переменную UMAMI_SHARE_ID сервиса jobs-web.
//
// Цифры кешируем на час: штаб открывают часто, а Umami считать заново каждый раз незачем.

if (typeof window !== "undefined") {
  throw new Error("[lib/metrics/umami] server-only");
}

const BASE = (process.env.UMAMI_URL || "https://umami-production-e14b.up.railway.app").replace(/\/$/, "");
const TTL_MS = 60 * 60_000;

export type UmamiPeriod = { visitors: number; visits: number; pageviews: number; bounces: number; totaltime: number };
export type UmamiRow = { x: string; y: number };
export type UmamiSummary = {
  ok: true;
  today: UmamiPeriod;
  week: UmamiPeriod;
  prevWeek: UmamiPeriod;
  referrers: UmamiRow[];
  events: Record<string, number>;
  at: string;
};
export type UmamiResult = UmamiSummary | { ok: false; reason: "not_configured" | "failed"; detail?: string };

let cache: { at: number; data: UmamiResult } | null = null;

async function auth(shareId: string): Promise<{ websiteId: string; token: string }> {
  const r = await fetch(`${BASE}/api/share/${encodeURIComponent(shareId)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`share ${r.status}`);
  const j = (await r.json()) as { websiteId?: string; token?: string };
  if (!j.websiteId || !j.token) throw new Error("share: no token");
  return { websiteId: j.websiteId, token: j.token };
}

async function get<T>(a: { websiteId: string; token: string }, path: string, qs: Record<string, string | number>): Promise<T> {
  const q = new URLSearchParams(Object.entries(qs).map(([k, v]) => [k, String(v)]));
  const r = await fetch(`${BASE}/api/websites/${a.websiteId}/${path}?${q.toString()}`, {
    headers: { "x-umami-share-token": a.token },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return (await r.json()) as T;
}

/** У разных версий Umami ответ stats разный: {visitors:{value}} или {visitors: N}. Приводим к числам. */
function period(raw: Record<string, unknown>): UmamiPeriod {
  const n = (k: string): number => {
    const v = raw[k];
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && typeof (v as { value?: unknown }).value === "number") return (v as { value: number }).value;
    return 0;
  };
  return { visitors: n("visitors"), visits: n("visits"), pageviews: n("pageviews"), bounces: n("bounces"), totaltime: n("totaltime") };
}

function kyivMidnight(now: Date): number {
  // полночь по Киеву: берём киевскую дату и ищем её начало в UTC (смещение +2/+3)
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  for (const off of [3, 2]) {
    const t = Date.parse(`${d}T00:00:00+0${off}:00`);
    const back = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", hour: "2-digit", hourCycle: "h23" }).format(new Date(t));
    if (back === "00") return t;
  }
  return Date.parse(`${d}T00:00:00+02:00`);
}

export async function umamiSummary(): Promise<UmamiResult> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const shareId = (process.env.UMAMI_SHARE_ID ?? "").trim();
  if (!shareId) return { ok: false, reason: "not_configured" };
  try {
    const a = await auth(shareId);
    const now = Date.now();
    const day0 = kyivMidnight(new Date(now));
    const week0 = now - 7 * 86_400_000;
    const prev0 = now - 14 * 86_400_000;
    const [today, week, prevWeek, referrers, events] = await Promise.all([
      get<Record<string, unknown>>(a, "stats", { startAt: day0, endAt: now }),
      get<Record<string, unknown>>(a, "stats", { startAt: week0, endAt: now }),
      get<Record<string, unknown>>(a, "stats", { startAt: prev0, endAt: week0 }),
      get<UmamiRow[]>(a, "metrics", { startAt: week0, endAt: now, type: "referrer", limit: 6 }).catch(() => [] as UmamiRow[]),
      get<UmamiRow[]>(a, "metrics", { startAt: week0, endAt: now, type: "event", limit: 50 }).catch(() => [] as UmamiRow[]),
    ]);
    const ev: Record<string, number> = {};
    for (const r of Array.isArray(events) ? events : []) if (r && typeof r.x === "string") ev[r.x] = Number(r.y) || 0;
    const data: UmamiSummary = {
      ok: true,
      today: period(today),
      week: period(week),
      prevWeek: period(prevWeek),
      referrers: (Array.isArray(referrers) ? referrers : []).filter((r) => r && r.x).slice(0, 6),
      events: ev,
      at: new Date(now).toISOString(),
    };
    cache = { at: now, data };
    return data;
  } catch (e) {
    const res: UmamiResult = { ok: false, reason: "failed", detail: e instanceof Error ? e.message : String(e) };
    // неудачу кешируем ненадолго, чтобы штаб не ждал Umami при каждом обновлении
    cache = { at: Date.now() - TTL_MS + 5 * 60_000, data: res };
    return res;
  }
}
