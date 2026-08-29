// app/api/account/update-profile/route.ts
//
// Phase 6 (PLAN.md §6.15): the post-signup "Настройте профиль" step.
// Writes exactly the three fields that step collects — nothing else,
// per account.updateProfile's own documented contract (§6.1: "no fields
// required — send only what changed").
//
// occupation/expertise map directly onto Resource.User's own fields
// (confirmed against app/u/[username]/page.tsx's pre-existing code —
// see PLAN.md §6.15's correction note). "Отрасль" (category) has no bare
// top-level field on Resource.User — it only exists nested inside
// companies[].category (lib/a1/schemas.ts's UserCompanySchema), so this
// sends a single company entry with just that field set.
//
// CONFIRMED BROKEN, 2026-08-29 (live production error, not a guess):
// the backend rejects this with 400 INVALID_INPUT "'companies.0' is
// missing required property 'name'" — the live openapi.json's own
// Resource.User.Company schema requires `name` (e.g. "Coca-Cola") on
// every companies[] entry, and this step collects no company/employer
// name. Every real submission from /onboarding/profile fails right now.
// See PLAN.md §6.15 — asked Aleksandr how he wants this resolved
// (add a name field vs. this isn't really the right field for
// "Отрасль" at all) rather than guessing with a placeholder name on
// real user profiles.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const UpdateProfileInput = z.object({
  occupation: z.enum(["entrepreneur", "professional", "freelancer"]),
  expertise: z.string().trim().min(1),
  category: z.number(),
});

export async function POST(request: NextRequest) {
  const parsed = UpdateProfileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { occupation, expertise, category } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor(
      "account.updateProfile",
      { occupation, expertise, companies: [{ category }] },
    );
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/update-profile] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/update-profile] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "update_failed", detail }, { status: 502 });
  }
}
