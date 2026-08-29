// app/api/account/verify-email-confirm/route.ts
//
// Phase 6 (PLAN.md §6.15): submits the code the visitor typed. Confirmed
// shape (2026-08-29): body is { key, code } (OtpInput — both required),
// response is a bare `true` on success. No documented error schema for a
// wrong/expired code (PLAN.md §0's ground truth: 400/401/500 have none),
// so this just surfaces a generic "wrong code" failure — the code-entry
// page's own copy carries the message, same pattern as sign-in/sign-up.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const ConfirmInput = z.object({
  key: z.string().min(1),
  code: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = ConfirmInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { refreshedSession } = await callAsVisitor<boolean>(
      "account.verifyEmailConfirm",
      parsed.data,
    );
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      // The visitor's session cookie is unusable (never existed, or its
      // refresh token was itself rejected by the backend — see
      // lib/a1/visitor-call.ts's callAsVisitor for when that happens) —
      // clear it so a stale cookie does not keep silently failing every
      // later call instead of sending the visitor back to /sign-in.
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/verify-email-confirm] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/verify-email-confirm] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "confirm_failed", detail }, { status: 400 });
  }
}
