// app/api/auth/sign-in/route.ts
//
// Phase 5a (PLAN.md §6.6): existing-account email+password sign-in via
// the public `auth.email` endpoint (PLAN.md §0/§6.1) — the same one
// lib/a1/auth.ts already uses for the service account, called here with
// a visitor's own credentials instead.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const SignInInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// PLAN.md §0's auth.email response shape.
type AuthEmailResponse = {
  userId: string;
  expiresAt: number; // unix seconds
  accessToken: string;
  refreshToken: string;
};

export async function POST(request: NextRequest) {
  const parsed = SignInInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const data = await call<AuthEmailResponse>(
      "auth.email",
      { email: input.email, password: input.password },
      { skipAuth: true },
    );

    const response = NextResponse.json({ ok: true, email: input.email });
    setSession(response, {
      userId: data.userId,
      email: input.email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt * 1000,
    });
    return response;
  } catch (err) {
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/auth/sign-in] auth.email failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/auth/sign-in] unexpected error:", err);
    }
    // auth.email failing is almost always "wrong email/password" — the
    // API gives no documented error schema to disambiguate (PLAN.md §0),
    // so this stays a single generic reason and lets the sign-in page's
    // own localized copy carry the message.
    return NextResponse.json({ ok: false, message: "sign_in_failed", detail }, { status: 401 });
  }
}
