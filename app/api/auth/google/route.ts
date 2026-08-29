// app/api/auth/google/route.ts
//
// Phase 5b (PLAN.md §6.6/§6.11): Google sign-in. Fully unblocked — §6.11
// established that the backend's auth.google already accepts this
// project's Web client id (Andrew: "already added, Nijat asked for it
// for Android"), so this is the one piece of Stage 2's OAuth work that
// does not need to wait for a backend change.
//
// Same shape as app/api/auth/sign-in/route.ts: exchange a token for a
// session and set the two cookies. The only difference is which token —
// here it's the Google ID token (a JWT) the client already obtained via
// Google Identity Services (components/google-sign-in-button.tsx), not
// an email/password pair.
//
// decodeEmailFromJwt moved to lib/a1/decode-jwt-email.ts, 2026-08-29
// (PLAN.md §6.16) — app/api/auth/apple/route.ts needs the exact same
// logic and it was previously only defined here.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";
import { decodeEmailFromJwt } from "@/lib/a1/decode-jwt-email";

export const runtime = "nodejs";

const GoogleSignInInput = z.object({
  // The raw JWT string from Google Identity Services' CredentialResponse
  // .credential (verified against Google's own JS reference, 2026-08-28)
  // — passed straight through, never decoded/verified here. auth.google
  // (PLAN.md §6.1) is the one place that validates it.
  token: z.string().min(1),
});

// PLAN.md §6.1: "same shape as auth.email".
type AuthGoogleResponse = {
  userId: string;
  expiresAt: number; // unix seconds
  accessToken: string;
  refreshToken: string;
};

export async function POST(request: NextRequest) {
  const parsed = GoogleSignInInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const data = await call<AuthGoogleResponse>(
      "auth.google",
      { token: parsed.data.token },
      { skipAuth: true },
    );

    // auth.google's response has no email field (PLAN.md §6.1) — decode
    // it from the same JWT we just sent, rather than adding a second
    // round trip to fetch the profile. This is a display-only read (the
    // JWT is not re-verified here, same trust boundary as passing it to
    // auth.google above); it only feeds the non-httpOnly display cookie.
    const email = decodeEmailFromJwt(parsed.data.token) ?? "";

    const response = NextResponse.json({ ok: true, email });
    setSession(response, {
      userId: data.userId,
      email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt * 1000,
    });
    return response;
  } catch (err) {
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/auth/google] auth.google failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/auth/google] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "sign_in_failed", detail }, { status: 401 });
  }
}
