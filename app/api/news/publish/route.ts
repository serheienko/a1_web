// app/api/news/publish/route.ts
//
// 09.10.2026: сюда агент «Редакція A1» (konkistador/konk_news.py) сдаёт готовую
// новость сразу в двух языках (uk + en). Ворота: секрет, размер, схема
// (lib/news/schema.ts), согласованность пары, дата, и защита от дублей
// (тот же источник или тот же slug -- 409). Сохраняем в Blob, сбрасываем кэш.
// Время показа -- publishAt: позже «сейчас» -- новость ждёт своего часа.

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { NEWS } from "@/lib/news/articles";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { loadEnvelopesFresh, saveEnvelope } from "@/lib/news/dynamic-store";
import { checkPair, publishSchema, toArticle } from "@/lib/news/schema";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function POST(req: Request) {
  const auth = checkNewsSecret(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.status === 503 ? "not configured" : "forbidden" }, { status: auth.status });

  const raw = await req.text();
  if (raw.length > 120_000) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const parsed = publishSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: "bad body", where: issue ? issue.path.join(".") : "", why: issue?.message ?? "" }, { status: 400 });
  }
  const body = parsed.data;
  const pairErr = checkPair(body);
  if (pairErr) return NextResponse.json({ ok: false, error: "bad pair", where: pairErr }, { status: 400 });

  const now = Date.now();
  const publishAt = new Date(body.publishAt).getTime();
  if (publishAt < now - DAY || publishAt > now + 2 * DAY) {
    return NextResponse.json({ ok: false, error: "publishAt out of range" }, { status: 400 });
  }
  const pub = new Date(body.uk.published + "T12:00:00Z").getTime();
  if (Math.abs(pub - now) > 2 * DAY) return NextResponse.json({ ok: false, error: "published date out of range" }, { status: 400 });

  const existing = await loadEnvelopesFresh();
  const slugs = new Set([...NEWS.map((a) => a.slug), ...existing.map((e) => e.article.slug)]);
  const sources = new Set([...NEWS.map((a) => a.source.url), ...existing.map((e) => e.article.source.url)]);
  if (slugs.has(body.uk.slug) || slugs.has(body.en.slug) || sources.has(body.uk.source.url)) {
    return NextResponse.json({ ok: false, error: "duplicate" }, { status: 409 });
  }

  const okUk = await saveEnvelope({ v: 1, publishAt: body.publishAt, article: toArticle(body.uk) });
  const okEn = okUk && (await saveEnvelope({ v: 1, publishAt: body.publishAt, article: toArticle(body.en) }));
  if (!okUk || !okEn) return NextResponse.json({ ok: false, error: "storage" }, { status: 502 });

  revalidateTag("news");
  revalidatePath("/news");
  revalidatePath("/news/en");
  return NextResponse.json({ ok: true, uk: body.uk.slug, en: body.en.slug, publishAt: body.publishAt });
}
