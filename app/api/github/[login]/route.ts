// app/api/github/[login]/route.ts
//
// 18.10.2026: данные для плитки GitHub в профиле (components/github-tile.tsx) и для приложения
// (https://jobs.a1appp.com/api/github/<login>). Ответ -- GithubSummary из lib/github/core.ts.
// Публичные данные GitHub, вход не нужен. Кеш на сутки -- lib/github/fetch.ts.
import { NextResponse } from "next/server";
import { isValidGithubLogin } from "@/lib/github/core";
import { getGithubSummary } from "@/lib/github/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "cache-control": "public, s-maxage=86400, stale-while-revalidate=86400",
  "access-control-allow-origin": "*",
};

export async function GET(_req: Request, ctx: { params: Promise<{ login: string }> }) {
  const { login: raw } = await ctx.params;
  let login = "";
  try {
    login = decodeURIComponent(raw ?? "").trim();
  } catch {
    login = "";
  }
  if (!isValidGithubLogin(login)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CACHE_HEADERS });
  }
  try {
    const r = await getGithubSummary(login);
    if (r.status === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: CACHE_HEADERS });
    }
    return NextResponse.json(r.data, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
