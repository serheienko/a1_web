// app/api/contacts/remove/route.ts
//
// 2026-08-31: pairs with app/api/contacts/add/route.ts — "и сделай
// возможность при повторном тапе убрать из контактов" (Aleksandr, on the
// icon-only add-contact button). Same live-testing situation add/
// route.ts's own comment describes for contacts.addContact: aone-api-
// private's contacts.* methods were never in PLAN.md's confirmed
// endpoint table (§6.1, contacts was out of scope for v1.0), so this
// route's method name/body shape is a first guess from the addContact
// naming convention (`contacts.addContact` takes `{ user: <id> }`) —
// NOT independently confirmed against a live call the way addContact now
// is. If the real method name or field differs, this will surface as a
// live 502 with `detail` set to the backend's actual error (same
// A1ApiError.detail plumbing every route here uses) — fix the method
// name/body then, not by guessing further.
//
// Takes the contact's own `_id` (Contact.object === "contact", from
// contacts.search / the addContact response — see lib/a1/schemas.ts's
// ContactSchema), not the linked platform user's id: a Contact row is
// what actually gets deleted, and `_id` is the only field guaranteed to
// identify a specific one.
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
    const { refreshedSession } = await callAsVisitor<unknown>("contacts.removeContact", {
      id: contactId,
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
