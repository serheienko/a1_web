// app/api/admin/claim-link/route.ts
//
// 2026-09-11 (Aleksandr: "хочу увидеть функционал передачи акка в
// админке"). Server-side equivalent of "Claude outputs"/
// make_claim_link.py on his own machine: sign in AS the company's own
// technical account (lib/a1/admin-act-as.ts — the same auth.email hop
// every admin post edit already does), then call `auth.claimStart`,
// which mints the 24-character / 14-day link code (backend spec:
// docs/superpowers/specs/2026-09-11-company-account-claim-design.md in
// aone-api-private) and hand back the /claim/<key>/<code> URL to give
// the company.
//
// Deliberately a POST, not a GET: claimStart MINTS A NEW CODE every
// call, so this must never be something a crawler, a prefetch or a
// double-render can trigger. It is admin-gated the same "plain 404"
// way as every other /api/admin/* route here.
//
// The link is NOT emailed anywhere by this route (the backend never
// emails it either — see the spec: the link travels out-of-band, only
// the short 4-digit confirmation code is emailed later, to whatever
// address the company itself types on the claim page). Whoever holds
// this URL can take the account over, so it goes to the company through
// a channel we trust, by hand.
//
// ACCOUNT_ALREADY_CLAIMED (409) comes back for an account that is no
// longer flagged UNCLAIMED — i.e. somebody already went through the
// whole flow on it. Mapped to a reason string rather than surfaced raw,
// same lib/a1/claim-errors.ts whitelist the public claim routes use.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { getAdminActAsToken, UnknownAccountError } from "@/lib/a1/admin-act-as";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://jobs.a1appp.com";

const Input = z.object({
  email: z.string().trim().toLowerCase().email(),
});

type ClaimStartResponse = { key: string; code: string; expiresInSeconds: number };

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }

  try {
    const token = await getAdminActAsToken(parsed.data.email);
    // `{}` rather than an omitted/null body: that is the exact shape
    // make_claim_link.py already sends to this method from Aleksandr's
    // machine, so it is the proven one.
    const data = await call<ClaimStartResponse>("auth.claimStart", {}, { accessToken: token });
    return NextResponse.json({
      ok: true,
      url: `${SITE_URL}/claim/${data.key}/${data.code}`,
      expiresInSeconds: data.expiresInSeconds,
    });
  } catch (err) {
    if (err instanceof UnknownAccountError) {
      return NextResponse.json({ ok: false, reason: "unknown_account" }, { status: 404 });
    }
    const reason = reasonFromError(err);
    if (err instanceof A1ApiError) {
      console.error("[api/admin/claim-link] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/admin/claim-link] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status: reason === "unknown" ? 500 : 409 });
  }
}
