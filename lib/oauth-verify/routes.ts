// lib/oauth-verify/routes.ts
//
// 18.10.2026: обработчики «Підтвердити через Dribbble / Stack Overflow» -- те же четыре шага, что у
// GitHub (app/api/github/*), одним набором на оба сервиса:
//   begin    вошедший просит у бэкенда одноразовое состояние (account.<x>Start)
//   start    кука с состоянием + переход на страницу разрешения сервиса
//   callback сверка куки, code+state уходят бэкенду (account.<x>Complete); токена и секрета сайт не видит
//   status   свежий статус подтверждения владельца (страница профиля кешируется)
// Приложение использует тот же /verify/start и тот же callback.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { A1ApiError, call } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { clearSession, setSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";
import { clientIp, tooManyRequests } from "@/lib/github/rate-limit";
import { isWellFormedOAuthState } from "@/lib/github/verify";
import {
  dribbbleAuthorizeUrl,
  stackoverflowAuthorizeUrl,
  statusFromProviderError,
  type VerifyStatus,
} from "./status";

export type OAuthProvider = {
  /** Короткое имя: префикс адресов /api/<id>/..., страница /<id>-verify, бакеты заслона. */
  id: "dribbble" | "stackoverflow";
  startMethod: string;
  completeMethod: string;
  cookie: string;
  clientIdEnv: string;
  authorizeUrl: (clientId: string, state: string) => string;
};

export const DRIBBBLE: OAuthProvider = {
  id: "dribbble",
  startMethod: "account.dribbbleStart",
  completeMethod: "account.dribbbleComplete",
  cookie: "a1_dr_state",
  clientIdEnv: "DRIBBBLE_CLIENT_ID",
  authorizeUrl: dribbbleAuthorizeUrl,
};

export const STACKOVERFLOW: OAuthProvider = {
  id: "stackoverflow",
  startMethod: "account.stackoverflowStart",
  completeMethod: "account.stackoverflowComplete",
  cookie: "a1_so_state",
  clientIdEnv: "STACKEXCHANGE_CLIENT_ID",
  authorizeUrl: stackoverflowAuthorizeUrl,
};

const STATE_MAX_AGE = 600;

function resultRedirect(p: OAuthProvider, status: VerifyStatus, clearCookie: boolean) {
  const response = new NextResponse(null, {
    status: 302,
    headers: { location: `/${p.id}-verify?status=${status}`, "cache-control": "no-store" },
  });
  if (clearCookie) {
    response.cookies.set(p.cookie, "", { path: `/api/${p.id}`, httpOnly: true, secure: true, sameSite: "lax", maxAge: 0 });
  }
  return response;
}

function sameValue(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function makeBegin(p: OAuthProvider) {
  return async function POST(request: Request) {
    if (tooManyRequests(`${p.id}-begin`, clientIp(request), 20, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, reason: "busy" }, { status: 429 });
    }
    try {
      const { data, refreshedSession } = await callAsVisitor<{ state?: unknown }>(p.startMethod, {});
      if (!isWellFormedOAuthState(data?.state)) {
        return NextResponse.json({ ok: false, reason: "error" }, { status: 502 });
      }
      const response = NextResponse.json({ ok: true, url: `/api/${p.id}/verify/start?state=${encodeURIComponent(data.state)}` });
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
  };
}

export function makeStart(p: OAuthProvider) {
  return async function GET(request: NextRequest) {
    if (tooManyRequests(`${p.id}-start`, clientIp(request), 30, 60 * 60 * 1000)) return resultRedirect(p, "busy", false);
    const state = request.nextUrl.searchParams.get("state");
    if (!isWellFormedOAuthState(state)) return resultRedirect(p, "expired", false);

    // Публичный id OAuth-приложения (не секрет) -- в переменной сайта.
    const clientId = (process.env[p.clientIdEnv] ?? "").trim();
    if (!clientId) return resultRedirect(p, "error", false);

    const response = NextResponse.redirect(p.authorizeUrl(clientId, state), { status: 302 });
    response.headers.set("cache-control", "no-store");
    response.cookies.set(p.cookie, state, {
      path: `/api/${p.id}`,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: STATE_MAX_AGE,
    });
    return response;
  };
}

export function makeCallback(p: OAuthProvider) {
  return async function GET(request: NextRequest) {
    if (tooManyRequests(`${p.id}-callback`, clientIp(request), 30, 10 * 60 * 1000)) return resultRedirect(p, "busy", true);

    const params = request.nextUrl.searchParams;
    if (params.get("error")) return resultRedirect(p, "denied", true);

    const state = params.get("state");
    const code = params.get("code");
    if (!isWellFormedOAuthState(state) || !code || code.length > 300) return resultRedirect(p, "expired", true);

    // CSRF: возврат принимаем только в браузере, который начал вход.
    const cookie = request.cookies.get(p.cookie)?.value;
    if (!cookie || !sameValue(cookie, state)) return resultRedirect(p, "expired", true);

    try {
      await call(p.completeMethod, { code, state }, { skipAuth: true });
      return resultRedirect(p, "ok", true);
    } catch (err) {
      if (err instanceof A1ApiError) return resultRedirect(p, statusFromProviderError(err.httpStatus, err.body), true);
      return resultRedirect(p, "error", true);
    }
  };
}

/** Свежий подтверждённый статус текущего пользователя: pick берёт нужные поля из профиля. */
export function makeStatus(pick: (profile: NonNullable<ReturnType<typeof parseUserProfile>> & { object: "user" }) => Record<string, unknown>) {
  return async function GET() {
    try {
      const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
      const profile = parseUserProfile(data);
      const fields = profile?.object === "user" ? pick(profile) : {};
      const response = NextResponse.json({ ok: true, ...fields }, { headers: { "cache-control": "no-store" } });
      if (refreshedSession) setSession(response, refreshedSession);
      return response;
    } catch (err) {
      if (err instanceof NoSessionError) {
        const response = NextResponse.json({ ok: false }, { status: 401 });
        clearSession(response);
        return response;
      }
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  };
}
