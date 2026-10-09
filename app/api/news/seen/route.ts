// app/api/news/seen/route.ts
//
// 09.10.2026: что у нас уже опубликовано (в том числе ждёт своего часа) --
// агент «Редакція A1» читает это перед выбором темы, чтобы не повторяться.
// Тот же секрет, что у /api/news/publish.

import { NextResponse } from "next/server";
import { NEWS } from "@/lib/news/articles";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { loadEnvelopesFresh } from "@/lib/news/dynamic-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = checkNewsSecret(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.status === 503 ? "not configured" : "forbidden" }, { status: auth.status });
  const dyn = (await loadEnvelopesFresh()).map((e) => e.article);
  const items = [...NEWS, ...dyn]
    .filter((a) => a.lang === "en")
    .map((a) => ({ url: a.source.url, title: a.title, published: a.published, tags: a.tags }))
    .sort((x, y) => y.published.localeCompare(x.published))
    .slice(0, 300);
  return NextResponse.json({ ok: true, items });
}
