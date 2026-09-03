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

// True for a "no confirmed chat yet" route param (see the comment
// above) -- app/api/chats/read-state/route.ts uses this to skip the
// chats.getChats lookup entirely when there's provably no real Chat
// resource (and so no participants/reaMaxId) to find yet.
export function isNewChatRouteParam(routeParam: string): boolean {
  return routeParam.startsWith(NEW_CHAT_ROUTE_PARAM_PREFIX);
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
    // 2026-09-02 (Aleksandr, live bug report + screenshot: sent messages
    // never flip from single to double tick even after the other side
    // has actually opened and read them) -- root cause confirmed
    // straight off chat-server's own OpenAPI spec (Resource.Message has
    // NO read/delivered field at all, `additionalProperties: false`, so
    // MessageSchema's own guessed `unread` boolean below can never be
    // populated -- it was never wrong, there was just never a message-
    // level field to read). Read state instead lives on the CHAT's own
    // participants array: each Resource.Chat.Participant carries
    // `reaMaxId` ("Position up to which all messages are read" -- read
    // literally off the spec, this really is chat-server's own field
    // name, not a typo introduced here), a per-participant high-water
    // mark. otherParticipantReadMaxId() below reads the OTHER
    // participant's own reaMaxId; messageTickState() compares a message's
    // numeric _id against it.
    reaMaxId: z.number().optional(),
  })
  .catchall(z.unknown());
export type ChatParticipant = z.infer<typeof ChatParticipantSchema>;

// Message shape CONFIRMED LIVE 2026-09-02 (Vercel Logs, real
// messages.send + messages.getMessages responses -- Aleksandr: "чат не
// работает и не синхронизируется с апкой" / "история прошлых чатов
// тоже не подвязывается"): this whole shape was guessed wrong on the
// first pass below it (_id as a string, a flat `message` text field, a
// standalone `fromId` field, `date` as a numeric epoch) -- none of
// that existed, which is why extractMessages() silently returned []
// for every real payload (zod's safeParse rejected `_id: 3` against
// `z.string()` with no .catch() on that one field, dropping the whole
// message). A real message looks like:
//   { _id: 3, flags: 1,
//     peerFrom: { object: "peer-user", user: "usr_..." },
//     peerTo: { object: "peer-chat", chat: "<chatId>" },
//     date: "2026-09-02T10:51:31.567Z",
//     entities: [{ object: "entity-text", text: "Hi! How r u?" }],
//     media: [], reactions: [], object: "message",
//     forwardFrom: null, replyTo: null, editedAt: null, __v: 0 }
// `_id` is a per-chat sequential NUMBER, not a Mongo ObjectId string --
// coerced to a string below so every existing call site (React keys,
// `===` comparisons) keeps working unchanged. `fromId` doesn't exist as
// its own field either; it's derived from `peerFrom.user` via the
// .transform() below, again so every read site (`msg.fromId`) needed no
// changes of its own.
const MessageEntitySchema = z
  .object({
    object: z.string().catch(""),
    text: z.string().optional(),
  })
  .catchall(z.unknown());

