// app/api/auth/apple/route.ts
//
// Phase 5b-Apple (PLAN.md §6.6/§6.16): Sign in with Apple. Same shape as
// app/api/auth/google/route.ts and app/api/auth/sign-in/route.ts —
// exchange a token for a session and set the two cookies. Here the
// token is Apple's identity token (a JWT), obtained client-side via
// Apple's own "Sign in with Apple JS" (components/apple-sign-in-
// button.tsx), never Firebase Auth.
//
// Unblocked 2026-08-29: Aleksandr confirmed Andrew is no longer being
// waited on — the Apple Services ID (com.aone.aoneapp.web, PLAN.md
// §6.10) has been added to auth.appleId's accepted audience list, the
// same way Google's web client id already was (§6.11). See PLAN.md
// §6.16 for the redirect-URI caveat this route's companion button
// carries — a real console setting Aleksandr still needs to update.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";
import { decodeEmailFromJwt } from "@/lib/a1/decode-jwt-email";

export const runtime = "nodejs";

const AppleSignInInput = z.object({
  // The raw JWT string from Apple's AppleIDAuthorization.id_token
  // (Sign in with Apple JS) — passed straight through, never decoded/
  // verified here. auth.appleId (PLAN.md §6.1) is the one place that
  // validates it, same trust boundary as the Google route.
  token: z.string().min(1),
});

// PLAN.md §6.1: "same as [auth.google]" — userId/expiresAt/accessToken/
// refreshToken, unix-seconds expiry.
type AuthAppleResponse = {
  userId: string;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
};

export async function POST(request: NextRequest) {
  const parsed = AppleSignInInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const data = await call<AuthAppleResponse>(
      "auth.appleId",
      { token: parsed.data.token },
      { skipAuth: true },
    );

    // Same display-only caveat as the Google route: auth.appleId's
    // response has no email field, so read it out of the same ID token
    // already sent — only present when the `email` scope was granted
    // (components/apple-sign-in-button.tsx requests it), and Apple
    // omits it entirely on a returning sign-in where the user already
    // decided what to share on their first authorization — the display
    // cookie just falls back to an empty string in that case, same as
    // any other field this phase treats as best-effort.
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
      console.error("[api/auth/apple] auth.appleId failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/auth/apple] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "sign_in_failed", detail }, { status: 401 });
  }
}
