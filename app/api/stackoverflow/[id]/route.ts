// app/api/stackoverflow/[id]/route.ts
//
// 18.10.2026: данные для плитки Stack Overflow в профиле (components/stackoverflow-tile.tsx) и для
// приложения (https://jobs.a1appp.com/api/stackoverflow/<id>). Ответ -- StackoverflowSummary из
// lib/stackoverflow/core.ts. Публичные данные, вход не нужен. Кеш на сутки -- lib/stackoverflow/fetch.ts.
import { NextResponse } from "next/server";
import { isValidStackoverflowId } from "@/lib/stackoverflow/core";
import { getStackoverflowSummary } from "@/lib/stackoverflow/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "cache-control": "public, s-maxage=86400, stale-while-revalidate=86400",
  "access-control-allow-origin": "*",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = (raw ?? "").trim();
  if (!isValidStackoverflowId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CACHE_HEADERS });
  }
  try {
    const r = await getStackoverflowSummary(Number(id));
    if (r.status === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: CACHE_HEADERS });
    }
    return NextResponse.json(r.data, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
