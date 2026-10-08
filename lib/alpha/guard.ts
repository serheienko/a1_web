// lib/alpha/guard.ts -- who may use Alpha (test environment, 2026-10-07).
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/a1/session-constants";
import { call } from "@/lib/a1/client";

export const PREMIUM_TEST_COOKIE = "a1_premium_test";

/** Alpha lives only on the test copy of the site for now. */
export function alphaEnabled(): boolean {
  return process.env.PREMIUM_PREVIEW === "1";
}

/** 08.10.2026: the mobile app calls Alpha with its own A1 access token in
 *  `x-a1-token` (the `authorization` header is taken by the test site's
 *  Basic Auth). */
export function appToken(req: NextRequest): string | null {
  const t = req.headers.get("x-a1-token")?.trim();
  return t && t.length > 10 ? t : null;
}

export function isSignedIn(req: NextRequest): boolean {
  return Boolean(req.cookies.get(SESSION_COOKIE)?.value) || appToken(req) != null;
}

type Me = { emojiStatus?: { object?: string; until?: number } | null };
const memberCache = new Map<string, { at: number; member: boolean }>();

/** Real Alpha membership of the app user: the server returns an
 *  `emoji-status-until` emoji status only while the membership is active. */
async function isAlphaMember(token: string): Promise<boolean> {
  const hit = memberCache.get(token);
  // A fresh purchase must show up quickly: "no" is cached for 10 s only.
  if (hit && Date.now() - hit.at < (hit.member ? 60_000 : 10_000)) return hit.member;
  let member = false;
  try {
    const me = await call<Me>("users.getMe", {}, { accessToken: token, timeoutMs: 6000 });
    const st = me?.emojiStatus;
    member = st?.object === "emoji-status-until" && typeof st.until === "number" && st.until * 1000 > Date.now();
  } catch {
    member = false;
  }
  memberCache.set(token, { at: Date.now(), member });
  if (memberCache.size > 500) memberCache.delete(memberCache.keys().next().value as string);
  return member;
}

/** Until payments exist: a test switch on the preview page grants Premium. */
export async function hasPremium(req: NextRequest): Promise<boolean> {
  if (!alphaEnabled()) return false;
  if (req.cookies.get(PREMIUM_TEST_COOKIE)?.value === "1") return true;
  const token = appToken(req);
  return token ? isAlphaMember(token) : false;
}
