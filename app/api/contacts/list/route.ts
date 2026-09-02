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
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";

export const runtime = "nodejs";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  // 2026-08-31, live-testing feedback (contacts screenshot, avatars
  // showing blank while loading): a real per-avatar blur preview,
  // same lib/avatar-blur.ts helper every other avatar/photo in this
  // app already uses (profile header, post author, job/talent
  // author) -- computed here server-side since it needs to fetch and
  // downsize the actual photo bytes, which a client component can't
  // do. Null (fetch failed, or this contact has no linked-user photo
  // at all) falls back to the shared generic shimmer client-side, the
  // same convention every other call site uses.
  avatarBlurDataUrl: string | null;
  // 2026-09-02, Aleksandr (native-app "sent contact" card screenshot --
  // occupation pill, rocket-icon expertise line): the same two fields
  // app/u/[username]/page.tsx already renders publicly for any profile,
  // added here too so components/chat/contact-message-card.tsx can show
  // them for a JUST-PICKED contact without a second round-trip (this
  // route already parses the full UserProfile via parseUserProfile
  // below -- occupation/expertise were sitting right there, just never
  // copied into the old narrower summary). workInterests deliberately
  // NOT included yet -- the reference card's second pill needs a
  // category-id -> label dataset lookup (dataset.workInterests) this
  // pass doesn't build; only the occupation pill + expertise line ship
  // for now.
  occupation: string;
  expertise: string | null;
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
//
// Async (unlike the rest of this file's small helpers) because it also
// fetches+downsizes each linked contact's real avatar for the blur
// placeholder (see ContactUserSummary's own comment) -- done as one
// Promise.all pass over every resolved contact-user rather than
// sequentially, since generateAvatarBlurDataUrl is a real network fetch
// per avatar and a contact list can have plenty of rows.
async function extractContactUsers(raw: unknown): Promise<Record<string, ContactUserSummary>> {
  const out: Record<string, ContactUserSummary> = {};
  if (!raw || typeof raw !== "object") return out;
  const list = (raw as Record<string, unknown>).users;
  if (!Array.isArray(list)) return out;
  const entries: { id: string; summary: ContactUserSummary }[] = [];
  for (const item of list) {
    const profile = parseUserProfile(item);
    if (!profile || profile.object !== "user") continue; // user-hidden/user-empty: no usable data
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    entries.push({
      id: profile._id,
      summary: {
        username: profile.username,
        fullName: fullName || profile.username || "",
        avatarUrl: profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null,
        avatarBlurDataUrl: null,
        occupation: profile.occupation,
        expertise: profile.expertise,
      },
    });
  }
  await Promise.all(
    entries.map(async ({ summary }) => {
      if (summary.avatarUrl) {
        summary.avatarBlurDataUrl = await generateAvatarBlurDataUrl(summary.avatarUrl);
      }
    }),
  );
  for (const { id, summary } of entries) out[id] = summary;
  return out;
}

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.search", {});
    // The temp `_debug` probe that used to live here (2026-08-31, "Все
    // аватарки не совпадают") is gone -- it turned out the real cause
    // wasn't a data-shape mismatch (this file's own extractContactUsers
    // was already reading contacts.search's `users` array correctly),
    // it was that every deploy since the fix that added this endpoint's
    // logic had been silently failing to build on Vercel (an unrelated
    // TypeScript error elsewhere in the app) -- see components/profile-
    // editor.tsx's isPlausibleUrl/setRawFlags fix commits. Confirmed
    // live once a build actually shipped: names resolve correctly.
    const response = NextResponse.json({
      ok: true,
      contacts: extractContacts(data),
      contactUsers: await extractContactUsers(data),
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
