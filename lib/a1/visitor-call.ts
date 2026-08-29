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

    const refreshed = await call<AuthRefreshResponse>(
      "auth.refreshToken",
      { refreshToken: session.refreshToken },
      { skipAuth: true },
    );
    const nextSession: SessionState = {
      userId: refreshed.userId || session.userId,
      email: session.email,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt * 1000,
    };
    const data = await call<T>(method, body, { accessToken: nextSession.accessToken });
    return { data, refreshedSession: nextSession };
  }
}
