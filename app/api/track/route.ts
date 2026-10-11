export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/track/route.ts
//
// 11.10.2026. Маячок со страницы: «нажали переход на сайт компании»,
// «открыли форму клейма» и так далее. Браузер шлёт его через
// navigator.sendBeacon -- запрос уходит в фоне и ничего не ждёт, даже
// если страница в этот момент закрывается.
//
// Здесь только счётчик. Ни кто нажал, ни откуда он -- не сохраняем:
// для вопроса «сколько переходов у этой компании» это не нужно, а
// хранить лишнее про людей незачем.

import { NextRequest, NextResponse } from "next/server";
import { bump, STAT_EVENTS, type StatEvent } from "@/lib/stats/store";

// Столько событий с одного адреса в минуту. Не защита от злого умысла
// (её тут и не построить), а заслон от зациклившейся страницы.
const MAX_PER_MINUTE = 120;
const seen = new Map<string, { n: number; since: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = seen.get(ip);
  if (!rec || now - rec.since > 60_000) {
    seen.set(ip, { n: 1, since: now });
    if (seen.size > 10_000) {
      for (const [k, v] of seen) if (now - v.since > 60_000) seen.delete(k);
    }
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_MINUTE;
}

/** Ник компании / адрес вакансии: только то, что бывает в наших адресах. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim().toLowerCase().slice(0, 120);
  return /^[a-z0-9][a-z0-9._-]*$/.test(v) ? v : "";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    // sendBeacon шлёт text/plain, поэтому читаем как текст и разбираем сами.
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 204 });

  const { e, c, p } = body as { e?: unknown; c?: unknown; p?: unknown };
  if (typeof e !== "string" || !(STAT_EVENTS as readonly string[]).includes(e)) {
    return new NextResponse(null, { status: 204 });
  }

  bump({ event: e as StatEvent, company: clean(c), post: clean(p) });
  return new NextResponse(null, { status: 204 });
}
