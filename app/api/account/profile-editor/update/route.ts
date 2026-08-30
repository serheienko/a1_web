// app/api/account/profile-editor/update/route.ts
//
// Save endpoint for the full profile editor (components/profile-editor.tsx).
// Deliberately separate from app/api/account/update-profile/route.ts, which
// stays exactly as it was for the onboarding step's narrower
// {occupation, expertise, category} body — the two forms don't share a
// request shape (onboarding's bare `category` becomes a nested
// companies[].category here), so overloading one endpoint would mean
// branching on which shape arrived instead of two small, honest routes.
//
// ProfileInputSchema (lib/a1/schemas.ts) makes every field optional, which
// is what lets this route honor account.updateProfile's own documented
// contract ("no fields required — send only what changed"): whatever key
// the client didn't send simply isn't present on parsed.data, so it isn't
// forwarded either. The one nested exception is companies[] entries,
// which (per update-profile/route.ts's comment, discovered via live 400s)
// must carry every sub-field once included at all — ProfileInputCompanySchema
// already requires that for each entry, so nothing extra is needed here.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { ProfileInputSchema } from "@/lib/a1/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const parsed = ProfileInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    console.warn("[api/account/profile-editor/update] invalid input", parsed.error);
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { refreshedSession } = await callAsVisitor("account.updateProfile", parsed.data);
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      // Same reasoning as every other visitor-authenticated route: a
      // stale/unusable session cookie should get cleared, not keep
      // silently failing every future call.
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/profile-editor/update] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/profile-editor/update] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "update_failed", detail }, { status: 502 });
  }
}
