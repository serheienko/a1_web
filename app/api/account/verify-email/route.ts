// app/api/account/verify-email/route.ts
//
// Phase 6 (PLAN.md §6.15): sends a fresh verification code to the
// signed-in visitor's own email. Confirmed shape (2026-08-29, pulled
// exact-text from the live openapi.json): no input params at all, just
// the visitor's bearer token — the API already knows whose email to use.
// Returns { key, codeLength, expiresAt } — `key` must be echoed back to
// verify-email-confirm, `codeLength` tells the UI how many digit boxes
// to render, `expiresAt` (unix seconds) drives the real resend countdown
// instead of a guessed duration.
//
// Called both on first mount of the code-entry step AND for "resend" —
// same endpoint, a fresh call just issues a new key/code pair.

import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";

export const runtime = "nodejs";

type VerifyEmailResponse = { key: string; codeLength: number; expiresAt: number };

export async function POST() {
  try {
    const { data, refreshedSession } = await callAsVisitor<VerifyEmailResponse>(
      "account.verifyEmail",
      {},
    );
    const response = NextResponse.json({
      ok: true,
      key: data.key,
      codeLength: data.codeLength,
      expiresAt: data.expiresAt,
    });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/verify-email] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/verify-email] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "send_failed", detail }, { status: 502 });
  }
}
