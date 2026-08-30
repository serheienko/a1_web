// app/api/account/whoami/route.ts
//
// Aleksandr, 2026-08-30, correcting my first pass at "View profile" in
// the avatar menu: "должна быть возможность всегда посмотреть свой
// профиль" -- gating that link on "does the visitor happen to have at
// least one post" (via /api/posts/mine's authorUsername, PLAN.md §6.41)
// was wrong. This route exists to give the visitor's own username with
// NO dependency on posts at all.
//
// PLAN.md's confirmed endpoint table (§6.1) still lists no dedicated
// "get my own profile" read -- `account.updateProfile` is the only
// authenticated call that returns a full user object at all, and its
// own documented contract is "no fields required -- send only what
// changed". So this calls it with a genuinely empty input as a no-op
// "read": nothing changes, the backend just echoes back the current
// user.
//
// IMPORTANT, flagged rather than presented as confirmed like the rest
// of this codebase's fixes: no prior code in this project has ever
// actually parsed account.updateProfile's response body (the existing
// /api/account/update-profile route discards it and returns only `{ ok:
// true }`), so "it returns the same Resource.User shape
// UserProfileSchema already parses for users.getByUsername" is an
// inference from PLAN.md's endpoint table, not something confirmed live
// yet. parseUserProfile() fails closed (returns null on any
// unrecognized shape) rather than throwing, so a wrong guess here
// degrades to "View profile" link hidden, not a crash -- but this
// specifically needs a live check after deploy (open the avatar menu
// signed in with zero posts and confirm the link appears).
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
    const profile = parseUserProfile(data);
    const username = profile?.object === "user" ? profile.username : null;
    const response = NextResponse.json({ ok: true, username });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/account/whoami] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/whoami] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}
