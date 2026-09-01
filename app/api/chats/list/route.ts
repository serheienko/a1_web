// app/api/chats/list/route.ts
//
// Phase 1 of the web chat feature (Aleksandr, 2026-09-01) -- see
// lib/a1/chat-schemas.ts's header for the full confirmed-vs-inferred
// shape caveat this route inherits. Proxies chat-server's
// `chats.getChats` the same way every other authenticated route in this
// app proxies api-server-modern: through callAsVisitor (PLAN.md §5 rule
// 3's "only lib/a1/client.ts calls fetch()" applies equally to
// chat-server -- this route never talks to it directly).
//
// Request body sent as `{}`, same first-pass as contacts.search (see
// app/api/contacts/list/route.ts's own comment) -- confirm real filter/
// pagination args exist only once a live 400/502 says so, don't guess
// further now.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import { extractChats, extractChatUsers } from "@/lib/a1/chat-schemas";
import { resolveChatDisplay, pickChatAvatar } from "@/lib/a1/chat-mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Read once up front for myUserId (needed to tell "the other
    // participant" apart in a personal chat) -- callAsVisitor below
    // re-reads it internally too, but readSession() is just a cookie
    // parse, not a network call, so this costs nothing extra.
    const session = await readSession();
    const { data, refreshedSession } = await callAsVisitor<unknown>("chats.getChats", {});

    const chats = extractChats(data);
    const users = extractChatUsers(data);
    const items = chats
      .map((chat) => {
        const display = resolveChatDisplay(chat, session?.userId ?? null, users);
        return {
          id: chat._id,
          title: display.title,
          avatarUrl: pickChatAvatar(chat, display),
          isPersonal: display.isPersonal,
          lastMessageId: chat.lastMessage,
        };
      })
      // No confirmed "last activity" timestamp on Chat itself
      // (lib/a1/chat-schemas.ts's ChatSchema only has lastMessage as an
      // id, not an embedded message/date) -- ordering is whatever
      // chats.getChats itself returned until that's resolved.
      .filter((item) => item.title || item.lastMessageId);

    const response = NextResponse.json({ ok: true, chats: items });
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
      console.error("[api/chats/list] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/list] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "list_failed", detail }, { status: 502 });
  }
}
