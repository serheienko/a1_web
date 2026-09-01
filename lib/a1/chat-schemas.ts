// lib/a1/chat-schemas.ts
//
// Aleksandr, 2026-09-01: "я хочу добавить еще веб-версию чата... такие же
// примерно полноценные чаты, как у нас в приложении" -- Phase 1 (data
// layer) of the web chat feature. See PLAN.md's chat section for the
// master plan / architecture writeup this scaffolding follows: MVP
// transport is REST polling (no WebSocket relay yet), talking to
// aone-api-private-main's chat-server -- a separate microservice with
// its own MongoDB, NOT api-server-modern, which every other lib/a1/*.ts
// file in this app talks to.
//
// IMPORTANT CAVEAT, read before touching request/response shapes below:
// chat-server's own packages/types/methods/*.d.ts (the authoritative
// request/response types) could not be read this session -- every
// attempt (cat, python open(), cp) hit the same `Resource deadlock
// avoided` (EDEADLK) OS error specifically on that mount. What IS
// confirmed by directly reading two files that DID open
// (apps/chat-app/src/composables/useChat.ts and useWs.ts -- the
// reference Vue web-chat client already built against this same
// backend) is: Chat has _id/title/flags/participants/lastMessage;
// Peer is a discriminated union on `object` ("peer-user" | "peer-chat");
// messages are always addressed by `{ object: "peer-chat", chat: id }`
// even inside a 1:1 chat (useChat.ts builds that peer for its OWN
// personal chat's lastMessage lookup) -- there is no separate
// peer-user-addressed message stream to worry about here. Everything
// else below is this session's best inference, called out inline.
// Same "confirmed vs inferred, don't guess past the first 502" rule
// this repo already applies to contacts.search (app/api/contacts/list/
// route.ts's own comment) -- fix a field name here the moment a live
// response disagrees, don't keep guessing further.
import { z } from "zod";

export const PeerSchema = z.discriminatedUnion("object", [
  z.object({ object: z.literal("peer-user"), user: z.string() }),
  z.object({ object: z.literal("peer-chat"), chat: z.string() }),
]);
export type Peer = z.infer<typeof PeerSchema>;

export function peerForChat(chatId: string): Peer {
  return { object: "peer-chat", chat: chatId };
}

// useChat.ts checks `checkBitmask(chat.value.flags, CHAT_FLAG.PERSONAL)`.
// CHAT_FLAG.PERSONAL's real numeric value lives in @aone/constants, which
// this session couldn't read either -- 1 (the first bit) is assumed,
// matching this backend's evident MTProto/Telegram-flavored conventions
// elsewhere (Peer's own peer-user/peer-chat naming is straight out of
// that vocabulary). If wrong, a personal chat just renders with its
// group-chat fallback (chat.title as-is, generic icon) instead of the
// other participant's name/photo -- degrades, never crashes.
export const CHAT_FLAG_PERSONAL = 1;

export const ChatParticipantSchema = z
  .object({
    object: z.enum(["peer-user", "peer-chat"]),
    user: z.string().optional(),
    chat: z.string().optional(),
  })
  .catchall(z.unknown());
export type ChatParticipant = z.infer<typeof ChatParticipantSchema>;

// Confirmed via useChat.ts: _id, title, flags, participants, lastMessage
// (a message id -- NOT an embedded message object, useChat.ts looks it
// up separately in its messages store). Everything else this backend's
// Chat resource might carry (photo, unreadCount, pinnedMessage, ...) is
// unconfirmed -- caught by .catchall so an unrecognized extra field
// never fails parsing; nothing here assumes those fields exist.
export const ChatSchema = z
  .object({
    _id: z.string(),
    title: z.string().catch(""),
    flags: z.number().catch(0),
    participants: z.array(ChatParticipantSchema).catch([]),
    lastMessage: z.string().nullable().catch(null),
    object: z.string().optional(),
  })
  .catchall(z.unknown());
export type Chat = z.infer<typeof ChatSchema>;

// Embedded/denormalized user preview -- same convention this repo's own
// UserPreviewSchema (lib/a1/schemas.ts) uses for posts.search's embedded
// authors and contacts.search's confirmed `{ contacts, users }` side
// array (app/api/contacts/list/route.ts), assumed here on the same
// pattern for a possible `chats.getChats` -> `{ chats, users }` shape --
// unconfirmed for chat-server specifically, degrades to a generic
// name/avatar if absent or shaped differently. `photo` is a bare
// nullable URL, not a MediaDocument: useChat.ts reads `user.photo`
// directly as an <img> src, never through this repo's own
// buildMediaProxyUrl (unlike post/profile photos), so chat-server's own
// user objects are assumed to already be plain, directly-usable URLs.
export const ChatUserSchema = z
  .object({
    _id: z.string(),
    firstName: z.string().catch(""),
    lastName: z.string().catch(""),
    username: z.string().nullable().catch(null),
    photo: z.string().nullable().catch(null),
  })
  .catchall(z.unknown());
export type ChatUser = z.infer<typeof ChatUserSchema>;

