// lib/a1/session.ts
//
// Phase 5a (PLAN.md §6.6/§6.2): the first per-visitor session, sitting
// next to (not inside) lib/a1/auth.ts's service-account singleton. That
// singleton exists once per warm instance and speaks for the "web
// reader" service account; a signed-in visitor's tokens are per-request
// and per-browser, so they cannot live in the same module-level cache —
// they live in this visitor's own cookies instead.
//
// Two cookies, deliberately split by trust level:
//   - SESSION_COOKIE  (httpOnly): the actual accessToken/refreshToken.
//     Never readable from client JS. Read only in Route Handlers/Server
//     Components that have already opted into dynamic rendering — never
//     from the root layout or the public feed/detail pages (PLAN.md §6.2
//     "only the new sign-in/profile/post-editor pages become dynamic").
//   - DISPLAY_COOKIE  (plain): just the email the visitor signed in
//     with, nothing else. Exists ONLY so components/site-nav.tsx (a
//     client component mounted on every page, including the ISR'd feed)
//     can show "signed in as X" without ever calling cookies()/headers()
//     server-side — reading it is a client-side document.cookie lookup,
//     same trick middleware.ts's a1_geo cookie and the theme/lang
//     anti-flash scripts in app/layout.tsx already use. NEVER trust this
//     cookie for authorization — it is a display hint, not a credential.
//
// Deliberately unsigned/unencrypted for this phase: the only thing a
// visitor could do by editing their own SESSION_COOKIE is corrupt their
// own login (the real access/refresh tokens are validated by the A1 API
// itself on every call, same as the app) — there is no cross-user risk
// to sign against. Revisit if a later phase adds anything session-cookie
// derived that must NOT be visitor-editable.

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "a1_session";
export const DISPLAY_COOKIE = "a1_user";

// 60 days: no stated backend policy for how long a refreshToken stays
// valid (not in PLAN.md §6.1's ground-truth table) — picked as a
// reasonable, adjustable default. If auth.refreshToken ever rejects a
// stale refresh token, the visitor just lands back on /sign-in; nothing
// else in this codebase assumes the cookie is still good.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

export type SessionState = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  // unix milliseconds, or null when the endpoint that created this
  // session didn't return one (users.createUser's documented response
  // shape, PLAN.md §6.1, has no expiresAt field — unlike auth.email).
  // No authenticated call is made yet in Phase 5a, so this is stored for
  // a later phase's refresh-before-expiry logic, not used here.
  expiresAt: number | null;
};

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  maxAge: MAX_AGE_SECONDS,
};

/** Set both cookies on an outgoing response after a successful sign-in/up. */
export function setSession(response: NextResponse, state: SessionState): void {
  response.cookies.set(SESSION_COOKIE, JSON.stringify(state), {
    ...COOKIE_OPTS,
    httpOnly: true,
  });
  response.cookies.set(DISPLAY_COOKIE, state.email, {
    ...COOKIE_OPTS,
    httpOnly: false,
  });
}

/** Clear both cookies (sign-out). */
export function clearSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, httpOnly: true, maxAge: 0 });
  response.cookies.set(DISPLAY_COOKIE, "", { ...COOKIE_OPTS, httpOnly: false, maxAge: 0 });
}

/**
 * Server-only read of the real session — for Route Handlers or a future
 * dynamic page (profile/post editor, Phase 6/7). Do NOT call this from
 * the root layout or any page that must stay ISR (PLAN.md §6.2) — calling
 * next/headers' cookies() forces the calling route into dynamic
 * rendering. components/site-nav.tsx must keep using the client-side
 * DISPLAY_COOKIE read instead, precisely to avoid this.
 */
export async function readSession(): Promise<SessionState | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.email) return null;
    return {
      userId: parsed.userId ?? "",
      email: parsed.email,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}
