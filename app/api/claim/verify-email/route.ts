// app/api/claim/verify-email/route.ts
//
// 2026-09-11: step two of a company account claim (backend spec:
// docs/superpowers/specs/2026-09-11-company-account-claim-design.md in
// aone-api-private). The claim link's key+code go to `auth.claimVerifyEmail`
// together with the address the company typed; the backend checks the link,
// checks the address is free, and emails a short code to it.
//
// The claim link is never consumed here — a typo in the address must not
// destroy the only link the company has — so this route is safe to retry.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";

const Input = z.object({
  key: z.string().trim().min(1),
  code: z.string().trim().min(1),
  email: z.string().trim().email(),
});

type ClaimVerifyEmailResponse = { key: string; codeLength: number; expiresAt: number };

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const { key, code, email } = parsed.data;

  try {
    const data = await call<ClaimVerifyEmailResponse>(
      "auth.claimVerifyEmail",
      { claim: { key, code }, email },
      { skipAuth: true },
    );

    return NextResponse.json({ ok: true, otpKey: data.key, codeLength: data.codeLength });
  } catch (err) {
    const reason = reasonFromError(err);
    if (err instanceof A1ApiError) {
      console.error("[api/claim/verify-email] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/claim/verify-email] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status: reason === "unknown" ? 500 : 409 });
  }
}
