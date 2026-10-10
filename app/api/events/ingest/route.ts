// app/api/events/ingest/route.ts
//
// 11.10.2026: сюда Конкистадор (konk_events.py) сдаёт ВСЕ актуальные события разом.
// Ворота: секрет (тот же x-news-secret, что у новостей), размер, проверка каждой записи
// (lib/events/validate.ts), уникальность слагов, и защита от «пустой» пачки (так
// не затрём календарь, если источник сломался). Новые адреса сразу уходят в IndexNow.

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { loadEventsFresh, saveEvents } from "@/lib/events/store";
import { cleanEvent } from "@/lib/events/validate";
import { SITE_URL } from "@/lib/events/util";
import { submitUrls } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = checkNewsSecret(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.status === 503 ? "not configured" : "forbidden" }, { status: auth.status });

  const raw = await req.text();
  if (raw.length > 8_000_000) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  let json: { events?: unknown[] };
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  if (!Array.isArray(json.events)) return NextResponse.json({ ok: false, error: "no events" }, { status: 400 });

  const events = [];
  const seen = new Set<string>();
  let rejected = 0;
  for (const r of json.events) {
    const e = cleanEvent(r);
    if (!e || seen.has(e.slug)) {
      rejected++;
      continue;
    }
    seen.add(e.slug);
    events.push(e);
  }
  // Защита: пачка заметно меньше прошлой -- не принимаем (источник мог сломаться).
  const prev = await loadEventsFresh();
  const prevN = prev?.events.length ?? 0;
  if (events.length < 20 || (prevN > 50 && events.length < prevN * 0.5)) {
    return NextResponse.json({ ok: false, error: "batch too small", got: events.length, had: prevN, rejected }, { status: 422 });
  }

  const ok = await saveEvents({ v: 1, updated: new Date().toISOString(), events });
  if (!ok) return NextResponse.json({ ok: false, error: "storage" }, { status: 502 });

  revalidateTag("events");
  revalidatePath("/events");
  revalidatePath("/events/en");

  // IndexNow: только новые адреса (и uk, и en).
  const had = new Set((prev?.events ?? []).map((e) => e.slug));
  const fresh = events.filter((e) => !had.has(e.slug));
  const urls = fresh.flatMap((e) => [`${SITE_URL}/events/${e.slug}`, `${SITE_URL}/events/en/${e.slug}`]);
  if (fresh.length) urls.push(`${SITE_URL}/events`, `${SITE_URL}/events/en`);
  let indexnow: unknown = null;
  if (urls.length) {
    try {
      indexnow = await submitUrls(urls.slice(0, 5000));
    } catch {
      indexnow = "failed";
    }
  }
  return NextResponse.json({ ok: true, saved: events.length, rejected, added: fresh.length, indexnow });
}
