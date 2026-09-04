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
// CONFIRMED live, 2026-08-30 (Aleksandr's own screenshot of the avatar
// menu showing "Переглянути профіль" working, and the profile page it
// linked to rendering real data): account.updateProfile({}) really does
// return the same Resource.User shape UserProfileSchema already parses
// for users.getByUsername. parseUserProfile() still fails closed
// (returns null on any unrecognized shape) rather than throwing, so a
// future backend change here degrades to the link/avatar just not
// showing rather than a crash.
//
// 2026-08-30 follow-up (Aleksandr, live screenshot of the merged
// account block): "поставь не цветная векторное синее, а аватар,
// персональный" -- also returns avatarUrl now, same buildMediaProxyUrl
// pipeline every other real-photo-or-cat-fallback spot in this app
// already uses (lib/a1/mappers.ts, lib/a1/user-mappers.ts), closing the
// exact gap this file's own KNOWN GAP comment (components/avatar-
// menu.tsx) flagged before this route existed.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
    const profile = parseUserProfile(data);
    const username = profile?.object === "user" ? profile.username : null;
    const avatarDoc = profile?.object === "user" ? profile.photos[0] : null;
    const avatarUrl = avatarDoc ? buildMediaProxyUrl(avatarDoc) : null;
    // 2026-09-04 (Scheduled Meetings, "1-3 допили") -- the meeting card
    // needs to show the PROPOSER's own display name next to their
    // avatar (lib/a1/meeting-protocol.ts's own MeetingPayload.
    // proposerName), same "the visitor's own identity has to be read
    // from SOMEWHERE" gap this route's avatarUrl already closed once
    // for the now-playing bar (see that field's own comment above) --
    // firstName/lastName are both real UserProfileSchema fields,
    // falls back to the username already returned above, then "" (the
    // caller's own last resort, never null -- an empty proposerName
    // just means the row renders without a name rather than crashing).
    const firstName = profile?.object === "user" ? profile.firstName : "";
    const lastName = profile?.object === "user" ? profile.lastName : "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || username || "";
    const response = NextResponse.json({ ok: true, username, avatarUrl, name });
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
