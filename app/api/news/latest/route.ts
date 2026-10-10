// app/api/news/latest/route.ts -- самая свежая новость (uk и en) для превью «IT новини» в меню «три точки».
// Публичный: отдаём только заголовок, теги и slug -- то, что и так видно на /news.
import { NextResponse } from "next/server";
import { newsByLang } from "@/lib/news/articles";
import { allNews } from "@/lib/news/registry";
import type { NewsArticle } from "@/lib/news/types";

export const runtime = "nodejs";

export type LatestNews = { slug: string; title: string; tags: string[] };

function pick(a: NewsArticle | undefined): LatestNews | null {
  if (!a) return null;
  return { slug: a.slug, title: a.h1 || a.title, tags: (a.tags ?? []).slice(0, 3) };
}

export async function GET() {
  const pool = await allNews();
  const body = { ok: true, uk: pick(newsByLang("uk", pool)[0]), en: pick(newsByLang("en", pool)[0]) };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
