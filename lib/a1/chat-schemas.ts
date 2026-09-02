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

// 2026-09-02 (Aleksandr, live bug report: "как открыть с кем то чат? Я
// из контактов нажимаю - не срабатывает"): chats.createChat -- what
// app/api/chats/open/route.ts used to fall back to when no existing
// personal chat was found -- turned out to be chat-server's GROUP-chat
// creator, not a way to pre-create an empty 1:1 chat: its own route
// file (chat-server/src/api/v1/chats/chats.createChat.ts) literally
// documents itself as "Create group chat with participants", takes
// `{ title, participants: Peer[] }` (nothing like this repo's earlier
// `{ users: [id] }` guess), and returns `{ chatId }` (not `{_id}` /
// `{chat:{...}}` as extractCreatedChatId used to guess).
//
// Read directly off chat-server's own source this time (no more
// guessing): services/chats/methods/_peerToPeerChat.ts +
// resolvePersonalChat.ts, and services/chats/methods/getMessages.ts +
// the messages.getMessages route handler (api/v1/messages/
// messages.getMessages.ts) -- both messages.getMessages AND
// messages.send accept `peerTo: { object: "peer-user", user: id }`
// directly, with NO existing chat required. getMessages just runs
// messageService.search (returns [] for a conversation with no
// messages yet, doesn't throw); send resolves-or-creates the personal
// chat transparently via resolvePersonalChat (a Mongo
// findOneAndUpdate upsert keyed on the two participants) the moment a
// message actually goes out. So a personal chat never needs to be
// pre-created at all -- the chat window can always address someone by
// their user id, and the same personal chat is found (or created,
// exactly once) the first time a message is actually sent.
//
// Route param convention for app/chats/[chatId]/page.tsx: a real Chat
// _id (bare ObjectId hex string) OR `u_<userId>` meaning "no confirmed
// chat yet, address this user directly" -- chosen since chat-server's
// real ids can never start with this prefix. app/api/chats/open/
// route.ts hands back `u_<userId>` instead of trying to create
// anything when chats.getChats didn't already have a personal chat
// with that contact; app/api/chats/messages, .../send and .../typing
// all resolve either form via peerForRouteParam below.
const NEW_CHAT_ROUTE_PARAM_PREFIX = "u_";

export function chatRouteParamForUser(userId: string): string {
  return `${NEW_CHAT_ROUTE_PARAM_PREFIX}${userId}`;
}

export function peerForRouteParam(routeParam: string): Peer {
  if (routeParam.startsWith(NEW_CHAT_ROUTE_PARAM_PREFIX)) {
    return { object: "peer-user", user: routeParam.slice(NEW_CHAT_ROUTE_PARAM_PREFIX.length) };
  }
  return peerForChat(routeParam);
}

// useChat.ts checks `checkBitmask(chat.value.flags, CHAT_FLAG.PERSONAL)`.
// CONFIRMED 2026-09-02 (packages/constants/src/chats.constants.ts, read
// directly off the source): `PERSONAL: 1 << 0` -- the original guess of
// 1 was right.
export const CHAT_FLAG_PERSONAL = 1;

export const ChatParticipantSchema = z
  .object({
    object: z.enum(["peer-user", "peer-chat"]),
    user: z.string().optional(),
    chat: z.string().optional(),
  })
  .catchall(z.unknown());
export type ChatParticipant = z.infer<typeof ChatParticipantSchema>;

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
//
// `unread` (2026-09-02, chat UI redesign per Figma): guessed boolean
// for per-message read/delivered state so the web bubble can show the
// same single-vs-double checkmark the app does ("покажем статус read,
// delivered, вот этими галочками, там две или одна"). Chat-server's
// real field could just as easily be a `status` enum -- this is
// unconfirmed, first live response that disagrees wins.
export const MessageSchema = z
  .object({
    _id: z.string(),
    chat: z.string().optional(),
    fromId: z.string().nullable().catch(null),
    message: z.string().catch(""),
    // Unconfirmed unit (seconds vs ms) -- messageDateMs() below guesses
    // from magnitude rather than assuming.
    date: z.number().catch(0),
    media: z.array(z.unknown()).catch([]),
    unread: z.boolean().optional(),
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

// Read/delivered tick state for one of MY OWN messages (never rendered
// for the other side's messages -- Aleksandr, 2026-09-02: "если это
// тебе прислали, то галочек нет вовсе"). `unread === false` -> read
// (double, tinted); `unread === true` or absent -> sent/delivered
// (double, muted) -- absent-means-delivered is the safer default over
// absent-means-read, since a wrong guess here just under-tints a tick
// rather than falsely claiming something was read.
export type MessageTickState = "read" | "delivered";
export function messageTickState(msg: ChatMessage): MessageTickState {
  return msg.unread === false ? "read" : "delivered";
}

// Confirmed via useChat.ts: _id, title, flags, participants, lastMessage
// (a message id -- NOT an embedded message object, useChat.ts looks it
// up separately in its messages store). Everything else this backend's
// Chat resource might carry (photo, unreadCount, pinnedMessage, ...) is
// unconfirmed -- caught by .catchall so an unrecognized extra field
// never fails parsing; nothing here assumes those fields exist.
//
// 2026-09-02 (chat UI redesign per Figma -- list row needs a message
// preview, unread badge, and red draft text): `lastMessage` is widened
// to accept the confirmed bare-id string OR a full embedded message
// object, in case chats.getChats actually already returns the latter
// and the old `z.string()`-only guess was silently discarding it via
// its own `.catch(null)`. `unreadCount`/`draft` are new best-effort
// guesses (common field names for this shape of feature) with no
// precedent in useChat.ts at all -- read via chatUnreadCount()/
// chatDraftText() below, which fall back to "nothing to show" rather
// than a wrong number/string.
export const ChatSchema = z
  .object({
    _id: z.string(),
    title: z.string().catch(""),
    flags: z.number().catch(0),
    participants: z.array(ChatParticipantSchema).catch([]),
    lastMessage: z.union([z.string(), MessageSchema]).nullable().catch(null),
    unreadCount: z.number().catch(0).optional(),
    draft: z.union([z.string(), z.object({ message: z.string().catch("") }).catchall(z.unknown())]).nullable().optional(),
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

// Resolves chat.lastMessage into a list-row preview, only when it came
// back as an embedded object (see ChatSchema's own comment) -- null
// when it's still just a bare id, same "degrade to nothing" rule as
// every other guessed field here.
export type ChatLastMessagePreview = { text: string; dateMs: number; fromId: string | null };
export function chatLastMessagePreview(chat: Chat): ChatLastMessagePreview | null {
  const lm = chat.lastMessage;
  if (!lm || typeof lm === "string") return null;
  return { text: extractMessageText(lm), dateMs: messageDateMs(lm), fromId: lm.fromId };
}

export function chatUnreadCount(chat: Chat): number {
  return typeof chat.unreadCount === "number" && chat.unreadCount > 0 ? chat.unreadCount : 0;
}

// Red "Draft: ..." line (Aleksandr, 2026-09-02: "показываем также draft
// message, типа красным, если ты набрал сообщение, но не отправил") --
// only rendered when this resolves to non-empty text.
export function chatDraftText(chat: Chat): string {
  const d = chat.draft;
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.message ?? "";
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
