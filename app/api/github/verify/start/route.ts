// app/api/github/verify/start/route.ts
//
// 18.10.2026: шаг 2. Браузер (сайта или системный браузер из приложения) приходит сюда с
// одноразовым state. Кладём его в httpOnly-куку -- так возврат из GitHub привяжется к тому же
// браузеру -- и отправляем на страницу разрешения GitHub. Ничего секретного здесь нет.
import { NextRequest, NextResponse } from "next/server";
import { clientIp, tooManyRequests } from "@/lib/github/rate-limit";
import {
  GITHUB_CLIENT_ID_DEFAULT,
  GITHUB_STATE_COOKIE,
  GITHUB_STATE_MAX_AGE,
  githubAuthorizeUrl,
  isWellFormedOAuthState,
} from "@/lib/github/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toResult(status: string) {
  return new NextResponse(null, { status: 302, headers: { location: `/github-verify?status=${status}`, "cache-control": "no-store" } });
}

export async function GET(request: NextRequest) {
  if (tooManyRequests("start", clientIp(request), 30, 60 * 60 * 1000)) return toResult("busy");
  const state = request.nextUrl.searchParams.get("state");
  if (!isWellFormedOAuthState(state)) return toResult("expired");

  const clientId = process.env.GITHUB_CLIENT_ID?.trim() || GITHUB_CLIENT_ID_DEFAULT;
  const response = NextResponse.redirect(githubAuthorizeUrl(clientId, state), { status: 302 });
  response.headers.set("cache-control", "no-store");
  response.cookies.set(GITHUB_STATE_COOKIE, state, {
    path: "/api/github",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: GITHUB_STATE_MAX_AGE,
  });
  return response;
}
