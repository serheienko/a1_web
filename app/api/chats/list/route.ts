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
//
// 2026-09-02: response confirmed live (Vercel Logs) to be a BARE ARRAY
// of Chat objects -- no `{ chats, users }` wrapper like contacts.search
// has. See lib/a1/chat-schemas.ts's ChatSchema comment for the two real
// mismatches this uncovered (lastMessage as a bare number, and the
// missing `users` side array) and which of those is fixed vs. still
// flagged.
//
// 2026-09-02 (chat UI redesign per Figma -- list row needs a preview
// line, read ticks, unread badge, red draft text): the response now
// also carries previewText/previewMine/previewDateMs/previewTick/
// unreadCount/draftText, sourced from lib/a1/chat-schemas.ts's newly
// widened ChatSchema (chatLastMessagePreview/chatUnreadCount/
// chatDraftText -- see that file's header for exactly what's confirmed
// vs guessed here). Every one of these degrades to "" / 0 / null when
// the real chats.getChats response doesn't carry that field under the
// guessed name -- never a 502, just a plainer row, same as before this
// pass.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import {
  extractChats,
  extractChatUsers,
  chatLastMessagePreview,
  chatUnreadCount,
  chatDraftText,
  messageTickState,
} from "@/lib/a1/chat-schemas";
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
    const myUserId = session?.userId ?? null;
    const { data, refreshedSession } = await callAsVisitor<unknown>("chats.getChats", {});

    const chats = extractChats(data);
    const users = extractChatUsers(data);
    const items = chats
      .map((chat) => {
        const display = resolveChatDisplay(chat, myUserId, users);
        const lm = chat.lastMessage;
        const preview = chatLastMessagePreview(chat);
        const previewMine = preview !== null && myUserId !== null && preview.fromId === myUserId;
        // lm is only ever the embedded-message shape when preview
        // resolved (chatLastMessagePreview returns null for the plain
        // bare-id string case) -- this guard mirrors that instead of
        // casting.
        const previewTick = previewMine && lm !== null && typeof lm === "object" ? messageTickState(lm) : null;
        return {
          id: chat._id,
          title: display.title,
          avatarUrl: pickChatAvatar(chat, display),
          username: display.otherUsername,
          isPersonal: display.isPersonal,
          lastMessageId: typeof lm === "string" ? lm : (lm?._id ?? null),
          previewText: preview?.text ?? "",
          previewMine,
          previewDateMs: preview?.dateMs ?? 0,
          previewTick,
          unreadCount: chatUnreadCount(chat),
          draftText: chatDraftText(chat),
        };
      })
      // No confirmed "last activity" timestamp on Chat itself when
      // lastMessage is still just a bare id (lib/a1/chat-schemas.ts's
      // ChatSchema) -- ordering is whatever chats.getChats itself
      // returned until that's resolved.
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
