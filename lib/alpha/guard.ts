// lib/alpha/guard.ts -- who may use Alpha (test environment, 2026-10-07).
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/a1/session-constants";

export const PREMIUM_TEST_COOKIE = "a1_premium_test";

/** Alpha lives only on the test copy of the site for now. */
export function alphaEnabled(): boolean {
  return process.env.PREMIUM_PREVIEW === "1";
}

export function isSignedIn(req: NextRequest): boolean {
  return Boolean(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Until payments exist: a test switch on the preview page grants Premium. */
export function hasPremium(req: NextRequest): boolean {
  return alphaEnabled() && req.cookies.get(PREMIUM_TEST_COOKIE)?.value === "1";
}
