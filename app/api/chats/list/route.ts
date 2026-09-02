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
// widened ChatSchema (chatUnreadCount/chatDraftText -- see that file's
// header for exactly what's confirmed vs guessed here). Every one of
// these degrades to "" / 0 / null when the real chats.getChats response
// doesn't carry that field under the guessed name -- never a 502, just
// a plainer row, same as before this pass.
//
// 2026-09-02 follow-up (Aleksandr, live screenshot after the two fixes
// above shipped: "Сюда надо добавить: 1. Имена 2. Актуальные аватары
// 3. Текст последнего сообщения 4. Дата/время 5. Статус... прочитано/не
// прочитано 6. Draft"): every row was still showing "—" and no preview,
// because of the two gaps this file already flagged --
// chats.getChats's response has no embedded `users` side array AND
// `lastMessage` is only ever a bare numeric id, never an embedded
// message object (confirmed live, see ChatSchema's own comment). Both
// resolved here now with two EXTRA calls per list load, not guessed
// past their first live response:
//   - users.search with an `{ids: [...]}` filter, for every distinct
//     "other participant" id across this visitor's personal chats --
//     `ids` is an unconfirmed param name (app/api/favorites/users/
//     route.ts's own use of users.search only ever confirmed
//     `{favorited: true}`, not an id filter), but resolving names is
//     best-effort here: a 400/empty result just leaves names as "—",
//     exactly like before this pass, never a 502 for the whole list.
//   - messages.getMessages (already fully confirmed live, see app/api/
//     chats/messages/route.ts) with `{peerTo: peerForChat(chat._id),
//     limit: 1}` per chat whose lastMessage is a bare id, to get the
//     real preview text/date/read-state -- the SAME endpoint the chat
//     window itself already polls, just asking for one message instead
//     of the recent window.
// Both run in parallel (Promise.all) across all of a visitor's chats --
// fine at today's chat counts; worth revisiting if that ever grows into
// the hundreds.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import {
  extractChats,
  extractChatUsers,
  extractMessages,
  extractMessageText,
  messageDateMs,
  messageTickState,
  chatUnreadCount,
  chatDraftText,
  otherParticipantUserId,
  peerForChat,
  type Chat,
  type ChatUser,
  type ChatMessage,
} from "@/lib/a1/chat-schemas";
import { resolveChatDisplay, pickChatAvatar } from "@/lib/a1/chat-mappers";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";

// Best-effort name/avatar resolution for every distinct "other
// participant" id across `chats` -- see this file's own header comment
// for why `ids` is an unconfirmed users.search filter, and why a
// failure here degrades to "—" rows rather than a 502.
async function resolveChatUsers(chats: Chat[], myUserId: string | null): Promise<Record<string, ChatUser>> {
  const ids = Array.from(
    new Set(chats.map((chat) => otherParticipantUserId(chat, myUserId)).filter((id): id is string => Boolean(id))),
  );
  if (ids.length === 0) return {};
  try {
    const { data } = await callAsVisitor<{ items?: unknown[] }>("users.search", { ids, limit: ids.length });
    const out: Record<string, ChatUser> = {};
    for (const raw of data?.items ?? []) {
      const profile = parseUserProfile(raw);
      if (!profile || profile.object !== "user") continue;
      out[profile._id] = {
        _id: profile._id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        photo: profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null,
      };
    }
    return out;
  } catch (err) {
    console.error("[api/chats/list] users.search failed (names/avatars stay unresolved):", err);
    return {};
  }
}

// Real last-message text/date/read-state for every chat whose
// `lastMessage` is only a bare id (every real chat today, see this
// file's own header comment) -- one messages.getMessages call per such
// chat, in parallel, each asking for just the most recent message.
async function resolveLastMessages(chats: Chat[]): Promise<Map<string, ChatMessage | null>> {
  const entries = await Promise.all(
    chats
      .filter((chat) => typeof chat.lastMessage === "string")
      .map(async (chat) => {
        try {
          const { data } = await callAsVisitor<unknown>("messages.getMessages", {
            peerTo: peerForChat(chat._id),
            limit: 1,
          });
          return [chat._id, extractMessages(data).at(-1) ?? null] as const;
        } catch (err) {
          console.error("[api/chats/list] messages.getMessages failed for", chat._id, ":", err);
          return [chat._id, null] as const;
        }
      }),
  );
  return new Map(entries);
}

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
    // Two best-effort resolution passes, in parallel with each other --
    // see this file's own header comment. `users` merges chats.getChats'
    // own (always-empty-today) side array with whatever users.search
    // resolved, so a future backend change that starts embedding users
    // directly keeps working without touching this route again.
    const [resolvedUsers, lastMessages] = await Promise.all([
      resolveChatUsers(chats, myUserId),
      resolveLastMessages(chats),
    ]);
    const users = { ...extractChatUsers(data), ...resolvedUsers };
    const items = chats
      .map((chat) => {
        const display = resolveChatDisplay(chat, myUserId, users);
        const lm = chat.lastMessage;
        // The embedded-object shape (`lm` already a full ChatMessage) has
        // never been seen live -- every real chat's lastMessage is a bare
        // id, resolved via resolveLastMessages above -- but handling it
        // here too costs nothing and keeps this correct if that ever
        // changes.
        const resolvedMessage: ChatMessage | null =
          lm && typeof lm === "object" ? lm : typeof lm === "string" ? (lastMessages.get(chat._id) ?? null) : null;
        const previewFromId = resolvedMessage?.fromId ?? null;
        const previewMine = previewFromId !== null && myUserId !== null && previewFromId === myUserId;
        const previewTick = previewMine && resolvedMessage ? messageTickState(resolvedMessage) : null;
        return {
          id: chat._id,
          title: display.title,
          avatarUrl: pickChatAvatar(chat, display),
          username: display.otherUsername,
          isPersonal: display.isPersonal,
          lastMessageId: typeof lm === "string" ? lm : (lm?._id ?? null),
          previewText: resolvedMessage ? extractMessageText(resolvedMessage) : "",
          previewMine,
          previewDateMs: resolvedMessage ? messageDateMs(resolvedMessage) : 0,
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
