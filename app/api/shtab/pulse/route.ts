// app/api/shtab/pulse/route.ts
//
// 09.10.2026: агенты (Конкистадор и другие) присылают сюда короткий «пульс»
// после каждого запуска -- его показывает штаб (/admin/shtab).
// Доступ -- по общему секрету в заголовке x-shtab-secret (переменная
// SHTAB_SECRET на сайте и у агента). Времени из тела не берём: ставит сервер.
// Без секрета на сервере -- 503, с неверным -- 401. Тело маленькое, агент
// из списка lib/a1/shtab-agents.ts.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { KNOWN_AGENT_IDS } from "@/lib/a1/shtab-agents";
import { savePulse } from "@/lib/a1/shtab-store";

export const dynamic = "force-dynamic";

const Body = z.object({
  agent: z.string().min(1).max(40),
  status: z.enum(["working", "ok", "error"]),
  note: z.string().max(300).optional(),
  published: z.number().int().min(0).max(1_000_000).nullable().optional(),
  errors: z.number().int().min(0).max(1_000_000).nullable().optional(),
  limit: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = (process.env.SHTAB_SECRET ?? "").trim();
  if (!expected) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  const given = (req.headers.get("x-shtab-secret") ?? "").trim();
  if (!given || !sameSecret(given, expected)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > 4000) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  if (!KNOWN_AGENT_IDS.has(parsed.data.agent)) {
    return NextResponse.json({ ok: false, error: "unknown agent" }, { status: 400 });
  }

  const saved = await savePulse(parsed.data);
  return NextResponse.json({ ok: saved }, { status: saved ? 200 : 502 });
}
