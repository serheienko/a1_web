// lib/a1/auth.ts
//
// Bridges the service account: logs in as a dedicated "web reader" A1
// account, caches the tokens for this warm serverless instance, and
// refreshes them before they expire or on a 401. See PLAN.md §2.1.
//
// Kept behind the Authorizer interface so swapping to a real public/
// anonymous read endpoint later (PLAN.md OPEN QUESTIONS #9) is a one-file
// change — see `authorizer` at the bottom.

import { env } from "./config";
import { call } from "./client";

export interface Authorizer {
  /** Headers to attach to an authenticated request. */
  headers(): Promise<Record<string, string>>;
  /** Drop any cached token — call after a 401. */
  invalidate(): void;
}

type TokenState = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix milliseconds
};

// Raw shape of auth.email / auth.refreshToken responses. Deliberately not
// in lib/a1/schemas.ts — a login response never reaches the UI, so it does
// not need to be part of the shared, Zod-validated API surface.
type AuthResponse = {
  userId: string;
  expiresAt: number; // unix SECONDS, per PLAN.md §0.3
  accessToken: string;
  refreshToken: string;
};

// Module-level singleton — survives across requests within one warm
// instance. A cold start pays for one extra login. No cross-instance cache
// (e.g. Upstash) yet; PLAN.md §2.2 flags this as acceptable for Phase 0/MVP.
let cached: TokenState | null = null;
let inFlight: Promise<TokenState> | null = null;

const REFRESH_SKEW_MS = 60_000; // refresh 60s ahead of actual expiry

function toTokenState(res: AuthResponse): TokenState {
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresAt: res.expiresAt * 1000,
  };
}

async function login(): Promise<TokenState> {
  const res = await call<AuthResponse>(
    "auth.email",
    { email: env.A1_SERVICE_EMAIL, password: env.A1_SERVICE_PASSWORD },
    { skipAuth: true },
  );
  return toTokenState(res);
}

async function refresh(refreshToken: string): Promise<TokenState> {
  try {
    const res = await call<AuthResponse>(
      "auth.refreshToken",
      { refreshToken },
      { skipAuth: true },
    );
    return toTokenState(res);
  } catch (err) {
    // The refresh token itself may be stale or revoked — fall back to a
    // full login rather than surfacing this as a request failure.
    console.error("[lib/a1/auth] refresh failed, falling back to full login:", err);
    return login();
  }
}

async function getTokenState(): Promise<TokenState> {
  if (cached && cached.expiresAt - REFRESH_SKEW_MS > Date.now()) {
    return cached;
  }

  // Coalesce concurrent callers into a single login/refresh instead of a
  // stampede of parallel logins on a cold instance.
  if (!inFlight) {
    const next = cached ? refresh(cached.refreshToken) : login();
    inFlight = next
      .then((state) => {
        cached = state;
        return state;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

class ServiceAccountAuthorizer implements Authorizer {
  async headers(): Promise<Record<string, string>> {
    const { accessToken } = await getTokenState();
    return { authorization: `Bearer ${accessToken}` };
  }

  invalidate(): void {
    cached = null;
  }
}

class NoAuthAuthorizer implements Authorizer {
  async headers(): Promise<Record<string, string>> {
    return {};
  }
  invalidate(): void {
    // nothing cached
  }
}

/**
 * Set A1_PUBLIC_MODE=true once the backend ships a public/anonymous read
 * endpoint (OPEN QUESTIONS #9) — the service-account bridge then drops out
 * of the request path without any other file changing.
 */
export const authorizer: Authorizer =
  process.env.A1_PUBLIC_MODE === "true" ? new NoAuthAuthorizer() : new ServiceAccountAuthorizer();