const RawMessageSchema = z
  .object({
    _id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    chat: z.string().optional(),
    flags: z.number().catch(0),
    peerFrom: PeerSchema.nullable().catch(null),
    peerTo: PeerSchema.nullable().catch(null),
    date: z.string().catch(""),
    entities: z.array(MessageEntitySchema).catch([]),
    media: z.array(z.unknown()).catch([]),
    // Never seen on a real message yet (see the confirmed shape above --
    // there's no read/delivered field at all today), kept only because
    // messageTickState() below already treats its absence as the safe
    // "delivered, not read" default -- costs nothing to keep, and picks
    // this up for free the moment chat-server actually sends it.
    unread: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const MessageSchema = RawMessageSchema.transform((msg) => ({
  ...msg,
  fromId: msg.peerFrom && msg.peerFrom.object === "peer-user" ? msg.peerFrom.user : null,
}));
export type ChatMessage = z.infer<typeof MessageSchema>;

// Message attachments (Aleksandr, 2026-09-02: "поискать теперь в коде
// всё что у нас живет на скрепке и приготовиться к имплементации") --
// CONFIRMED against chat-server's own OpenAPI spec (Resource.Message.
// Media.Document / MessageInput.Media.Document), not guessed: a real
// document attachment on a message looks like
//   { _id: "...", mimetype: "image/png", fileReference: "...",
//     date: 1234567890, sizes: [{object:"size-photo", w, h, bytes}, ...],
//     attributes: [{object:"attribute-filename", fileName: "..."}, ...],
//     object: "media-doc" }
// -- note the literal `object` value ("media-doc") differs from
// lib/a1/schemas.ts's own MediaDocumentSchema ("media-document", the
// upload.confirm RESPONSE shape for a not-yet-sent upload); both
// describe the same underlying MediaDocument resource, just tagged
// differently depending which endpoint returned it. Kept as its own
// schema here rather than reusing that one so this file doesn't need to
// reach into lib/a1/schemas.ts's own literal, and so a future mismatch
// between the two endpoints' shapes fails independently.
const MessageMediaAttributeSchema = z
  .object({
    object: z.string().catch(""),
    fileName: z.string().optional(),
    // attribute-audio fields (CONFIRMED via aone-api-private-main's
    // packages/types/resources/MediaDocument.d.ts, 2026-09-03 --
    // Resource.MediaDocument.Attribute.AttributeAudio):
    duration: z.number().optional(),
    title: z.string().optional(),
    performer: z.string().optional(),
    waveform: z.string().optional(),
    voice: z.boolean().optional(),
  })
  .catchall(z.unknown());

const MessageMediaSizeSchema = z
  .object({
    object: z.string().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    bytes: z.number().optional(),
  })
  .catchall(z.unknown());

export const MessageMediaDocumentSchema = z
  .object({
    _id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    mimetype: z.string().catch("application/octet-stream"),
    fileReference: z.string(),
    date: z.number().optional(),
    viewed: z.number().optional(),
    ttl: z.number().nullable().optional(),
    ttlSeconds: z.number().optional(),
    flags: z.number().catch(0),
    sizes: z.array(MessageMediaSizeSchema).catch([]),
    attributes: z.array(MessageMediaAttributeSchema).catch([]),
    object: z.literal("media-doc"),
  })
  .catchall(z.unknown());
export type MessageMediaDocument = z.infer<typeof MessageMediaDocumentSchema>;

// `media-doc-deleted` echo (Resource.Message.Media.DocumentDeleted) --
// what a self-destructing voice note turns into once the server has
// actually purged it (`reason: "expired"`), or transiently while an
// UNIMPORTANT staging upload is still in flight. Only `reason ===
// "expired"` is treated as "this voice message is gone" by
// isExpiredVoiceEcho() below; every other/absent reason is left alone
// (fail-closed, same convention as messageDocumentMedia).
export const MessageMediaDocumentDeletedSchema = z
  .object({
    _id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    flags: z.number().catch(0),
    mimetype: z.string().catch(""),
    reason: z.string().optional(),
    object: z.literal("media-doc-deleted"),
  })
  .catchall(z.unknown());
export type MessageMediaDocumentDeleted = z.infer<typeof MessageMediaDocumentDeletedSchema>;

export function messageDeletedDocumentMedia(msg: ChatMessage): MessageMediaDocumentDeleted[] {
  const out: MessageMediaDocumentDeleted[] = [];
  for (const item of msg.media) {
    const parsed = MessageMediaDocumentDeletedSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// `msg.media` is only ever validated as `z.unknown()` at the top level
// (RawMessageSchema, above) -- chat-server's Resource.Message.Media is a
// 7-way union (document / deleted-document / contact / meet / meet-
// invite / post / user, see the OpenAPI spec) and this Phase 1 pass only
// ever SENDS the document variant (see app/api/chats/send/route.ts), so
// this is the only variant worth parsing back out on the read side too --
// every other media kind (a shared contact, a meeting invite, ...) is
// silently skipped here rather than guessed at, same fail-closed
// convention as extractMessages() itself.
export function messageDocumentMedia(msg: ChatMessage): MessageMediaDocument[] {
  const out: MessageMediaDocument[] = [];
  for (const item of msg.media) {
    const parsed = MessageMediaDocumentSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function isImageMediaDocument(doc: MessageMediaDocument): boolean {
  return doc.mimetype.startsWith("image/");
}

// The uploaded file's original name, when the backend echoed one back
// via an `attribute-filename` entry (see components/post-editor.tsx's
// own upload flow -- this app's upload.create/confirm routes don't set
// this themselves, so it's whatever chat-server itself derives/stores).
// Empty string (never undefined) when absent, so call sites can always
// fall back to a generic "Document" label without an extra null check.
export function mediaDocumentFileName(doc: MessageMediaDocument): string {
  const attr = doc.attributes.find(
    (a) => a.object === "attribute-filename" && typeof a.fileName === "string",
  );
  return (attr?.fileName as string | undefined) ?? "";
}

// Byte size (Aleksandr, 2026-09-03, Figma ref node 24368:126: the
// document-attachment row should show a size like "341,8 KB" next to
// the filename) -- `sizes` is a flat array of size variants
// (size-photo/size-original/... for images, but a plain document
// upload only ever seems to report one entry), so this just takes
// whichever entry actually carries a numeric `bytes`, first-found,
// rather than assuming a specific `object` tag the way
// pickDisplaySize() does for images. null (not 0) when nothing in the
// array has one, so callers can hide the size text entirely instead of
// showing a false "0 B".
export function mediaDocumentBytes(doc: MessageMediaDocument): number | null {
  for (const s of doc.sizes) {
    if (typeof s.bytes === "number" && Number.isFinite(s.bytes) && s.bytes > 0) return s.bytes;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Voice messages (Aleksandr, 2026-09-03: "давай следующей фичой сделаем
// запись голосового сообщения") -- a voice note is an ordinary
// media-doc/media-document with an `audio/*` mimetype, carrying an
// `attribute-audio` entry (duration/voice/waveform). CONFIRMED against
// aone-api-private-main's packages/types/resources/MediaDocument.d.ts +
// the Flutter mobile app's own conversation_detail_entity.dart (`Media`
// class -- isVoice/_hasAudioAttribute getters, resolveDeleteWindow()/
// deleteCountdownFraction(), waveform_decoder.dart's decode5BitWaveform/
// normalizePeaks) -- every function below is a direct TS port of that
// confirmed logic, not a guess. See PLAN.md's voice-messages entries for
// the full research writeup (screen recordings + Figma cross-check).
// ---------------------------------------------------------------------------

export type VoiceAttribute = {
  duration: number;
  voice: boolean;
  waveform?: string;
  title?: string;
  performer?: string;
};

function findAudioAttribute(doc: MessageMediaDocument) {
  return doc.attributes.find((a) => a.object === "attribute-audio") ?? null;
}

// Raw `attribute-audio` entry, typed -- null when the document carries
// none (a plain file/image attachment).
export function messageVoiceAttribute(doc: MessageMediaDocument): VoiceAttribute | null {
  const attr = findAudioAttribute(doc);
  if (!attr) return null;
  return {
    duration: typeof attr.duration === "number" ? attr.duration : 0,
    voice: attr.voice === true,
    waveform: typeof attr.waveform === "string" ? attr.waveform : undefined,
    title: attr.title,
    performer: attr.performer,
  };
}

// Direct port of the Flutter app's `Media.isVoice` getter (minus the
// `_isStagingDeletedAudio`/`voice_`-local-id branches, which are Hive-
// outbox-specific and don't apply to this REST-based optimistic-send
// model -- the web side's own pending-voice bubbles are tracked
// separately, see PendingMessage.pendingVoice in app/chats/[chatId]/
// page.tsx, not via a synthetic media item). A bare document with only
// a fileReference is intentionally NOT voice -- otherwise every
// non-audio attachment coming back from the backend would misrender as
// an unplayable voice bubble.
export function isVoiceMediaDocument(doc: MessageMediaDocument): boolean {
  const mime = doc.mimetype.toLowerCase().trim();
  if (mime.startsWith("image/") || mime.startsWith("video/")) return false;
  if (mime.startsWith("audio/")) return true;
  const attr = findAudioAttribute(doc);
  if (!attr) return false;
  return attr.voice === true || (typeof attr.duration === "number" && attr.duration > 0) || typeof attr.waveform === "string";
}

export function voiceDurationSeconds(doc: MessageMediaDocument): number {
  return messageVoiceAttribute(doc)?.duration ?? 0;
}

// Base64 -> bytes, browser-safe (atob, not Buffer -- this file runs
// client-side in bubble rendering, not just in API routes).
function base64ToBytes(encoded: string): Uint8Array | null {
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// Direct port of waveform_decoder.dart's `decode5BitWaveform` -- 5-bit
// peak values (0..31), LSB-first, read via a 16-bit window straddling
// two bytes so the last partial byte is handled the same way the
// Telegram desktop reference implementation does (comment links the
// exact tdesktop source line in the Dart original).
export function decode5BitWaveform(bytes: Uint8Array): number[] {
  const bitsCount = bytes.length * 8;
  const valuesCount = Math.floor(bitsCount / 5);
  if (valuesCount === 0) return [];
  const result = new Array<number>(valuesCount);
  for (let i = 0; i < valuesCount; i++) {
    const byteIndex = Math.floor((i * 5) / 8);
    const bitShift = (i * 5) % 8;
    const low = bytes[byteIndex] ?? 0;
    const high = byteIndex + 1 < bytes.length ? (bytes[byteIndex + 1] ?? 0) : 0;
    const value = low + (high << 8);
    result[i] = (value >> bitShift) & 0x1f;
  }
  return result;
}

export function decodeBase64Waveform(encoded: string | undefined | null): number[] | null {
  if (!encoded) return null;
  const bytes = base64ToBytes(encoded);
  if (!bytes) return null;
  return decode5BitWaveform(bytes);
}

export function resampleWaveform(samples: number[], targetCount: number): number[] {
  if (samples.length === targetCount) return samples.slice();
  if (samples.length === 0) return new Array(targetCount).fill(0);
  if (samples.length === 1) return new Array(targetCount).fill(samples[0]);
  const result: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const t = targetCount === 1 ? 0 : i / (targetCount - 1);
    const srcIndex = t * (samples.length - 1);
    const lo = Math.floor(srcIndex);
    const hi = Math.min(samples.length - 1, Math.ceil(srcIndex));
    const frac = srcIndex - lo;
    result.push((samples[lo] ?? 0) * (1 - frac) + (samples[hi] ?? 0) * frac);
  }
  return result;
}

// Resamples raw 0..31 peaks into `barCount` normalised heights in
// [minHeight, 1], scaled by the loudest peak so quiet clips still show
// readable bars -- same as normalizePeaks() in the Dart original.
export function normalizeWaveformPeaks(peaks: number[], barCount: number, minHeight = 0.06): number[] | null {
  if (peaks.length === 0 || barCount <= 0) return null;
  const resampled = resampleWaveform(peaks, barCount);
  let peak = 0;
  for (const v of resampled) if (v > peak) peak = v;
  if (peak < 1e-4) return null;
  return resampled.map((v) => Math.min(1, Math.max(minHeight, v / peak)));
}

export function decodeWaveformBars(encoded: string | undefined | null, barCount: number, minHeight = 0.06): number[] | null {
  const peaks = decodeBase64Waveform(encoded);
  if (!peaks || peaks.length === 0) return null;
  return normalizeWaveformPeaks(peaks, barCount, minHeight);
}

// Self-destruct flags bitmask (CONFIRMED, @aone/constants MESSAGE_FLAG /
// the Dart Media class's own `_flagTimeDestroy`/`_flagViewDestroy`).
export const VOICE_FLAG_TIME_DESTROY = 1 << 0;
export const VOICE_FLAG_VIEW_DESTROY = 1 << 1;

export function isVoiceViewDestroy(doc: MessageMediaDocument): boolean {
  return (doc.flags & VOICE_FLAG_VIEW_DESTROY) !== 0;
}

export type VoiceDeleteWindow = { startUnix: number; expiresUnix: number; pending: boolean };

export type VoiceDeleteWindowOptions = {
  /** The message's own send date, ms epoch (ChatMessage via messageDateMs()). */
  messageDateMs?: number | null;
  nowMs?: number;
  /** Local optimistic open-timer, set the instant the RECIPIENT presses play,
   * before the server echoes back an authoritative `viewed`/`ttl` -- unix
   * seconds, mirrors chat_detail_cubit.dart's voiceDeleteStartedCache. */
  localStartUnix?: number | null;
  localExpiresUnix?: number | null;
};

// Direct port of `Media.resolveDeleteWindow()` (conversation_detail_
// entity.dart) -- resolves the ACTIVE delete window for a self-
// destructing voice note, in this priority order: (1) server-recorded
// `viewed` is authoritative once present; (2) a local optimistic open-
// timer, until the server echoes back; (3) VIEW_DESTROY + never opened
// -> pending (full bar, countdown hasn't started); (4) an absolute `ttl`
// staging window (pre-open ~7 day countdown); (5) a bare `ttlSeconds`
// with no ttl yet -> pending. Returns null when the doc has no delete
// window at all (not self-destructing).
export function resolveVoiceDeleteWindow(
  doc: MessageMediaDocument,
  opts: VoiceDeleteWindowOptions = {},
): VoiceDeleteWindow | null {
  const nowMs = opts.nowMs ?? Date.now();
  const parsedTtl = typeof doc.ttl === "number" && Number.isFinite(doc.ttl) ? doc.ttl : null;
  const durationSec = typeof doc.ttlSeconds === "number" && doc.ttlSeconds > 0 ? doc.ttlSeconds : null;
  const viewed = typeof doc.viewed === "number" && doc.viewed > 0 ? doc.viewed : null;

  if (viewed != null) {
    if (parsedTtl != null && parsedTtl > viewed) {
      return { startUnix: viewed, expiresUnix: parsedTtl, pending: false };
    }
    if (durationSec != null) {
      return { startUnix: viewed, expiresUnix: viewed + durationSec, pending: false };
    }
  }

  const localStart = opts.localStartUnix ?? null;
  const localExpires = opts.localExpiresUnix ?? null;
  if (viewed == null && localStart != null && localExpires != null && localExpires > localStart) {
    return { startUnix: localStart, expiresUnix: localExpires, pending: false };
  }

  if (durationSec == null && parsedTtl == null) return null;

  if (isVoiceViewDestroy(doc) && viewed == null && localStart == null) {
    return { startUnix: 0, expiresUnix: durationSec ?? 1, pending: true };
  }

  if (parsedTtl != null && parsedTtl > 1_000_000_000) {
    const startUnix = doc.date && doc.date > 0 ? doc.date : opts.messageDateMs != null ? Math.floor(opts.messageDateMs / 1000) : null;
    if (startUnix != null && parsedTtl > startUnix) {
      return { startUnix, expiresUnix: parsedTtl, pending: false };
    }
    const nowUnix = Math.floor(nowMs / 1000);
    if (parsedTtl > nowUnix) {
      return { startUnix: parsedTtl - 1, expiresUnix: parsedTtl, pending: false };
    }
  }

  if (durationSec == null) return null;
  return { startUnix: 0, expiresUnix: durationSec, pending: true };
}

// Direct port of `Media.deleteCountdownFraction()` -- remaining lifetime
// fraction [0,1], sub-second precision so a left-border countdown
// animation drains smoothly instead of jumping once per second. null
// when the doc has no active delete window at all.
export function voiceDeleteCountdownFraction(doc: MessageMediaDocument, opts: VoiceDeleteWindowOptions = {}): number | null {
  const window = resolveVoiceDeleteWindow(doc, opts);
  if (window == null) return null;
  if (window.pending) return 1;
  const nowMs = opts.nowMs ?? Date.now();
  const expiresMs = window.expiresUnix * 1000;
  if (nowMs >= expiresMs) return 0;
  const totalSec = window.expiresUnix - window.startUnix;
  if (totalSec <= 0) return null;
  const remainingMs = expiresMs - nowMs;
  return Math.min(1, Math.max(0, remainingMs / (totalSec * 1000)));
}

// A voice note the server has actually purged (media-doc-deleted echo
// with reason "expired") -- the message row may still carry caption
// text, but the clip itself is gone and must not offer to play.
export function isExpiredVoiceEcho(doc: MessageMediaDocumentDeleted): boolean {
  return doc.reason === "expired";
}

// Shared-contact attachment (Aleksandr, 2026-09-02: "прокинь пока на
// бэке возможность отправлять контакты. Актуальный UI я потом тебе
// покажу") -- CONFIRMED against the OpenAPI spec, Resource.Message.
// Media.Contact: `{ userId, phoneNumber, firstName, lastName,
// object: "media-contact" }`, all five required. Same literal
// "media-contact" on both the send side (MessageInput.Media.Contact)
// and this read side, unlike the document variant above -- no
// send-vs-read tag mismatch to account for here. This is data-layer
// only for now, per Aleksandr's own framing -- no picker UI, no
// message-bubble rendering yet; see app/api/chats/send/route.ts's own
// comment for the send-side half.
export const MessageMediaContactSchema = z
  .object({
    userId: z.string(),
    phoneNumber: z.string().catch(""),
    firstName: z.string().catch(""),
    lastName: z.string().catch(""),
    object: z.literal("media-contact"),
  })
  .catchall(z.unknown());
export type MessageMediaContact = z.infer<typeof MessageMediaContactSchema>;

// Same "only the variant we actually send" convention as
// messageDocumentMedia above.
export function messageContactMedia(msg: ChatMessage): MessageMediaContact[] {
  const out: MessageMediaContact[] = [];
  for (const item of msg.media) {
    const parsed = MessageMediaContactSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// Calculation/quote attachment (Aleksandr, 2026-09-02, native-app
// screenshot of an invoice-style card with Description/Cost/Qty/Subt
// columns: "поищи плз, у нас есть еще такая фича, calculations") --
// CONFIRMED against the OpenAPI spec, but a meaningfully DIFFERENT
// shape of "attachment" than the two above: it's not a media.getUrl-
// style resource at all, it's Resource.RichText.Calculation -- a
// member of the `entities` union (same array `entity-text` already
// lives in), not `media`. Same literal on both send and read (no
// MessageInput-vs-Resource split): `{ note, currency, rows: [{
// quantity, unitAmount (integer cents), description }], object:
// "entity-calculation" }`. Data-layer only for now, same as the
// contact attachment above -- Aleksandr wants to bring his own
// calculator-form UI (add/remove row, currency picker, running total)
// separately; see app/api/chats/send/route.ts's own comment for the
// send-side half and why it does NOT also set `message` when a
// calculation is being sent.
const MessageCalculationRowSchema = z
  .object({
    quantity: z.number().catch(0),
    unitAmount: z.number().catch(0),
    description: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

export const MessageCalculationSchema = z
  .object({
    note: z.string().catch(""),
    currency: z.string().catch(""),
    rows: z.array(MessageCalculationRowSchema).catch([]),
    object: z.literal("entity-calculation"),
  })
  .catchall(z.unknown());
export type MessageCalculation = z.infer<typeof MessageCalculationSchema>;

// Unlike messageDocumentMedia/messageContactMedia (an array -- several
// documents or contacts can ride one message), every real example in
// the OpenAPI spec shows at most one calculation per message, so this
// returns the first match (or null) rather than a list.
export function messageCalculation(msg: ChatMessage): MessageCalculation | null {
  for (const item of msg.entities) {
    const parsed = MessageCalculationSchema.safeParse(item);
    if (parsed.success) return parsed.data;
  }
  return null;
}

// Real text lives under `entities` (an array of typed spans -- only
// `entity-text` carries a `.text` string; other entity types are just
// passed through by MessageEntitySchema's catchall and ignored here) --
// NOT a flat `message`/`text`/`content`/`body` field, which is what
// this function guessed before the shape above was confirmed live.
// Multiple entity-text entities (if a message ever has more than one)
// are concatenated in order. Never throws; empty string means "render
// the media/attachment area only, no text bubble" once media rendering
// exists (not in this Phase 1 pass -- see PLAN.md).
export function extractMessageText(msg: ChatMessage): string {
  const fromEntities = msg.entities
    .filter((e) => e.object === "entity-text" && typeof e.text === "string")
    .map((e) => e.text as string)
    .join("");
  if (fromEntities) return fromEntities;
  // Kept as a fallback for any message shape this session hasn't seen a
  // live example of yet -- costs nothing, never fires against the
  // confirmed shape above.
  const raw = msg as unknown as Record<string, unknown>;
  const candidate = raw.message ?? raw.text ?? raw.content ?? raw.body;
  return typeof candidate === "string" ? candidate : "";
}

// `date` is a plain ISO 8601 string on every real message (see the
// confirmed shape above), not a numeric epoch -- replaces the old
// "guess seconds vs ms from magnitude" trick, which never applied here
// to begin with.
export function messageDateMs(msg: ChatMessage): number {
  if (!msg.date) return 0;
  const ms = Date.parse(msg.date);
  return Number.isNaN(ms) ? 0 : ms;
}

// Read/delivered tick state for one of MY OWN messages (never rendered
// for the other side's messages -- Aleksandr, 2026-09-02: "если это
// тебе прислали, то галочек нет вовсе"). `unread === false` -> read
// (double, tinted); `unread === true` or absent -> sent/delivered
// (double, muted) -- absent-means-delivered is the safer default over
// absent-means-read, since a wrong guess here just under-tints a tick
// rather than falsely claiming something was read.
export type MessageTickState = "read" | "delivered";
// `peerReadMaxId` -- the other participant's ChatParticipant.reaMaxId,
// see that field's own comment above for why this is now the primary
// signal instead of the never-populated `unread` guess (kept as a
// first check purely so a real `unread` value, if chat-server ever
// does start sending one, keeps taking priority for free). A message
// is "read" once its own numeric _id is at or below the peer's
// reaMaxId high-water mark -- exactly the same comparison chat-
// server's own Vue reference client (useChat.ts) does.
export function messageTickState(msg: ChatMessage, peerReadMaxId?: number | null): MessageTickState {
  if (msg.unread === false) return "read";
  if (peerReadMaxId != null) {
    const id = Number(msg._id);
    if (!Number.isNaN(id) && id <= peerReadMaxId) return "read";
  }
  return "delivered";
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
// 2026-09-02 (Aleksandr, live bug report + screen recording: chat list
// shows "Повідомлень ще немає" even though a real chat with real
// messages exists) -- root-caused via Vercel Logs against a real
// chats.getChats response, same method as the messages.getMessages fix.
// TWO real mismatches, both now fixed:
//
// 1) `lastMessage` on a real Chat is a bare NUMBER (`"lastMessage":221`
//    in the live payload) -- the same per-chat sequential id type
//    MessageSchema's own `_id` was already confirmed to be. The old
//    `z.union([z.string(), MessageSchema])` only ever matched a STRING
//    bare-id or a full embedded object, so a real chat's numeric
//    lastMessage failed the whole union and silently became `null` via
//    `.catch(null)`. Downstream, app/api/chats/list/route.ts's own
//    `.filter((item) => item.title || item.lastMessageId)` -- there to
//    drop genuinely-empty rows -- was dropping every real 1:1 chat
//    instead, since `title` is ALSO always "" for a personal chat (see
//    point 2) and `lastMessageId` was `null` because of this exact bug.
//    Widened to accept `z.number()` too, coerced to a string via the
//    same `.transform()` shape MessageSchema's own `_id` uses, so every
//    existing `typeof lm === "string"` / `lm?._id` read site downstream
//    keeps working unchanged.
// 2) The real chats.getChats response is a BARE ARRAY of Chat objects --
//    confirmed live, no `{ chats, users }` wrapper at all, unlike
//    contacts.search's confirmed shape. `extractChatUsers` below always
//    returns `{}` today because of this; lib/a1/chat-mappers.ts's
//    resolveChatDisplay() already fails closed onto `chat.title` when
//    no user resolves (which is also always "" for a personal chat) --
//    flagged here, not fixed, since there's no confirmed way to batch-
//    resolve participant names/photos from chat-server yet (no
//    users.getUsers-style endpoint seen anywhere in this app to build
//    on) -- guessing one blind risks the same "guessed field, silently
//    wrong" failure mode this whole file exists to avoid repeating.
export const ChatSchema = z
  .object({
    _id: z.string(),
    title: z.string().catch(""),
    flags: z.number().catch(0),
    participants: z.array(ChatParticipantSchema).catch([]),
    lastMessage: z
      .union([z.string(), z.number().transform((v) => String(v)), MessageSchema])
      .nullable()
      .catch(null),
    unreadCount: z.number().catch(0).optional(),
    // 2026-09-02: widened to also carry `entities` -- the one real
    // draft payload seen live so far (Vercel Logs, CHAT_LIST_DEBUG) had
    // an empty `message` AND empty `entities`, so which one actually
    // carries real text was never confirmed either way. Given a real
    // MESSAGE's text turned out to live in `entities` and NOT a flat
    // field (see MessageSchema's own header), a draft -- same
    // `draft-message` object family -- almost certainly follows the
    // same convention. chatDraftText() below now checks both, entities
    // first, so this is right the moment a non-empty draft is seen
    // either way.
    draft: z
      .union([
        z.string(),
        z
          .object({ message: z.string().catch(""), entities: z.array(MessageEntitySchema).catch([]) })
          .catchall(z.unknown()),
      ])
      .nullable()
      .optional(),
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

// Same "other participant" lookup as above, but returns their own
// reaMaxId instead of their user id -- see ChatParticipantSchema's own
// comment for what this field is and messageTickState() for how it
// turns into a tick. null when there's no personal chat, no other
// participant, or that participant simply has no reaMaxId yet (a chat
// they've never opened) -- messageTickState() already treats null the
// same safe "assume delivered, not read" way it always has.
export function otherParticipantReadMaxId(chat: Chat, myUserId: string | null): number | null {
  if (!isPersonalChat(chat)) return null;
  const other = chat.participants.find(
    (p) => p.object === "peer-user" && p.user && p.user !== myUserId,
  );
  return typeof other?.reaMaxId === "number" ? other.reaMaxId : null;
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
// only rendered when this resolves to non-empty text. Entities first,
// same fallback order as extractMessageText -- see the draft field's
// own schema comment above for why.
export function chatDraftText(chat: Chat): string {
  const d = chat.draft;
  if (!d) return "";
  if (typeof d === "string") return d;
  const fromEntities = d.entities
    .filter((e) => e.object === "entity-text" && typeof e.text === "string")
    .map((e) => e.text as string)
    .join("");
  return fromEntities || d.message || "";
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
