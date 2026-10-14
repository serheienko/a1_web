// app/api/shtab/scout/route.ts
//
// 14.10.2026: сюда раз в неделю Разведчик (konkistador/konk_scout.py) присылает отчёт по конкурентам.
// Ворота как у Редакции: секрет x-news-secret (env NEWS_SECRET), размер, проверка полей.
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { saveScoutReport } from "@/lib/a1/scout-store";

export const dynamic = "force-dynamic";

const Idea = z.object({
  who: z.string().max(80),
  what: z.string().min(1).max(400),
  why: z.string().min(1).max(500),
  how: z.string().max(400),
  effort: z.enum(["легко", "средне", "сложно"]),
  url: z.string().max(600),
  source: z.string().max(80),
});

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string().max(40),
  ideas: z.array(Idea).max(8),
  market: z.string().max(500),
  scanned: z.object({
    apps: z.number().int().min(0).max(10_000),
    feeds: z.number().int().min(0).max(10_000),
    hn: z.number().int().min(0).max(10_000),
    items: z.number().int().min(0).max(10_000),
  }),
  errors: z.array(z.string().max(300)).max(20),
});

export async function POST(req: Request) {
  const auth = checkNewsSecret(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: "forbidden" }, { status: auth.status });

  const raw = await req.text();
  if (raw.length > 40_000) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });

  // Ссылки -- только http(s): их рисует штаб.
  const ideas = parsed.data.ideas.map((i) => ({ ...i, url: /^https?:\/\//.test(i.url) ? i.url : "" }));
  const saved = await saveScoutReport({ ...parsed.data, ideas });
  return NextResponse.json({ ok: saved }, { status: saved ? 200 : 502 });
}
