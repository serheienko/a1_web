// lib/a1/visitor-call.ts
//
// Shared "call the A1 API as the signed-in visitor, refresh once on 401"
// helper for the onboarding routes (account.updateProfile,
// account.verifyEmail, account.verifyEmailConfirm — PLAN.md §6.15). All
// three need the same accessToken-then-refresh dance lib/a1/client.ts's
// own doc comment says is each accessToken caller's responsibility, so it
// lives here once instead of being copy-pasted into every route.
//
// Returns the refreshed session (if a refresh happened) instead of
// writing cookies itself — callers build their own NextResponse with the
// real JSON body first, then call setSession() on it, since a
// NextResponse's body can't be swapped after construction.

import { call, A1ApiError } from "./client";
import { readSession, type SessionState } from "./session";

export class NoSessionError extends Error {
  constructor() {
    super("no visitor session");
    this.name = "NoSessionError";
  }
}

// PLAN.md §0's auth.refreshToken response shape.
type AuthRefreshResponse = {
  userId: string;
  expiresAt: number; // unix seconds
  accessToken: string;
  refreshToken: string;
};

// 2026-08-29: coalesces concurrent refreshes of the SAME refresh token —
// mirrors lib/a1/auth.ts's own `inFlight` de-dup for the service account
// (that module's comment literally says "coalesce concurrent callers
// into a single login/refresh instead of a stampede"), applied here
// per-visitor instead of as a single global, since many different
// visitors' sessions can be in flight on one warm instance at once.
//
// Without this: two authenticated calls that both land on an expired
// access token around the same moment (e.g. a photo upload firing
// alongside a draft autosave, or two browser tabs open on the same
// account) each read the SAME not-yet-updated refreshToken from their
// request's cookie and each try to refresh with it. If the backend's
// refresh token is single-use/rotating, only the first actually
// succeeds — every other concurrent attempt gets rejected, and the
// backend reports that identically to a genuinely revoked token
// ("TOKEN_VALIDATION_ERROR" / "Token revoked."), with no way to tell a
// lost race from an actually-dead session from the error alone. This
// makes only the first caller for a given refreshToken value actually
// call auth.refreshToken; every other concurrent caller awaits that same
// promise and reuses its result instead of racing it.
const inFlightRefreshes = new Map<string, Promise<AuthRefreshResponse>>();

function refreshOnce(refreshToken: string): Promise<AuthRefreshResponse> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;
  const promise = call<AuthRefreshResponse>(
    "auth.refreshToken",
    { refreshToken },
    { skipAuth: true },
  ).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });
  inFlightRefreshes.set(refreshToken, promise);
  return promise;
}

export async function callAsVisitor<T>(
  method: string,
  body: unknown = {},
): Promise<{ data: T; refreshedSession: SessionState | null }> {
  const session = await readSession();
  if (!session) throw new NoSessionError();

  try {
    const data = await call<T>(method, body, { accessToken: session.accessToken });
    return { data, refreshedSession: null };
  } catch (err) {
    if (!(err instanceof A1ApiError) || err.httpStatus !== 401) throw err;

    // 2026-08-29 round 5: the coalescing fix above didn't stop a live
    // recurrence of "Token revoked" that involved no concurrent request
    // at all, which the race theory can't explain. Log how old the
    // access token actually was (against what auth.refreshToken itself
    // told us its expiresAt was) so the NEXT occurrence tells us whether
    // this is a normal expiry we should refresh earlier, or a token
    // that's revoked well before its stated expiry (which would point
    // at something external — e.g. a login elsewhere — instead).
    console.warn("[visitor-call] 401 on", method, {
      tokenAgeMs: session.expiresAt !== null ? Date.now() - session.expiresAt : null,
      expiresAt: session.expiresAt,
    });

    // 2026-08-29: live 401s turned out to come in two shapes that both
    // need different handling — an ordinary expired access token
    // (refreshable) and a genuinely revoked/invalid refresh token
    // (Vercel logs: "TOKEN_VALIDATION_ERROR" / "Token revoked.", seen on
    // both posts.createPost and upload.create). The second kind can
    // never succeed no matter how many times it's retried, so
    // auth.refreshToken itself throwing 401 here — or the retried call
    // still 401ing with a "fresh" token — both now become NoSessionError
    // instead of an opaque 502, so callers fall into their existing
    // not_signed_in handling (clear the cookie, send the visitor back to
    // /sign-in) rather than surfacing "something went wrong" for a
    // problem no amount of retrying fixes.
    let refreshed: AuthRefreshResponse;
    try {
      refreshed = await refreshOnce(session.refreshToken);
    } catch (refreshErr) {
      if (refreshErr instanceof A1ApiError && refreshErr.httpStatus === 401) throw new NoSessionError();
      throw refreshErr;
    }
    const nextSession: SessionState = {
      userId: refreshed.userId || session.userId,
      email: session.email,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt * 1000,
    };
    try {
      const data = await call<T>(method, body, { accessToken: nextSession.accessToken });
      return { data, refreshedSession: nextSession };
    } catch (retryErr) {
      if (retryErr instanceof A1ApiError && retryErr.httpStatus === 401) throw new NoSessionError();
      throw retryErr;
    }
  }
}