// Message shape is entirely UNCONFIRMED (messages_send.d.ts /
// messages_getMessages.d.ts hit the same deadlock as everything else
// under packages/types this session). `_id` mirrors every other
// timestamped resource already confirmed in this repo (Post, Contact
// both have it); `message` as the text field name matches this
// backend's own `messages.*` method-naming convention (send/getMessages/
// saveDraft all say "message", never "content" or "body"); `fromId`
// mirrors the Peer shape already confirmed via useChat.ts. Every field
// below is optional or has a .catch() specifically so a wrong guess
// degrades one message to an empty bubble instead of dropping it or
// failing the whole list -- fix the field name here the moment a live
// response disagrees.
export const MessageSchema = z
  .object({
    _id: z.string(),
    chat: z.string().optional(),
    fromId: z.string().nullable().catch(null),
    message: z.string().catch(""),
    // Unconfirmed unit (seconds vs ms) -- messageDateMs() in
    // chat-mappers.ts guesses from magnitude rather than assuming.
    date: z.number().catch(0),
    media: z.array(z.unknown()).catch([]),
  })
  .catchall(z.unknown());
export type ChatMessage = z.infer<typeof MessageSchema>;

// Best-effort text extraction: some real messages may carry the text
// under a different field name than `message` above (sticker/media-only
// messages may have none at all). Never throws; empty string means
// "render the media/attachment area only, no text bubble" once media
// rendering exists (not in this Phase 1 pass -- see PLAN.md).
export function extractMessageText(msg: ChatMessage): string {
  const raw = msg as unknown as Record<string, unknown>;
  const candidate = raw.message ?? raw.text ?? raw.content ?? raw.body;
  return typeof candidate === "string" ? candidate : "";
}

// Same "seconds vs ms, guess from magnitude" trick as lib/a1/mappers.ts
// already applies elsewhere in this codebase for timestamp fields this
// backend hasn't documented a unit for. A unix-seconds value for "now"
// is currently ~1.8e9; a unix-ms value is ~1.8e12 -- 1e12 cleanly splits
// the two with room to spare either direction.
export function messageDateMs(msg: ChatMessage): number {
  const raw = msg.date;
  if (!raw) return 0;
  return raw > 1_000_000_000_000 ? raw : raw * 1000;
}

export function isPersonalChat(chat: Chat): boolean {
  return (chat.flags & CHAT_FLAG_PERSONAL) === CHAT_FLAG_PERSONAL;
}

// For a personal (1:1) chat, the other participant's user id -- same
// logic as useChat.ts's own chatUserId computed, minus the Pinia store
// (server routes already have session.userId to pass in directly).
export function otherParticipantUserId(chat: Chat, myUserId: string | null): string | null {
  if (!isPersonalChat(chat)) return null;
  const other = chat.participants.find(
    (p) => p.object === "peer-user" && p.user && p.user !== myUserId,
  );
  return other?.user ?? null;
}

// Defensive extraction for chats.getChats's response -- unconfirmed
// exact shape, so this accepts a bare array or the two most likely
// wrapper shapes (mirrors app/api/contacts/list/route.ts's own
// extractContacts, same reasoning: one malformed item, or an
// unanticipated wrapper key, never fails the whole list).
export function extractChats(raw: unknown): Chat[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.chats)) list = obj.chats;
  }
  const out: Chat[] = [];
  for (const item of list) {
    const parsed = ChatSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// See ChatUserSchema's own comment -- a possible `users` side array
// alongside `chats`, same shape contacts.search confirmed. Returns {}
// (never throws) if absent or unrecognized; every call site already
// falls back to chat.title / a generic avatar when a user isn't found
// here.
export function extractChatUsers(raw: unknown): Record<string, ChatUser> {
  const out: Record<string, ChatUser> = {};
  if (!raw || typeof raw !== "object") return out;
  const list = (raw as Record<string, unknown>).users;
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    const parsed = ChatUserSchema.safeParse(item);
    if (parsed.success) out[parsed.data._id] = parsed.data;
  }
  return out;
}

// chats.createChat's response shape is entirely unconfirmed (that
// method's own file, chats/chats.createChat.ts, hit the same read-lock
// as everything else under packages/types this session -- see this
// file's header). Accepts either the created Chat directly, a
// `{chat: ...}` wrapper (the shape contacts.search's own `{contacts,
// users}` pattern would suggest if this backend is consistent about
// it), or -- last resort -- just grabs a top-level `_id` string so a
// slightly different wrapper key still resolves instead of failing the
// whole "start a chat" action.
export function extractCreatedChatId(raw: unknown): string | null {
  const direct = ChatSchema.safeParse(raw);
  if (direct.success) return direct.data._id;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const nested = ChatSchema.safeParse(obj.chat);
    if (nested.success) return nested.data._id;
    if (typeof obj._id === "string") return obj._id;
  }
  return null;
}

// Same shape family as extractChats -- messages.getMessages's response,
// unconfirmed exact wrapper key (`items` vs `messages`).
export function extractMessages(raw: unknown): ChatMessage[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.messages)) list = obj.messages;
  }
  const out: ChatMessage[] = [];
  for (const item of list) {
    const parsed = MessageSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out.sort((a, b) => messageDateMs(a) - messageDateMs(b));
}
