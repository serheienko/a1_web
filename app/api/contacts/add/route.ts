// app/api/contacts/add/route.ts
//
// Aleksandr, 2026-08-31: "чтобы можно было добавлять пользователей в
// контакты, также на вебе, как и на мобильной" — mobile's Contacts
// screen (Settings > Contacts) already lets you add a platform user;
// this is the same feature's backend piece for the web app. Scope for
// now is explicitly backend-only — no button wired to this route yet,
// that's the next step once this is confirmed working.
//
// PLAN.md line 36 lists contacts as "out of scope for v1.0" — that line
// predates this request; Aleksandr asked for this directly, so it's now
// in scope. Contacts themselves were never in PLAN.md's confirmed
// endpoint table (§6.1), so this route's contract comes straight from
// reading aone-api-private (a separate repo) directly:
// apps/api-server-modern/src/api/v1/contacts/contacts.addContact.ts —
// `{ user: <id> }` upserts a Contact row linking `owner` (the caller,
// taken from the access token — never sent by the client, same as every
// other callAsVisitor route in this app) to that platform user. Passing
// `contact: {...}` instead is the phone-book-import shape mobile also
// supports; this app never sends that.
//
// Same request/response contract as app/api/account/update-profile/
// route.ts (zod-validated input, callAsVisitor + session refresh,
// NoSessionError -> 401 + clear cookie, A1ApiError -> 502 with detail).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { ContactSchema } from "@/lib/a1/schemas";

export const runtime = "nodejs";

const AddContactInput = z.object({
  userId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = AddContactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { userId } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.addContact", {
      user: userId,
    });
    // Degrades to `contact: null` on an unrecognized shape rather than
    // throwing — same fail-closed pattern as parseUserProfile (PLAN.md
    // §5 rule 6): the add already happened backend-side either way, so
    // failing the response over a display-only field would be wrong.
    const contactParsed = ContactSchema.safeParse(data);
    const response = NextResponse.json({
      ok: true,
      contact: contactParsed.success ? contactParsed.data : null,
    });
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
      console.error("[api/contacts/add] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/contacts/add] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "add_failed", detail }, { status: 502 });
  }
}
