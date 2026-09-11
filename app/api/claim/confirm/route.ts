// app/api/claim/confirm/route.ts
//
// 2026-09-11: final step of a company account claim. The short code from the
// email plus a password of the company's choosing go to `auth.claimConfirm`;
// the backend moves the account onto the verified address and answers with a
// session, which this route stores in the visitor's cookies exactly the way
// app/api/auth/sign-in does. The company therefore lands inside its own
// profile instead of on a login screen it has no reason to trust yet.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";

const Input = z.object({
  otpKey: z.string().trim().min(1),
  code: z.string().trim().min(1),
  // Only used for the display cookie — the backend takes the address from the
  // one-time code it just consumed, never from the browser.
  email: z.string().trim().email(),
  password: z.string().min(8),
});

type ClaimConfirmResponse = {
  userId: string;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
};

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const { otpKey, code, email, password } = parsed.data;

  try {
    const data = await call<ClaimConfirmResponse>(
      "auth.claimConfirm",
      { otp: { key: otpKey, code }, newPassword: password },
      { skipAuth: true },
    );

    const response = NextResponse.json({ ok: true });
    setSession(response, {
      userId: data.userId,
      email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt * 1000,
    });
    return response;
  } catch (err) {
    const known = reasonFromError(err);
    // A wrong or expired short code is the everyday failure here and the
    // backend has no dedicated code for it, so anything unrecognised at this
    // step reads as "wrong code" rather than a scary generic error.
    const reason = known === "unknown" ? "wrong_code" : known;
    if (err instanceof A1ApiError) {
      console.error("[api/claim/confirm] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/claim/confirm] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status: 409 });
  }
}
