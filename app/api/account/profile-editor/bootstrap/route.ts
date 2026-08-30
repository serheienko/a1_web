// app/api/account/profile-editor/bootstrap/route.ts
//
// One-shot data load for the full profile editor (components/
// profile-editor.tsx, 2026-08-30), mirroring app/api/post-editor/
// bootstrap/route.ts's shape for the post editor: everything the dialog
// needs to render and prefill, fetched the moment it opens.
//
// `profile` is the signed-in visitor's OWN full editable snapshot,
// gotten via account.updateProfile({}) — the same no-op-read trick
// app/api/account/whoami/route.ts already uses ("no fields required —
// send only what changed", so an empty body changes nothing and just
// echoes the current user back). Unlike whoami (which only picks out
// username/avatarUrl), this parses the FULL EditableProfileSchema
// (lib/a1/schemas.ts) so the editor can prefill every field it manages,
// including the raw MediaDocument objects for photos/voiceIntroduction
// that WebProfile (the public-profile type) deliberately never exposes.
//
// The four dataset.* lookups alongside it are all public/no-auth, same
// as the post editor's own bootstrap — fetched in parallel so opening
// the dialog is one round trip, not five.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { EditableProfileSchema } from "@/lib/a1/schemas";
import {
  fetchCompanyCategories,
  fetchHobbies,
  fetchWorkInterests,
  fetchWorkStylePreferences,
} from "@/lib/a1/datasets";

export async function GET() {
  try {
    const [profileResult, companyCategories, hobbyGroups, workInterests, workStylePreferences] = await Promise.all([
      callAsVisitor<unknown>("account.updateProfile", {}),
      fetchCompanyCategories(),
      fetchHobbies(),
      fetchWorkInterests(),
      fetchWorkStylePreferences(),
    ]);

    const parsed = EditableProfileSchema.safeParse(profileResult.data);
    if (!parsed.success) {
      console.warn("[api/account/profile-editor/bootstrap] unexpected profile shape", parsed.error);
      return NextResponse.json({ ok: false, message: "unexpected_profile_shape" }, { status: 502 });
    }

    const response = NextResponse.json({
      ok: true,
      profile: parsed.data,
      companyCategories,
      hobbyGroups,
      workInterests,
      workStylePreferences,
    });
    if (profileResult.refreshedSession) setSession(response, profileResult.refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/profile-editor/bootstrap] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/profile-editor/bootstrap] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}
