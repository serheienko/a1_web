// app/api/contacts/remove/route.ts
//
// 2026-08-31: pairs with app/api/contacts/add/route.ts — "и сделай
// возможность при повторном тапе убрать из контактов" (Aleksandr, on the
// icon-only add-contact button). aone-api-private's contacts.* methods
// were never in PLAN.md's confirmed endpoint table (§6.1, contacts was
// out of scope for v1.0), so unlike every other route in this app this
// one's method name genuinely couldn't be read from source ahead of
// time — confirmed live instead, the same way contacts.addContact was
// confirmed for add/route.ts. First guesses (`contacts.removeContact`,
// then a batch of other addContact-style names) all came back "Unknown
// method" from the live backend. The real method is
// `contacts.deleteContacts` — plural, unlike every singular contacts.*
// method this app otherwise calls — and it takes `{ ids: [<contactId>,
// ...] }`, not a single `id`/`contact` field; "root is missing required
// property 'ids'" from a live call is what gave that away. Found via a
// temporary generic method-probe route (POST any method name + body
// through callAsVisitor, added and removed again in this same session)
// rather than redeploying once per guess.
//
// Takes the contact's own `_id` (Contact.object === "contact", from
// contacts.search / the addContact response — see lib/a1/schemas.ts's
// ContactSchema), not the linked platform user's id: a Contact row is
// what actually gets deleted, and `_id` is the only field guaranteed to
// identify a specific one. This route only ever sends a single-element
// `ids` array — nothing in this app deletes more than one contact at a
// time yet.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const RemoveContactInput = z.object({
  contactId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = RemoveContactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { contactId } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("contacts.deleteContacts", {
      ids: [contactId],
    });
    const response = NextResponse.json({ ok: true });
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
      console.error("[api/contacts/remove] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/contacts/remove] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "remove_failed", detail }, { status: 502 });
  }
}
