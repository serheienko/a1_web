// app/api/github/verify/begin/route.ts
//
// 18.10.2026: «Підтвердити через GitHub» на сайте, шаг 1. Вошедший пользователь просит у бэкенда
// одноразовое состояние (account.githubStart) и получает адрес /api/github/verify/start?state=...,
// куда браузер и уходит. Приложение делает то же само: зовёт account.githubStart и открывает
// этот же адрес в браузере.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { clearSession, setSession } from "@/lib/a1/session";
import { clientIp, tooManyRequests } from "@/lib/github/rate-limit";
import { isWellFormedOAuthState } from "@/lib/github/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (tooManyRequests("begin", clientIp(request), 20, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, reason: "busy" }, { status: 429 });
  }
  try {
    const { data, refreshedSession } = await callAsVisitor<{ state?: unknown }>("account.githubStart", {});
    if (!isWellFormedOAuthState(data?.state)) {
      return NextResponse.json({ ok: false, reason: "error" }, { status: 502 });
    }
    const response = NextResponse.json({ ok: true, url: `/api/github/verify/start?state=${encodeURIComponent(data.state)}` });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, reason: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const busy = err instanceof A1ApiError && err.httpStatus === 429;
    return NextResponse.json({ ok: false, reason: busy ? "busy" : "error" }, { status: busy ? 429 : 502 });
  }
}
