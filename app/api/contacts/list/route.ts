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
//
// 2026-08-31, live-testing feedback ("Арина в контактах сохраняется
// почему то с другим аватаром"): contacts.search's real response is
// `{ contacts: Contact[], users: (User | UserEmpty)[] }` — confirmed by
// reading aone-api-private's contacts.search.ts directly, not guessed.
// The web app was only ever reading the bare `contacts` half; `Contact`
// itself (lib/a1/schemas.ts) has no photo/username at all, which is why
// every row fell back to the generated pickDefaultCatAvatar placeholder
// even for a platform-linked contact. The `users` array carries exactly
// the same DTO shape as users.getByUsername's response (both go through
// UserService#toDtoObject — confirmed in the same source file), so it
// reuses UserProfileSchema/parseUserProfile rather than inventing a new
// schema. Returned here as a `contactUsers` map keyed by user id (not
// merged into `contacts`) since ContactSchema stays the bare backend
// shape; the page does the lookup by `contact.user`. A `user-empty`
// entry (the linked account no longer resolves) fails parseUserProfile
// and is simply absent from the map — the page's existing
// pickDefaultCatAvatar fallback already covers "no data for this
// contact" without any extra handling here.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { ContactSchema, parseUserProfile, type Contact } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";

export const runtime = "nodejs";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
};

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

// See this file's own 2026-08-31 comment above — `raw.users` alongside
// `raw.contacts`, same defensive "drop what doesn't parse" rule.
function extractContactUsers(raw: unknown): Record<string, ContactUserSummary> {
  const out: Record<string, ContactUserSummary> = {};
  if (!raw || typeof raw !== "object") return out;
  const list = (raw as Record<string, unknown>).users;
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    const profile = parseUserProfile(item);
    if (!profile || profile.object !== "user") continue; // user-hidden/user-empty: no usable data
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    out[profile._id] = {
      username: profile.username,
      fullName: fullName || profile.username || "",
      avatarUrl: profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null,
    };
  }
  return out;
}

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.search", {});
    const response = NextResponse.json({
      ok: true,
      contacts: extractContacts(data),
      contactUsers: extractContactUsers(data),
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
      console.error("[api/contacts/list] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/contacts/list] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "list_failed", detail }, { status: 502 });
  }
}
