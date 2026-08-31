// app/api/contacts/list/route.ts
//
// Aleksandr, 2026-08-31: "давай пока сделаем какую-то эпичную упрощенную
// версию, типа чтобы можно было добавлять пользователей ВКонтакте...
// где-то у нас какую-то контактную книгу" — first-pass backend for the
// "contact book" page (app/contacts/page.tsx). Explicitly a rough sketch
// per his own framing ("накидаешь, потом пересделаем"), not a final
// design — UI placement is still undecided too.
//
// contacts.addContact's own response shape was confirmed live against
// aone-api-private's ContactService source (see lib/a1/schemas.ts's
// ContactSchema comment). contacts.search itself is NOT independently
// confirmed the same way — inferred only by name (ContactService almost
// certainly exposes a list/search alongside addContact) and by the
// method-naming convention every other *.search endpoint in this API
// follows (posts.search takes filters + returns items/pagination). This
// route is written defensively for exactly that reason: it accepts
// either a bare array OR an `{items:[...]}`/`{contacts:[...]}` wrapper
// back from the backend, and silently drops any entry that doesn't
// parse as a Contact rather than failing the whole list — same "a single
// bad item never breaks the page" rule this codebase already applies to
// posts.search (lib/a1/schemas.ts's parsePost). If contacts.search turns
// out to need real filter args (an owner id, pagination) rather than
// `{}`, that will surface as a live 400/502 from A1ApiError below — fix
// the request body then, not by guessing further now.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { ContactSchema, type Contact } from "@/lib/a1/schemas";

export const runtime = "nodejs";

function extractContacts(raw: unknown): Contact[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.contacts)) list = obj.contacts;
  }
  const out: Contact[] = [];
  for (const item of list) {
    const parsed = ContactSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.search", {});
    const response = NextResponse.json({ ok: true, contacts: extractContacts(data) });
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
      console.error("[api/contacts/list] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/contacts/list] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "list_failed", detail }, { status: 502 });
  }
}
