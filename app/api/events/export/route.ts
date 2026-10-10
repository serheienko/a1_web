// app/api/events/export/route.ts -- Конкистадор забирает текущий набор (с описаниями и
// картинками), чтобы не писать их заново для уже известных событий. Тот же секрет.
import { NextResponse } from "next/server";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { loadEventsFresh } from "@/lib/events/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkNewsSecret(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.status === 503 ? "not configured" : "forbidden" }, { status: auth.status });
  const f = await loadEventsFresh();
  return NextResponse.json({ ok: true, updated: f?.updated ?? null, events: f?.events ?? [] });
}
