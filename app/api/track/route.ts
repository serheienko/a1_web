export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/track/route.ts
//
// 11.10.2026. Маячок со страницы: «нажали переход на сайт компании»,
// «открыли форму клейма» и так далее. Браузер шлёт его через
// navigator.sendBeacon -- запрос уходит в фоне и ничего не ждёт, даже
// если страница в этот момент закрывается.
//
// Здесь только счётчик. Кто нажал -- не сохраняем: для вопроса «сколько
// переходов у этой компании» это не нужно, а хранить лишнее про людей
// незачем.
//
// 22.10.2026. Появилось одно исключение -- ярлык канала («google»,
// «telegram», «direct»). Раньше здесь было написано «и откуда он -- не
// сохраняем», и это стоило нам ответа на главный вопрос: какой канал
// приводит людей. Ярлык канала -- это дверь, а не человек: он одинаковый
// у всех, кто пришёл из поиска, и по нему нельзя узнать никого. Он идёт
// ОТДЕЛЬНОЙ строкой (lib/stats/store.ts, SOURCE_MARK), не привязанной ни
// к вакансии, ни к компании, поэтому связать «этот человек смотрел эту
// вакансию» по нему тоже нельзя.

import { NextRequest, NextResponse } from "next/server";
import { bump, SOURCE_MARK, STAT_EVENTS, type StatEvent } from "@/lib/stats/store";

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

/** Ярлык канала: буквы, цифры и дефис, не длиннее 24 знаков. Длина -- чтобы
 *  чужая метка в ссылке не наплодила строк, набор знаков -- чтобы ярлык
 *  нельзя было спутать с ником компании. */
function cleanSource(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim().toLowerCase().slice(0, 24);
  return /^[a-z0-9][a-z0-9-]*$/.test(v) ? v : "";
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

  const { e, c, p, s } = body as { e?: unknown; c?: unknown; p?: unknown; s?: unknown };
  if (typeof e !== "string" || !(STAT_EVENTS as readonly string[]).includes(e)) {
    return new NextResponse(null, { status: 204 });
  }

  const event = e as StatEvent;
  bump({ event, company: clean(c), post: clean(p) });
  const source = cleanSource(s);
  if (source) bump({ event, company: SOURCE_MARK, post: source });
  return new NextResponse(null, { status: 204 });
}
