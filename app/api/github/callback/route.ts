// app/api/github/callback/route.ts
//
// 18.10.2026: шаг 3. GitHub возвращает человека сюда (адрес записан в OAuth-приложении GitHub
// именно таким: https://jobs.a1appp.com/api/github/callback). Сайт НИЧЕГО не обменивает сам и
// секрета не знает: проверяет, что возврат пришёл в тот же браузер, что начал вход (кука), и
// передаёт code + state бэкенду (account.githubComplete). Бэкенд обменивает код, читает логин,
// выбрасывает токен и записывает «подтверждён» на пользователя, которому принадлежит state.
// Здесь вход на сайте не нужен: в приложении системный браузер не знает сессии сайта.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { A1ApiError, call } from "@/lib/a1/client";
import { clientIp, tooManyRequests } from "@/lib/github/rate-limit";
import {
  GITHUB_STATE_COOKIE,
  isWellFormedOAuthState,
  statusFromBackendError,
  type VerifyStatus,
} from "@/lib/github/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function done(status: VerifyStatus) {
  const response = new NextResponse(null, {
    status: 302,
    headers: { location: `/github-verify?status=${status}`, "cache-control": "no-store" },
  });
  // Состояние одноразовое -- кука больше не нужна, что бы ни случилось.
  response.cookies.set(GITHUB_STATE_COOKIE, "", { path: "/api/github", httpOnly: true, secure: true, sameSite: "lax", maxAge: 0 });
  return response;
}

function sameValue(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: NextRequest) {
  if (tooManyRequests("callback", clientIp(request), 30, 10 * 60 * 1000)) return done("busy");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done("denied");

  const state = params.get("state");
  const code = params.get("code");
  if (!isWellFormedOAuthState(state) || !code || code.length > 200) return done("expired");

  // CSRF: возврат принимаем только в браузере, который начал вход.
  const cookie = request.cookies.get(GITHUB_STATE_COOKIE)?.value;
  if (!cookie || !sameValue(cookie, state)) return done("expired");

  try {
    await call("account.githubComplete", { code, state }, { skipAuth: true });
    return done("ok");
  } catch (err) {
    if (err instanceof A1ApiError) return done(statusFromBackendError(err.httpStatus, err.body));
    return done("error");
  }
}
