// app/api/users/summaries/route.ts
//
// 2026-09-02, Aleksandr (native-app "sent contact" card screenshot):
// batch profile lookup for rendering an already-sent media-contact
// message (lib/a1/chat-schemas.ts's messageContactMedia) -- the message
// itself only ever carries {userId, phoneNumber, firstName, lastName}
// (confirmed against the OpenAPI spec's MessageInput.Media.Contact /
// Resource.Message.Media.Contact, both required-all, no occupation/
// expertise/photo), so the occupation pill + expertise line + avatar the
// reference card shows have to be resolved separately, by userId, at
// render time.
//
// Deliberately its own route rather than reusing GET /api/contacts/list:
// that one is scoped to "my own contacts" (contacts.search), but a
// contact-media message can reference ANY user -- something a
// collocutor forwarded that never went through my own contact book.
// wraps users.getUsers (confirmed: {ids: UserId[]} -> (Resource.User |
// Resource.UserEmpty)[], batched, no per-id round-trips) and reuses this
// codebase's existing UserProfileSchema/parseUserProfile rather than a
// new schema, since Resource.User and users.getByUsername's own output
// are confirmed to be the same underlying DTO (see app/api/contacts/
// list/route.ts's own 2026-08-31 comment on that).
//
// SECURITY: UserProfileSchema also carries phoneNumber/email/dob --
// those are only meant to reach a caller from behind their own SHOW_*
// flag gate (lib/a1/user-mappers.ts's mapUserProfile, built for the
// single-profile page). This route bypasses that mapper entirely (it
// needs an array, not one WebProfile), so it whitelists the response by
// hand below instead -- occupation/expertise/avatar/name only. Never add
// phoneNumber/email/dob to UserSummary; the phone this feature shows
// anywhere comes only from the message/contact's OWN phoneNumber field,
// never from another user's account.
import { NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";

export const runtime = "nodejs";

const Input = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(50),
});

export type UserSummary = {
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  occupation: string;
  expertise: string | null;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    // De-duped -- the same userId can legitimately show up more than
    // once across a page of messages (someone forwarding the same
    // contact twice, or replying to their own contact-share).
    const ids = Array.from(new Set(parsed.data.ids));
    const { data, refreshedSession } = await callAsVisitor<unknown>("users.getUsers", { ids });
    const list = Array.isArray(data) ? data : [];
    const users: Record<string, UserSummary> = {};
    for (const item of list) {
      const profile = parseUserProfile(item);
      if (!profile || profile.object !== "user") continue; // user-empty/unparseable: no usable data
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
      users[profile._id] = {
        fullName: fullName || profile.username || "",
        username: profile.username,
        avatarUrl: profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null,
        occupation: profile.occupation,
        expertise: profile.expertise,
      };
    }
    const response = NextResponse.json({ ok: true, users });
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
      console.error("[api/users/summaries] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/users/summaries] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "summaries_failed", detail }, { status: 502 });
  }
}
