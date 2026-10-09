// app/api/shtab/legacy/route.ts
//
// 09.10.2026: «мост» для сервиса DOU (a1-dou-runner). Он уже шлёт пульсы
// (heartbeat.py: agent / status working|sleeping|error / note) на адрес из
// переменной PULSE_URL -- раньше это была Google-таблица со старой картой агентов.
// Теперь PULSE_URL указывает сюда: мы кладём пульс в штаб, а исходное
// сообщение пересылаем на старый адрес (LEGACY_PULSE_URL/LEGACY_PULSE_SECRET),
// чтобы старая карта не оглохла. Код сервиса DOU при этом не меняется.
//
// Секрет -- тот же SHTAB_SECRET (в теле, поле secret: так шлёт heartbeat.py).

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { savePulse, type PulseStatus } from "@/lib/a1/shtab-store";

export const dynamic = "force-dynamic";

const Body = z.object({
  secret: z.string().min(1).max(200),
  kind: z.string().max(20).optional(),
  agent: z.string().min(1).max(60),
  status: z.string().max(20),
  note: z.string().max(400).optional(),
  next: z.string().max(80).optional(),
  ts: z.string().max(40).optional(),
});

// Имена агентов в heartbeat.py -> id в штабе.
const AGENT_MAP: Record<string, string> = {
  "a1-parser": "kazak",
  "google-indexing": "postman",
};

const STATUS_MAP: Record<string, PulseStatus> = { working: "working", sleeping: "ok", error: "error" };

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function num(re: RegExp, s: string): number | null {
  const m = re.exec(s);
  return m ? Number(m[1]) : null;
}

export async function POST(req: Request) {
  const expected = (process.env.SHTAB_SECRET ?? "").trim();
  if (!expected) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

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
  const b = parsed.data;
  if (!same(b.secret.trim(), expected)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });

  // 1) в штаб
  const id = AGENT_MAP[b.agent];
  const status = STATUS_MAP[b.status];
  let saved = false;
  if (id && status) {
    const note = b.note ?? "";
    const published = num(/опубликовано\s+(\d+)/, note) ?? num(/отправлено\s+(\d+)/, note);
    const errors = num(/ошибок\s+(\d+)/, note);
    saved = await savePulse({ agent: id, status, note: published === null && errors === null ? note.slice(0, 300) : "", published, errors });
  }

  // 2) на старый адрес (старая карта агентов), если он задан
  const legacyUrl = (process.env.LEGACY_PULSE_URL ?? "").trim();
  const legacySecret = (process.env.LEGACY_PULSE_SECRET ?? "").trim();
  let forwarded = false;
  if (legacyUrl && legacySecret) {
    try {
      const res = await fetch(legacyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, secret: legacySecret }),
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      forwarded = res.ok;
    } catch {
      forwarded = false;
    }
  }
  return NextResponse.json({ ok: true, saved, forwarded });
}
