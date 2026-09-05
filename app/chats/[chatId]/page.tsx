// app/chats/[chatId]/page.tsx -- Phase 1 web chat window (Aleksandr,
// 2026-09-01). Message history + send box + a best-effort "typing"
// pulse on the input. Polling transport, no WS relay yet -- see
// app/api/chats/messages/route.ts and app/api/chats/typing/route.ts's
// own headers for exactly what that does and doesn't cover yet
// (notably: sending a typing action works, SEEING the other side's
// typing indicator does not, until Phase 2's realtime relay exists --
// the header's typing pill below is wired up but has nothing live to
// show yet, see its own comment).
//
// 2026-09-02: visual pass to match the app's own chat UI (Aleksandr:
// "хочу использовать определённый UI для чатов, такой же, как у нас в
// приложении"), pulled from Figma (node 24360:7305, "(3) Chat view +
// Typing indicator") via the Figma MCP -- exact colors/spacing/icons
// for the parts that data layer already supports; see PLAN.md's
// 2026-09-02 chat-UI entry for what's still guessed (per-message read
// ticks) vs load-bearing on the existing polling transport.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BLUR_DATA_URL, MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { LottiePlayer } from "@/components/lottie-player";
import {
  describeMessagePreview,
  encodeBase64Waveform,
  extractMessageText,
  isImageMediaDocument,
  isStickerMediaDocument,
  isVideoMediaDocument,
  isVoiceMediaDocument,
  mediaDocumentBytes,
  mediaDocumentFileName,
  messageCalculation,
  messageContactMedia,
  messageDateMs,
  messageDocumentMedia,
  messageTickState,
  SELF_DESTRUCT_VOICE_FLAGS,
  SELF_DESTRUCT_VOICE_TTL_SECONDS,
  type ChatMessage,
  type MessageCalculation,
  type MessageMediaDocument,
} from "@/lib/a1/chat-schemas";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { MessageActionsMenu, ReplyComposeBar, MessageReplyQuote, ReplyIcon } from "@/components/chat/message-actions-menu";
import { buildMediaProxyUrl, buildMediaDownloadUrl } from "@/lib/a1/media-proxy";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import type { MediaUploadUsage } from "@/lib/a1/schemas";
import {
  ChatAttachmentSpinner,
  ChatBackArrow,
  ChatCalculatorAttachIcon,
  ChatCatFieldIcon,
  ChatContactAttachIcon,
  ChatFileAttachIcon,
  ChatMeetingAttachIcon,
  ChatPaperclipButton,
  ChatPhotoAttachIcon,
  ChatStorageIcon,
  ChatTypingDots,
  MessageTicks,
} from "@/components/chat/icons";
import { ChatCalculationCard } from "@/components/chat/calculation-card";
import { ChatFileTypeIcon, fileKindFromName, DocumentFallbackLabel } from "@/components/chat/file-type-icon";
import { PdfPageThumbnail } from "@/components/chat/pdf-thumbnail";
import { CurrencyPickerModal } from "@/components/chat/currency-picker-modal";
import { DailyUploadsModal } from "@/components/daily-uploads-modal";
import { ContactMessageCard, type ContactCardSummary } from "@/components/chat/contact-message-card";
import { ContactsPickerModal, type PickedContact } from "@/components/chat/contacts-picker-modal";
import { MeetingsMenuModal, quickInviteCatAnimation } from "@/components/chat/meetings-menu-modal";
import { ScheduleMeetingModal } from "@/components/chat/schedule-meeting-modal";
import { MeetingMessageCard } from "@/components/chat/meeting-message-card";
import {
  encodeMeetingText,
  decodeMeetingText,
  encodeMeetingAcceptText,
  decodeMeetingAcceptText,
  type MeetingAcceptPayload,
} from "@/lib/a1/meeting-protocol";
import { ChatPhotoViewer, type ChatViewerImage } from "@/components/chat/photo-viewer";
import { ChatPhotoGrid } from "@/components/chat/photo-grid";
import { useVoiceRecorder, formatVoiceTimer, type VoiceRecordingResult } from "@/components/chat/voice-recorder";
import { rememberLocalVoiceWaveform } from "@/lib/voice-local-waveform-cache";
import { VoiceRecordButton, VoiceRecordingBar, VoiceMicDeniedNotice } from "@/components/chat/voice-message";
import { VoiceMessageBubble, PendingVoiceBubble } from "@/components/chat/voice-bubble";

type LoadState = "loading" | "signed-out" | "error" | "ready";

// 2026-09-04 -- mirrors app/api/chats/send/route.ts's own SendInput.meet
// union (see that field's comment for the full protocol writeup): the
// bare "invite" marker a proposal sends, or a "confirm" carrying the
// real meeting time/link, sent only once accepted. Kept as its own type
// here (not imported from the route file, a server module) since
// send()/attemptSend() just need the shape, not the zod schema.
type MeetSendPayload = { kind: "invite" } | { kind: "confirm"; at: number; url: string | null };

// See the `pendingMessages` state comment (below, in the component) for
// why this exists -- a locally-built stand-in for a message that was
// just sent but hasn't shown up in a real messages.getMessages response
// yet. Same shape as ChatMessage (so every existing render/format
// helper -- extractMessageText, messageDateMs, messageTickState --
// works on it unchanged) plus two fields nothing server-side ever sets.
// 2026-09-02 follow-up (Aleksandr: "надо учесть ошибки с сетью, когда
// сообщение не дошло и тд. Нам надо показывать маленький лоадер и при
// нажатии на сообщение модалку возле него с возможностью отменить
// сообщение, но если не отменил, когда сеть появилась оно должно
// дослаться") -- `failed` tracks whether the LAST send attempt for
// this bubble came back bad (network exception, or any non-401 error
// response): false while a request for it is actually in flight (shows
// a spinner) or once it's gone out fine (removed by load()'s own
// reconciliation the moment the real message shows up); true while
// it's sitting there waiting for a retry (still shows a small "not
// sent" indicator, and is what the retry-on-reconnect pass below scans
// for). A 401 is NOT put into this state at all -- see attemptSend --
// that's not a network hiccup, it's "you're signed out", and retrying
// it silently forever would just be wrong.
// One attachment mid-upload or ready to send from the compose bar --
// local-only, never sent to the server as-is (only `fileReference`
// survives into the messages.send POST once `status === "ready"`, see
// send() below). `previewUrl` is a local blob: URL (images only) so the
// thumbnail shows instantly, before the upload round-trip even starts.
type PendingAttachment = {
  localId: string;
  // 2026-09-03 (Aleksandr, "давай следующей фичой сделаем запись
  // голосового сообщения"): "voice" reuses this exact same local-
  // upload-preview/status lifecycle (uploading -> ready -> error) and
  // send()'s existing readyAttachments plumbing wholesale -- a recorded
  // clip is uploaded through the identical /api/upload/create -> S3 ->
  // /api/upload/confirm pipeline handleAttachFile already runs for
  // photos/files (see handleVoiceFinish below), so there was no reason
  // to invent a parallel pendingVoice path. It skips the compose-bar
  // staging area though (see handleVoiceFinish's own comment) -- a
  // voice PendingAttachment only ever exists inside a PendingMessage's
  // pendingAttachments, never in the top-level `attachments` queue.
  kind: "image" | "file" | "voice";
  fileName: string;
  mimetype: string;
  previewUrl?: string;
  status: "uploading" | "ready" | "error";
  fileReference?: string;
  // Voice-only: local recorder output, needed to render the pending
  // bubble's own player before load() reconciles it into a real
  // message (lib/a1/chat-schemas.ts's own messageVoiceAttribute takes
  // over from there).
  durationSeconds?: number;
  waveform?: number[];
  // Set only for the quota-exceeded case (see handleAttachFile below) --
  // a specific, already-localized+formatted reason to show instead of
  // (or alongside) the generic error state every other upload failure
  // still falls back to.
  errorMessage?: string;
  // 2026-09-03: the file's own byte size (post-compression for images,
  // matching the Figma spec's own "Upload size is calculated after
  // compression" note) -- needed both for the size-cap/quota checks in
  // handleAttachFile and for the composer's own running quota-preview
  // banner (selectedBytes below).
  bytes: number;
  // 2026-09-03 (Figma "4.File too large" / "Attachment validation"):
  // true for either half of that section's validation -- over the flat
  // 20 MB single-file cap, or under it but over what's left of today's
  // quota. Distinguishes the RED full-size file card (icon/name/size
  // still visible, a "choose another" retry button) from the plain
  // small-thumbnail "Failed"/"Limit reached" overlay every other
  // attachment error still uses below.
  tooLarge?: boolean;
};

type PendingMessage = ChatMessage & {
  pending: true;
  localId: string;
  failed: boolean;
  // Attachment feature (2026-09-02, Aleksandr: "поискать теперь в коде
  // всё что у нас живет на скрепке и приготовиться к имплементации") --
  // the confirmed uploads this bubble was sent with, kept in their local
  // upload-preview shape (not the server's MessageMediaDocument shape --
  // see lib/a1/chat-schemas.ts's own comment on why those two shapes
  // differ) so the optimistic bubble renders the exact same thumbnail
  // the compose bar was just showing, with zero extra network
  // round-trip, until load()'s own reconciliation swaps this bubble for
  // the real message.
  pendingAttachments?: PendingAttachment[];
  // Contact-attachment feature (2026-09-02) -- same reasoning as
  // pendingAttachments above, but for picked-not-yet-sent contacts:
  // already carries its `summary` (occupation/expertise/avatar) from
  // whichever fetch resolved it first (the picker's own /api/contacts/
  // list call), so the optimistic bubble's ContactMessageCard needs no
  // extra round-trip either.
  pendingContacts?: PickedContact[];
  // 2026-09-03 (Aleksandr, live bug report: a sent calculation didn't
  // show up in the chat right away, not even after a reload -- only
  // after leaving and re-entering the chat) -- sendCalculation() below
  // used to have NO optimistic-bubble step at all (a deliberate scope
  // cut when the feature first shipped, see messageCalculation's call
  // site's own comment), so the table was only ever visible once
  // load()'s poll happened to catch chat-server having indexed it,
  // exactly the same race pendingMessages/attemptSend already solves
  // for text. This closes that gap the same way: an optimistic
  // MessageCalculation, rendered by the same ChatCalculationCard a real
  // message uses.
  pendingCalc?: MessageCalculation;
  // Reply feature (2026-09-05) -- the FULL original ChatMessage this
  // bubble is replying to (not just its id/replyTo shape), captured at
  // send() time so the bubble can render its own reply quote instantly
  // -- see MessageReplyQuote's usage below and attemptSend's own
  // `replyTo` param comment for why the actual POST only ever needs
  // this object's id + fromId, never the whole snapshot.
  replySnapshot?: ChatMessage;
};

function isPendingMessage(msg: ChatMessage | PendingMessage): msg is PendingMessage {
  return (msg as PendingMessage).pending === true;
}

// Small spinner (mid-flight) / "not sent" dot (waiting for a retry) --
// rendered where MessageTicks normally goes, same 11px caption row, so
// a pending bubble never jumps size once it resolves into a real one.
function SendingSpinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.35" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function NotSentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-red-300" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.3" r="1.15" fill="white" />
    </svg>
  );
}

// Attachment feature (2026-09-02): same compression target as
// components/post-editor.tsx's own compressImage (Aleksandr: "фото
// повинні стискатися і зберігатися в розмірі макс 200-300 кб на шт."),
// duplicated here rather than imported -- this session's established
// "self-contained widget" convention (see components/chats-flyout.tsx /
// mini-chat-window.tsx's own header comments): a modest amount of
// duplicated logic beats risking a regression on post-editor.tsx, an
// already-shipped page, by sharing code with it while building
// unsupervised.
const MAX_ATTACHMENT_PHOTO_DIMENSION = 1600;
const MAX_ATTACHMENT_PHOTO_BYTES = 280 * 1024;
// 2026-09-03 (Aleksandr, Figma "Attachments" section, "Attachment
// validation" note -- confirmed against the actual rendered "Max 20 MB"
// text on that section's own "4.File too large" screen, not just the
// annotation): was 25 MB, corrected to the real per-file cap. A second,
// independent cap -- today's remaining daily quota, `uploadUsage` state
// below -- can reject a file that's under this 20 MB limit but would
// still not fit what's left of the day; see handleAttachFile.
const MAX_ATTACHMENT_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;
// app/api/chats/send/route.ts's own SendInput caps `contacts` at 5,
// separate from and lower than the media cap above.
const MAX_CONTACTS_PER_MESSAGE = 5;
// 2026-09-03: "quota banner" trigger thresholds and the localStorage key
// for the attach-menu's one-time teaching banner -- see their own call
// sites below for the exact Figma text these come from.
const QUOTA_BANNER_MIN_COUNT = 3;
const QUOTA_BANNER_MIN_BYTES = 5 * 1024 * 1024;
const DAILY_BANNER_SEEN_KEY = "a1_daily_uploads_banner_seen";
// Calculations feature: one draft row -- description free text, cost
// and quantity kept as raw typed strings (not numbers) so a field can
// sit on "12," or be empty mid-edit without fighting a controlled
// <input>'s own cursor position; parsed only at send time
// (calcRowSubtotal/sendCalculation below). Matches app/api/chats/send/
// route.ts's own SendInput.calculation.rows cap of 50.
type CalcRow = { id: string; description: string; unitAmount: string; quantity: string };
const CALC_MAX_ROWS = 50;

function calcBlankRow(): CalcRow {
  return { id: `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`, description: "", unitAmount: "", quantity: "" };
}

// Accepts a comma OR dot as the decimal separator (Aleksandr's own demo
// typed "1,5") -- everything else stripped, so a stray letter from a
// mis-tap never produces NaN downstream.
function calcParseDecimal(raw: string): number {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Quantity is a whole number on the wire (chat-server's own `quantity:
// UInt`, confirmed in app/api/chats/send/route.ts's own SendInput --
// `z.number().int().min(1)`) -- typed input is digits-only (see the
// row's own onChange below) so this only ever needs to floor+clamp, not
// reject a decimal outright.
function calcParseQuantity(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Row subtotal in the calculator's own display units (not cents --
// conversion to integer cents happens once, at send time, matching
// unitAmount's documented wire format).
function calcRowSubtotal(row: CalcRow): number {
  if (!row.unitAmount.trim()) return 0;
  return calcParseDecimal(row.unitAmount) * calcParseQuantity(row.quantity);
}

// 2026-09-03 (Aleksandr, 3 screenshots of the real reference app: a
// row showing "12" / total "258 SGD", never "12.00"/"258.00") --
// corrects an earlier guess at always padding to 2 decimals; whole
// numbers now render bare, a typed decimal still shows up to 2 places.
function calcFormatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function compressAttachmentImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_ATTACHMENT_PHOTO_DIMENSION || height > MAX_ATTACHMENT_PHOTO_DIMENSION) {
      const scale = MAX_ATTACHMENT_PHOTO_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let blob: Blob | null = null;
    let quality = 0.85;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= MAX_ATTACHMENT_PHOTO_BYTES || quality <= 0.35) break;
      quality -= 0.15;
    }
    if (!blob) return file;
    const base = file.name.replace(/\.\w+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// 2026-09-05 (Aleksandr: "Почему у меня при каждом заходе чаты грузятся
// по новой? Мы можем их кешировать?") -- this page used to always mount
// into state "loading" with an empty message list and show the loading
// skeleton on every single visit, even reopening a chat that was showing
// seconds ago. app/chats/page.tsx already solved the exact same problem
// for the chat LIST via a per-account sessionStorage cache (see that
// file's own 2026-09-04 header) -- same idea here, just keyed by chatId
// too since this is one cache entry per chat, not one shared list.
function chatMessagesCacheKey(chatId: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const email = match?.[1] ? decodeURIComponent(match[1]) : null;
  return email ? `a1:chat-messages-cache:${email}:${chatId}` : null;
}

// 2026-09-05 follow-up (Aleksandr, screen recording: cached messages
// briefly painted on the WRONG side -- his own sent messages showed up
// on the left, like they were received, then a beat later flipped back
// to the right) -- root cause: every bubble's mine/theirs side comes
// from `myUserId !== null && msg.fromId === myUserId` (see its call
// sites below), and myUserId itself starts at `null` and is only ever
// set from the REAL fetch's response, never from cache. Painting the
// cached MESSAGES immediately (as this already did) while myUserId was
// still null made every single bubble compute mine=false for that one
// frame, until the real fetch resolved a beat later and myUserId
// caught up -- exactly the "shows on the left, then snaps right" he
// saw. Fixed by caching myUserId ALONGSIDE messages (not the messages
// array bare) and restoring both together on mount.
type CachedChatMessages = { messages: ChatMessage[]; myUserId: string | null };

function readCachedMessages(chatId: string): CachedChatMessages {
  try {
    const key = chatMessagesCacheKey(chatId);
    if (!key) return { messages: [], myUserId: null };
    const raw = sessionStorage.getItem(key);
    if (!raw) return { messages: [], myUserId: null };
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Pre-6.167 cache shape (a bare array, no myUserId) -- treat as
      // stale rather than crash on it; the real fetch fills in
      // myUserId correctly a beat later same as before this fix.
      return { messages: parsed as ChatMessage[], myUserId: null };
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as CachedChatMessages).messages)) {
      const cached = parsed as CachedChatMessages;
      return { messages: cached.messages, myUserId: cached.myUserId ?? null };
    }
    return { messages: [], myUserId: null };
  } catch {
    return { messages: [], myUserId: null };
  }
}

function writeCachedMessages(chatId: string, messages: ChatMessage[], myUserId: string | null): void {
  try {
    const key = chatMessagesCacheKey(chatId);
    if (!key) return;
    const cached: CachedChatMessages = { messages, myUserId };
    sessionStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // Storage disabled/full/private mode -- caching is a nice-to-have,
    // never worth failing the actual message load over.
  }
}

const POLL_MS = 3000;
// Don't re-announce "typing" on every keystroke -- once per this window
// is plenty for a best-effort indicator, and it keeps this from firing a
// request per character on a fast typer.
const TYPING_THROTTLE_MS = 3000;

function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateLabel(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function sameDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Same client-side "read the active lang-XX class" trick components/
// profile-action-row.tsx and post-viewer-menu.tsx already use -- <T>
// alone (this file's usual localization path) renders every locale's
// text server-side and lets CSS pick one, which works for display copy
// but not for a value that has to leave the browser as a real string
// (the greeting message text sent below).
function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

// 2026-09-02 (Aleksandr, mobile app's empty-state screenshot + Hicat.tgs:
// "тап на привітання" -- tapping the waving cat below sends this as a
// real first message, same "greeting sticker" flow the reference
// screenshot's own copy implies).
// 2026-09-03 follow-up (Aleksandr, screenshot of the empty state:
// "он должен отправляться в чат, без текстов... Он у нас - обычное
// сообщение") -- was "👋 Привіт!" (localized text); now just the cat
// itself, a single plain emoji with nothing language-specific about it
// (so no Locale record needed any more), sent through the exact same
// send() path as any typed message -- still a normal bubble with its
// own timestamp/ticks, just this one glyph as its text.
const GREETING_EMOJI = "🐱";
// 2026-09-05 (Aleksandr, live screenshot: the pending-bubble cancel/
// retry popover rendered up near/behind the sticky chat header --
// "Че то не отправляется приветственный кот и 'скасувати' куда-то
// залезло далеко") -- traced to the popover always opening ABOVE its
// bubble (see its own `bottom-full` placement below), which only has
// room when the bubble isn't the first thing in the scroll area (e.g.
// an auto-sent welcome sticker, the very first message in a brand new
// chat). Below this many px of viewport space above the bubble, it
// flips to opening BELOW instead.
const PENDING_POPOVER_MIN_SPACE_ABOVE = 180;

// Photo-viewer header (Aleksandr, photo-viewer spec: "сверху повинно
// бути ім'я") -- the sender label for a bubble the viewer opened from
// `mine` (headerTitle/headerUsername are only ever the OTHER
// participant, see their own comments above -- there's no "my own
// display name" anywhere on this page otherwise).
const YOU_LABEL_TEXT: Record<Locale, string> = {
  uk: "Ви",
  en: "You",
  ru: "Вы",
  de: "Du",
  es: "Tú",
  fr: "Vous",
  pl: "Ty",
  ptBR: "Você",
  zh: "你",
};

// Daily upload quota (Aleksandr, 2026-09-02: "лимит по daily uploads
// на 1 пользователя 20 мб день, на вэбе надо тоже прокинуть... Возьми
// всю логику с моб версии") -- the byte figures and reset countdown
// are computed and appended separately (formatBytes/formatRelativeTime,
// lib/format.ts), this is just the static "why did this fail" lead-in,
// same static-lead-in convention GREETING_EMOJI used to follow when
// it was still localized text.
const UPLOAD_QUOTA_EXCEEDED_TEXT: Record<Locale, string> = {
  uk: "Досягнуто денний ліміт завантажень",
  en: "Daily upload limit reached",
  ru: "Достигнут дневной лимит загрузок",
  de: "Tägliches Upload-Limit erreicht",
  es: "Límite diario de subidas alcanzado",
  fr: "Limite quotidienne de téléversement atteinte",
  pl: "Osiągnięto dzienny limit przesyłania",
  ptBR: "Limite diário de envio atingido",
  zh: "已达每日上传上限",
};

// 2026-09-03 (Figma "Attachment validation" note, wording confirmed
// against the section's own "4.File too large" screen: "71,8 MB · Max
// 20 MB"): the short "· Max 20 MB" suffix for a single file over the
// flat per-file cap.
const MAX_FILE_SIZE_TEXT: Record<Locale, string> = {
  uk: "Макс. 20 МБ", en: "Max 20 MB", ru: "Макс. 20 МБ", de: "Max. 20 MB",
  es: "Máx. 20 MB", fr: "Max 20 Mo", pl: "Maks. 20 MB", ptBR: "Máx. 20 MB", zh: "最大 20 MB",
};
// Second half of the same note -- a file under 20 MB but over what's
// left of today's quota: "· YY MB left" (its own dev-annotation example
// on that screen spelled it out in full, "3.2 MB left today").
const QUOTA_LEFT_TODAY_TEXT: Record<Locale, string> = {
  uk: "залишилось сьогодні", en: "left today", ru: "осталось сегодня", de: "heute übrig",
  es: "restante hoy", fr: "restant aujourd'hui", pl: "zostało dzisiaj", ptBR: "restante hoje", zh: "今日剩余",
};
// 2026-09-03 (Figma "4.1 Multiple files selected" / "exceeded limit"
// composer banner) -- the banner's own label, normal vs. red-exceeded
// variant. "Daily uploads" doubles as the banner's own tap target text
// (opens DailyUploadsModal, same modal the attach-menu's storage icon
// already opens).
const DAILY_UPLOADS_LABEL_TEXT: Record<Locale, string> = {
  uk: "Щоденні завантаження", en: "Daily uploads", ru: "Ежедневная загрузка", de: "Tägliche Uploads",
  es: "Subidas diarias", fr: "Téléversements quotidiens", pl: "Dzienne przesyłanie", ptBR: "Envios diários", zh: "每日上传",
};
const DAILY_LIMIT_EXCEEDED_TEXT: Record<Locale, string> = {
  uk: "Денний ліміт вичерпано", en: "Daily limit exceeded", ru: "Дневной лимит исчерпан", de: "Tageslimit überschritten",
  es: "Límite diario superado", fr: "Limite quotidienne dépassée", pl: "Dzienny limit przekroczony", ptBR: "Limite diário excedido", zh: "已超每日上限",
};
// 2026-09-03 (Figma "8. One time popover" -- "Teach the user, but show
// banner only 1 time"): shown above the attach-menu once quota is fully
// exhausted, dismissed permanently via DAILY_BANNER_SEEN_KEY in
// localStorage. No exact trigger threshold was ever specified beyond
// "teach the user" (the "50%"/"70%" figures on that same Figma frame
// read, on a second pass, as icon/text OPACITY style notes, not usage-
// percentage triggers) -- tied here to the same full-quota-exhaustion
// condition that already dims the Photo/File rows below, an inferred
// call flagged as such rather than guessed silently.
const PHOTOS_FILES_LABEL_TEXT: Record<Locale, string> = {
  uk: "Фото та файли", en: "Photos & files", ru: "Фото и файлы", de: "Fotos & Dateien",
  es: "Fotos y archivos", fr: "Photos et fichiers", pl: "Zdjęcia i pliki", ptBR: "Fotos e arquivos", zh: "照片和文件",
};
const AVAILABLE_AGAIN_TEXT: Record<Locale, string> = {
  uk: "Знову доступно через", en: "Available again in", ru: "Снова доступно через", de: "Wieder verfügbar in",
  es: "Disponible de nuevo en", fr: "Disponible de nouveau dans", pl: "Znów dostępne za", ptBR: "Disponível novamente em", zh: "将在以下时间后恢复",
};
const VIEW_USAGE_TEXT: Record<Locale, string> = {
  uk: "Переглянути", en: "View usage", ru: "Посмотреть", de: "Nutzung ansehen",
  es: "Ver uso", fr: "Voir l'utilisation", pl: "Zobacz użycie", ptBR: "Ver uso", zh: "查看用量",
};

export default function ChatWindowPage() {
  const lang = useActiveLocale();
  const params = useParams<{ chatId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = params.chatId;
  const headerTitleParam = searchParams.get("title") ?? "";
  const headerAvatarParam = searchParams.get("avatar");
  // 2026-09-02 (Aleksandr: "Подгрузка всех аватаров на сайте должна
  // быть через blur эффект, как мы делали в карточках постов в феде") --
  // rides along the same query string as ?avatar= (see app/chats/
  // page.tsx's own Link href comment), computed server-side there via
  // lib/avatar-blur.ts's generateAvatarBlurDataUrl. Absent for a cat-
  // mascot default avatar (never computed for those -- see that
  // route's own comment) or on direct navigation with no query string
  // at all, both of which just fall back to the shared generic shimmer.
  const headerAvatarBlurParam = searchParams.get("avatarBlur") || null;
  // 2026-09-02 (Aleksandr: "при нажатии на аватар и на имя должен
  // открываться профіль цієї людини") -- ?username= travels alongside
  // ?title=/?avatar= from wherever the chat was opened (components/
  // profile-action-row.tsx, app/contacts/page.tsx), same convention.
  // Null (a chat opened some other way, or a group chat down the line)
  // just means the header name/avatar render as plain, non-clickable
  // elements below instead of a broken link to nowhere.
  const headerUsernameParam = searchParams.get("username");

  // 2026-09-03 (Aleksandr, live bug report: after sending a calculation
  // and navigating chat-list -> back into the chat, the header lost the
  // partner's name/avatar entirely -- showed "—" and the generic
  // gradient default). Root cause: this header's identity is sourced
  // ENTIRELY from the ?title=/?avatar=/?username= query string set by
  // whichever link opened the chat (app/chats/page.tsx's own Link
  // href) -- there was no fallback at all if that list's own name/
  // avatar resolution came back empty for a tick (a known best-effort
  // limitation already documented in app/api/chats/list/route.ts's own
  // header: contacts.search can fail transiently, or the partner isn't
  // a saved contact). Now: when the query string didn't carry a title,
  // re-derive it from the SAME /api/chats/list source of truth instead
  // of just falling back to a blank "—" -- one extra request, only on
  // that empty-query-string path, not on every normal open.
  const [chatFallback, setChatFallback] = useState<{
    title: string;
    avatarUrl: string;
    avatarBlurDataUrl: string | null;
    username: string | null;
  } | null>(null);
  useEffect(() => {
    if (headerTitleParam) return;
    let cancelled = false;
    authFetch("/api/chats/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.chats)) return;
        const match = data.chats.find((c: { id: string }) => c.id === chatId);
        if (match) {
          setChatFallback({
            title: match.title ?? "",
            avatarUrl: match.avatarUrl ?? "",
            avatarBlurDataUrl: match.avatarBlurDataUrl ?? null,
            username: match.username ?? null,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [headerTitleParam, chatId]);

  const headerTitle = headerTitleParam || chatFallback?.title || "";
  const headerAvatar = headerAvatarParam || chatFallback?.avatarUrl || pickDefaultCatAvatar(chatId);
  const headerAvatarBlur = headerAvatarBlurParam || chatFallback?.avatarBlurDataUrl || null;
  const headerUsername = headerUsernameParam || chatFallback?.username || null;
  const headerProfileHref = headerUsername ? profileHref(headerUsername) : null;

  // 2026-09-04 (Aleksandr, live screenshot of the now-playing bar on a
  // self-sent voice clip showing the generic mic glyph: "поставь в
  // этот попап аватар того чье голосовое вместо микрофона слева") --
  // this page never loaded the visitor's OWN avatar anywhere (only the
  // chat PARTNER's, via headerAvatar above), which is why voice-
  // bubble.tsx's own entry-building always passed `null` for a `mine`
  // clip. Same /api/account/whoami route + response shape components/
  // avatar-menu.tsx's own nav account-row already fetches for the same
  // reason -- one-shot on mount, best-effort (a 401/network failure
  // just leaves the mic-glyph fallback in place, same as before this).
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  // Scheduled Meetings ("1-3 допили") -- the same whoami round-trip
  // above now also carries the visitor's own display name (see that
  // route's own comment); read here rather than adding a second fetch,
  // and passed to MeetingMessageCard/scheduleMeeting/acceptMeeting
  // below as this viewer's own identity for whichever participant row
  // is "me" in a given meeting card.
  const [myName, setMyName] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (data.avatarUrl) setMyAvatarUrl(data.avatarUrl);
        if (data.name) setMyName(data.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [state, setState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    const cached = readCachedMessages(chatId);
    if (cached.messages.length === 0) return;
    setMessages(cached.messages);
    setMyUserId(cached.myUserId);
    setState("ready");
  }, [chatId]);
  // 2026-09-02 (Aleksandr, live bug report: "я не вижу появившееся
  // сообщение сразу после отправки") -- send() used to just POST then
  // call load() once, hoping the very next messages.getMessages
  // roundtrip already had the just-sent message indexed on chat-
  // server's side; when it didn't (a real race, not every time), the
  // bubble simply didn't appear until the NEXT poll tick up to
  // POLL_MS later. Fixed with a real optimistic entry instead: send()
  // appends a locally-built ChatMessage-shaped bubble the instant the
  // POST resolves, tagged `pending`+`localId` (not part of the real
  // ChatMessage shape, only ever read by this file). load() below
  // drops a pending entry once a real message with the same sender +
  // text shows up in the fetched list (see reconcilePending below) --
  // until then it just keeps showing, so it's never a race, only ever
  // a graceful handoff. Rendered merged with `messages`, see
  // displayMessages below.
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  // Which pending bubble's cancel/retry popover is open, if any -- only
  // ever one at a time, closed by tapping elsewhere (see the
  // document-click effect near the retry helpers below).
  const [openPendingId, setOpenPendingId] = useState<string | null>(null);
  // Whether the currently-open pending popover should grow UP from its
  // bubble (the usual case) or DOWN (flipped -- see
  // PENDING_POPOVER_MIN_SPACE_ABOVE's own comment above for why).
  const [openPendingAbove, setOpenPendingAbove] = useState(true);
  const pendingPopoverRef = useRef<HTMLDivElement>(null);

  // Reply feature (2026-09-05, Aleksandr, live UI reference: "Давай
  // теперь сделаем фичу, которая называется Reply") -- actionsMenu is
  // the Cupertino-style per-message menu (components/chat/message-
  // actions-menu.tsx), opened by a plain click per his own reasoning
  // (see that file's header); replyTarget is whatever message Reply
  // was last chosen on, driving both the compose-bar accessory row
  // below and the `replyTo` this chat's own send()/attemptSend/
  // uploadAndSendVoice thread through to chat-server.
  const [actionsMenu, setActionsMenu] = useState<{ message: ChatMessage; anchorRect: DOMRect; mine: boolean } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  // Swipe-to-reply (2026-09-05, Aleksandr, Telegram Web reference
  // recording: dragging a bubble to the right pops the same "Reply to
  // ..." compose bar this app's own actions-menu Reply row already
  // sets) -- mobile-only in practice since it's driven entirely by
  // touch events, which a mouse/trackpad never fires, so the existing
  // right-click/two-finger-click path above is untouched for desktop.
  // swipeGestureRef is a plain ref (not state) specifically so an
  // in-progress drag survives a re-render mid-gesture (this page polls
  // messages every few seconds -- see `load()` -- and a fresh render
  // would otherwise re-initialize a `let` closed over inside the
  // message-list JSX, resetting the drag's start point and making it
  // stutter). swipeState IS real state because its `dx` needs to
  // actually repaint the one bubble being dragged; every other row's
  // closure reads it and no-ops when the id doesn't match.
  const swipeGestureRef = useRef<{ msgId: string; startX: number; startY: number; active: boolean } | null>(null);
  const [swipeState, setSwipeState] = useState<{ msgId: string; dx: number } | null>(null);
  const SWIPE_TRIGGER_DX = 56;
  const SWIPE_MAX_DX = 72;
  const [myUserId, setMyUserId] = useState<string | null>(null);
  // 2026-09-02 (Aleksandr: "человек прочёл, но галочки не поменялись
  // из одной в две") -- the OTHER participant's read high-water mark
  // (lib/a1/chat-schemas.ts's ChatParticipantSchema.reaMaxId comment
  // has the full "why" -- there's no per-message read field to read
  // instead), used by messageTickState() below to flip MY OWN sent
  // messages' ticks from single to double. Polled at half the message
  // poll's own cadence (readStateTick below, ~6s not ~3s) since it
  // costs a whole chats.getChats call (same one app/chats/page.tsx's
  // own list view already polls every 5s) just for one number -- read
  // state lagging a couple seconds behind is a fine tradeoff, message
  // delivery itself isn't.
  const [peerReadMaxId, setPeerReadMaxId] = useState<number | null>(null);
  const readStateTick = useRef(0);
  const [draft, setDraft] = useState("");
  // 2026-09-04 (Aleksandr, live screenshots: the chat LIST correctly
  // shows "Чернетка Meow" for this chat, but opening it leaves the
  // compose box empty -- "Чернетка должна отображаться в инпут филде
  // при переходе в чат в таком кейсе") -- app/chats/page.tsx already
  // reads this exact draft text off /api/chats/list's own draftText
  // field (chatDraftText() server-side, off the real Chat.draft
  // resource), this page just never fetched it to seed the compose
  // box itself. One-shot fetch on mount, same endpoint (already
  // fetched elsewhere on this page for the header-fallback path, but
  // ONLY when ?title= is missing -- the draft isn't carried in that
  // query string at all, so this needs its own unconditional fetch).
  // Guarded with a ref (not a `draft === ""` check) so it can never
  // clobber text the person already typed in the moment between mount
  // and this response landing.
  const draftSeeded = useRef(false);
  // 2026-09-05 (see the draft-sync effect right below for the full
  // story) -- the sync-TO-server effect must not fire with an empty
  // string while THIS fetch is still in flight, or it would race the
  // seed and immediately clear the very draft this is trying to
  // restore. Flips true once this fetch settles (found a draft, found
  // none, or failed) -- either way there is nothing left it could
  // clobber from here on.
  const [draftSyncReady, setDraftSyncReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/chats/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!draftSeeded.current && data?.ok && Array.isArray(data.chats)) {
          const match = data.chats.find((c: { id: string; draftText?: string }) => c.id === chatId);
          if (match?.draftText) {
            draftSeeded.current = true;
            // Functional update (not the `match.draftText` value
            // directly) -- reads whatever's ACTUALLY in the box the
            // instant this resolves, so a person who started typing
            // during this round-trip never gets overwritten.
            setDraft((cur) => (cur === "" ? (match.draftText as string) : cur));
          }
        }
        setDraftSyncReady(true);
      })
      .catch(() => {
        if (!cancelled) setDraftSyncReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);
  // 2026-09-05 (Aleksandr, live bug report: "когда я вручную стираю
  // инпут и нажимяю стрелку назад и ухожу в чат-лист надпись 'драфт'
  // по-прежнему остается, и само сообщение в инпуте потом тоже. То
  // есть надо сделать, чтобы оно дружило с актуальным инпутом и
  // понимало, что я удалил") -- the seed effect above only ever READ
  // chat.draft; nothing in this app ever wrote it back, so clearing
  // the box locally never told the server, and the stale draft (from
  // the mobile app, or an earlier web session) just kept coming back.
  // Endpoint confirmed off the mobile app's own source, not guessed
  // (see app/api/chats/save-draft/route.ts's own header) -- same
  // `messages.saveDraft` call the mobile client makes, debounced the
  // same 600ms that client's own DraftService uses. Fires on EVERY
  // change including the transition to "" -- an empty message is the
  // documented way to CLEAR a draft server-side, not a no-op, which is
  // exactly the case that was broken. Best-effort (no `.then` even
  // checked) -- see that route's own header for why a failed save is
  // never worth surfacing here.
  const draftSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftSyncReady) return;
    if (draftSyncTimer.current) clearTimeout(draftSyncTimer.current);
    draftSyncTimer.current = setTimeout(() => {
      draftSyncTimer.current = null;
      authFetch("/api/chats/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, message: draft }),
      }).catch(() => {});
    }, 600);
    return () => {
      if (draftSyncTimer.current) clearTimeout(draftSyncTimer.current);
    };
  }, [draft, chatId, draftSyncReady]);
  // Flushes the CURRENT draft immediately, bypassing the 600ms debounce
  // above -- wired to the header's own Back link's onClick (see that
  // element below) so leaving the chat right after typing/clearing
  // doesn't lose up to 600ms of unsaved state to an unmount racing the
  // still-pending timer. Fire-and-forget on purpose: this fetch keeps
  // running after the click-triggered client-side navigation unmounts
  // this page, same as any other in-flight request would.
  function flushDraftSync() {
    if (!draftSyncReady) return;
    if (draftSyncTimer.current) {
      clearTimeout(draftSyncTimer.current);
      draftSyncTimer.current = null;
    }
    void authFetch("/api/chats/save-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId, message: draft }),
    }).catch(() => {});
  }
  // Same flush, for the ways of leaving that AREN'T a click on the Back
  // link above -- closing the tab, switching apps, backgrounding a
  // installed/PWA session -- mirroring the mobile app's own
  // ChatDetailDraftHandler, which saves on BOTH screen dispose and
  // AppLifecycleState.paused/inactive, not just one. `visibilitychange`
  // firing "hidden" covers all of those in a browser; unlike
  // `beforeunload`, it's reliable on mobile Safari/Chrome where a tab
  // close or app-switch often never fires unload at all.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flushDraftSync();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, draft, draftSyncReady]);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  // Attachment feature: pending compose-bar attachments (see
  // PendingAttachment's own comment above) plus the attach-menu open
  // state and the two hidden <input type=file> refs it drives -- one
  // per native "Photos" / "Files" row from the reference screenshot
  // that started this (its "Meetings"/"Calculations"/"Contacts" rows
  // are out of scope for this pass).
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  // 2026-09-03 (Aleksandr, "давай следующей фичой сделаем запись
  // голосового сообщения") -- recording ENGINE (components/chat/voice-
  // recorder.ts), wired to handleVoiceFinish below (defined later as a
  // function declaration, so this call sees it fine -- hoisted, same
  // as attemptSend/send/etc. throughout this file). voiceBlobsRef keeps
  // each recording's raw Blob keyed by its pending bubble's localId, so
  // a failed UPLOAD (not just a failed SEND) can be retried by re-
  // running the whole upload from the same audio instead of having
  // nothing left to resend -- see uploadAndSendVoice/retryOne below.
  // 2026-09-03 (Aleksandr, live test: "эквалайзер должен быть уже на
  // отосланном сообщении") -- now also carries durationSeconds/waveform
  // (both already computed locally by voice-recorder.ts's onFinish, see
  // handleVoiceFinish below) alongside the blob, so uploadAndSendVoice
  // can send a real `attribute-audio` at upload time instead of none at
  // all -- checked a real sent voice doc live via messages.getMessages
  // and its `attributes` array came back completely empty, which is
  // exactly why the SENT bubble's waveform rendered as a flat line
  // (voice-bubble.tsx falls back to a uniform 0.35 array when
  // decodeWaveformBars finds nothing to decode).
  const voiceBlobsRef = useRef<Map<string, { blob: Blob; mimeType: string; durationSeconds: number; waveform: number[] }>>(new Map());
  const recorder = useVoiceRecorder(handleVoiceFinish);
  // 2026-09-03 (Aleksandr, live test, Telegram Desktop reference
  // screenshot: "клик по любой свободной области во время записи
  // должен вызывать такой попап") -- this file's own voice-message.tsx
  // header flagged the "click outside a locked recording" confirm-
  // dialog nuance as explicitly deferred scope; now wired up. Any
  // mousedown outside voiceRowRef (the whole recording row: bar +
  // record/lock button) while a recording is actually in progress
  // (recording or locked -- NOT requesting/denied/idle) opens this
  // confirm instead of doing nothing or silently discarding.
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const voiceRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (recorder.state !== "recording" && recorder.state !== "locked") return;
    function onDocPointerDown(e: MouseEvent) {
      if (voiceRowRef.current?.contains(e.target as Node)) return;
      setDiscardConfirmOpen(true);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [recorder.state]);
  // 2026-09-02, Aleksandr: "Daily Uploads" quota popup (see
  // components/daily-uploads-modal.tsx's own header comment) --
  // STANDALONE backdrop modal (variant="modal", the component's own
  // default), used only by the compose-bar's own quota-exceeded banner
  // below (that one isn't anchored to the attach popover at all, so
  // there's no popover to embed into).
  const [dailyUploadsOpen, setDailyUploadsOpen] = useState(false);
  // 2026-09-04 (Aleksandr, live test: see the attach popover's own
  // comment further down for the full quote) -- the INLINE variant,
  // shown INSIDE the already-open attach popover (storage icon, the
  // quota banner that lives inside that same popover, and
  // onPickAttachment's quota-exceeded redirect all set this instead of
  // the standalone one above) rather than opening a second, separate
  // modal on top of it. Reset the instant the popover itself closes, so
  // reopening the paperclip always starts back on the row menu.
  const [attachDailyUploadsOpen, setAttachDailyUploadsOpen] = useState(false);
  useEffect(() => {
    if (!attachMenuOpen) setAttachDailyUploadsOpen(false);
  }, [attachMenuOpen]);
  // 2026-09-04 (Aleksandr: "Эту модалку делай тоже внутри модалки из
  // скрепки") -- meetingsMenuOpen (declared further down, same idea)
  // now nests inside this SAME attach popover instead of opening as
  // its own full-screen modal, same attachDailyUploadsOpen convention
  // right above: reset the instant the popover itself closes, so
  // reopening the paperclip always starts back on the row menu.
  useEffect(() => {
    if (!attachMenuOpen) setMeetingsMenuOpen(false);
  }, [attachMenuOpen]);
  // 2026-09-04 (Aleksandr, screen recording: "на секунде 3 попап
  // сначала растет вверх, а потом уменьшает высоту и растет в бок") --
  // measures the attach popover's own swapped-in content (row menu <->
  // MeetingsMenuModal <-> DailyUploadsModal) so the popover box's own
  // `style.height` (set at that box's own JSX below) can animate in
  // step with its `width` transition instead of snapping to the new
  // content's height instantly. Reset to null the moment the popover
  // itself closes so the NEXT open always starts from natural auto-
  // sizing again, rather than briefly holding onto whatever height was
  // last measured (which could otherwise itself animate open -- e.g.
  // last closed while showing the much-taller Daily Uploads panel).
  const attachPanelContentRef = useRef<HTMLDivElement>(null);
  const [attachPanelHeight, setAttachPanelHeight] = useState<number | null>(null);
  useEffect(() => {
    if (!attachMenuOpen) {
      setAttachPanelHeight(null);
      return;
    }
    const el = attachPanelContentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setAttachPanelHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // Only keyed on `attachMenuOpen` itself -- the observer, once
    // attached to `attachPanelContentRef`'s element, already reports
    // every subsequent resize of that SAME element on its own (which is
    // exactly what a meetingsMenuOpen/attachDailyUploadsOpen-driven
    // content swap produces), so those don't need to be dependencies
    // here too. Both are declared further down in this file anyway --
    // listing them here would be a use-before-declaration error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachMenuOpen]);
  // 2026-09-03 (Figma "Attachments" section, "Attachment validation" +
  // "Daily uploads" notes): a cached copy of the SAME MediaUploadUsage
  // DailyUploadsModal itself fetches (/api/upload/usage), kept here too
  // so handleAttachFile can validate a pick against the REMAINING quota
  // before ever starting an upload, and so the composer's own quota
  // banner (below) has numbers to show without opening that modal.
  // Fetched once when the attach menu first opens (see its own effect
  // below) -- a deliberately loose cache, not re-synced after every
  // send; app/api/upload/create's own server-side quota_exceeded
  // response (already handled below) is the real backstop if this
  // drifts stale within one sitting.
  const [uploadUsage, setUploadUsage] = useState<MediaUploadUsage | null>(null);
  // One-time teaching banner above the attach menu (Figma "8. One time
  // popover": "Teach the user, but show banner only 1 time") -- the
  // Figma frame never states an exact numeric trigger, only that it
  // accompanies the quota-exhausted state (same frame's Photos/Files
  // rows are dimmed there); read literally, "quota fully used" is this
  // pass's own trigger too, see the effect below. Persisted in
  // localStorage (not per-chat) so it genuinely only ever shows once
  // for a given browser, not once per chat opened.
  const [dailyBannerDismissed, setDailyBannerDismissed] = useState(true);
  useEffect(() => {
    try {
      setDailyBannerDismissed(window.localStorage.getItem(DAILY_BANNER_SEEN_KEY) === "1");
    } catch {
      // Storage can throw in a locked-down browser context -- leave the
      // banner suppressed (safe default: silence over showing an
      // unfulfillable "1-time" promise every single visit).
    }
  }, []);
  useEffect(() => {
    if (!attachMenuOpen || uploadUsage) return;
    let cancelled = false;
    authFetch("/api/upload/usage")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data.usage) setUploadUsage(data.usage as MediaUploadUsage);
      })
      .catch(() => {
        // Best-effort -- handleAttachFile's own server-side quota_exceeded
        // handling still catches an over-quota upload even with no local
        // usage figure to pre-check against.
      });
    return () => {
      cancelled = true;
    };
  }, [attachMenuOpen, uploadUsage]);
  // Contact-attachment feature (2026-09-02, Aleksandr's Contacts-picker
  // + "sent contact" card screenshots): contactsPickerOpen drives
  // components/chat/contacts-picker-modal.tsx; pendingContacts is the
  // running "queued to send" list (up to 5, same cap app/api/chats/
  // send/route.ts enforces) built by toggling rows in that picker;
  // contactSummaries caches components/chat/contact-message-card.tsx's
  // occupation/expertise/avatar data for REAL messages' contact media,
  // keyed by userId and filled by the batch-fetch effect below --
  // separate from each pendingContact's own already-known `summary`
  // (see PendingMessage's own comment on why those don't share a
  // fetch). openingChatFor guards the card's "Message" button against
  // a double-click while POST /api/chats/open is in flight.
  const [contactsPickerOpen, setContactsPickerOpen] = useState(false);
  // 2026-09-04 (Aleksandr, Scheduled Meetings spec + Figma reference):
  // drives components/chat/meetings-menu-modal.tsx, same on/off pattern
  // as contactsPickerOpen right above -- see that component's own header
  // comment for what it does and doesn't cover yet.
  const [meetingsMenuOpen, setMeetingsMenuOpen] = useState(false);
  // Scheduled Meetings (2026-09-04) -- scheduleMeetingOpen is the
  // second screen behind the attach menu's Meetings row (past
  // MeetingsMenuModal's own Quick Invites list), acceptingMeetingId
  // tracks which single MeetingMessageCard's Accept button is
  // in-flight (there's normally at most one at a time, but keyed
  // by the real message _id rather than a bare boolean so two
  // different proposals in the same chat can't cross-disable each
  // other's button).
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [acceptingMeetingId, setAcceptingMeetingId] = useState<string | null>(null);
  const [pendingContacts, setPendingContacts] = useState<PickedContact[]>([]);
  const [contactSummaries, setContactSummaries] = useState<Record<string, ContactCardSummary>>({});
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  // 2026-09-03 (Aleksandr: "Если контакта которым со мной поделились
  // нет у меня в контактах добавь справа круглую кнопку (+)") --
  // components/chat/contact-message-card.tsx's own "+" needs to know
  // whether a RECEIVED contact is already in the visitor's book; null
  // = not fetched yet (the one-shot effect below only fires once this
  // chat actually has a received contact card, see that effect's own
  // comment), so ContactMessageCard treats "unknown" the same as
  // "already a contact" (canAddContact stays false) rather than
  // flashing the + button on and then off once the real answer lands.
  const [myContactUserIds, setMyContactUserIds] = useState<Set<string> | null>(null);
  // Photo-viewer feature (2026-09-03) -- viewerIndex is this chat's own
  // position into chatViewerImages (below), null when the viewer is
  // closed; highlightedMessageId drives the "Show in chat" scroll+flash
  // (see handleShowInChat below), cleared automatically after a beat.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  // Calculations feature (2026-09-03, Aleksandr's own reference video:
  // "поищи плз, у нас есть еще такая фича, calculations" + the actual
  // add/remove-row, currency-picker, running-total UI he later sent).
  // The panel below REPLACES the normal draft/attach row while open
  // (same as the reference video -- it swaps back the moment the calc
  // sends), so this needs none of send()/attemptSend()'s optimistic-
  // pending-bubble machinery: sendCalculation() below just POSTs and
  // calls load(), same as any other one-shot mutation in this file.
  // That's a real, acknowledged scope cut from full parity with plain
  // text/attachment sends (no offline retry, no optimistic bubble) --
  // fine for a first pass, revisit if it turns out to matter live.
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcRows, setCalcRows] = useState<CalcRow[]>([calcBlankRow()]);
  const [calcNote, setCalcNote] = useState("");
  const [calcCurrency, setCalcCurrency] = useState("usd");
  const [calcCurrencyPickerOpen, setCalcCurrencyPickerOpen] = useState(false);
  const [calcSending, setCalcSending] = useState(false);
  const [calcError, setCalcError] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  // 2026-09-03 (Aleksandr, comparing against every other popover in
  // this app: "Сделай появление модалки при наведении на скрепку,
  // такую же как мы делаем везде... Только десктоп") -- lib/use-hover-
  // panel.ts's shared hook, same one components/post-owner-menu.tsx's
  // "•••" menu and components/avatar-menu.tsx's own dropdown already
  // use. Click-to-toggle (onClick below) and the outside-mousedown
  // close effect further down both keep working unchanged -- this only
  // adds a THIRD way in (hover) on top of them; touch devices never
  // fire hover at all, so nothing changes there.
  const attachPanelRef = useRef<HTMLDivElement>(null);
  const {
    handleMouseEnter: handleAttachMouseEnter,
    handleMouseLeave: handleAttachMouseLeave,
    isRecentHoverOpen: isAttachRecentHoverOpen,
  } = useHoverPanel(attachMenuOpen, setAttachMenuOpen, [{ trigger: attachMenuRef, panel: attachPanelRef }]);
  // 2026-09-03 (Aleksandr: currency popover must close on an outside
  // click, same convention as attachMenuRef above -- it's no longer a
  // backdrop modal, see components/chat/currency-picker-modal.tsx).
  const calcCurrencyPickerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 2026-09-04 (Aleksandr: "При выхове калькуляции сделай дефолтно
  // моргающий курсор возле 1.") -- opening the calculator used to leave
  // nothing focused, so the first row's Description field needed an
  // extra tap before typing. Focused the instant the panel opens (see
  // its own onClick below), same requestAnimationFrame-after-reveal
  // convention handleReplyFromViewer already uses for the compose
  // textarea -- the panel has to actually be in the DOM first.
  const calcFirstRowInputRef = useRef<HTMLInputElement>(null);
  // 2026-09-02 (Aleksandr: "когда я отвечаю с моба и читаю это на
  // вебе, оно не отмечается у меня на мобильном, что сообщение
  // прочитано") -- highest message _id this tab has already told
  // chat-server about via messages.markAsRead (app/api/chats/mark-read/
  // route.ts), so load() below only ever calls it again once a NEWER
  // message shows up, never redundantly on every poll tick.
  const lastMarkedReadId = useRef(0);
  const lastTypingSentAt = useRef(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // 2026-09-02 (Aleksandr: "input field должен по высоте увеличиваться
  // по мере того как мы пишем текст... в мобильной версии максимум
  // плюс 4-5 строк, в веб-версии строк на 7") -- textareaRef drives the
  // scrollHeight-based auto-grow effect below; composeBarRef/
  // composeBarHeight mirror components/site-nav.tsx's own ResizeObserver
  // pattern (published there as --site-nav-h) so the message list's
  // bottom padding always matches the compose bar's REAL height instead
  // of the old fixed pb-28, which only ever accounted for a single-line
  // bar -- a grown textarea would otherwise sit on top of (and the fixed
  // bar would cover) the last message or two.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composeBarRef = useRef<HTMLDivElement>(null);
  const [composeBarHeight, setComposeBarHeight] = useState(112);
  // 2026-09-02 (Aleksandr, live screenshot with the keyboard open: "у
  // нас, когда открывается это, уезжает наверх София Беннетт, стрелочка
  // и аватар. Они должны быть зафиксированными тоже сверху") -- this
  // header used to be `sticky top-0` *inside* this page's own flex
  // column, which is exactly why it scrolled away: focusing the compose
  // textarea makes iOS Safari force-scroll the document to keep that
  // field clear of the keyboard, and a `sticky` element just rides along
  // with whatever ancestor actually did the scrolling. The compose bar
  // right below stayed correctly pinned through the same keyboard-open
  // moment because it's `position: fixed` (real viewport, not this
  // column) -- so the header gets the identical treatment below (see
  // its own JSX), truly fixed on mobile where it now also owns the top
  // of the screen (components/site-nav.tsx hides itself there on this
  // route). Kept `sticky` at `sm:` and up, unchanged -- desktop was
  // never the problem, and switching it to `fixed` there would need its
  // own top offset math against site-nav's real height for no benefit.
  // headerHeight/headerRef mirror composeBarHeight/composeBarRef's own
  // ResizeObserver just below, so the message list can pad its top by
  // this header's REAL rendered height (which varies by device, thanks
  // to `env(safe-area-inset-top)`) instead of a guessed constant -- but
  // only while the header is actually `fixed` and out of normal flow;
  // see isMobileNav below for why.
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  // Same one-shot `matchMedia` read as isTouch below (this file's own
  // established pattern) -- decides whether the header above is
  // currently rendered `fixed` (mobile, out of flow, needs the message
  // list's top padding driven by headerHeight) or `sticky` (desktop,
  // still in flow, already pushes the message list down on its own).
  const [isMobileNav, setIsMobileNav] = useState(true);
  useEffect(() => {
    setIsMobileNav(!window.matchMedia("(min-width: 640px)").matches);
  }, []);
  // Mirrors pendingMessages for the "online" listener below (registered
  // once, so it can't close over a fresh `pendingMessages` each render)
  // and guards against retrying the same bubble twice if a poll tick's
  // own retry pass and the browser's "online" event land close together.
  const pendingMessagesRef = useRef<PendingMessage[]>([]);
  useEffect(() => {
    pendingMessagesRef.current = pendingMessages;
  }, [pendingMessages]);
  const retryingIds = useRef<Set<string>>(new Set());

  // Not wired to anything live yet -- chat-server's typing events are
  // WS-only (this file's own header, and app/api/chats/typing/route.ts's
  // header), so this always reads false until Phase 2's realtime relay
  // exists. Left as real state (not deleted) so the header's pill below
  // just starts working the day that relay lands, no markup changes.
  const [peerTyping] = useState(false);

  // 2026-09-02 (Aleksandr, mobile-app empty-state screenshot: "Ток
  // вместо tap в тексте походу надо click? На десктоп") -- the greeting
  // copy below needs to say "tap" on a touch device and "click" on a
  // mouse/trackpad one. No server-side signal for this (unlike locale,
  // which app/globals.css's lang-XX: variants pick per-request), so it
  // starts assuming touch (this app's stated mobile-first default, same
  // as useActiveLocale() below defaulting to "uk") and corrects once
  // mounted if the real pointer is fine (mouse/trackpad).
  const [isTouch, setIsTouch] = useState(true);
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const el = composeBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setComposeBarHeight(el.offsetHeight));
    ro.observe(el);
    setComposeBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [state]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [state]);

  // 2026-09-03 (Aleksandr, screen recording: "имя, аватар и стрелка
  // назад не уезжали вверх" when the keyboard opens) -- the header
  // above is already `position: fixed` specifically to survive this
  // (see its own 2026-09-02 comment/fix), but that turned out to only
  // be half the story on iOS Safari: focusing the compose textarea
  // still makes iOS force a real `window.scrollY` change to shuffle
  // the focused field clear of the keyboard, and iOS's `fixed`
  // positioning has a long-standing bug where it visually drags along
  // with that scroll instead of staying pinned to the viewport (this
  // page's own body has no scrollable overflow of its own -- see the
  // outer container's own `calc(100dvh - ...)` comment -- so this
  // isn't content genuinely needing to scroll, it's iOS's own
  // keyboard-avoidance heuristic scrolling the document regardless).
  // The compose bar right below never showed this because it's pinned
  // to the BOTTOM of the visual viewport, which the keyboard opening
  // naturally keeps correct; only a `top: 0` fixed element gets left
  // behind. Counteracting it needs an actual scroll listener -- there
  // is no CSS-only fix for this -- translating the header down by
  // whatever `window.scrollY` iOS just forced re-pins it to the real
  // top of the visible screen every time that offset changes.
  // visualViewport's own resize/scroll fire a beat earlier than the
  // window's on some iOS versions, so both are watched to close that
  // gap. Mobile-only: the header is `sm:sticky` (in normal flow) at
  // the desktop breakpoint, where this bug and this fix are both
  // irrelevant.
  useEffect(() => {
    if (!isMobileNav) return;
    const el = headerRef.current;
    if (!el) return;
    function reposition() {
      if (!el) return;
      // 2026-09-04 (Aleksandr, critical, screen recording: header with
      // name/avatar/back-arrow floats to the middle of the screen and
      // glitches right after tapping Send, Send stops responding, only
      // a manual vertical swipe fixes it) -- the transform above only
      // MASKS window.scrollY, it never clears it, and iOS doesn't
      // reliably fire a trailing scroll/resize event when its own
      // keyboard-avoidance scroll settles back to 0 on dismiss. That
      // leaves the transform stuck at a stale value with nothing left
      // to re-trigger reposition() -- exactly matching "only a swipe
      // fixes it" (a swipe is a fresh scroll event). Once no field is
      // focused the keyboard is closing/closed, so any leftover
      // scrollY at that point is guaranteed to be iOS's own settle
      // artifact, never real content (this page has no scrollable
      // overflow of its own -- see the outer container's own
      // `calc(100dvh - ...)` comment) -- so it's safe to zero it
      // directly instead of only masking it, which is what actually
      // unsticks the header without waiting on an event that might
      // not come. Left alone while a field IS focused so this doesn't
      // fight iOS's own keyboard-open scroll (that's still handled by
      // the transform, per the 2026-09-03 fix below).
      const active = document.activeElement;
      const keyboardLikelyOpen =
        active instanceof HTMLElement &&
        (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable);
      if (!keyboardLikelyOpen && window.scrollY) {
        window.scrollTo(0, 0);
      }
      el.style.transform = window.scrollY ? `translateY(${window.scrollY}px)` : "";
    }
    // Belt-and-suspenders trigger: focusout fires the instant the
    // compose textarea loses focus, which is exactly when the
    // keyboard starts dismissing (e.g. right after Send) -- watching
    // it directly means the fix above doesn't depend on scroll/resize
    // firing at all. Two delayed passes cover both a quick settle and
    // a slower one across iOS versions.
    function onFocusOut() {
      window.setTimeout(reposition, 50);
      window.setTimeout(reposition, 350);
    }
    window.addEventListener("scroll", reposition, { passive: true });
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    document.addEventListener("focusout", onFocusOut);
    reposition();
    return () => {
      window.removeEventListener("scroll", reposition);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
      document.removeEventListener("focusout", onFocusOut);
      el.style.transform = "";
    };
  }, [isMobileNav]);

  // TEXTAREA_LINE_PX matches the textarea's own leading-5 (20px) class
  // below. Resets to "auto" first so a deleted line can shrink the box
  // back down, not just grow it -- scrollHeight only ever reports the
  // content's natural height against whatever height is currently set,
  // so it has to be cleared before re-measuring on every keystroke.
  const TEXTAREA_LINE_PX = 20;
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxLines = isTouch ? 6 : 7;
    const maxHeight = TEXTAREA_LINE_PX * maxLines;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft, isTouch]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await authFetch(`/api/chats/messages?chat=${encodeURIComponent(chatId)}`);
      if (res.status === 401) {
        setState("signed-out");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setState((prev) => (prev === "ready" ? prev : "error"));
        return;
      }
      const fetched: ChatMessage[] = data.messages ?? [];
      const resolvedMyUserId: string | null = data.myUserId ?? null;
      setMessages(fetched);
      setMyUserId(resolvedMyUserId);
      writeCachedMessages(chatId, fetched, resolvedMyUserId);
      // Only while the tab is actually visible -- marking a message
      // "read" from a poll tick in a backgrounded tab would be a lie,
      // same reasoning app/chats/page.tsx's own poll timer already
      // applies to skip polling entirely while hidden (this page's
      // own poll timer below does too; this extra check only matters
      // for the INITIAL load, which -- like that page's -- runs even
      // in a background tab so messages are ready the moment it's
      // foregrounded, without also falsely marking them read yet).
      if (!document.hidden && fetched.length > 0) {
        const highestId = Math.max(...fetched.map((m) => Number(m._id)).filter((n) => !Number.isNaN(n)));
        if (highestId > lastMarkedReadId.current) {
          lastMarkedReadId.current = highestId;
          authFetch("/api/chats/mark-read", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat: chatId, lastMessage: highestId }),
          }).catch(() => {
            // Best-effort -- a failed mark-read just means the peer's
            // tick stays single a bit longer; the NEXT poll tick's
            // highestId is still > whatever chat-server last recorded,
            // so this naturally retries itself without extra bookkeeping.
            lastMarkedReadId.current = 0;
          });
        }
      }
      // Drop any pending (optimistic) entry that a real message now
      // covers -- same sender + same text, and the real one dated at or
      // after the pending one was created (a few seconds of slack for
      // clock skew between this device and chat-server). Anything still
      // unmatched just keeps showing as pending; it's never removed by
      // a timeout, only by this reconciliation actually finding it, so
      // a slow send never flickers away and comes back.
      setPendingMessages((prev) => {
        const stillPending: PendingMessage[] = [];
        for (const p of prev) {
          // 2026-09-04 (Aleksandr, video: "фото-то отправлены, но они
          // не видны вот в той первой части" -- a just-sent multi-photo
          // message flashing as an empty blue bubble for a moment)
          // -- traced to this match firing off sender+text+date alone,
          // before chat-server has necessarily finished attaching the
          // message's own media documents to what the messages-list
          // endpoint returns. The old code swapped to the real message
          // (and revoked this bubble's local blob: previews below) the
          // instant text/date lined up, even when messageDocumentMedia
          // on that candidate was still empty -- rendering nothing
          // where the pending bubble's own correct local thumbnails had
          // been showing a moment earlier. A pending message that
          // finished uploading (status "ready") its attachments now
          // also requires the candidate real message to already carry
          // at least that many media documents before counting as
          // reconciled -- an unmatched pending bubble just keeps
          // showing its own (correct, already-loaded) local previews
          // until a poll tick actually has the real media ready.
          const expectedMediaCount =
            p.pendingAttachments?.filter((a) => a.status === "ready").length ?? 0;
          const reconciled = fetched.some(
            (m) =>
              resolvedMyUserId !== null &&
              m.fromId === resolvedMyUserId &&
              extractMessageText(m) === extractMessageText(p) &&
              messageDateMs(m) >= messageDateMs(p) - 5000 &&
              (expectedMediaCount === 0 || messageDocumentMedia(m).length >= expectedMediaCount),
          );
          if (reconciled) {
            // Attachment feature: this bubble's local image previews
            // (PendingAttachment.previewUrl, blob: URLs -- see that
            // type's own comment) are no longer needed once the real
            // message takes over rendering via messageDocumentMedia's
            // server-proxied URL instead -- release them here so a long
            // session sending many photos doesn't quietly accumulate
            // blob: URLs the tab never frees on its own.
            p.pendingAttachments?.forEach((a) => {
              if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            });
          } else {
            stillPending.push(p);
          }
        }
        return stillPending;
      });
      setState("ready");
      // A poll tick only gets here once the fetch above actually
      // succeeded -- as good a "we have a network" signal as the
      // browser's own `online` event (registered below), and covers
      // reconnects that event doesn't reliably fire for (e.g. Wi-Fi
      // that stays "connected" while the internet itself was down).
      retryAllFailedRef.current();
      // See peerReadMaxId's own comment above for the ~6s cadence --
      // fire-and-forget, same convention announceTyping() below already
      // uses for a poll-adjacent request that shouldn't block load()
      // itself or flip `state` on its own failure.
      readStateTick.current += 1;
      if (readStateTick.current % 2 === 1) {
        authFetch(`/api/chats/read-state?chat=${encodeURIComponent(chatId)}`)
          .then((r) => r.json())
          .then((readData) => {
            if (readData?.ok) {
              setPeerReadMaxId(typeof readData.peerReadMaxId === "number" ? readData.peerReadMaxId : null);
            }
          })
          .catch(() => {});
      }
    } catch {
      setState((prev) => (prev === "ready" ? prev : "error"));
    } finally {
      inFlight.current = false;
    }
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;
    // Same 2026-09-01 fix as app/chats/page.tsx's own load() -- initial
    // load must run even in a background/unfocused tab; only the
    // recurring poll skips while hidden.
    load();
    const timer = window.setInterval(() => {
      if (!cancelled && !document.hidden) load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // 2026-09-02 (Aleksandr, screen recording: "Новое сообщение должно
  // подниматься выше, чем сейчас") -- scrollIntoView({block: "end"}) on
  // scrollAnchorRef (a marker sitting right after the last message,
  // BEFORE this container's own pb-28) aligns the ANCHOR's bottom edge
  // with the scroll container's bottom edge -- which reaches the very
  // bottom of the screen, since the compose bar below is `fixed` and
  // no longer reserves flex space of its own (see that bar's own
  // comment). That put the newest message flush with the screen's
  // absolute bottom edge, hidden behind the compose bar, instead of
  // sitting pb-28's own 112px above it the way the empty/loading states
  // already do. Scrolling the container to its real scrollHeight
  // (which DOES include that trailing padding) instead of scrolling an
  // inner element into view is what actually respects it, and doesn't
  // need to hardcode the compose bar's own height (which varies with
  // env(safe-area-inset-bottom) across devices) to match pb-28 against.
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pendingMessages.length]);

  // 2026-09-03 (Aleksandr, screen recording: "Сделай, чтобы на мобильном
  // при переходе в чат он открывался в самой нижней точке сразу, чтобы
  // мне не приходилось свайпить наверх") -- the single snap above fires
  // once per messages/pendingMessages count change, but on a long mobile
  // history the content keeps growing for a while AFTER that snap already
  // ran: avatar/photo images finish decoding, headerHeight/
  // composeBarHeight correct themselves off their own hardcoded defaults
  // (see those ResizeObservers above), PdfPageThumbnail resolves
  // asynchronously, web fonts swap in -- each one grows scrollHeight a
  // beat later, leaving the view stranded mid-history exactly like the
  // recording shows (confirmed via extracted frames: settles well short
  // of the true bottom, then a real user swipe reveals more content
  // still below). Fix: track whether the reader is actually pinned to
  // the bottom (a scroll listener with a small threshold, so scrolling
  // UP to read old history un-pins and isn't fought), and keep re-
  // snapping on every later layout-height change via a ResizeObserver on
  // the message list's own content wrapper -- not just once on message-
  // count change like the effect above.
  const isPinnedToBottomRef = useRef(true);
  useEffect(() => {
    isPinnedToBottomRef.current = true;
  }, [chatId]);
  // 2026-09-05 (Aleksandr, Telegram Desktop reference screenshots: a
  // circular down-chevron floats above the compose bar once the newest
  // message has scrolled almost out of view, jumping back to the very
  // bottom on click) -- reuses the SAME pinned-to-bottom signal the
  // effect below already computes on every scroll tick (that ref alone
  // can't drive the button's visibility since writing a ref doesn't
  // re-render); this state mirrors it, but only setState on an actual
  // flip so a smooth scroll animation firing many scroll events doesn't
  // spam re-renders the whole way down.
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  useEffect(() => {
    setShowJumpToBottom(false);
  }, [chatId]);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const BOTTOM_PIN_THRESHOLD_PX = 96;
    function onScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const pinned = distanceFromBottom <= BOTTOM_PIN_THRESHOLD_PX;
      isPinnedToBottomRef.current = pinned;
      setShowJumpToBottom((prev) => (prev === !pinned ? prev : !pinned));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  // 2026-09-05 (Aleksandr: "Сделай анимацию стрелки вниз при клике") --
  // bumping this key remounts the chevron's own svg element, which
  // re-triggers its animate-jump-arrow CSS animation (app/globals.css)
  // on every tap -- a plain className toggle wouldn't replay on a
  // SECOND click while the first play was still finishing.
  const [jumpArrowBounceKey, setJumpArrowBounceKey] = useState(0);
  function jumpToBottom() {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isPinnedToBottomRef.current = true;
    setShowJumpToBottom(false);
    setJumpArrowBounceKey((k) => k + 1);
  }
  useEffect(() => {
    const el = messagesScrollRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const ro = new ResizeObserver(() => {
      if (isPinnedToBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // 2026-09-02 (Aleksandr, follow-up on the optimistic-send fix above:
  // "надо учесть ошибки с сетью, когда сообщение не дошло... если не
  // отменил, когда сеть появилась оно должно дослаться") -- one real
  // POST attempt for one pending bubble, shared by send() (the first
  // attempt) and retryOne() below (every attempt after). Three
  // outcomes: delivered (load() picks up the real message and
  // reconciliation above removes this bubble), a session problem
  // (401 -- not a network hiccup, drop the bubble and hand the text
  // back rather than retry something that will just 401 forever), or
  // anything else (marks `failed`, left on screen with NotSentIcon
  // instead of a tick, picked up again by retryAllFailed the next time
  // there's actually a network to retry on).
  async function attemptSend(
    localId: string,
    text: string,
    media?: { fileReference: string }[],
    contacts?: PickedContact[],
    meet?: MeetSendPayload,
    // Reply feature (2026-09-05) -- the message this send is replying
    // to, if any. Only ever set from send()'s own optimistic bubble
    // (fresh sends) or retryOne (re-derived from that same bubble's
    // own `replySnapshot`) -- never re-typed by hand, since the only
    // two facts chat-server needs (the target's numeric id + its
    // sender's user id) are already sitting on the ChatMessage object
    // this page already has in hand at both call sites.
    replyTo?: { messageId: string; userId: string },
  ) {
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Attachment feature: `text` may now be empty (attachment-only
        // send) and `media`/`contacts` may be present -- app/api/chats/
        // send/route.ts's own SendInput requires at least one of the
        // three, and only forwards whichever is actually present to
        // messages.send.
        body: JSON.stringify({
          chatId,
          text: text || undefined,
          media: media && media.length > 0 ? media : undefined,
          contacts:
            contacts && contacts.length > 0
              ? contacts.map((c) => ({
                  userId: c.userId,
                  phoneNumber: c.phoneNumber,
                  firstName: c.firstName,
                  lastName: c.lastName,
                }))
              : undefined,
          meet,
          replyTo,
        }),
      });
      if (res.ok) {
        load();
        return;
      }
      if (res.status === 401) {
        setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
        setDraft((d) => d || text);
        return;
      }
      setPendingMessages((prev) => prev.map((p) => (p.localId === localId ? { ...p, failed: true } : p)));
    } catch {
      setPendingMessages((prev) => prev.map((p) => (p.localId === localId ? { ...p, failed: true } : p)));
    }
  }

  // Voice messages (2026-09-03): marks the pending bubble's voice
  // attachment (and the bubble itself) failed -- same visible state
  // (red "not sent" dot, retry/cancel popover) a failed text/photo send
  // already gets, just reached from an upload-step failure instead of
  // the final POST /api/chats/send failing.
  function markVoiceUploadFailed(localId: string) {
    setPendingMessages((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? {
              ...p,
              failed: true,
              pendingAttachments: p.pendingAttachments?.map((a) =>
                a.kind === "voice" ? { ...a, status: "error" as const } : a,
              ),
            }
          : p,
      ),
    );
  }

  // Voice messages: the SAME create -> S3 POST -> confirm pipeline
  // handleAttachFile runs for photos/files (see that function's own
  // comment on why it's reusable as-is), just off a recorded Blob
  // (voiceBlobsRef) instead of a picked File, and firing attemptSend
  // itself once a fileReference exists rather than staging into the
  // top-level `attachments` queue for a manual Send tap -- releasing
  // the record button IS "send" for a voice note (matches the mobile
  // app), there's no separate staged-attachment step like Photo/File.
  // Shared between handleVoiceFinish (first attempt) and retryOne
  // (every attempt after an upload failure) so a retry re-uploads from
  // the same audio instead of having a stale/empty fileReference to
  // resend.
  async function uploadAndSendVoice(localId: string) {
    const stored = voiceBlobsRef.current.get(localId);
    if (!stored) {
      markVoiceUploadFailed(localId);
      return;
    }
    setPendingMessages((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? {
              ...p,
              failed: false,
              pendingAttachments: p.pendingAttachments?.map((a) =>
                a.kind === "voice" ? { ...a, status: "uploading" as const } : a,
              ),
            }
          : p,
      ),
    );
    try {
      const file = new File([stored.blob], `voice-${Date.now()}.webm`, { type: stored.mimeType });
      // 2026-09-03 (Aleksandr, live test: "эквалайзер должен быть уже
      // на отосланном сообщении") -- duration + a base64 5-bit-packed
      // waveform (encodeBase64Waveform, lib/a1/chat-schemas.ts -- the
      // exact inverse of the decode this app's own voice bubble already
      // uses to render bars) now actually go out with the upload, via
      // the same `attributes` passthrough app/api/upload/create/
      // route.ts already proved works for `attribute-filename` (PLAN.md
      // 6.105). Previously this body carried neither, so every sent
      // voice doc's `attributes` came back completely empty -- confirmed
      // live via messages.getMessages on a just-sent clip -- which is
      // why the sent bubble's own waveform rendered as a flat line.
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mimetype: file.type || "audio/webm",
          bytes: file.size,
          voiceDuration: stored.durationSeconds,
          voiceWaveform: encodeBase64Waveform(stored.waveform),
          // 2026-09-05 (Aleksandr: "ты забыл про огонек и
          // самоудаление") -- every voice note the mobile app sends is
          // self-destructing BY DEFAULT (source-confirmed, see
          // SELF_DESTRUCT_VOICE_FLAGS's own header in lib/a1/
          // chat-schemas.ts) -- this upload never requested that, so
          // the doc came back plain and voice-bubble.tsx's already-
          // built fire badge/countdown had nothing to show. Same
          // flags + 2-hour TTL the mobile app's own upload sends.
          flags: SELF_DESTRUCT_VOICE_FLAGS,
          ttlSeconds: SELF_DESTRUCT_VOICE_TTL_SECONDS,
        }),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok || !createData?.ok || !createData.result?.url) {
        markVoiceUploadFailed(localId);
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        markVoiceUploadFailed(localId);
        return;
      }
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json().catch(() => null);
      const fileReference = confirmData?.media?.fileReference as string | undefined;
      if (!confirmRes.ok || !confirmData?.ok || !fileReference) {
        markVoiceUploadFailed(localId);
        return;
      }
      // 2026-09-04 (see lib/voice-local-waveform-cache.ts's own header
      // for the full live-test trail) -- keyed by this exact
      // fileReference, so VoiceMessageBubble can render off the real
      // locally-recorded waveform instead of whatever the server's own
      // attribute-audio.waveform comes back as once this doc confirms.
      rememberLocalVoiceWaveform(fileReference, stored.waveform);
      voiceBlobsRef.current.delete(localId);
      setPendingMessages((prev) =>
        prev.map((p) =>
          p.localId === localId
            ? {
                ...p,
                pendingAttachments: p.pendingAttachments?.map((a) =>
                  a.kind === "voice" ? { ...a, status: "ready" as const, fileReference } : a,
                ),
              }
            : p,
        ),
      );
      // Reply feature (2026-09-05): a voice note follows the exact
      // same optimistic-bubble/replySnapshot machinery a text/photo
      // send already does (see handleVoiceFinish below, which staged
      // it onto this same pending bubble) -- looked up fresh here
      // rather than threaded through every call site, since retryOne
      // reaches this same function for a re-upload without re-deriving
      // it itself.
      const owner = pendingMessagesRef.current.find((p) => p.localId === localId);
      const replyTo =
        owner?.replySnapshot && owner.replySnapshot.fromId
          ? { messageId: owner.replySnapshot._id, userId: owner.replySnapshot.fromId }
          : undefined;
      await attemptSend(localId, "", [{ fileReference }], undefined, undefined, replyTo);
    } catch {
      markVoiceUploadFailed(localId);
    }
  }

  // Record-button release (components/chat/voice-recorder.ts's own
  // onFinish) -- builds the optimistic bubble (same PendingMessage
  // machinery text/photo/file/contact sends already use) then hands off
  // to uploadAndSendVoice. `entities`/`media` stay empty -- this bubble
  // renders purely off pendingAttachments, same as an attachment-only
  // photo/file send already does.
  function handleVoiceFinish(result: VoiceRecordingResult) {
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Reply feature (2026-09-05): same "only a real, hands-on send
    // clears the staged reply" rule send() itself follows -- captured
    // before clearing so this voice note's own optimistic bubble can
    // carry it, same as a typed message's `replySnapshot` above.
    const replyToSend = replyTarget;
    setReplyTarget(null);
    voiceBlobsRef.current.set(localId, {
      blob: result.blob,
      mimeType: result.mimeType,
      durationSeconds: result.durationSeconds,
      waveform: result.waveform,
    });
    const optimistic: PendingMessage = {
      _id: localId,
      flags: 0,
      peerFrom: myUserId ? { object: "peer-user", user: myUserId } : null,
      peerTo: null,
      date: new Date().toISOString(),
      entities: [],
      media: [],
      fromId: myUserId,
      pending: true,
      localId,
      failed: false,
      replySnapshot: replyToSend ?? undefined,
      pendingAttachments: [
        {
          localId: `${localId}-voice`,
          kind: "voice",
          fileName: "voice-message",
          mimetype: result.mimeType,
          status: "uploading",
          bytes: result.blob.size,
          durationSeconds: result.durationSeconds,
          waveform: result.waveform,
        },
      ],
    };
    setPendingMessages((prev) => [...prev, optimistic]);
    void uploadAndSendVoice(localId);
  }

  // Re-fires one failed bubble's send. `retryingIds` is the lock that
  // keeps the poll-tick retry pass and the browser's `online` event
  // from both picking up the same bubble at once -- flips it back to
  // "not failed" (spinner, not the red dot) the instant a retry starts,
  // so it also can't be picked up a second time before this attempt
  // resolves.
  async function retryOne(p: PendingMessage) {
    if (retryingIds.current.has(p.localId)) return;
    retryingIds.current.add(p.localId);
    setPendingMessages((prev) => prev.map((m) => (m.localId === p.localId ? { ...m, failed: false } : m)));
    try {
      // Voice messages: a voice attachment stuck at anything but "ready"
      // means the UPLOAD itself failed (never got a fileReference), not
      // just the final send POST -- attemptSend alone has nothing new
      // to resend in that case, so retry the whole upload instead (off
      // the same Blob, voiceBlobsRef).
      const voiceAttachment = p.pendingAttachments?.find((a) => a.kind === "voice");
      if (voiceAttachment && voiceAttachment.status !== "ready") {
        await uploadAndSendVoice(p.localId);
        return;
      }
      const media = p.pendingAttachments
        ?.filter((a) => a.status === "ready" && a.fileReference)
        .map((a) => ({ fileReference: a.fileReference as string }));
      const replyTo =
        p.replySnapshot && p.replySnapshot.fromId
          ? { messageId: p.replySnapshot._id, userId: p.replySnapshot.fromId }
          : undefined;
      await attemptSend(p.localId, extractMessageText(p), media, p.pendingContacts, undefined, replyTo);
    } finally {
      retryingIds.current.delete(p.localId);
    }
  }

  function retryAllFailed() {
    pendingMessagesRef.current.filter((p) => p.failed).forEach((p) => {
      void retryOne(p);
    });
  }

  // Ref indirection so the `online` listener below can stay registered
  // once for the page's whole life (no churn every time pendingMessages
  // changes) while still always calling the CURRENT retryAllFailed --
  // reassigned on every render, no effect needed for that part.
  // See the batch-fetch effect below (contactSummaries) for what this
  // guards against.
  const attemptedContactIdsRef = useRef<Set<string>>(new Set());
  const retryAllFailedRef = useRef(retryAllFailed);
  retryAllFailedRef.current = retryAllFailed;

  useEffect(() => {
    function handleOnline() {
      retryAllFailedRef.current();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Closes the cancel/retry popover on any click outside it -- no
  // backdrop element (this popover sits inline in the message list,
  // not portaled), so a plain document-level listener is simpler than
  // reasoning about z-index against the scrolling message list.
  useEffect(() => {
    if (!openPendingId) return;
    function handleDocClick(e: MouseEvent) {
      if (pendingPopoverRef.current && !pendingPopoverRef.current.contains(e.target as Node)) {
        setOpenPendingId(null);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [openPendingId]);

  function cancelPending(localId: string) {
    setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
    setOpenPendingId(null);
    // Voice messages: drop the held Blob too (see voiceBlobsRef's own
    // comment) -- a cancelled bubble is never retried, so there's
    // nothing left to re-upload it for.
    voiceBlobsRef.current.delete(localId);
  }

  useEffect(() => {
    if (!attachMenuOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!calcCurrencyPickerOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (calcCurrencyPickerRef.current && !calcCurrencyPickerRef.current.contains(e.target as Node)) {
        setCalcCurrencyPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [calcCurrencyPickerOpen]);

  // Contact-attachment feature: batch-resolves occupation/expertise/
  // avatar (POST /api/users/summaries) for every REAL message's contact
  // media whose sender isn't already covered -- runs off `messages`
  // (not `displayMessages`, which also includes this page's own
  // pendingContacts -- those already carry their `summary` from the
  // picker, see PendingMessage's own comment, so re-fetching them here
  // would be a wasted round-trip). De-duped against contactSummaries'
  // current keys so a poll tick that returns the same messages again
  // doesn't refire this for ids it already has.
  useEffect(() => {
    const ids = new Set<string>();
    for (const msg of messages) {
      for (const c of messageContactMedia(msg)) {
        // attemptedContactIdsRef, not contactSummaries itself -- a
        // user-empty/deleted-account contact never resolves to a
        // summary, and POLL_MS is 3s, so gating on the state map alone
        // would refire this POST every single poll tick forever for
        // any permanently-unresolvable id. "Already asked once" is
        // enough; ContactMessageCard's own null/undefined handling
        // covers "never got an answer" either way.
        if (!contactSummaries[c.userId] && !attemptedContactIdsRef.current.has(c.userId)) {
          ids.add(c.userId);
        }
      }
    }
    if (ids.size === 0) return;
    for (const id of ids) attemptedContactIdsRef.current.add(id);
    let cancelled = false;
    authFetch("/api/users/summaries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: Array.from(ids) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok || !data.users) return;
        setContactSummaries((prev) => ({ ...prev, ...data.users }));
      })
      .catch(() => {
        // Best-effort -- ContactMessageCard already renders fine with no
        // summary (just name/phone, no pill/expertise row).
      });
    return () => {
      cancelled = true;
    };
  }, [messages, contactSummaries]);

  // 2026-09-03 (Aleksandr, live screenshot of a received contact card:
  // "Если контакта которым со мной поделились нет у меня в контактах
  // добавь справа круглую кнопку (+)... Сам контакт буде добавлятися
  // нам в контакти") -- one-shot /api/contacts/list fetch (same route
  // components/chat/contacts-picker-modal.tsx already uses to attach a
  // contact), only fired once this chat actually has at least one
  // RECEIVED contact card (msg.fromId !== myUserId) -- most chats never
  // show a contact card at all, so this stays a no-op for them. Guarded
  // by a ref (not just checking myContactUserIds !== null) so a poll
  // tick landing between "fired" and "resolved" can't fire it twice.
  const contactBookRequestedRef = useRef(false);
  useEffect(() => {
    if (contactBookRequestedRef.current || myUserId === null) return;
    const hasReceivedContactCard = messages.some(
      (msg) => msg.fromId !== myUserId && messageContactMedia(msg).length > 0,
    );
    if (!hasReceivedContactCard) return;
    contactBookRequestedRef.current = true;
    authFetch("/api/contacts/list")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.ok) return;
        const ids = new Set<string>();
        for (const c of data.contacts ?? []) {
          if (c.user) ids.add(c.user as string);
        }
        setMyContactUserIds(ids);
      })
      .catch(() => {
        // Best-effort -- ContactMessageCard just never offers the +
        // shortcut if this never resolves; "Message" still works.
      });
  }, [messages, myUserId]);

  // Runs the same create -> upload -> confirm flow components/post-
  // editor.tsx's handleFileSelected already uses for post photos --
  // confirmed reusable as-is for chat attachments this session (Upload/
  // Media is one unified service shared across every backend service,
  // not duplicated per service -- see app/api/upload/create/route.ts).
  // `kind` only affects client-side compression/preview; the two upload
  // routes themselves don't care which button triggered the pick.
  // 2026-09-03 (Aleksandr, live test: "в компоузере при отправке нельзя
  // отправить файл пока он не подгрузится, это бесит... сразу можно
  // отправить в чат, а там пусть догружается") -- an attachment's own
  // upload (started the moment it's picked, in handleAttachFile below)
  // used to only ever update the compose-bar's own `attachments` array,
  // which send() cleared out the instant Send was pressed -- so Send
  // had to BLOCK until every upload finished first, or a still-
  // uploading attachment's eventual "ready"/"error" update would have
  // nowhere left to land. This updates whichever of the two places
  // currently holds that attachment: the compose array (not sent yet)
  // or a PendingMessage's own pendingAttachments (already sent, still
  // uploading in the background) -- exactly one of the two ever
  // actually matches, the other call is a harmless no-op.
  function updateAttachmentEverywhere(localId: string, updater: (a: PendingAttachment) => PendingAttachment) {
    setAttachments((prev) => prev.map((a) => (a.localId === localId ? updater(a) : a)));
    setPendingMessages((prev) =>
      prev.map((p) =>
        p.pendingAttachments?.some((a) => a.localId === localId)
          ? { ...p, pendingAttachments: p.pendingAttachments.map((a) => (a.localId === localId ? updater(a) : a)) }
          : p,
      ),
    );
  }

  // Once an attachment finishes uploading, checks whether it had
  // already been folded into a sent PendingMessage (Send no longer
  // waits) and, if every attachment that message carries is now ready,
  // fires the real send -- the same "release/ready IS what triggers the
  // POST" shape uploadAndSendVoice already uses for voice notes, here
  // used for however many photos/files were attached at once.
  function maybeFinalizePendingSend(localId: string, updatedAttachment: PendingAttachment) {
    const owner = pendingMessagesRef.current.find((p) => p.pendingAttachments?.some((a) => a.localId === localId));
    if (!owner || !owner.pendingAttachments) return;
    const nextAttachments = owner.pendingAttachments.map((a) => (a.localId === localId ? updatedAttachment : a));
    if (updatedAttachment.status === "error") {
      setPendingMessages((prev) => prev.map((p) => (p.localId === owner.localId ? { ...p, failed: true } : p)));
      return;
    }
    if (nextAttachments.every((a) => a.status === "ready")) {
      void attemptSend(
        owner.localId,
        extractMessageText(owner),
        nextAttachments.map((a) => ({ fileReference: a.fileReference as string })),
        owner.pendingContacts,
        undefined,
        owner.replySnapshot && owner.replySnapshot.fromId
          ? { messageId: owner.replySnapshot._id, userId: owner.replySnapshot.fromId }
          : undefined,
      );
    }
  }

  async function handleAttachFile(file: File, kind: "image" | "file") {
    if (attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) return;
    const localId = `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toUpload = kind === "image" ? await compressAttachmentImage(file) : file;
    // Size checked AFTER compression, on `toUpload.size` -- Aleksandr,
    // 2026-09-03 Figma annotation: "рассчитывается после сжатия
    // (фактический объём, который займёт место), а не по исходному
    // размеру файла." For images this falls out naturally since
    // toUpload is already the compressed File.
    const bytes = toUpload.size;
    // 2026-09-03 ("1:1 с Figma" follow-up): a PDF file gets a local
    // blob: URL too, same as an image -- lib/pdf-thumbnail.ts renders
    // its first page off this exact URL for the compose preview/
    // pending-bubble thumbnail. Every other file kind stays without a
    // previewUrl, unchanged.
    const previewUrl =
      kind === "image" || fileKindFromName(file.name, file.type) === "pdf" ? URL.createObjectURL(toUpload) : undefined;
    // Two independent validations before ever attempting an upload
    // (Aleksandr, 2026-09-03: flat per-file cap, then whatever's left of
    // today's quota) -- both push a visible RED error card instead of
    // the old silent `return` this replaced, per the real reference
    // app's "4. File too large" screenshot.
    if (bytes > MAX_ATTACHMENT_FILE_BYTES) {
      setAttachments((prev) => [
        ...prev,
        {
          localId,
          kind,
          fileName: file.name,
          mimetype: toUpload.type || "application/octet-stream",
          previewUrl,
          status: "error",
          errorMessage: `${formatBytes(bytes)} · ${MAX_FILE_SIZE_TEXT[lang]}`,
          bytes,
          tooLarge: true,
        },
      ]);
      return;
    }
    if (uploadUsage && bytes > uploadUsage.remainingBytes) {
      setAttachments((prev) => [
        ...prev,
        {
          localId,
          kind,
          fileName: file.name,
          mimetype: toUpload.type || "application/octet-stream",
          previewUrl,
          status: "error",
          errorMessage: `${formatBytes(bytes)} · ${formatBytes(uploadUsage.remainingBytes)} ${QUOTA_LEFT_TODAY_TEXT[lang]}`,
          bytes,
          tooLarge: true,
        },
      ]);
      return;
    }
    setAttachments((prev) => [
      ...prev,
      {
        localId,
        kind,
        fileName: file.name,
        mimetype: toUpload.type || "application/octet-stream",
        previewUrl,
        status: "uploading",
        bytes,
      },
    ]);
    try {
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // 2026-09-03 (Aleksandr, live screenshots: sent files show a
        // generic "Документ"/"FILE" badge instead of the real name/
        // icon) -- file.name is the ORIGINAL name (kind === "image"
        // attachments went through compressAttachmentImage above, which
        // preserves the source name, not toUpload's own -- same value
        // either way here). See app/api/upload/create/route.ts's own
        // comment for why this is what actually fixes it.
        body: JSON.stringify({ mimetype: toUpload.type || "application/octet-stream", bytes: toUpload.size, fileName: file.name }),
      });
      const createData = await createRes.json();
      // 2026-09-03 (Aleksandr, live test: "сразу можно отправить в
      // чат, а там пусть догружается") -- every status transition below
      // now builds the FULL updated attachment straight from this
      // function's own local variables (kind/file/toUpload/bytes/
      // previewUrl, all already in scope) instead of patching whatever
      // the state array currently holds -- Send may already have moved
      // this attachment out of `attachments` and into a PendingMessage
      // by the time any of these resolve, so there's no single source
      // of truth left to read the rest of the fields FROM; the closure
      // already has them.
      if (createData?.message === "quota_exceeded" && createData.usage) {
        // Aleksandr, 2026-09-02: same 20MB/day-per-user quota the native
        // app enforces (app/api/upload/create/route.ts's own comment) --
        // shown as an actual reason instead of the generic "Failed"
        // every other upload error still falls back to.
        const usage = createData.usage as { usedBytes: number; limitBytes: number; resetAt: number };
        const resetsIn = formatRelativeTime(new Date(usage.resetAt * 1000), lang);
        const errorMessage = `${UPLOAD_QUOTA_EXCEEDED_TEXT[lang]} (${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}, ${resetsIn})`;
        const updated: PendingAttachment = {
          localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
          previewUrl, bytes, status: "error", errorMessage,
        };
        updateAttachmentEverywhere(localId, () => updated);
        maybeFinalizePendingSend(localId, updated);
        return;
      }
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        const updated: PendingAttachment = {
          localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
          previewUrl, bytes, status: "error",
        };
        updateAttachmentEverywhere(localId, () => updated);
        maybeFinalizePendingSend(localId, updated);
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", toUpload);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const updated: PendingAttachment = {
          localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
          previewUrl, bytes, status: "error",
        };
        updateAttachmentEverywhere(localId, () => updated);
        maybeFinalizePendingSend(localId, updated);
        return;
      }
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json();
      const fileReference = confirmData?.media?.fileReference as string | undefined;
      if (!confirmRes.ok || !confirmData.ok || !fileReference) {
        const updated: PendingAttachment = {
          localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
          previewUrl, bytes, status: "error",
        };
        updateAttachmentEverywhere(localId, () => updated);
        maybeFinalizePendingSend(localId, updated);
        return;
      }
      {
        const updated: PendingAttachment = {
          localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
          previewUrl, bytes, status: "ready", fileReference,
        };
        updateAttachmentEverywhere(localId, () => updated);
        maybeFinalizePendingSend(localId, updated);
      }
    } catch {
      const updated: PendingAttachment = {
        localId, kind, fileName: file.name, mimetype: toUpload.type || "application/octet-stream",
        previewUrl, bytes, status: "error",
      };
      updateAttachmentEverywhere(localId, () => updated);
      maybeFinalizePendingSend(localId, updated);
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.localId !== localId);
    });
  }

  // Persists the one-time "Photos & files" teaching banner's dismissal
  // -- see DAILY_BANNER_SEEN_KEY's own comment for the trigger and why
  // it's inferred rather than a spec'd threshold.
  function dismissDailyBanner() {
    setDailyBannerDismissed(true);
    try {
      window.localStorage.setItem(DAILY_BANNER_SEEN_KEY, "1");
    } catch {
      // Best-effort -- a failed write just means the banner can show
      // again next session, never a broken UI.
    }
  }

  function onPickAttachment(kind: "image" | "file") {
    // 2026-09-03 (Figma "Attachments" section: quota-exhausted Photo/
    // File rows are 50%-dim and non-selectable, reachable only via the
    // Daily Uploads modal instead) -- mirrors the same
    // `uploadUsage.remainingBytes <= 0` gate the attach-menu JSX below
    // already dims those two rows with, so a click can't slip through
    // between the dim state rendering and this handler running.
    if (quotaFullyUsed) {
      setAttachDailyUploadsOpen(true);
      return;
    }
    setAttachMenuOpen(false);
    (kind === "image" ? photoInputRef : fileInputRef).current?.click();
  }

  // 2026-09-03 (Figma "Attachments" section: "можно выбирать мульти
  // количество файлов сразу... чтобы можно было точно так же с десктопа
  // или там с версии веб на мобильном тоже можно было выбирать
  // несколько") -- both file inputs below now carry `multiple`; this
  // slices the picked FileList down to whatever's left of
  // MAX_ATTACHMENTS_PER_MESSAGE BEFORE looping, so firing N
  // handleAttachFile calls from one multi-select batch can't overshoot
  // the cap on a stale `attachments.length` closure the way looping
  // and checking that length freshly on each iteration would.
  function pickAttachmentFiles(fileList: FileList | null, kind: "image" | "file") {
    if (!fileList || fileList.length === 0) return;
    const room = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
    if (room <= 0) return;
    Array.from(fileList)
      .slice(0, room)
      .forEach((file) => void handleAttachFile(file, kind));
  }

  function announceTyping() {
    const now = Date.now();
    if (now - lastTypingSentAt.current < TYPING_THROTTLE_MS) return;
    lastTypingSentAt.current = now;
    // Fire-and-forget, per app/api/chats/typing/route.ts's own header --
    // a dropped typing ping is a non-event, never surfaced to the UI.
    authFetch("/api/chats/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId }),
    }).catch(() => {});
  }

  async function send(overrideText?: string, meet?: MeetSendPayload) {
    const text = (overrideText ?? draft).trim();
    // Attachment feature: only ready (fully uploaded+confirmed)
    // attachments are ever sent -- a message can go out with zero typed
    // text as long as at least one is ready (MessageInput.message is
    // optional, see app/api/chats/send/route.ts). uploadingCount guards
    // the Enter-key path the same way the send button's own `disabled`
    // does below (see that JSX) -- send() is never called mid-upload.
    // Contact-attachment feature: pendingContacts needs no upload wait
    // (nothing to poll for -- a picked contact is ready the instant
    // it's toggled in the picker), so it only ever adds to the "has
    // content" check, never to uploadingCount.
    const readyAttachments = attachments.filter((a) => a.status === "ready" && a.fileReference);
    // 2026-09-03 (Aleksandr, live test: "нельзя отправить файл, пока он
    // не подгрузится, это бесит... сразу можно отправить в чат, а там
    // пусть догружается") -- an attachment still `status === "uploading"`
    // (or one that already failed and hasn't been removed) no longer
    // blocks Send: it rides along in this bubble's own pendingAttachments
    // exactly as staged, and maybeFinalizePendingSend (handleAttachFile's
    // own upload-completion callback, see its header comment) fires the
    // real POST once every attachment this message carries has actually
    // reached "ready" -- same "release IS send, upload happens after"
    // shape voice notes already use, generalized to N attachments.
    const uploadingAttachments = attachments.filter((a) => a.status !== "ready" || !a.fileReference);
    const allAttachmentsReady = attachments.length > 0 && uploadingAttachments.length === 0;
    const hasContacts = pendingContacts.length > 0;
    if ((!text && attachments.length === 0 && !hasContacts) || sending) return;
    setSending(true);
    const contactsToSend = pendingContacts;
    const attachmentsToSend = attachments;
    // Reply feature (2026-09-05) -- only a manually-typed/attached send
    // (never an overrideText call like the empty-chat greeting sticker
    // or a meeting accept, neither of which has anything to reply to at
    // the point they fire) carries whatever reply was staged, same
    // "only overrideText-less sends touch this compose state" rule
    // draft/attachments/contacts already follow right below.
    const replyToSend = overrideText ? null : replyTarget;
    if (!overrideText) {
      setDraft("");
      setAttachments([]);
      setPendingContacts([]);
      setReplyTarget(null);
    }
    // Optimistic bubble, shown the instant the POST is fired -- see the
    // `pendingMessages` state comment above for why (load() right after
    // send() used to sometimes race chat-server's own indexing and show
    // nothing new for up to POLL_MS). localId is only ever used to find
    // this exact entry again (the `key` prop below and every lookup in
    // attemptSend/retryOne/cancelPending); real messages never collide
    // with it since chat-server's own _ids never contain a "-".
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: PendingMessage = {
      _id: localId,
      flags: 0,
      peerFrom: myUserId ? { object: "peer-user", user: myUserId } : null,
      peerTo: null,
      date: new Date().toISOString(),
      entities: text ? [{ object: "entity-text", text }] : [],
      media: [],
      fromId: myUserId,
      pending: true,
      localId,
      failed: false,
      pendingAttachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      pendingContacts: contactsToSend.length > 0 ? contactsToSend : undefined,
      // Reply feature: the FULL original message, not just its id --
      // this pending bubble needs something to render its own reply
      // quote from immediately (see MessageReplyQuote's own usage
      // below), well before load()'s next poll could resolve one from
      // a bare id the way a real, already-sent message's replyTo does.
      replySnapshot: replyToSend ?? undefined,
    };
    setPendingMessages((prev) => [...prev, optimistic]);
    // Only fire the real send now if every attachment is already
    // ready (the common case -- uploads usually finish well before a
    // caption is typed and Send is tapped) -- otherwise leave it to
    // maybeFinalizePendingSend, which fires the instant the LAST still-
    // uploading one reaches "ready" (or marks this bubble failed if one
    // of them errors out instead).
    if (allAttachmentsReady || attachmentsToSend.length === 0) {
      await attemptSend(
        localId,
        text,
        readyAttachments.map((a) => ({ fileReference: a.fileReference as string })),
        contactsToSend,
        meet,
        replyToSend && replyToSend.fromId ? { messageId: replyToSend._id, userId: replyToSend.fromId } : undefined,
      );
    }
    setSending(false);
  }

  // Contact-card "Message" button (components/chat/contact-message-
  // card.tsx's onMessage) -- same POST /api/chats/open -> router.push
  // pattern app/contacts/page.tsx's own openChat already uses (finds an
  // existing personal chat with that user, or creates one), just
  // without that page's own flashError-on-failure UI since a card deep
  // inside a chat's message list has nowhere sensible to flash red into.
  async function openChatWithUser(userId: string, title: string, avatarUrl: string | null) {
    if (openingChatFor) return;
    setOpeningChatFor(userId);
    try {
      const res = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        const qs = new URLSearchParams();
        if (title) qs.set("title", title);
        if (avatarUrl) qs.set("avatar", avatarUrl);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        router.push(`/chats/${data.chatId}${suffix}`);
      }
    } catch {
      // Best-effort -- see this function's own comment on why there's no
      // visible failure state here.
    } finally {
      setOpeningChatFor(null);
    }
  }

  // Photo-viewer feature (2026-09-03) -- every image attachment across
  // REAL messages (never pendingMessages -- an optimistic bubble's own
  // pendingAttachments are local blob: previews with no server-side
  // docId/fileReference yet, nothing to open a durable viewer onto, same
  // reasoning as messageDocumentMedia() itself only ever reading
  // `msg.media`), in chat order, each carrying enough to render + save +
  // delete + label itself with zero further lookups.
  const chatViewerImages: ChatViewerImage[] = useMemo(() => {
    const out: ChatViewerImage[] = [];
    for (const msg of messages) {
      const mine = myUserId !== null && msg.fromId === myUserId;
      const senderLabel = mine ? YOU_LABEL_TEXT[lang] : headerTitle || "—";
      const ms = messageDateMs(msg);
      const numericId = Number(msg._id);
      for (const doc of messageDocumentMedia(msg)) {
        if (!isImageMediaDocument(doc)) continue;
        const fileName = mediaDocumentFileName(doc);
        out.push({
          key: `${msg._id}:${doc._id}`,
          docId: doc._id,
          url: buildMediaProxyUrl(doc),
          downloadUrl: buildMediaDownloadUrl(doc, fileName || undefined),
          fileName,
          messageId: numericId,
          senderLabel,
          dateMs: ms,
        });
      }
    }
    return out;
  }, [messages, myUserId, lang, headerTitle]);

  function openViewerForDoc(messageId: string, docId: string) {
    const i = chatViewerImages.findIndex((im) => im.messageId === Number(messageId) && im.docId === docId);
    if (i >= 0) setViewerIndex(i);
  }

  // "Show in chat" (viewer's "•••" menu) -- closes the viewer, scrolls
  // the source message into view, and flashes an outline on it for
  // ~1.5s. Relies on the `data-message-id` attribute the bubble below
  // carries for exactly this.
  function handleShowInChatFromViewer(messageId: number) {
    setViewerIndex(null);
    window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      window.setTimeout(() => {
        setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
      }, 1500);
    });
  }

  // Reply (viewer's "•••" menu) -- deliberately minimal, see photo-
  // viewer.tsx's own header comment on why: just closes the viewer and
  // focuses the compose box, same as tapping it manually would.
  function handleReplyFromViewer() {
    setViewerIndex(null);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // Delete (viewer's bottom bar + "•••" menu, both share this) -- always
  // revoke:false (delete-for-me only, see app/api/chats/delete/route.ts's
  // own header for the explicit scope this was cut down to). Removing
  // the message from local `messages` state here is what shrinks the
  // viewer's own `images` prop, which its own effect reacts to (auto-
  // advance / auto-close) -- no need to duplicate that logic here.
  const handleDeleteChatMessage = useCallback(
    async (messageId: number) => {
      const res = await authFetch("/api/chats/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, messageIds: [messageId] }),
      });
      if (!res.ok) {
        throw new Error("delete_failed");
      }
      setMessages((prev) => prev.filter((m) => Number(m._id) !== messageId));
    },
    [chatId],
  );

  // Calculations feature -- draft-row mutations, all pure state updates.
  function calcAddRow() {
    setCalcRows((prev) => (prev.length >= CALC_MAX_ROWS ? prev : [...prev, calcBlankRow()]));
  }
  function calcUpdateRow(id: string, patch: Partial<Omit<CalcRow, "id">>) {
    setCalcRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  // Bottom-bar "−" (see the panel's own JSX comment for how the four
  // buttons there were interpreted off the reference video, which
  // doesn't narrate itself): drops the most recently added row, same
  // "undo the last add" a stepper's minus usually means. Never drops
  // below one row -- there's always at least a blank one to type into.
  function calcRemoveLastRow() {
    setCalcRows((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));
  }
  function calcClose() {
    setCalcOpen(false);
    setCalcRows([calcBlankRow()]);
    setCalcNote("");
    setCalcCurrency("usd");
    setCalcError(false);
  }
  const calcTotal = calcRows.reduce((sum, r) => sum + calcRowSubtotal(r), 0);
  const calcHasContent = calcRows.some((r) => r.description.trim() || r.unitAmount.trim()) || calcNote.trim().length > 0;

  async function sendCalculation() {
    if (calcSending || !calcHasContent) return;
    setCalcSending(true);
    setCalcError(false);
    const rows = calcRows
      .filter((r) => r.description.trim() || r.unitAmount.trim())
      .map((r) => ({
        description: r.description.trim() || null,
        unitAmount: Math.round(calcParseDecimal(r.unitAmount) * 100),
        quantity: calcParseQuantity(r.quantity),
      }));
    // Optimistic bubble -- see PendingMessage.pendingCalc's own comment
    // for why this is needed now. Left OUT of `pendingMessages` on
    // failure below (rows/note/currency stay in the panel, exactly the
    // pre-existing on-failure behavior) rather than marked `failed` like
    // a text bubble, since there's no calc-specific retry path yet --
    // the user just presses send again.
    const localId = `pending-calc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: PendingMessage = {
      _id: localId,
      flags: 0,
      peerFrom: myUserId ? { object: "peer-user", user: myUserId } : null,
      peerTo: null,
      date: new Date().toISOString(),
      entities: [],
      media: [],
      fromId: myUserId,
      pending: true,
      localId,
      failed: false,
      pendingCalc: { note: calcNote.trim(), currency: calcCurrency, rows, object: "entity-calculation" },
    };
    setPendingMessages((prev) => [...prev, optimistic]);
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId,
          calculation: { note: calcNote.trim(), currency: calcCurrency, rows },
        }),
      });
      if (!res.ok) {
        setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
        setCalcError(true);
        return;
      }
      calcClose();
      load();
    } catch {
      setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
      setCalcError(true);
    } finally {
      setCalcSending(false);
    }
  }

  // Scheduled Meetings (2026-09-04) -- ScheduleMeetingModal's own
  // onSchedule callback. Same optimistic-free shape sendCalculation()
  // used to have before its own pending-bubble fix (see PendingMessage.
  // pendingCalc's comment) -- NOT replicated here on purpose: a meeting
  // proposal is plain text end to end (see lib/a1/meeting-protocol.ts's
  // header), so it already gets send()'s normal optimistic bubble,
  // retry-on-failure, and reconciliation for free, same as any typed
  // message or the Quick Invite buttons above it in the same menu.
  async function scheduleMeeting(payload: { startsAtUtcMs: number; link: string | null }) {
    if (schedulingMeeting) return;
    setSchedulingMeeting(true);
    try {
      // Scheduled Meetings, round two -- proposerTimeZone is read live
      // off THIS device (Intl, no permission prompt, no backend call)
      // at the moment of sending, same as every other "device-
      // automatic" zone read in this feature (see meeting-protocol.ts's
      // own TIMEZONE NOTE).
      //
      // 2026-09-04, round three (Aleksandr found the real backend media
      // type himself -- see app/api/chats/send/route.ts's own SendInput.
      // meet comment for the full protocol writeup, and his own ask:
      // "Нам нужно чтобы оно отображалось на мобе и скрывало время,
      // подставляло иконку с ориентиром пока встречу не примут") -- this
      // now ALSO attaches a bare `media-meet-invite-online` marker
      // alongside the exact same text payload as before. Deliberately
      // carries no time/link of its own: a native client rendering this
      // marker has nothing to show but its own generic "meeting invite"
      // affordance, which is exactly "hide the time, show an icon"
      // without this app needing to build or fake that UI itself.
      await send(
        encodeMeetingText({
          ...payload,
          proposerTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        { kind: "invite" },
      );
      setScheduleMeetingOpen(false);
    } finally {
      setSchedulingMeeting(false);
    }
  }

  // Scheduled Meetings: Accept is itself just another text message
  // (encodeMeetingAcceptText), sent through the exact same send() path
  // -- the render pass below (displayMessages' own acceptedMeetingIds
  // computation) is what keeps it from ever showing as its own bubble.
  //
  // 2026-09-04, round three -- startsAtUtcMs/link are the ORIGINAL
  // proposal's own already-decoded values (this app's own
  // meeting-protocol.ts never renegotiates the time on accept, only
  // records the accepter's timezone -- see MeetingAcceptPayload's own
  // comment), passed in from the MeetingMessageCard call site below
  // where `meeting` is already in scope. The real `media-meet` object
  // (the one with an actual time on it) only goes out HERE, on accept
  // -- never on the original proposal -- so a native client sees
  // nothing but the bare invite marker until this fires, matching
  // Aleksandr's "hide the time... until accepted" ask above.
  async function acceptMeeting(meetingMsgId: string, startsAtUtcMs: number, link: string | null) {
    if (acceptingMeetingId) return;
    setAcceptingMeetingId(meetingMsgId);
    try {
      await send(
        encodeMeetingAcceptText({
          meetingMsgId,
          accepterTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        { kind: "confirm", at: Math.round(startsAtUtcMs / 1000), url: link },
      );
    } finally {
      setAcceptingMeetingId(null);
    }
  }

  // Rendered list: real messages + any not-yet-reconciled optimistic
  // ones, re-sorted by date so a pending bubble (timestamped "now" the
  // moment it was created) always lands at the end where it belongs,
  // never briefly out of order against whatever load() last fetched.
  const rawDisplayMessages: (ChatMessage | PendingMessage)[] = [...messages, ...pendingMessages].sort(
    (a, b) => messageDateMs(a) - messageDateMs(b),
  );
  // Scheduled Meetings: an Accept is a hidden protocol message (see
  // lib/a1/meeting-protocol.ts's own header) -- never rendered as its
  // own bubble, only folded into the proposal card it references.
  // acceptedMeetingIds is gathered from the FULL list (both already-
  // synced accepts from either participant and this viewer's own
  // optimistic pending one, so tapping Accept flips the card
  // immediately rather than waiting a poll tick) before accept entries
  // are filtered back out of what actually renders.
  // Round two: was a plain Set<string> of accepted meeting ids -- now a
  // Map to the full decoded MeetingAcceptPayload, since
  // MeetingMessageCard needs the ACCEPTER's own name/avatar/timeZone
  // (see that payload's own comment in meeting-protocol.ts) to render
  // their participant row once accepted, not just a yes/no flag.
  const acceptedMeetings = new Map<string, MeetingAcceptPayload>();
  for (const m of rawDisplayMessages) {
    const accept = decodeMeetingAcceptText(extractMessageText(m));
    if (accept) acceptedMeetings.set(accept.meetingMsgId, accept);
  }
  const displayMessages = rawDisplayMessages.filter((m) => decodeMeetingAcceptText(extractMessageText(m)) === null);

  // 2026-09-05 (Aleksandr, repeated report even after 6.116/6.142:
  // "Фото по-прежнему не отображаются в комбинированном виде" -- confirmed live: he
  // multi-selects several photos and sends them as ONE compose action).
  // The within-message grouping above (imageGroupStartId, per-message
  // docMedia run) assumes chat-server actually stores a multi-attachment
  // send as a single message carrying N media entries -- the OpenAPI
  // spec only confirms `media` is an array on Resource.Message's OUTPUT
  // shape, never confirmed live that messages.send's INPUT array
  // survives as one grouped message rather than being split server-side
  // into N single-media messages (no groupedId/albumId field exists on
  // this backend at all, unlike Telegram's own MTProto). This is a
  // defensive fallback for exactly that split-server-side case: group
  // any run of 2+ CONSECUTIVE real (non-pending) messages from the SAME
  // sender, each carrying nothing but a single image (no caption, no
  // other content -- the same "solo" shape isImageOnly below already
  // tests per-message), sent within CROSS_MESSAGE_GROUP_WINDOW_MS of
  // each other, into one ChatPhotoGrid -- same visual result as the
  // within-message case, just spanning message boundaries instead of
  // one message's own media array. A message that already groups via
  // imageGroupStartId (2+ images in its OWN media array) never
  // qualifies as "solo" here (soloImageMessage requires exactly one doc),
  // so the two groupings can never double-fire on the same message.
  const CROSS_MESSAGE_GROUP_WINDOW_MS = 15_000;
  const soloImageMessage = (m: ChatMessage | PendingMessage): { msg: ChatMessage; doc: MessageMediaDocument } | null => {
    if (isPendingMessage(m)) return null;
    if (extractMessageText(m)) return null;
    if (messageCalculation(m) !== null) return null;
    if (messageContactMedia(m).length > 0) return null;
    const docs = messageDocumentMedia(m);
    if (docs.length !== 1) return null;
    const doc = docs[0]!;
    if (!isImageMediaDocument(doc)) return null;
    return { msg: m, doc };
  };
  const crossMessageGroupStart = new Map<string, { msg: ChatMessage; doc: MessageMediaDocument }[]>();
  const crossMessageGroupSkip = new Set<string>();
  {
    let idx = 0;
    while (idx < displayMessages.length) {
      const first = soloImageMessage(displayMessages[idx]!);
      if (!first) {
        idx++;
        continue;
      }
      const run = [first];
      let next = idx + 1;
      while (next < displayMessages.length) {
        const cand = soloImageMessage(displayMessages[next]!);
        if (!cand || cand.msg.fromId !== first.msg.fromId) break;
        const gapMs = messageDateMs(cand.msg) - messageDateMs(run[run.length - 1]!.msg);
        if (gapMs < 0 || gapMs > CROSS_MESSAGE_GROUP_WINDOW_MS) break;
        run.push(cand);
        next++;
      }
      if (run.length >= 2) {
        crossMessageGroupStart.set(run[0]!.msg._id, run);
        for (const r of run.slice(1)) crossMessageGroupSkip.add(r.msg._id);
      }
      idx = next;
    }
  }

  // Reply feature (2026-09-05) -- a real message's own `replyTo` (see
  // lib/a1/chat-schemas.ts's MessageReplyToSchema header) carries only
  // the target's numeric id, never a snippet of what it said -- this
  // resolves that id against whatever's already loaded in THIS chat's
  // own recent-history window (messages, not pendingMessages: nothing
  // pending has a real numeric id yet to be replied TO, only ever a
  // localId). A target outside that window (an old reply, or a chat
  // with a lot of history since) has nothing to resolve to; the quote
  // block below just falls back to a generic label rather than fetching
  // it specially -- same "don't build a second round-trip for an edge
  // case" call as every other best-effort lookup on this page.
  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m._id, m);
    return map;
  }, [messages]);

  function resolveReplyPreview(target: ChatMessage | null | undefined): { authorLabel: string; node: ReactNode; thumbnail: ReactNode } | null {
    if (!target) return null;
    const authorLabel = target.fromId !== null && target.fromId === myUserId ? YOU_LABEL_TEXT[lang] : headerTitle;
    const preview = describeMessagePreview(target);
    // 2026-09-05 follow-up (Aleksandr, 4 reference screenshots: "давай
    // расширять дальше на другие типы файлов" -- replying-with-text to
    // a Photo/Voice Message/Sticker/document in the reference app) --
    // this used to hardcode photoUrl to null, so replying to a photo
    // never showed the little thumbnail ChatPreviewLine already knows
    // how to render (it's the same component the chat list itself
    // uses) -- describeMessagePreview already hands back the actual
    // doc for a "photo" preview, just wasn't being read here yet.
    const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;
    // 2026-09-05 follow-up #2 (Aleksandr, reference screenshot: a
    // CAPTIONED photo's reply quote in the reference app shows the
    // photo's own thumbnail right next to the caption, not the caption
    // alone) -- describeMessagePreview's own precedence (lib/a1/
    // chat-schemas.ts) calls a message "text" the instant it HAS text,
    // caption or not, so a captioned photo/file never even reaches the
    // photo/file branches above. This is a second, independent look at
    // the SAME target's own docs, scoped to the "text" case only, so a
    // genuinely plain text message (no docs at all) still gets none.
    let thumbnail: ReactNode = null;
    if (preview.kind === "text") {
      const docs = messageDocumentMedia(target);
      const captionPhoto = docs.find((d) => isImageMediaDocument(d));
      const captionFile = docs.find((d) => !isVoiceMediaDocument(d) && !isImageMediaDocument(d) && !isVideoMediaDocument(d) && !isStickerMediaDocument(d));
      if (captionPhoto) {
        thumbnail = (
          // eslint-disable-next-line @next/next/no-img-element -- proxied through /api/media.
          <img src={getStableMediaProxyUrl(captionPhoto)} alt="" className="h-9 w-9 shrink-0 rounded-[6px] object-cover" />
        );
      } else if (captionFile) {
        thumbnail = (
          <ChatFileTypeIcon kind={fileKindFromName(mediaDocumentFileName(captionFile), captionFile.mimetype)} className="h-9 w-9 shrink-0" />
        );
      }
    }
    return {
      authorLabel,
      node: <ChatPreviewLine kind={preview.kind} text={preview.text} photoUrl={photoUrl} className="truncate whitespace-nowrap" />,
      thumbnail,
    };
  }

  // 2026-09-03 (Figma "Attachments" section, "4.1 Multiple files
  // selected" / "exceeded limit" banners) -- selectedAttachmentBytes
  // excludes `tooLarge` picks (they're not going anywhere, already
  // shown as their own red card) so the banner's own math isn't thrown
  // off by a rejected file still sitting in `attachments`. quotaBanner
  // shows on any of three conditions: 3+ selected, 5MB+ selected, or
  // the selection alone would blow past what's left of today's quota.
  // Figma "Attachments" section: Photo/File rows dim + redirect to
  // DailyUploadsModal once nothing is left of today's quota; also
  // gates the one-time teaching banner above the attach-menu.
  const quotaFullyUsed = uploadUsage !== null && uploadUsage.remainingBytes <= 0;
  const selectableAttachments = attachments.filter((a) => !a.tooLarge);
  const selectedAttachmentBytes = selectableAttachments.reduce((sum, a) => sum + (a.bytes || 0), 0);
  const quotaExceededBySelection = uploadUsage !== null && selectedAttachmentBytes > uploadUsage.remainingBytes;
  const showQuotaBanner =
    selectableAttachments.length >= QUOTA_BANNER_MIN_COUNT ||
    selectedAttachmentBytes >= QUOTA_BANNER_MIN_BYTES ||
    quotaExceededBySelection;

  return (
    // 2026-09-02 (Aleksandr: "её аватарка должны бути також зверху
    // закріплені... они должны толкать все следующие сообщения вверх, чтобы
    // оставаться наверху") -- see components/site-nav.tsx's own comment on
    // --site-nav-h for the actual bug: a bare `100dvh` here made this box
    // taller than the real remaining viewport by exactly that bar's own
    // height, which made the whole BODY scrollable and let that bar cover
    // this page's own sticky header the moment anything scrolled it (which
    // the scroll-to-latest-message effect below did on every load). Sizing
    // to the real remaining space instead means this box's own internal
    // scroll (the message list below) is the ONLY scroll on this page ever
    // again -- new messages already push the list up top were fine; they
    // just needed to stay reachable without dragging the header away with
    // them.
    <div
      className="flex flex-col bg-[#f2f2f7] text-[#262a34] dark:bg-black dark:text-white"
      style={{ height: "calc(100dvh - var(--site-nav-h, 64px))" }}
    >
      {/* 2026-09-02 (Aleksandr: "Сделай как у нас в приложении UI,
          поставь имя по центру, а аватар справа. И при нажатии на
          аватар и на имя должен открываться профіль цієї людини") --
          matches the reference app screenshot's own layout: back
          button stays the row's only normal-flow LEFT item; the name
          is still absolutely centered over the row's full width, same
          "pointer-events-none absolute inset-0 flex items-center
          justify-center" trick components/site-nav.tsx uses for its own
          centered tabs pill (see that file's header for the technique
          in full) -- but now rendered as its own tappable rounded pill
          (bg-black/5, matching the app's dark chip) instead of sitting
          next to the avatar; the avatar moves out of that centered
          group entirely and becomes the row's other normal-flow item,
          pushed to the right via ml-auto. Name and avatar both link to
          headerProfileHref when a ?username= came along with this
          chat's ?title=/?avatar= (see where those are read above) --
          null just renders them as plain non-clickable elements, same
          fail-open convention this file's other guessed-shape reads
          use. max-w-[470px] still matches the compose bar's own row so
          the back button tracks the paperclip's x. */}
      {/* 2026-09-02 (Aleksandr: "верхнюю часть с логотипом уберём на
          мобильном, поднимем имя/стрелку/аватар") -- components/site-
          nav.tsx now hides itself below `sm` on this exact route, which
          also means IT no longer contributes its own `pt-[env(safe-
          area-inset-top)]` notch padding on mobile. This header becomes
          the topmost fixed chrome in that case, so it takes over that
          padding itself -- `sm:pt-0` drops it again at the breakpoint
          where site-nav reappears and already reserves that space,
          avoiding a doubled-up gap on desktop. */}
      <div
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-10 border-b border-black/5 bg-[#f2f2f7]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/10 dark:bg-black/80 sm:sticky sm:pt-0"
      >
        <div className="relative mx-auto flex w-full max-w-[470px] items-center px-4 py-3">
          {/* 2026-09-04 (Aleksandr, live test: "сделай анимацию на
              стрелку назад при ховер") -- `group` here + `animate-
              back-arrow` on the glyph itself (app/globals.css's own
              back-arrow-nudge keyframe) is the same hover-nudge
              convention the compose bar's own send button already uses
              on its arrow (that button's own `group`/`animate-send-
              arrow` comment). */}
          <Link
            href="/chats"
            aria-label="Back"
            onClick={flushDraftSync}
            className="group flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
          >
            <ChatBackArrow className="h-3 w-[7px] animate-back-arrow" />
          </Link>

          {/* 2026-09-03 (Aleksandr, live screenshot: "высоту заливки
              имени сделай такой же как кнопка назад и аватар") -- the
              name pill used to size itself off its own py-1.5 padding
              alone, landing a bit shorter than the 42px back-arrow/
              avatar circles flanking it. min-h-[42px] + flex-centering
              the (possibly two-line, once the "typing..." row shows up)
              content matches the pill's BASE height to those exactly
              without capping how tall it can grow. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-3">
            {headerProfileHref ? (
              <Link
                href={headerProfileHref}
                className="pointer-events-auto flex min-h-[42px] max-w-[55%] flex-col items-center justify-center truncate rounded-full bg-black/5 px-4 text-center transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <span className="block truncate text-[15px] font-semibold leading-tight">{headerTitle || "—"}</span>
                {peerTyping && (
                  <span className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#335ef7] dark:text-[#0c8ce9]">
                    <T uk="набирає" en="typing" ru="печатает" de="tippt" es="escribiendo" fr="écrit" pl="pisze" ptBR="digitando" zh="正在输入" />
                    <ChatTypingDots />
                  </span>
                )}
              </Link>
            ) : (
              <div className="pointer-events-auto flex min-h-[42px] max-w-[55%] flex-col items-center justify-center truncate rounded-full bg-black/5 px-4 text-center dark:bg-white/10">
                <span className="block truncate text-[15px] font-semibold leading-tight">{headerTitle || "—"}</span>
                {peerTyping && (
                  <span className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#335ef7] dark:text-[#0c8ce9]">
                    <T uk="набирає" en="typing" ru="печатает" de="tippt" es="escribiendo" fr="écrit" pl="pisze" ptBR="digitando" zh="正在输入" />
                    <ChatTypingDots />
                  </span>
                )}
              </div>
            )}
          </div>

          {headerProfileHref ? (
            <Link href={headerProfileHref} aria-label={headerTitle || undefined} className="ml-auto shrink-0">
              <Image
                src={headerAvatar}
                alt=""
                width={42}
                height={42}
                className="h-[42px] w-[42px] shrink-0 rounded-full object-cover"
                placeholder="blur"
                blurDataURL={headerAvatarBlur ?? BLUR_DATA_URL}
                unoptimized
              />
            </Link>
          ) : (
            <Image
              src={headerAvatar}
              alt=""
              width={42}
              height={42}
              className="ml-auto h-[42px] w-[42px] shrink-0 rounded-full object-cover"
              placeholder="blur"
              blurDataURL={headerAvatarBlur ?? BLUR_DATA_URL}
              unoptimized
            />
          )}
        </div>
      </div>

      {/* 2026-09-02: bottom padding clears the now-fixed compose bar below
          (it no longer takes up flex space of its own -- see that bar's
          own comment) so the last message/empty-state text never sits
          underneath it. Used to be a flat pb-28 (112px, enough for the
          bar's original single-line height); now matches the compose
          bar's REAL live height instead (composeBarHeight, above) now
          that the textarea itself can grow up to 6-7 lines tall -- see
          the ResizeObserver effect next to isTouch's own for why.
          2026-09-02, follow-up (Aleksandr: "Здорово, как ты" и "Привет"
          слишком далеко друг от друга... приблизь их") -- this stayed at
          the old max-w-2xl (672px) when the compose bar and header row
          below were narrowed to max-w-[470px] (see the compose bar's own
          "single source of truth" comment), so mine/theirs bubbles could
          drift out to that wider 672px column's edges even though
          nothing else on the page still uses that width. Matching it to
          the same 470px keeps every row -- header, messages, compose --
          on one consistent column width. */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: `${composeBarHeight + 16}px`, paddingTop: isMobileNav ? `${headerHeight + 16}px` : undefined }}
      >
        {/* 2026-09-04 follow-up (Aleksandr, circled screenshot: "Сюда. На
            десктопе тож по центу окна") -- the planet loader first landed
            with a plain `mt-6` near the top of this scrollable area, which
            only centers horizontally. He wants it centered in the whole
            visible chat window on both mobile and desktop. `h-full` here
            only resolves against a real height because THIS div's direct
            parent (messagesScrollRef, above) is the flex-1 pane that
            already carries the real, padding-adjusted visible height of
            the chat window (its own padding already clears the fixed
            header on mobile and the fixed compose bar at the bottom, per
            that padding's own comment) -- so centering inside it, instead
            of inside the plain `mx-auto` wrapper below (which has no
            defined height of its own), lands the loader in the true
            middle of the window regardless of viewport size. Only the
            loading branch gets this treatment; every other state below
            keeps the original plain wrapper untouched. */}
        <div
          className={
            state === "loading"
              ? "mx-auto flex h-full w-full max-w-[470px] items-center justify-center"
              : "mx-auto w-full max-w-[470px]"
          }
        >
        {state === "loading" && (
          // 2026-09-04 (Aleksandr, live mobile screenshot: "Вместо
          // 'завантаження' показывай анимацию нашец планеты как
          // загрузку" -- his own planet_loader.tgs, decompressed to
          // public/animations/planet-loader.json same as every other
          // .tgs sticker this app already ships this way, see PLAN.md
          // 6.123's cat-hi/cat-coffee entries) -- replaces the plain
          // "Завантаження…" text line with the same LottiePlayer this
          // app's other loading/empty states already use (e.g.
          // app/chats/page.tsx's own cat-pigeon empty state).
          <LottiePlayer src="/animations/planet-loader.json" size={120} />
        )}
        {state === "signed-out" && (
          <p className="mt-6 text-center text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T
              uk="Увійдіть, щоб побачити цей чат."
              en="Sign in to see this chat."
              ru="Войдите, чтобы увидеть этот чат."
              de="Melde dich an, um diesen Chat zu sehen."
              es="Inicia sesión para ver este chat."
              fr="Connectez-vous pour voir cette discussion."
              pl="Zaloguj się, aby zobaczyć ten czat."
              ptBR="Entre para ver esta conversa."
              zh="登录以查看此聊天。"
            />
          </p>
        )}
        {state === "error" && (
          <p className="mt-6 text-center text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T
              uk="Не вдалося завантажити повідомлення."
              en="Couldn't load messages."
              ru="Не удалось загрузить сообщения."
              de="Nachrichten konnten nicht geladen werden."
              es="No se pudieron cargar los mensajes."
              fr="Impossible de charger les messages."
              pl="Nie udało się załadować wiadomości."
              ptBR="Não foi possível carregar as mensagens."
              zh="无法加载消息。"
            />
          </p>
        )}
        {state === "ready" && displayMessages.length === 0 && (
          // 2026-09-02 (Aleksandr, screenshot of the mobile app's own
          // empty state: "ставим надпись по центру и добавляем
          // анимацию" -- bold headline + lighter instruction line, both
          // centered, matching that reference): Hicat.tgs decompressed
          // into public/animations/cat-hi.json, same convention every
          // other cat animation in this app already uses (components/
          // lottie-player.tsx). Tapping/clicking it sends GREETING_EMOJI
          // as a real first message -- what the instruction line above
          // ("tap/click the greeting below") actually refers to.
          <div className="mt-10 flex flex-col items-center gap-2 px-6 text-center">
            <p className="text-[15px] font-semibold text-[#262a34] dark:text-white">
              <T
                uk="Повідомлень ще немає…"
                en="No messages here yet…"
                ru="Пока нет сообщений…"
                de="Noch keine Nachrichten…"
                es="Aún no hay mensajes…"
                fr="Pas encore de messages…"
                pl="Jeszcze brak wiadomości…"
                ptBR="Ainda sem mensagens…"
                zh="暂无消息…"
              />
            </p>
            <p className="max-w-[240px] text-sm text-[#989aa6] dark:text-[#adafbb]">
              {isTouch ? (
                <T
                  uk="Напишіть повідомлення або торкніться привітання нижче"
                  en="Send a message or tap the greeting below"
                  ru="Напишите сообщение или коснитесь приветствия ниже"
                  de="Schreib eine Nachricht oder tippe unten auf die Begrüßung"
                  es="Escribe un mensaje o toca el saludo de abajo"
                  fr="Écrivez un message ou touchez le message d'accueil ci-dessous"
                  pl="Napisz wiadomość lub dotknij powitania poniżej"
                  ptBR="Envie uma mensagem ou toque na saudação abaixo"
                  zh="发送消息或点击下方的问候语"
                />
              ) : (
                <T
                  uk="Напишіть повідомлення або натисніть на привітання нижче"
                  en="Send a message or click the greeting below"
                  ru="Напишите сообщение или нажмите на приветствие ниже"
                  de="Schreib eine Nachricht oder klicke unten auf die Begrüßung"
                  es="Escribe un mensaje o haz clic en el saludo de abajo"
                  fr="Écrivez un message ou cliquez sur le message d'accueil ci-dessous"
                  pl="Napisz wiadomość lub kliknij powitanie poniżej"
                  ptBR="Envie uma mensagem ou clique na saudação abaixo"
                  zh="发送消息或点击下方的问候语"
                />
              )}
            </p>
            <button
              type="button"
              onClick={() => send(GREETING_EMOJI)}
              disabled={sending}
              aria-label={GREETING_EMOJI}
              className="mt-2 rounded-full transition active:scale-95 disabled:opacity-60"
            >
              <LottiePlayer src="/animations/cat-hi.json" size={140} />
            </button>
          </div>
        )}
        {state === "ready" && displayMessages.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {displayMessages.map((msg, i) => {
              if (crossMessageGroupSkip.has(msg._id)) return null;
              const mine = myUserId !== null && msg.fromId === myUserId;
              const text = extractMessageText(msg);
              const ms = messageDateMs(msg);
              // 2026-09-02: displayMessages[i - 1] types as
              // ChatMessage | PendingMessage | undefined under this
              // project's noUncheckedIndexedAccess (tsconfig.json) --
              // messageDateMs doesn't accept undefined, so this was a
              // silent `next build` failure (TS2345 at this exact line) that
              // blocked every deploy since this file's own 2026-09-02 Figma
              // redesign pass landed, discovered only now by reading a failed
              // deployment's build log directly (Vercel dashboard's own build
              // log panel wasn't automatable this round -- see PLAN.md).
              const prevMsg = i > 0 ? displayMessages[i - 1] : undefined;
              const prevMs = prevMsg ? messageDateMs(prevMsg) : 0;
              const showDate = i === 0 || !sameDay(ms, prevMs);
              // Only ever set for a pending bubble -- see the
              // `pendingMessages` state/PendingMessage type comments
              // above for what `failed` means and how it clears.
              const pending = isPendingMessage(msg) ? msg : null;
              const popoverOpen = pending !== null && openPendingId === pending.localId;
              // Attachment feature: a pending (not-yet-reconciled) bubble
              // renders its own local upload previews (pendingAttachments,
              // set by send() -- instant, no round-trip); a real message
              // renders whatever chat-server actually stored, parsed via
              // messageDocumentMedia (lib/a1/chat-schemas.ts).
              const docMedia = pending ? [] : messageDocumentMedia(msg);
              // 2026-09-04 (Aleksandr, live screenshots: "Комбинируй
              // более правильно фото, вот тебе референс телеграмма на
              // разное кол-во") -- a RUN of 2+ consecutive image docs
              // within this one message renders as a single grouped
              // grid (components/chat/photo-grid.tsx) instead of N
              // separate full-width rows. imageGroupStartId maps the
              // FIRST doc._id in each such run to the run's own doc
              // list (map insertion order below renders the whole grid
              // there); imageGroupSkipIds is every OTHER doc in that
              // run, skipped entirely since the grid already drew it.
              // A lone image (run length 1) is deliberately left out of
              // both -- keeps its existing individual rendering
              // (isImageOnly-flat or the plain rounded <img>) untouched.
              const imageGroupStartId = new Map<string, typeof docMedia>();
              const imageGroupSkipIds = new Set<string>();
              for (let i = 0; i < docMedia.length; ) {
                if (!isImageMediaDocument(docMedia[i]!)) {
                  i++;
                  continue;
                }
                let j = i + 1;
                while (j < docMedia.length && isImageMediaDocument(docMedia[j]!)) j++;
                const run = docMedia.slice(i, j);
                if (run.length >= 2) {
                  imageGroupStartId.set(run[0]!._id, run);
                  for (const d of run.slice(1)) imageGroupSkipIds.add(d._id);
                }
                i = j;
              }
              const pendingAttachments = pending?.pendingAttachments ?? [];
              // 2026-09-04 (Aleksandr, video: "сначала показывается
              // какое-то превью нерелевантное, а потом уже становится
              // другой вид") -- while a multi-photo send is still
              // uploading/pending, this used to render N separate
              // full-width rows (one per PendingAttachment below) and
              // only picked up the real grouped-grid look
              // (ChatPhotoGrid, see imageGroupStartId's own comment
              // above for the confirmed-message twin of this) once
              // load() reconciled it into a real message -- a visible
              // reshuffle the instant a send actually finished, on top
              // of whatever delay reconciliation itself takes (see the
              // expectedMediaCount fix in the poll handler above for
              // that other half of this same report). Grouping runs of
              // 2+ consecutive local image previews the SAME way here
              // means the pending bubble already looks exactly like its
              // eventual real self -- reconciliation swaps `src`
              // (blob: -> proxied URL) inside an unchanged layout, not
              // the whole shape of the message.
              const pendingImageGroupStartId = new Map<string, PendingAttachment[]>();
              const pendingImageGroupSkipIds = new Set<string>();
              for (let gi = 0; gi < pendingAttachments.length; ) {
                if (pendingAttachments[gi]!.kind !== "image") {
                  gi++;
                  continue;
                }
                let gj = gi + 1;
                while (gj < pendingAttachments.length && pendingAttachments[gj]!.kind === "image") gj++;
                const run = pendingAttachments.slice(gi, gj);
                if (run.length >= 2) {
                  pendingImageGroupStartId.set(run[0]!.localId, run);
                  for (const d of run.slice(1)) pendingImageGroupSkipIds.add(d.localId);
                }
                gi = gj;
              }
              // Contact-attachment feature: contactMedia is the REAL,
              // already-sent side (messageContactMedia, an array -- up to
              // 5 per message); pendingContactCards is this bubble's own
              // not-yet-sent picks, which already carry their `summary`
              // (see PendingMessage's own comment) so they render without
              // waiting on contactSummaries at all.
              const contactMedia = pending ? [] : messageContactMedia(msg);
              const pendingContactCards = pending?.pendingContacts ?? [];
              // Calculations feature: a sent calc lives in `entities`
              // (see app/api/chats/send/route.ts's own comment), never
              // on a pending/optimistic bubble (sendCalculation() above
              // has no optimistic-bubble step, a deliberate scope cut --
              // see its own comment), so `pending` always short-circuits
              // this to null same as docMedia/contactMedia above.
              const calc = pending ? (pending.pendingCalc ?? null) : messageCalculation(msg);
              // Scheduled Meetings: decodes straight off `text` (the
              // SAME extractMessageText result a plain message bubble
              // already reads below), which works identically for a
              // still-pending bubble and an already-synced one -- see
              // lib/a1/meeting-protocol.ts's own header for why no
              // separate PendingMessage field was needed here, unlike
              // pendingCalc/pendingAttachments/pendingContacts above.
              const meeting = decodeMeetingText(text);
              const hasMedia =
                docMedia.length > 0 ||
                pendingAttachments.length > 0 ||
                contactMedia.length > 0 ||
                pendingContactCards.length > 0 ||
                calc !== null ||
                meeting !== null;
              // 2026-09-03 (Aleksandr, third live-feedback round: "тут
              // из UI убери подложку синюю... уменьшим сообщение, оно
              // будет более компактно... также убери подложку для
              // фотографий и карточек контактов... как таблицы, видишь,
              // калькуляция полностью flat") -- a message whose ENTIRE
              // content is exactly one voice/document/contact/photo
              // attachment used to always sit inside this row's own
              // generic bubble chrome (solid color + padding) PLUS that
              // attachment's own translucent panel stacked on top,
              // reading as extra bulk around an already-compact card --
              // same complaint ChatCalculationCard never had (it always
              // rendered flat, no wrapping chrome, which is the shape
              // this now matches for these four kinds too). Scoped
              // tightly to the single-item, no-other-content case only
              // (`soleDoc`/one real contact, nothing else in the
              // message) -- anything mixed (text + a photo, two
              // documents, ...) keeps the original wrapper untouched,
              // safer than guessing a layout for combinations nobody
              // asked about yet. `pending` is always null here (see
              // docMedia/contactMedia's own definitions above, both
              // already `pending ? [] : ...`), so the flat footer below
              // never needs the SendingSpinner/NotSentIcon branch the
              // shared one still carries for a pending bubble.
              const soleDoc = docMedia.length === 1 ? (docMedia[0] ?? null) : null;
              // 2026-09-03 (Aleksandr, live test: "При отправке
              // отображение сначала показывается другим, потом
              // меняется, так не надо") -- these four flags used to
              // require `pendingAttachments.length === 0` outright, so
              // a still-uploading single attachment NEVER qualified as
              // "flat" no matter what it was -- it always got the
              // OLDER generic wrapper (this row's own solid chrome PLUS
              // the attachment's own translucent inner panel) until
              // load()'s poll swapped the pending bubble for a real
              // docMedia one, which suddenly WAS flat. That swap was
              // the visible "shows one thing, then changes" bug -- not
              // specific to PDFs, structural for every kind. Extended
              // to also recognize the single-PENDING-attachment case
              // (still `!text`/no calc/no contacts, and nothing ELSE
              // besides that one attachment) so a solo voice/photo/file
              // gets the exact same flat treatment from the moment it's
              // staged, before any server round-trip -- see flatFooter
              // below and the pendingAttachments render block for the
              // other half of this fix.
              const singlePendingAttachment = pendingAttachments.length === 1 ? pendingAttachments[0]! : null;
              const isVoiceOnly =
                !text && calc === null && contactMedia.length === 0 && pendingContactCards.length === 0 &&
                ((pendingAttachments.length === 0 && soleDoc !== null && isVoiceMediaDocument(soleDoc)) ||
                  (docMedia.length === 0 && singlePendingAttachment?.kind === "voice"));
              const isImageOnly =
                !text && calc === null && contactMedia.length === 0 && pendingContactCards.length === 0 &&
                ((pendingAttachments.length === 0 && soleDoc !== null && isImageMediaDocument(soleDoc)) ||
                  (docMedia.length === 0 && singlePendingAttachment?.kind === "image"));
              const isFileOnly =
                !text && calc === null && contactMedia.length === 0 && pendingContactCards.length === 0 &&
                ((pendingAttachments.length === 0 && soleDoc !== null &&
                  !isVoiceMediaDocument(soleDoc) && !isImageMediaDocument(soleDoc) &&
                  !isVideoMediaDocument(soleDoc) && !isStickerMediaDocument(soleDoc)) ||
                  (docMedia.length === 0 && singlePendingAttachment?.kind === "file"));
              const isContactOnly =
                !text && pendingAttachments.length === 0 && docMedia.length === 0 && calc === null &&
                ((contactMedia.length === 1 && pendingContactCards.length === 0) ||
                  (contactMedia.length === 0 && pendingContactCards.length === 1));
              // 2026-09-04 (Aleksandr: "Убери подложку со встречи") --
              // a meeting message's `text` is ENTIRELY the encoded
              // marker (decodeMeetingText either parses the whole
              // thing or returns null, see meeting-protocol.ts), so
              // `meeting !== null` alone is exactly as exclusive as the
              // other three flags above -- no other content ever rides
              // alongside one. MeetingMessageCard is already its own
              // fully-styled white/dark card (rounded-2xl, its own
              // shadow) same as ContactMessageCard, so it gets the same
              // flat treatment: no colored bubble wrapper behind it.
              const isMeetingOnly = meeting !== null;
              // 2026-09-04 (Aleksandr, 4 screenshots: "При першому
              // повідомленні надо щоб відправлявся наш нормальний
              // hi_cat анімація, вот як у мобе") -- reverses the
              // 2026-09-02/09-03 simplification (see GREETING_EMOJI's
              // own header) that deliberately made the greeting-tap
              // send a PLAIN "🐱" glyph with no special treatment.
              // Aleksandr now wants that first tap to render as the
              // same branded cat-hi.json sticker the button itself
              // shows, matching the reference (mobile) app -- same
              // "exclusive content, no other bubble content rides
              // alongside it" shape as the other isXOnly flags above,
              // so it gets the same flat (no colored-bubble) treatment
              // ContactMessageCard/MeetingMessageCard already have.
              const isGreetingSticker =
                text === GREETING_EMOJI && !meeting && calc === null && contactMedia.length === 0 &&
                pendingContactCards.length === 0 && pendingAttachments.length === 0 && docMedia.length === 0;
              const isFlatMedia = isVoiceOnly || isImageOnly || isFileOnly || isContactOnly || isMeetingOnly || isGreetingSticker;
              // See crossMessageGroupStart's own header comment above.
              const crossGroupRun = crossMessageGroupStart.get(msg._id) ?? null;
              const crossGroupFooter = crossGroupRun
                ? (() => {
                    const lastMsg = crossGroupRun[crossGroupRun.length - 1]!.msg;
                    return (
                      <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                        <span>{formatTime(messageDateMs(lastMsg))}</span>
                        {mine && <MessageTicks state={messageTickState(lastMsg, peerReadMaxId)} className="h-[7.77px] w-3.5" />}
                      </span>
                    );
                  })()
                : null;
              // Unified for both a real message (real ticks) and a
              // still-pending one (spinner/not-sent icon, same as the
              // shared non-flat footer below already did) -- so a flat
              // bubble's OWN footer doesn't itself flip styles once
              // load() reconciles it, only the ticks glyph updates.
              const flatFooter = (
                <div className={`flex items-center justify-end gap-1 text-[11px] ${mine ? "text-white/70" : "text-[#989aa6] dark:text-[#adafbb]"}`}>
                  <span>{formatTime(ms)}</span>
                  {pending ? (
                    pending.failed ? <NotSentIcon /> : <SendingSpinner />
                  ) : (
                    mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7.77px] w-3.5" />
                  )}
                </div>
              );
              // 2026-09-04, round three (Aleksandr, "подложку... убрать...
              // сделать вот как у меня") -- MeetingMessageCard's root is
              // now always a fixed dark-navy card regardless of `mine`
              // (see that component's own header), unlike every other
              // flat card here which still alternates white/dark-mode
              // vs accent-blue depending on sender. flatFooter's
              // `!mine` branch (dark gray, tuned for a light card) would
              // read poorly on that fixed dark background, so the
              // meeting card gets its own footer variant that's always
              // light, independent of `mine`.
              const meetingFooter = (
                <div className="flex items-center justify-end gap-1 text-[11px] text-white/60">
                  <span>{formatTime(ms)}</span>
                  {pending ? (
                    pending.failed ? <NotSentIcon /> : <SendingSpinner />
                  ) : (
                    mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7.77px] w-3.5" />
                  )}
                </div>
              );
              return (
                <div key={msg._id}>
                  {showDate && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[13px] font-medium text-[#262a34] backdrop-blur-sm dark:bg-white/10 dark:text-white">
                        {formatDateLabel(ms)}
                      </span>
                    </div>
                  )}
                  <div className={`relative flex ${mine ? "justify-end" : "justify-start"}`}>
                    {!pending && (
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none order-last flex shrink-0 items-center justify-center overflow-hidden ${
                          swipeState && swipeState.msgId === msg._id ? "" : "transition-[width] duration-200 ease-out"
                        }`}
                        style={{ width: swipeState && swipeState.msgId === msg._id ? swipeState.dx : 0 }}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#335ef7]/10 text-[#335ef7] dark:bg-white/10 dark:text-[#5b8dff]"
                          style={{
                            opacity: swipeState && swipeState.msgId === msg._id ? Math.min(1, swipeState.dx / SWIPE_TRIGGER_DX) : 0,
                            transform: `scale(${0.6 + 0.4 * (swipeState && swipeState.msgId === msg._id ? Math.min(1, swipeState.dx / SWIPE_TRIGGER_DX) : 0)})`,
                          }}
                        >
                          <ReplyIcon className="h-4 w-4" />
                        </span>
                      </div>
                    )}
                    <div
                      role={pending ? "button" : undefined}
                      tabIndex={pending ? 0 : undefined}
                      onClick={
                        pending
                          ? (e) => {
                              // See PENDING_POPOVER_MIN_SPACE_ABOVE's own
                              // comment above -- open below instead of
                              // above whenever the bubble is too close to
                              // the top of the viewport for the popover to
                              // fit above it (e.g. the first message in a
                              // brand new chat, like an auto-sent welcome
                              // sticker).
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenPendingAbove(rect.top > PENDING_POPOVER_MIN_SPACE_ABOVE);
                              setOpenPendingId(pending.localId);
                            }
                          : undefined
                      }
                      // Reply feature follow-up (2026-09-05, Aleksandr,
                      // 4 reference screenshots of replying-with-text
                      // to a Photo/Voice Message/Sticker/document in
                      // the reference app: "давай расширять дальше на
                      // другие типы файлов") -- the original pass only
                      // let you START a reply from a plain TEXT bubble
                      // (see that ternary branch's own comment below)
                      // because every other kind already owns its
                      // bubble's left-click (open the photo viewer,
                      // play/scrub voice, open a file...) and a bubble-
                      // wide left-click handler would fight every one
                      // of those. Right-click -- and, on effectively
                      // every mobile browser, the long-press gesture
                      // his own message pointed at ("как на Mac это
                      // двумя пальцами... в мобильной версии это
                      // обычно свайп/long-press") -- fires a completely
                      // separate DOM event from click, so this opens
                      // the SAME actions menu on ANY bubble kind
                      // (photo/voice/file, and contact/meeting/sticker
                      // along with them for free) without touching a
                      // single one of those existing click handlers.
                      // Known limitation, not silently decided: iOS
                      // Safari can still show its own native image-
                      // save callout on a long-press over an <img>
                      // before this fires, a documented platform quirk
                      // -- flag if that shows up live.
                      onContextMenu={
                        pending
                          ? undefined
                          : (e) => {
                              e.preventDefault();
                              setActionsMenu({ message: msg, anchorRect: e.currentTarget.getBoundingClientRect(), mine });
                            }
                      }
                      // Swipe-to-reply (2026-09-05, Aleksandr, Telegram
                      // Web reference recording -- see swipeGestureRef/
                      // swipeState's own comment above for why gesture
                      // tracking is a ref but the repaint driver is
                      // state). Touch-only, so this is additive next to
                      // onContextMenu above (right-click / two-finger-
                      // click / long-press), not a replacement for it --
                      // a mouse/trackpad never fires touch events.
                      onTouchStart={
                        pending
                          ? undefined
                          : (e) => {
                              if (e.touches.length !== 1) return;
                              const t = e.touches[0]!;
                              swipeGestureRef.current = { msgId: msg._id, startX: t.clientX, startY: t.clientY, active: false };
                            }
                      }
                      onTouchMove={
                        pending
                          ? undefined
                          : (e) => {
                              const g = swipeGestureRef.current;
                              if (!g || g.msgId !== msg._id || e.touches.length !== 1) return;
                              const t = e.touches[0]!;
                              const dx = t.clientX - g.startX;
                              const dy = t.clientY - g.startY;
                              if (!g.active) {
                                // Claim the gesture only once horizontal intent
                                // is clear, and never call preventDefault (React
                                // touch listeners are passive by default) -- so
                                // this never fights the page's own vertical
                                // scroll or iOS's edge-swipe-back gesture;
                                // touchAction: "pan-y" below tells the browser
                                // the same thing up front, before this even runs.
                                if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
                                g.active = true;
                              }
                              // 2026-09-05 (Aleksandr: "Свайп влево") -- only
                              // LEFTWARD drags reveal reply (dx negative), same
                              // direction regardless of `mine`/peer alignment;
                              // swipeState.dx itself stays a non-negative
                              // magnitude (of how far left), same as the slot
                              // width and icon math below expect.
                              const clamped = Math.max(0, Math.min(-dx, SWIPE_MAX_DX));
                              setSwipeState({ msgId: msg._id, dx: clamped });
                            }
                      }
                      onTouchEnd={
                        pending
                          ? undefined
                          : () => {
                              const g = swipeGestureRef.current;
                              swipeGestureRef.current = null;
                              if (!g || !g.active || g.msgId !== msg._id) {
                                setSwipeState(null);
                                return;
                              }
                              setSwipeState((prev) => {
                                if (prev && prev.msgId === msg._id && prev.dx >= SWIPE_TRIGGER_DX) {
                                  setReplyTarget(msg);
                                  window.requestAnimationFrame(() => textareaRef.current?.focus());
                                }
                                return null;
                              });
                            }
                      }
                      onTouchCancel={
                        pending
                          ? undefined
                          : () => {
                              swipeGestureRef.current = null;
                              setSwipeState(null);
                            }
                      }
                      style={{ touchAction: "pan-y" }}
                      // data-message-id + the outline below are the
                      // photo-viewer's "Show in chat" target (see
                      // handleShowInChatFromViewer above) -- undefined
                      // for a pending bubble, which has no real message
                      // id to scroll back to yet.
                      data-message-id={pending ? undefined : msg._id}
                      className={`animate-message-in max-w-[78%] rounded-[18px] text-[17px] leading-snug outline-offset-2 outline-[#335ef7] transition-[outline-color,outline-offset] duration-500 ${pending ? "cursor-pointer" : ""} ${
                        isFlatMedia
                          ? ""
                          : `px-3 py-2 ${mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"}`
                      } ${pending?.failed ? "opacity-70" : ""} ${
                        !pending && highlightedMessageId === Number(msg._id) ? "outline outline-2" : "outline-0"
                      }`}
                    >
                      {pendingAttachments.length > 0 && (
                        <div className="mb-1 flex flex-col gap-1.5">
                          {pendingAttachments.map((a) =>
                            // 2026-09-03 (Aleksandr, live test: "При
                            // отправке отображение сначала показывается
                            // другим, потом меняется" + "отправленное
                            // голосовое сначала отображается старой
                            // версией, потом переобувается") -- each
                            // kind now renders through the SAME shell
                            // its real (confirmed) docMedia counterpart
                            // below uses, flat/solid-card sized exactly
                            // like isVoiceOnly/isImageOnly/isFileOnly
                            // when this is the message's only content
                            // (see those flags' own comment above) --
                            // load()'s reconciliation swap is now a
                            // like-for-like replacement, not a visual
                            // change.
                            pendingImageGroupSkipIds.has(a.localId) ? null : pendingImageGroupStartId.has(a.localId) ? (
                              // See pendingImageGroupStartId's own
                              // comment above -- same grid shape
                              // ChatPhotoGrid gives the confirmed
                              // message, off local blob: previews
                              // instead of proxied URLs. Not clickable
                              // into the full viewer (no real doc id to
                              // open yet) and shows one shared uploading
                              // spinner if ANY photo in the run hasn't
                              // finished its upload -- matches how the
                              // whole group sends/fails together.
                              <div key={a.localId} className="relative">
                                <ChatPhotoGrid
                                  docs={pendingImageGroupStartId
                                    .get(a.localId)!
                                    .filter((d) => d.previewUrl)
                                    .map((d) => ({ id: d.localId, src: d.previewUrl! }))}
                                  onOpen={() => {}}
                                />
                                {pendingImageGroupStartId.get(a.localId)!.some((d) => d.status === "uploading") && (
                                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                                    <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                                  </div>
                                )}
                              </div>
                            ) : a.kind === "voice" ? (
                              <PendingVoiceBubble
                                key={a.localId}
                                mine={mine}
                                durationSeconds={a.durationSeconds ?? 0}
                                waveform={a.waveform}
                                uploading={a.status === "uploading"}
                                footer={isVoiceOnly ? flatFooter : undefined}
                              />
                            ) : a.kind === "image" ? (
                              <div key={a.localId} className="relative min-w-[200px] overflow-hidden rounded-xl">
                                {a.previewUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element -- a
                                  // local blob: URL, never a next/image-eligible remote src.
                                  // Same tiny-source-photo min-width fix as the real (sent)
                                  // isImageOnly bubble below -- see that img's own comment.
                                  <img src={a.previewUrl} alt="" className="max-h-64 w-full object-cover" />
                                )}
                                {isImageOnly && (
                                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                                    <span>{formatTime(ms)}</span>
                                    {pending?.failed ? <NotSentIcon /> : <SendingSpinner />}
                                  </span>
                                )}
                                {a.status === "uploading" && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                key={a.localId}
                                className={`relative overflow-hidden ${
                                  isFileOnly
                                    ? `flex w-64 max-w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 ${
                                        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
                                      }`
                                    : `flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"}`
                                }`}
                              >
                                {fileKindFromName(a.fileName, a.mimetype) === "pdf" && a.previewUrl ? (
                                  <PdfPageThumbnail
                                    src={a.previewUrl}
                                    className="h-11 w-11 shrink-0 rounded-[12px] object-cover object-top"
                                    fallback={<ChatFileTypeIcon kind="pdf" className="h-11 w-11" />}
                                  />
                                ) : (
                                  <ChatFileTypeIcon kind={fileKindFromName(a.fileName, a.mimetype)} className="h-11 w-11" />
                                )}
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                  <span className="truncate text-[14px] font-medium">{a.fileName}</span>
                                  <span className={`text-[12px] ${mine ? "opacity-80" : "opacity-60"}`}>{formatBytes(a.bytes)}</span>
                                  {isFileOnly && <span className="mt-0.5">{flatFooter}</span>}
                                </span>
                                {a.status === "uploading" && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                      {docMedia.length > 0 && (
                        <div className="mb-1 flex flex-col gap-1.5">
                          {docMedia.map((doc) =>
                            imageGroupSkipIds.has(doc._id) ? null : imageGroupStartId.has(doc._id) ? (
                              // getStableMediaProxyUrl, not buildMediaProxyUrl directly --
                              // see lib/a1/stable-media-url.ts's own header (same
                              // rotating-fileReference-on-every-poll bug already fixed for
                              // PdfPageThumbnail, now fixed here for plain <img> photos too).
                              <ChatPhotoGrid
                                key={doc._id}
                                docs={imageGroupStartId.get(doc._id)!.map((d) => ({ id: d._id, src: getStableMediaProxyUrl(d) }))}
                                onOpen={(docId) => openViewerForDoc(msg._id, docId)}
                              />
                            ) : isVoiceMediaDocument(doc) ? (
                              <VoiceMessageBubble
                                key={doc._id}
                                doc={doc}
                                mine={mine}
                                messageDateMs={ms}
                                lang={lang}
                                peerName={headerTitle}
                                peerAvatarUrl={headerAvatar}
                                myAvatarUrl={myAvatarUrl}
                                footer={isVoiceOnly ? flatFooter : undefined}
                              />
                            ) : isImageMediaDocument(doc) ? (
                              isImageOnly ? (
                                crossGroupRun ? (
                                  <ChatPhotoGrid
                                    key={doc._id}
                                    docs={crossGroupRun.map((g) => ({ id: g.doc._id, src: getStableMediaProxyUrl(g.doc) }))}
                                    onOpen={(docId) => {
                                      const owner = crossGroupRun.find((g) => g.doc._id === docId);
                                      openViewerForDoc(owner ? owner.msg._id : msg._id, docId);
                                    }}
                                    footer={crossGroupFooter}
                                  />
                                ) : (
                                // 2026-09-03 (Aleksandr, third live-
                                // feedback round: "убери подложку для
                                // фотографий... сделай время тоже в
                                // фотографию, но в такой прозрачной
                                // пилюлі") -- a lone photo message now
                                // renders with NO wrapping bubble chrome
                                // at all (see isFlatMedia above), so
                                // time+ticks move onto a small
                                // semi-transparent pill overlaid on the
                                // image itself instead of a separate row
                                // below it -- always a dark pill
                                // (regardless of mine/theirs) since it
                                // has to stay legible on any photo, not
                                // just this app's own light/dark bubble
                                // colors.
                                <div key={doc._id} className="relative min-w-[200px] overflow-hidden rounded-xl">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- proxied
                                      through /api/media, not a next/image-configured remote host.
                                      getStableMediaProxyUrl, not buildMediaProxyUrl -- see that
                                      helper's own header (2026-09-04, "подгрузку через блюр"). */}
                                  <img
                                    src={getStableMediaProxyUrl(doc)}
                                    alt=""
                                    onClick={() => openViewerForDoc(msg._id, doc._id)}
                                    // 2026-09-04 (Aleksandr, live screenshot: a small-resolution
                                    // source photo rendering as a ~90px postage stamp between two
                                    // voice messages -- "ты борщанул... ты же видел разметку в
                                    // телеграме"): this bubble is a shrink-to-fit flex item with no
                                    // width of its own -- `w-full` on the <img> just means "100% of
                                    // whatever the bubble ends up being", and the bubble's own
                                    // shrink-to-fit size is driven by the image's OWN intrinsic
                                    // pixel dimensions. A genuinely small source photo (a phone-
                                    // mockup screenshot, say) was therefore rendering at its real
                                    // tiny size instead of a real photo-bubble size, unlike Telegram
                                    // (his reference), which floors every photo bubble to a sane
                                    // minimum regardless of source resolution. min-w-[200px] on the
                                    // wrapper above is an inferred number, not measured off his
                                    // screenshot pixel-for-pixel -- flag if it should be bigger/smaller.
                                    className="block max-h-64 w-full cursor-pointer object-cover transition hover:opacity-90"
                                    style={MEDIA_BLUR_STYLE}
                                  />
                                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                                    <span>{formatTime(ms)}</span>
                                    {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7.77px] w-3.5" />}
                                  </span>
                                </div>
                                )
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- proxied
                                // through /api/media, not a next/image-configured remote host.
                                <img
                                  key={doc._id}
                                  src={getStableMediaProxyUrl(doc)}
                                  alt=""
                                  onClick={() => openViewerForDoc(msg._id, doc._id)}
                                  // Same tiny-source-photo fix as the flat isImageOnly branch
                                  // above -- see that img's own comment.
                                  className="max-h-64 w-full min-w-[200px] cursor-pointer rounded-xl object-cover transition hover:opacity-90"
                                  style={MEDIA_BLUR_STYLE}
                                />
                              )
                            ) : isVideoMediaDocument(doc) ? (
                              // 2026-09-03 (Aleksandr, live data trace --
                              // see isVideoMediaDocument's own comment,
                              // lib/a1/chat-schemas.ts): browsers can
                              // play mp4 natively, so this gets a real
                              // <video> instead of falling through to
                              // the generic file badge like every other
                              // non-image attachment used to.
                              <video
                                key={doc._id}
                                src={buildMediaProxyUrl(doc)}
                                controls
                                playsInline
                                className="max-h-64 w-full rounded-xl bg-black"
                              />
                            ) : isStickerMediaDocument(doc) ? (
                              // 2026-09-03 (Aleksandr, live screenshot:
                              // "Надо название файла, вес, другие
                              // иконки, а не надпись 'file'") -- traced
                              // to `application/x-tgsticker` attachments
                              // (see isStickerMediaDocument's own
                              // comment) falling through to the generic
                              // document row, which has no filename to
                              // show for a sticker (stickers never carry
                              // one) and no matching file-type-icon.tsx
                              // kind, hence the bare "Документ"/"FILE"
                              // badge he flagged. Scoped fix: a properly
                              // labeled sticker chip instead of a fake
                              // document row -- NOT an actual rendered
                              // sticker image yet (the underlying file is
                              // a gzipped Lottie/TGS animation, not a
                              // browser-renderable raster format; doing
                              // that properly needs its own decode pass,
                              // separate follow-up). Plain div, no href
                              // -- unlike a real document there is
                              // nothing useful to open here.
                              <div
                                key={doc._id}
                                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${
                                  mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                                }`}
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#8b5cf6]">
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="8.5" />
                                    <path d="M9 10.2h.01M15 10.2h.01" />
                                    <path d="M8.7 14.2c1.9 1.6 4.7 1.6 6.6 0" />
                                  </svg>
                                </span>
                                <span className="truncate text-[14px] font-medium">
                                  <T
                                    uk="Стікер" en="Sticker" ru="Стикер" de="Sticker" es="Sticker"
                                    fr="Sticker" pl="Naklejka" ptBR="Figurinha" zh="贴纸"
                                  />
                                </span>
                              </div>
                            ) : (
                              // 2026-09-03 (Aleksandr, Figma ref node
                              // 24368:126, "5. Chat view": "надо, чтобы
                              // показывало разные иконки... плюс ещё
                              // показывает вес") -- per-extension
                              // colored badge (ChatFileTypeIcon) instead
                              // of one generic paperclip for every
                              // non-image file, filename + byte size
                              // stacked beside it like that reference
                              // frame's own document rows.
                              // 2026-09-03 (Aleksandr, third live-
                              // feedback round: "убери подложку синюю,
                              // оставить просто актуальный такой
                              // размер... добавь снизу время") -- a
                              // lone document message drops the outer
                              // bubble chrome (isFlatMedia above) and
                              // this row becomes the ONLY layer -- solid
                              // bubble color instead of a translucent
                              // panel on top of it, a little roomier
                              // (px-3 py-2.5 instead of px-2.5 py-2) to
                              // read as a real message card rather than
                              // a compose-time attachment chip, and
                              // flatFooter tucked under the name/size
                              // column. A file inside a MIXED message
                              // (with text, or alongside other
                              // attachments) keeps the original compact
                              // translucent-chip styling unchanged.
                              <a
                                key={doc._id}
                                href={buildMediaProxyUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                  isFileOnly
                                    ? `flex w-64 max-w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 transition hover:opacity-90 ${
                                        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
                                      }`
                                    : `flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:opacity-80 ${
                                        mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                                      }`
                                }
                              >
                                {fileKindFromName(mediaDocumentFileName(doc), doc.mimetype) === "pdf" ? (
                                  // cacheKey={doc._id}: buildMediaProxyUrl(doc) embeds
                                  // doc.fileReference, which the backend reissues with a
                                  // new value on every poll for the SAME document -- so src
                                  // alone rotates every ~3s even though nothing changed.
                                  // Without a stable cacheKey the thumbnail cache (and the
                                  // effect's dep array in PdfPageThumbnail) treated every
                                  // poll as a brand-new image, blanking and re-rendering the
                                  // thumbnail each time ("flicker" reported 2026-09-04).
                                  // Keying by doc._id instead keeps the cache/identity
                                  // stable while src still carries the fresh ref needed to
                                  // actually fetch the file.
                                  <PdfPageThumbnail
                                    src={buildMediaProxyUrl(doc)}
                                    cacheKey={doc._id}
                                    className="h-11 w-11 shrink-0 rounded-[12px] object-cover object-top"
                                    fallback={<ChatFileTypeIcon kind="pdf" className="h-11 w-11" />}
                                  />
                                ) : (
                                  <ChatFileTypeIcon kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} className="h-11 w-11" />
                                )}
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                  <span className="truncate text-[14px] font-medium">
                                    {mediaDocumentFileName(doc) || (
                                      // 2026-09-04: no stored filename -- see
                                      // DocumentFallbackLabel's own header comment
                                      // (components/chat/file-type-icon.tsx) for why
                                      // that can happen and what this shows instead.
                                      <DocumentFallbackLabel kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} />
                                    )}
                                  </span>
                                  {mediaDocumentBytes(doc) !== null && (
                                    <span className={`text-[12px] ${mine ? "opacity-80" : "opacity-60"}`}>
                                      {formatBytes(mediaDocumentBytes(doc) as number)}
                                    </span>
                                  )}
                                  {isFileOnly && <span className="mt-0.5">{flatFooter}</span>}
                                </span>
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      {(pendingContactCards.length > 0 || contactMedia.length > 0) && (
                        <div className="mb-1 flex flex-col gap-1.5">
                          {pendingContactCards.map((c) => (
                            <ContactMessageCard
                              key={c.userId}
                              userId={c.userId}
                              firstName={c.firstName}
                              lastName={c.lastName}
                              phoneNumber={c.phoneNumber}
                              summary={c.summary}
                              mine={mine}
                              // Always my own not-yet-sent picks (see
                              // pendingContactCards' own comment above) --
                              // pulled straight from my own contact book by
                              // definition, never offers the + shortcut.
                              canAddContact={false}
                              onMessage={() => openChatWithUser(c.userId, `${c.firstName} ${c.lastName}`.trim(), c.summary?.avatarUrl ?? null)}
                            />
                          ))}
                          {contactMedia.map((c) => (
                            <ContactMessageCard
                              key={c.userId}
                              userId={c.userId}
                              firstName={c.firstName}
                              lastName={c.lastName}
                              phoneNumber={c.phoneNumber}
                              summary={contactSummaries[c.userId] ?? null}
                              mine={mine}
                              canAddContact={!mine && myContactUserIds !== null && !myContactUserIds.has(c.userId)}
                              onContactAdded={() =>
                                setMyContactUserIds((prev) => {
                                  if (!prev) return prev;
                                  const next = new Set(prev);
                                  next.add(c.userId);
                                  return next;
                                })
                              }
                              onMessage={() =>
                                openChatWithUser(
                                  c.userId,
                                  `${c.firstName} ${c.lastName}`.trim(),
                                  contactSummaries[c.userId]?.avatarUrl ?? null,
                                )
                              }
                              footer={isContactOnly ? flatFooter : undefined}
                            />
                          ))}
                        </div>
                      )}
                      {calc && <ChatCalculationCard calc={calc} mine={mine} />}
                      {meeting && (
                        <MeetingMessageCard
                          lang={lang}
                          payload={meeting}
                          mine={mine}
                          // Participant identity for both rows -- see
                          // meeting-protocol.ts's own MeetingPayload
                          // comment for why NEITHER side needs to ride
                          // in the payload itself: this is always a 1:1
                          // chat, so "the proposer" is whichever of
                          // these two `mine` already points at.
                          myName={myName}
                          myAvatarUrl={myAvatarUrl}
                          peerName={headerTitle}
                          peerAvatarUrl={headerAvatar}
                          acceptPayload={acceptedMeetings.get(msg._id) ?? null}
                          // Accept only makes sense for the OTHER
                          // participant, and only once this proposal is
                          // a real, already-synced message -- msg._id
                          // is still a throwaway localId while pending,
                          // which acceptMeeting has nothing real to
                          // reference yet.
                          canAccept={!mine && !pending}
                          accepting={acceptingMeetingId === msg._id}
                          onAccept={() => void acceptMeeting(msg._id, meeting.startsAtUtcMs, meeting.link)}
                          footer={isMeetingOnly ? meetingFooter : undefined}
                        />
                      )}
                      {text && !meeting && (
                        isGreetingSticker ? (
                          // 2026-09-04 (Aleksandr: "hi_cat анимация, вот
                          // как в мобе") -- same asset/size the empty-
                          // state button itself uses one screen up
                          // (140px there, a little smaller here so it
                          // reads as a sent bubble rather than a CTA);
                          // flatFooter appended manually the same way
                          // isFileOnly's own single-attachment case does
                          // (this content isn't inside a mapped list, so
                          // it can't ride the map's own per-item footer).
                          <>
                            <LottiePlayer src="/animations/cat-hi.json" size={96} />
                            <div className="mt-0.5">{flatFooter}</div>
                          </>
                        ) : quickInviteCatAnimation(text) ? (
                          // 2026-09-04, follow-up (Aleksandr: "Кошак есть,
                          // но посели его с правого края, а текст слева")
                          // -- was icon-then-text; text now comes first so
                          // the cat, last in this LTR row, lands at the
                          // bubble's own right edge instead of its left.
                          <div className="flex items-center gap-2">
                            <div className="whitespace-pre-wrap break-words">{text}</div>
                            <LottiePlayer src={quickInviteCatAnimation(text)!} size={40} />
                          </div>
                        ) : (
                          // Reply feature (2026-09-05) -- LEFT-click
                          // to open this menu is still scoped to plain
                          // text bubbles only (told to Aleksandr, not
                          // silently decided): every other kind here
                          // (photo/contact/meeting/voice/calc) has its
                          // own inner left-click action already (open
                          // the photo viewer, message a contact, accept
                          // a meeting...) that a bubble-wide left-click
                          // handler would fight; plain text has no such
                          // element, so it's the one safe place to hang
                          // a plain click on. Right-click/long-press
                          // (the outer bubble's own onContextMenu, see
                          // its 2026-09-05 follow-up comment above)
                          // opens the SAME menu on every other kind
                          // too, which is how a reply now actually gets
                          // started on a Photo/Voice Message/document.
                          <>
                            {(() => {
                              const quote = pending
                                ? resolveReplyPreview(pending.replySnapshot)
                                : resolveReplyPreview(msg.replyTo ? messagesById.get(msg.replyTo.message) ?? null : null);
                              if (!quote) return null;
                              return (
                                <MessageReplyQuote
                                  authorLabel={quote.authorLabel}
                                  previewText={quote.node}
                                  thumbnail={quote.thumbnail}
                                  mine={mine}
                                  onClick={
                                    !pending && msg.replyTo && messagesById.has(msg.replyTo.message)
                                      ? () => handleShowInChatFromViewer(Number(msg.replyTo!.message))
                                      : undefined
                                  }
                                />
                              );
                            })()}
                            <div
                              className={`whitespace-pre-wrap break-words ${pending ? "" : "cursor-pointer"}`}
                              onClick={
                                pending
                                  ? undefined
                                  : (e) => setActionsMenu({ message: msg, anchorRect: e.currentTarget.getBoundingClientRect(), mine })
                              }
                            >
                              {text}
                            </div>
                          </>
                        )
                      )}
                      {!text && !hasMedia && <div className="whitespace-pre-wrap break-words">…</div>}
                      {/* isFlatMedia messages (see that flag's own
                          comment above) already got their own time+
                          ticks rendered INSIDE the single attachment
                          component via `flatFooter` -- this shared row
                          would just duplicate it below an otherwise-
                          chromeless bubble. */}
                      {!isFlatMedia && (
                        <div
                          className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
                            mine ? "text-white/70" : "text-[#989aa6] dark:text-[#adafbb]"
                          }`}
                        >
                          <span>{formatTime(ms)}</span>
                          {pending ? (
                            pending.failed ? <NotSentIcon /> : <SendingSpinner />
                          ) : (
                            mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7.77px] w-3.5" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2026-09-02 (Aleksandr: "надо учесть ошибки с сетью...
                        при нажатии на сообщение модалку возле него с
                        возможностью отменить сообщение") -- anchored above
                        the bubble it belongs to (mine bubbles sit at the
                        row's right edge, so this does too), closed by the
                        document-click effect above the moment anything
                        outside pendingPopoverRef is clicked. Retrying here
                        is the same manual "try now" action the automatic
                        online/poll-triggered retryAllFailed already does
                        in the background -- this button just doesn't wait
                        for either of those triggers. */}
                    {popoverOpen && pending && (
                      <div
                        ref={pendingPopoverRef}
                        className={`absolute right-0 z-10 w-52 rounded-2xl bg-white p-3 shadow-xl dark:bg-neutral-900 ${
                          openPendingAbove ? "animate-popover-up bottom-full mb-2" : "animate-popover-down top-full mt-2"
                        }`}
                      >
                        <p className="text-center text-[13px] font-medium text-[#262a34] dark:text-white">
                          {pending.failed ? (
                            <T
                              uk="Не надіслано" en="Not sent" ru="Не отправлено" de="Nicht gesendet" es="No enviado"
                              fr="Non envoyé" pl="Nie wysłano" ptBR="Não enviado" zh="未发送"
                            />
                          ) : (
                            <T
                              uk="Надсилається…" en="Sending…" ru="Отправляется…" de="Wird gesendet…" es="Enviando…"
                              fr="Envoi…" pl="Wysyłanie…" ptBR="Enviando…" zh="发送中…"
                            />
                          )}
                        </p>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {pending.failed && (
                            <button
                              type="button"
                              onClick={() => {
                                if (pending) void retryOne(pending);
                                setOpenPendingId(null);
                              }}
                              className="rounded-full bg-[#335ef7] py-1.5 text-[13px] font-semibold text-white transition hover:opacity-90 dark:bg-[#009bff]"
                            >
                              <T
                                uk="Спробувати ще раз" en="Try again" ru="Спробувать снова" de="Erneut versuchen" es="Reintentar"
                                fr="Réessayer" pl="Spróbuj ponownie" ptBR="Tentar novamente" zh="重试"
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => pending && cancelPending(pending.localId)}
                            className="rounded-full border border-neutral-300 py-1.5 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            <T
                              uk="Скасувати" en="Cancel" ru="Отменить" de="Abbrechen" es="Cancelar"
                              fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消"
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* 2026-09-05 (Aleksandr, Telegram Desktop reference screenshots:
          a circular down-chevron sits just above the compose row, right
          where the mic/send button column lines up, once the newest
          message has almost scrolled out of view -- clicking it jumps
          straight to the bottom). `fixed inset-x-0` + an inner
          `mx-auto max-w-[470px] justify-end` wrapper mirrors exactly how
          the compose bar below centers its own 470px column and keeps
          its content flush to that column's right edge, so this button
          lines up with the send/mic button beneath it instead of the
          bare viewport edge. Anchored composeBarHeight + a gap above the
          (real, live-measured) compose bar, same technique the message
          list's own bottom padding already uses. */}
      {state !== "signed-out" && (
        // 2026-09-05 follow-up (Aleksandr: "сделай чтобы она появлялась
        // плавнее, через затухание и плавный переход") -- used to be a
        // conditionally-RENDERED block (mounted/unmounted outright on
        // showJumpToBottom), which pops instantly with no way to
        // transition since there's no "before" frame to transition
        // FROM on mount, and no time to transition to on unmount
        // either. Always mounted now; showJumpToBottom instead toggles
        // opacity/translate-y + pointer-events through a plain CSS
        // transition, so it fades and slides both in and out.
        <div
          className={`fixed inset-x-0 z-10 flex justify-center px-4 transition-all duration-200 ease-out ${
            showJumpToBottom ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1.5 opacity-0"
          }`}
          style={{ bottom: `${composeBarHeight + 12}px` }}
        >
          <div className="mx-auto flex w-full max-w-[470px] justify-end">
            <button
              type="button"
              onClick={jumpToBottom}
              // 2026-09-05 follow-up (Aleksandr: "Точнее про стрелку
              // которая опускает чат вниз 'анимация при наведении'" --
              // he actually meant HOVER, not just click) -- bumping the
              // same bounce key here too remounts the svg (and so
              // replays animate-jump-arrow) on mouse-enter as well,
              // reusing the exact click mechanism instead of a separate
              // .group:hover CSS rule -- simpler than layering a second
              // hover-only rule on top of the always-on click class,
              // and it still degrades fine on touch (mouseenter just
              // never fires there, so tap-to-replay via onClick above
              // is what mobile actually gets).
              onMouseEnter={() => setJumpArrowBounceKey((k) => k + 1)}
              aria-label="Jump to bottom"
              tabIndex={showJumpToBottom ? 0 : -1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] shadow-md backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/90 dark:text-[#0c8ce9]"
            >
              <svg key={jumpArrowBounceKey} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-jump-arrow" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state !== "signed-out" && (
        // 2026-09-02, live-testing feedback (video + 2 screenshots): compose
        // bar was drifting down the page instead of staying put -- now
        // `fixed` to the viewport bottom, same pattern as the "+" create-post
        // FAB (see create-post-fab.tsx: fixed + safe-area-inset-bottom via
        // inline style). Row width has moved a few times since (320px ->
        // 672px max-w-2xl -> this 470px, "на 30% уже" off that 672px) --
        // 470px is now the single source of truth, matched by the header
        // row above so the back button tracks the paperclip's x.
        <div
          ref={composeBarRef}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-[#f2f2f7]/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/80"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
{calcOpen ? (
            // Calculations feature (2026-09-03) -- replaces the normal
            // draft row entirely while this panel is open (matches the
            // reference video: it swaps back to a normal compose row
            // the moment a calculation sends, or the panel's own X is
            // pressed). Bottom-bar buttons (X/minus/send) confirmed
            // 2026-09-03 against 3 screenshots of the real reference
            // app -- see calcClose/calcRemoveLastRow's own comments.
            <div className="mx-auto w-full max-w-[470px]">
              <div className="overflow-hidden rounded-2xl bg-[#e4e9ff] dark:bg-[#151a30]">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="text-[#4f71eb] dark:text-[#8fb1ff]">
                      <th className="py-2 pl-3 text-left font-semibold">
                        <T uk="Опис" en="Description" ru="Описание" de="Beschr." es="Descr." fr="Descr." pl="Opis" ptBR="Descr." zh="描述" />
                      </th>
                      <th className="py-2 px-1 text-right font-semibold">
                        <T uk="Варт." en="Cost" ru="Стоим." de="Preis" es="Coste" fr="Coût" pl="Koszt" ptBR="Custo" zh="单价" />
                      </th>
                      <th className="py-2 px-1 text-right font-semibold">
                        <T uk="К-сть" en="Qty" ru="Кол-во" de="Anz." es="Cant." fr="Qté" pl="Ilość" ptBR="Qtd." zh="数量" />
                      </th>
                      <th className="py-2 pr-3 text-right font-semibold">
                        <T uk="Разом" en="Total" ru="Итого" de="Summe" es="Total" fr="Total" pl="Razem" ptBR="Total" zh="小计" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcRows.map((row, i) => {
                      const subtotal = calcRowSubtotal(row);
                      return (
                        <tr key={row.id} className="border-t border-[#c7d3f7] dark:border-[#28345c]">
                          <td className="py-1.5 pl-3 align-top">
                            <div className="flex items-start gap-1">
                              <span className="pt-1.5 text-[12px] text-[#4f71eb]/70 dark:text-[#8fb1ff]/70">{i + 1}.</span>
                              <input
                                ref={i === 0 ? calcFirstRowInputRef : undefined}
                                value={row.description}
                                onChange={(e) => calcUpdateRow(row.id, { description: e.target.value.slice(0, 300) })}
                                className="w-full min-w-0 bg-transparent py-1 text-[#262a34] outline-none dark:text-white"
                              />
                            </div>
                          </td>
                          <td className="py-1.5 px-1 align-top text-right">
                            <input
                              inputMode="decimal"
                              value={row.unitAmount}
                              onChange={(e) => calcUpdateRow(row.id, { unitAmount: e.target.value.replace(/[^0-9.,]/g, "") })}
                              placeholder="+"
                              className="w-24 bg-transparent py-1 text-right text-[#262a34] outline-none placeholder:font-semibold placeholder:text-[#335ef7] dark:text-white dark:placeholder:text-[#0c8ce9]"
                            />
                          </td>
                          <td className="py-1.5 px-1 align-top text-right">
                            <input
                              inputMode="numeric"
                              value={row.quantity}
                              onChange={(e) => calcUpdateRow(row.id, { quantity: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
                              placeholder="+"
                              className="w-14 bg-transparent py-1 text-right text-[#262a34] outline-none placeholder:font-semibold placeholder:text-[#335ef7] dark:text-white dark:placeholder:text-[#0c8ce9]"
                            />
                          </td>
                          <td className="py-1.5 pr-3 align-top text-right tabular-nums text-[#262a34] dark:text-white">
                            {subtotal > 0 ? calcFormatAmount(subtotal) : "\u2014"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={4} className="px-3 py-2">
                        <button
                          type="button"
                          onClick={calcAddRow}
                          disabled={calcRows.length >= CALC_MAX_ROWS}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#335ef7] disabled:opacity-40 dark:text-[#0c8ce9]"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#335ef7]/15 text-[14px] leading-none dark:bg-[#0c8ce9]/20">+</span>
                          <T uk="Рядок" en="Row" ru="Строка" de="Zeile" es="Fila" fr="Ligne" pl="Wiersz" ptBR="Linha" zh="\u884c" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-[#c7d3f7] px-3 py-2 text-[14px] font-semibold text-[#262a34] dark:border-[#28345c] dark:text-white">
                  <T uk="Разом" en="Total" ru="Итого" de="Summe" es="Total" fr="Total" pl="Razem" ptBR="Total" zh="\u5c0f\u8ba1" />
                  <span className="tabular-nums">
                    {calcFormatAmount(calcTotal)} {calcCurrency.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  value={calcNote}
                  onChange={(e) => setCalcNote(e.target.value.slice(0, 200))}
                  placeholder="Note"
                  className="min-w-0 flex-1 rounded-full bg-white px-4 py-2.5 text-[14px] text-[#262a34] outline-none placeholder:text-neutral-400 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-neutral-500"
                />
                <div ref={calcCurrencyPickerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCalcCurrencyPickerOpen((v) => !v)}
                  aria-label="Currency"
                  // 2026-09-03 (Aleksandr, 3 screenshots of the real
                  // reference app's own calculator panel, correcting my
                  // earlier solid-blue guess): a light outline circle,
                  // not a filled one -- matches the same
                  // bg-[#335ef7]/15 + text-[#335ef7] treatment the
                  // add-row "+" pill above already uses.
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-2 border-[#335ef7] bg-white text-[16px] font-bold text-[#335ef7] transition hover:bg-[#335ef7]/10 dark:border-[#0c8ce9] dark:bg-transparent dark:text-[#0c8ce9]"
                >
                  $
                </button>
                {calcCurrencyPickerOpen && (
                  <CurrencyPickerModal
                    lang={lang}
                    selected={calcCurrency}
                    onSelect={setCalcCurrency}
                    onClose={() => setCalcCurrencyPickerOpen(false)}
                  />
                )}
                </div>
              </div>

              {calcError && (
                <p className="mt-1.5 px-1 text-[13px] text-red-500">
                  <T
                    uk="\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
                    en="Couldn't send. Try again."
                    ru="\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437."
                    de="Senden fehlgeschlagen. Erneut versuchen."
                    es="No se pudo enviar. Int\u00e9ntalo de nuevo."
                    fr="\u00c9chec de l'envoi. R\u00e9essayez."
                    pl="Nie uda\u0142o si\u0119 wys\u0142a\u0107. Spr\u00f3buj ponownie."
                    ptBR="Falha ao enviar. Tente novamente."
                    zh="\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002"
                  />
                </p>
              )}

              {/* 2026-09-03 (Aleksandr, 3 screenshots of the real
                  reference app's own panel): only 3 buttons here, not 4
                  -- corrects my earlier guess at a separate trash/clear
                  button (a calcClearRows function, now removed as dead code). X
                  closes the panel, "-" undoes the last added row, the
                  arrow sends. */}
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={calcClose}
                    aria-label="Close"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-[#262a34] transition hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={calcRemoveLastRow}
                    disabled={calcRows.length <= 1}
                    aria-label="Remove row"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-[#262a34] transition hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={sendCalculation}
                  disabled={calcSending || !calcHasContent}
                  aria-label="Send"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>

            </div>
          ) : (
            <>
                    {/* 2026-09-02 (Aleksandr: "при увеличении высоты input field'а
              кота только оставляй внизу... скрепку и кнопку отправки
              тоже оставляй снизу, не двигай их") -- items-end (was
              items-center) on both this row and the pill below: with
              items-center, a grown multi-line textarea vertically
              centers itself in the row, dragging the paperclip/cat/send
              along with it away from the last line of text. items-end
              keeps every sibling glued to the row's bottom edge instead,
              so only the textarea grows upward and everything else
              stays exactly where it started. */}
          {/* Attachment feature: compose-bar preview strip for
              not-yet-sent attachments -- thumbnails for photos, a small
              filename chip for files, a spinner overlay while each one's
              own create/upload/confirm round-trip is still in flight (see
              handleAttachFile above), and a remove (x) button either way.
              Only rendered while attachments actually exist so it costs
              nothing on the far more common plain-text send. */}
          {/* 2026-09-03 (Figma "4.1 Multiple files selected" / "exceeded
              limit" banners) -- shown above the previews once 3+ files
              are selected, 5MB+ is selected, or the selection alone
              would exceed what's left of today's quota. Tapping it
              opens the same DailyUploadsModal the attach-menu's storage
              icon does. Gated on `uploadUsage` being loaded (it's
              fetched lazily the first time the attach menu opens, see
              that effect above) -- until then this just doesn't render,
              same as any other still-loading best-effort UI here. */}
          {uploadUsage && showQuotaBanner && (
            <button
              type="button"
              onClick={() => setDailyUploadsOpen(true)}
              className={`mx-auto mb-2 flex w-full max-w-[470px] flex-col gap-1.5 rounded-xl border px-3 py-2 text-left transition ${
                quotaExceededBySelection
                  ? "border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                  : "border-neutral-200 bg-white/90 hover:bg-white dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:hover:bg-[#1c1c1e]"
              }`}
            >
              <div className="flex items-center justify-between text-[12px]">
                <span className={quotaExceededBySelection ? "font-medium text-red-600 dark:text-red-400" : "text-[#262a34] dark:text-white"}>
                  {formatBytes(Math.min(uploadUsage.usedBytes + selectedAttachmentBytes, uploadUsage.limitBytes))} /{" "}
                  {formatBytes(uploadUsage.limitBytes)}
                </span>
                <span className={quotaExceededBySelection ? "font-medium text-red-600 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"}>
                  {quotaExceededBySelection ? DAILY_LIMIT_EXCEEDED_TEXT[lang] : DAILY_UPLOADS_LABEL_TEXT[lang]}
                </span>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full bg-[#335ef7] dark:bg-[#0c8ce9]"
                  style={{ width: `${Math.min(100, (uploadUsage.usedBytes / uploadUsage.limitBytes) * 100)}%` }}
                />
                <div
                  className={`h-full ${quotaExceededBySelection ? "bg-red-500" : "bg-[#335ef7]/40 dark:bg-[#0c8ce9]/40"}`}
                  style={{
                    width: `${Math.min(
                      100 - (uploadUsage.usedBytes / uploadUsage.limitBytes) * 100,
                      (selectedAttachmentBytes / uploadUsage.limitBytes) * 100,
                    )}%`,
                  }}
                />
              </div>
            </button>
          )}
          {attachments.length > 0 && (
            <div className="mx-auto mb-2 flex w-full max-w-[470px] flex-wrap gap-2">
              {attachments.map((a) =>
                // 2026-09-03 (Figma "4.File too large" / real reference-
                // app dark-mode screenshot) -- a file that failed either
                // the flat 20MB cap or the remaining-quota check
                // (handleAttachFile's own pre-upload checks, `tooLarge`)
                // gets its OWN full-width red card here, not the small
                // thumbnail-with-overlay treatment every other error
                // (a failed upload, a create-time quota_exceeded) still
                // uses below -- name + size/reason fully readable, a
                // "choose another" button that drops this attachment
                // and reopens the same picker it came from. Simplified
                // from the reference screenshot in one place: the file-
                // type badge (ChatFileTypeIcon) keeps its own per-kind
                // color rather than also turning red -- that component
                // has no red variant, and a colored icon still reads
                // fine against the red card.
                a.tooLarge ? (
                  <div
                    key={a.localId}
                    className="relative flex w-full items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30"
                  >
                    <ChatFileTypeIcon kind={fileKindFromName(a.fileName, a.mimetype)} tone="error" className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-red-700 dark:text-red-300">{a.fileName}</p>
                      <p className="truncate text-[12px] text-red-600 dark:text-red-400">{a.errorMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.localId)}
                      aria-label="Remove attachment"
                      className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeAttachment(a.localId);
                        (a.kind === "image" ? photoInputRef : fileInputRef).current?.click();
                      }}
                      aria-label="Choose another"
                      className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#335ef7] text-white shadow transition hover:brightness-110 dark:bg-[#0c8ce9]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path d="M17 3v4h-4M7 21v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ) : (
                <div key={a.localId} className="group relative">
                  {a.kind === "image" && a.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a
                    // local blob: URL preview, not a next/image remote src.
                    <img
                      src={a.previewUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    // Same per-type badge as the sent/pending rows below
                    // (ChatFileTypeIcon), scaled down to fit this chip --
                    // or, for a PDF, its own rendered first-page
                    // thumbnail (lib/pdf-thumbnail.ts) in that same slot.
                    <div className="flex h-16 w-40 items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-2.5 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
                      {fileKindFromName(a.fileName, a.mimetype) === "pdf" && a.previewUrl ? (
                        <PdfPageThumbnail
                          src={a.previewUrl}
                          className="h-8 w-8 shrink-0 rounded-[8px] object-cover object-top"
                          fallback={<ChatFileTypeIcon kind="pdf" className="h-8 w-8" />}
                        />
                      ) : (
                        <ChatFileTypeIcon kind={fileKindFromName(a.fileName, a.mimetype)} className="h-8 w-8" />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[12px] text-[#262a34] dark:text-white">{a.fileName}</span>
                        {/* 2026-09-04 (Aleksandr: "Показывай вес файла
                            тут") -- this compose-bar staging preview
                            showed name only, no size, unlike the sent/
                            pending message bubble a few hundred lines
                            below (which already pairs formatBytes(a.bytes)
                            under the filename) -- same pairing here. */}
                        <span className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">{formatBytes(a.bytes)}</span>
                      </span>
                    </div>
                  )}
                  {a.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                      <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {a.status === "error" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/70 p-1 text-center"
                      title={a.errorMessage}
                    >
                      <span className="text-[11px] font-medium text-white">
                        {a.errorMessage ? (
                          <T
                            uk="Ліміт вичерпано" en="Limit reached" ru="Лимит исчерпан" de="Limit erreicht"
                            es="Límite alcanzado" fr="Limite atteinte" pl="Limit osiągnięty" ptBR="Limite atingido" zh="已达上限"
                          />
                        ) : (
                          <T uk="Помилка" en="Failed" ru="Ошибка" de="Fehler" es="Error" fr="Erreur" pl="Błąd" ptBR="Erro" zh="失败" />
                        )}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.localId)}
                    aria-label="Remove attachment"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                ),
              )}
            </div>
          )}
          {/* Full quota message (formatted bytes + relative reset time)
              doesn't fit in the small thumbnail overlay above -- shown
              here in full for whichever attachment most recently hit it,
              also available as that overlay's own hover title. */}
          {attachments.some((a) => a.errorMessage && !a.tooLarge) && (
            <p className="mx-auto mb-2 w-full max-w-[470px] text-[12px] text-red-500 dark:text-red-400">
              {[...attachments].reverse().find((a) => a.errorMessage && !a.tooLarge)?.errorMessage}
            </p>
          )}
          {/* Contact-attachment feature: queued-to-send contact chips --
              small avatar + first name, remove (x) same treatment as the
              attachment thumbnails above. No upload/error state to show
              (a picked contact is ready the instant it's toggled). */}
          {pendingContacts.length > 0 && (
            <div className="mx-auto mb-2 flex w-full max-w-[470px] flex-wrap gap-2">
              {pendingContacts.map((c) => (
                <div
                  key={c.userId}
                  className="group relative flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 py-1 pl-1 pr-2.5 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- proxied/
                      generated avatar, not a next/image-configured remote host. */}
                  <img
                    src={c.summary?.avatarUrl ?? pickDefaultCatAvatar(c.userId)}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span className="max-w-[100px] truncate text-[12px] text-[#262a34] dark:text-white">
                    {c.firstName || c.lastName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingContacts((prev) => prev.filter((p) => p.userId !== c.userId))}
                    aria-label="Remove contact"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/10 text-[#262a34] transition hover:bg-black/20 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Reply feature (2026-09-05) -- the compose-bar accessory
              row, mirrored off the mobile app's own SelectedReply
              MessageItem (read directly off its source, see components/
              chat/message-actions-menu.tsx's own header). Sits above
              voiceRowRef rather than inside it: a staged reply survives
              switching in and out of the voice-recording UI that row
              alternates between, the same way it survives typing --
              only an actual send (of either kind) clears it. */}
          {/* 2026-09-05 follow-up (Aleksandr, WhatsApp reference: input
              field grows upward, reply shows inside it) -- this standalone
              floating card is now only for the two states that aren't the
              textarea pill (mic-denied notice, active voice-recording bar).
              While idle the quote renders INLINE inside that same pill,
              see the rounded-[22px] wrapper further down. */}
          {replyTarget &&
            recorder.state !== "idle" &&
            (() => {
              const quote = resolveReplyPreview(replyTarget);
              if (!quote) return null;
              return (
                <ReplyComposeBar
                  authorLabel={quote.authorLabel}
                  previewText={quote.node}
                  thumbnail={quote.thumbnail}
                  onRemove={() => setReplyTarget(null)}
                />
              );
            })()}
          <div ref={voiceRowRef} className="mx-auto flex w-full max-w-[470px] items-end gap-2">
            {/* 2026-09-03 (Aleksandr, voice messages): while a recording
                is in progress the paperclip/textarea pair is replaced by
                components/chat/voice-message.tsx's own VoiceRecordingBar
                (unlocked or locked) -- see that file's own header
                comment on this being a scope-trimmed stand-in for the
                Figma "text stays visible above a growing card" combine
                mechanic, not built yet. "denied" (mic permission
                refused) shows a dismissible notice in the WHOLE row's
                place instead.
                2026-09-03 follow-up (live-tested via Chrome, Aleksandr:
                "запись работает очень криво") -- traced, not guessed:
                VoiceRecordButton owns the ENTIRE press/lock/cancel
                gesture surface via setPointerCapture, but used to be
                swapped out for VoiceRecordingBar the instant
                recorder.state left "idle" -- which startPress sets
                SYNCHRONOUSLY on pointerdown, before getUserMedia even
                resolves. That unmounted the one element holding pointer
                capture mid-gesture, so release/lock/cancel could never
                reach it again -- a recording, once started, ran
                uncontrollably until the 10-minute VOICE_MAX_SECONDS cap
                auto-sent it (confirmed live: pointer released, button
                gone, timer kept climbing with nothing able to stop it).
                Fix: VoiceRecordButton now stays mounted across idle/
                requesting/recording/locked (rendered unconditionally
                below, ALONGSIDE VoiceRecordingBar instead of in place of
                it) -- only "denied" still replaces the whole row, since
                nothing is actually recording yet at that point. */}
            {recorder.state === "denied" ? (
              <VoiceMicDeniedNotice lang={lang} onDismiss={recorder.dismissDenied} />
            ) : (
              <>
            {recorder.state !== "idle" ? (
              <VoiceRecordingBar recorder={recorder} lang={lang} />
            ) : (
              <>
            <div ref={attachMenuRef} className="relative" onMouseEnter={handleAttachMouseEnter} onMouseLeave={handleAttachMouseLeave}>
              <ChatPaperclipButton
                disabled={sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
                // lib/use-hover-panel.ts, 2026-09-04 entry: same "•••"-menu
                // tap bug -- skip the toggle when this click is the same
                // tap that just hover-opened the menu, or it flips
                // straight back closed.
                onClick={() => {
                  if (isAttachRecentHoverOpen()) return;
                  setAttachMenuOpen((v) => !v);
                }}
              />
              {/* Attach menu (2026-09-02, reordered 2026-09-03 to match
                  the reference app's own row order -- see §6.92):
                  Photos / Files / Meetings / Calculations / Contacts.
                  Meetings is still a placeholder (no feature behind it
                  yet, see its own row comment below); every other row
                  is real. Anchored above the button (same "popover sits
                  right at the click, no mouse travel" reasoning as
                  components/fab-auth-prompt.tsx), not portaled -- this
                  page has no backdrop/z-index conflict a plain absolute
                  popover would run into, unlike that FAB's own corner
                  case. */}
              {attachMenuOpen && (
                // Wraps the one-time teaching banner (2026-09-03,
                // Figma "8. One time popover") + the actual attach
                // menu in one column, banner on top -- both anchored
                // together as a unit to the paperclip button, same
                // bottom-full/mb-2 the menu alone used before.
                <div
                  ref={attachPanelRef}
                  onMouseEnter={handleAttachMouseEnter}
                  onMouseLeave={handleAttachMouseLeave}
                  className="absolute bottom-full left-0 z-10 mb-2 flex flex-col gap-2"
                >
                  {quotaFullyUsed && !dailyBannerDismissed && uploadUsage && (
                    <div className="animate-popover-up w-64 rounded-2xl bg-white p-3 shadow-xl dark:bg-neutral-900">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#262a34] dark:text-white">
                            {PHOTOS_FILES_LABEL_TEXT[lang]}
                          </p>
                          <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                            {AVAILABLE_AGAIN_TEXT[lang]} {formatRelativeTime(new Date(uploadUsage.resetAt * 1000), lang)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              dismissDailyBanner();
                              setAttachDailyUploadsOpen(true);
                            }}
                            className="mt-1.5 text-[12px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]"
                          >
                            {VIEW_USAGE_TEXT[lang]}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={dismissDailyBanner}
                          aria-label="Dismiss"
                          className="shrink-0 rounded-full p-1 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                <div
                  // 2026-09-04, follow-up (Aleksandr, screen recording +
                  // 2 screenshots: "Попап этот который не влез" +
                  // "шрифт увеличил, а модалку забыл сделать выше и она
                  // теперь скроллится, а смысла нет") -- 420px was
                  // right at the edge even before the mobile +50% font
                  // bump (text-[14px] -> text-[21px]) pushed the plain
                  // row list past it too; both call sites of this same
                  // cap (this class + attachPanelHeight's own inline
                  // style below) raised together so neither the row
                  // list nor Meetings' schedule-row+2-quick-invites
                  // needs to scroll for content that's realistically
                  // never taller than this on a normal phone screen.
                  className={`animate-popover-up max-h-[min(70vh,500px)] overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-xl transition-[width,height] duration-200 dark:bg-neutral-900 ${
                    attachDailyUploadsOpen || meetingsMenuOpen ? "w-80 p-4" : "w-60 py-1.5 sm:w-44"
                  }`}
                  // 2026-09-04 (Aleksandr, screen recording: "на секунде
                  // 3 попап сначала растет вверх, а потом уменьшает
                  // высоту и растет в бок, это выглядит как баг") --
                  // this box's own height was never part of the
                  // transition above (only `width` was), so swapping
                  // content (the normal row list <-> Meetings <->
                  // Daily Uploads, each a very different natural
                  // height) snapped the box to the new content's height
                  // INSTANTLY while `width` kept animating over its own
                  // 200ms -- the "grows up then shrinks/grows sideways"
                  // is exactly that mismatch. `attachPanelHeight` below
                  // (measured off the actual content via ResizeObserver,
                  // see that state's own comment) pins this box to an
                  // explicit px height that now animates in step with
                  // width instead of snapping.
                  //
                  // 2026-09-04, mobile follow-up (Aleksandr, mobile
                  // screenshots of Daily Uploads / Meetings both
                  // showing their last row flush against the compose
                  // bar with nothing scrollable below it: "Попапы
                  // обрезались на мобе") -- this box is anchored
                  // `bottom-full` to the paperclip button (grows UPWARD
                  // from just above the compose bar) with no cap on its
                  // own height, so on a short mobile viewport its
                  // content -- Daily Uploads' full usage breakdown, or
                  // Meetings' row list -- can need more vertical room
                  // than actually exists between the compose bar and
                  // the top of the screen; the part that doesn't fit
                  // was simply unreachable (no scroll, nothing to bring
                  // it into view). `overflow-hidden` is now `overflow-
                  // y-auto` (still `overflow-x-hidden` so the width
                  // transition above keeps clipping horizontally) with
                  // a `max-h` cap, so content taller than that scrolls
                  // WITHIN the popover instead of extending past the
                  // visible screen.
                  // 2026-09-04, follow-up (Aleksandr, still scrolling
                  // after a hard refresh + the 420->500 cap raise: "Чтобы
                  // ВСЁ влазило") -- the REAL bug, found by actually
                  // working through the box-sizing: `attachPanelHeight`
                  // is measured off `attachPanelContentRef`'s own
                  // contentRect, which (like every ResizeObserver
                  // contentRect) excludes ITS OWN padding -- but there
                  // is none on that inner div; the padding (`p-4` /
                  // `py-1.5` above) lives on THIS outer box, the same
                  // element this height is then applied to. Under this
                  // app's global `box-sizing: border-box` (Tailwind
                  // preflight), setting `height` here to the padding-
                  // LESS inner measurement makes the box's own content
                  // area exactly `verticalPadding` short of what the
                  // inner content actually needs -- a fixed shortfall
                  // no amount of raising the 500px cap could ever fix,
                  // since the cap was never what was binding. Adding
                  // that same padding back in before capping is the
                  // actual fix.
                  style={attachPanelHeight !== null ? { height: Math.min(attachPanelHeight + (attachDailyUploadsOpen || meetingsMenuOpen ? 32 : 12), 500) } : undefined}
                >
                  <div ref={attachPanelContentRef}>
                  {meetingsMenuOpen ? (
                    // 2026-09-04 (Aleksandr: "Эту модалку делай тоже
                    // внутри модалки из скрепки, не надо весь экран
                    // перекрывать" + "Стрелка назад должна возвращать
                    // сразу в модалку") -- same inline-swap convention
                    // as attachDailyUploadsOpen's own DailyUploadsModal
                    // branch right below: onBack returns to the normal
                    // row list (this popover itself stays open), a
                    // quick invite send or opening Schedule Meeting
                    // closes the whole popover the same way picking a
                    // Photo/File already does.
                    <MeetingsMenuModal
                      lang={lang}
                      onBack={() => setMeetingsMenuOpen(false)}
                      onSendQuickInvite={(text) => {
                        setMeetingsMenuOpen(false);
                        setAttachMenuOpen(false);
                        void send(text);
                      }}
                      onOpenSchedule={() => {
                        setMeetingsMenuOpen(false);
                        setAttachMenuOpen(false);
                        setScheduleMeetingOpen(true);
                      }}
                    />
                  ) : attachDailyUploadsOpen ? (
                    // 2026-09-04 (Aleksandr, live test: "сделай эту штуку
                    // со стореджем как бы выплывающей... из нашей
                    // стандартной модалки... не блокируй флоу... чтобы
                    // она была частью") -- same attach popover box, just
                    // grown wider and swapped to this content instead of
                    // opening as a second, separate backdrop modal (see
                    // components/daily-uploads-modal.tsx's own 2026-09-04
                    // header entry for the inline variant this uses).
                    <DailyUploadsModal
                      lang={lang}
                      variant="inline"
                      // Fixes the loading-skeleton flash Aleksandr
                      // flagged on this exact transition -- see
                      // DailyUploadsModal's own prefetchedUsage comment.
                      // `uploadUsage` is already fetched (or in flight)
                      // the moment the attach popover itself opens, well
                      // before this inline panel can ever be reached.
                      prefetchedUsage={uploadUsage}
                      onBack={() => setAttachDailyUploadsOpen(false)}
                      onClose={() => {
                        setAttachDailyUploadsOpen(false);
                        setAttachMenuOpen(false);
                      }}
                    />
                  ) : (
                    <>
                  {/* Daily-uploads quota entry point (2026-09-02,
                      Aleksandr's "как ты UI отрисуешь?" follow-up) --
                      same top-right corner the reference native-app
                      attach sheet puts its own stack/disk icon in. Opens
                      components/daily-uploads-modal.tsx instead of
                      picking a file, so it sits outside the two
                      onPickAttachment rows below rather than as a third
                      one. */}
                  <button
                    type="button"
                    onClick={() => setAttachDailyUploadsOpen(true)}
                    aria-label="Daily uploads"
                    className="group absolute right-2 top-2 rounded-full p-1 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                  >
                    <ChatStorageIcon className="animate-storage-icon h-4 w-4" />
                  </button>
                  {/* Photo/File rows dim to 50% and stop opening a
                      picker once today's quota is fully used (Figma
                      "Attachments" section) -- onPickAttachment already
                      redirects to DailyUploadsModal instead in that
                      case, this just signals it visually up front
                      rather than only on tap.
                      2026-09-04 (Aleksandr, live test: "сделай на
                      десктопе шрифты в модалке +3-4") -- all five rows
                      below (Photo/File/Meetings/Calculation/Contact)
                      share this same text-[Npx] base; each also carries
                      `sm:text-[18px]` (this app's usual mobile-first
                      `sm:` = desktop breakpoint, see e.g. the glass-
                      effect experiment's own `sm:` resets) for desktop.
                      2026-09-04, follow-up (Aleksandr: "На мобе увеличь
                      на 50% шрифт в модалке, ну и саму модалку
                      увеличь") -- the mobile base itself is now +50%
                      too (14px -> 21px, desktop's sm:text-[18px]
                      unchanged), with the popover's own collapsed-state
                      width bumped to w-60 on mobile (sm:w-44 keeps
                      desktop as-is, see this popover's own className a
                      few lines up) so "Розрахунок" -- the longest of
                      these five labels -- still fits on one line. */}
                  <button
                    type="button"
                    onClick={() => onPickAttachment("image")}
                    className={`group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[21px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:text-[18px] ${quotaFullyUsed ? "opacity-50" : ""}`}
                  >
                    <ChatPhotoAttachIcon className="animate-photo-attach h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Фото" en="Photo" ru="Фото" de="Foto" es="Foto" fr="Photo" pl="Zdjęcie" ptBR="Foto" zh="照片" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPickAttachment("file")}
                    className={`group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[21px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:text-[18px] ${quotaFullyUsed ? "opacity-50" : ""}`}
                  >
                    <ChatFileAttachIcon className="animate-file-attach h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Файл" en="File" ru="Файл" de="Datei" es="Archivo" fr="Fichier" pl="Plik" ptBR="Arquivo" zh="文件" />
                  </button>
                  {/* "Meetings" (2026-09-03, Aleksandr: reference-app
                      screenshot shows Фото/Файлы/Встречи/Расчеты/
                      Контакты in exactly this order) -- was a
                      PLACEHOLDER with no feature behind it; now opens
                      components/chat/meetings-menu-modal.tsx (2026-09-04,
                      full spec + Figma reference) -- see that file's own
                      header comment for what it does (Quick Invites) and
                      doesn't (Schedule Meeting) cover yet. */}
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingsMenuOpen(true);
                    }}
                    className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[21px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:text-[18px]"
                  >
                    <ChatMeetingAttachIcon className="animate-meeting-attach h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Зустрічі" en="Meetings" ru="Встречи" de="Treffen" es="Reuniones" fr="Rendez-vous" pl="Spotkania" ptBR="Reuniões" zh="会议" />
                  </button>
                  {/* Calculations feature (2026-09-03) -- opens the
                      calculator panel below (swaps in for the normal
                      draft row, see its own comment) instead of picking
                      a file, same reasoning as Contact below for why
                      this doesn't go through onPickAttachment. */}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(false);
                      setCalcOpen(true);
                      window.requestAnimationFrame(() => calcFirstRowInputRef.current?.focus());
                    }}
                    className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[21px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:text-[18px]"
                  >
                    <ChatCalculatorAttachIcon className="animate-calc-attach h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T
                      uk="Розрахунок" en="Calculation" ru="Калькуляция" de="Berechnung" es="Cálculo"
                      fr="Calcul" pl="Kalkulacja" ptBR="Cálculo" zh="计算"
                    />
                  </button>
                  {/* Contact-attachment feature (2026-09-02) -- opens
                      components/chat/contacts-picker-modal.tsx instead of
                      a native file input, same reasoning as the storage
                      icon above for why this doesn't go through
                      onPickAttachment. */}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(false);
                      setContactsPickerOpen(true);
                    }}
                    className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[21px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:text-[18px]"
                  >
                    <ChatContactAttachIcon className="animate-contact-attach h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Контакт" en="Contact" ru="Контакт" de="Kontakt" es="Contacto" fr="Contact" pl="Kontakt" ptBR="Contato" zh="联系人" />
                  </button>
                    </>
                  )}
                  </div>
                </div>
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickAttachmentFiles(e.target.files, "image");
                  e.target.value = "";
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                // 2026-09-05 (Aleksandr, screen recording: tapping "File" on
                // mobile Safari popped up Apple's own "Photo Library / Take
                // Photo or Video / Browse" sheet instead of going straight
                // to the Files browser) -- this input had NO accept
                // attribute at all, which iOS Safari treats as ambiguous
                // (could be an image/video too) and shows that extra sheet
                // to disambiguate. application/*+text/*+audio/* covers
                // every kind file-type-icon.tsx actually recognizes
                // (pdf/zip/doc/sheet/slides/txt/mp3 all register under one
                // of those three) while still excluding image/* and
                // video/* -- the two categories that trigger the sheet --
                // so Safari now opens Files directly, same as the photo
                // input already does for accept="image/*".
                accept="application/*,text/*,audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickAttachmentFiles(e.target.files, "file");
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex flex-1 flex-col rounded-[22px] border border-neutral-200 bg-white/90 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
              {replyTarget &&
                (() => {
                  const quote = resolveReplyPreview(replyTarget);
                  if (!quote) return null;
                  return (
                    <ReplyComposeBar
                      inline
                      authorLabel={quote.authorLabel}
                      previewText={quote.node}
                      thumbnail={quote.thumbnail}
                      onRemove={() => setReplyTarget(null)}
                    />
                  );
                })()}
              <div className="flex min-h-[44px] items-end gap-2 px-3.5 py-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  announceTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Message"
                // 2026-09-02 (Aleksandr: "прокрутку у input field... можно
                // её убрать") -- still scrolls internally once the
                // auto-grow effect above hits its line cap, just without
                // drawing a visible scrollbar (app/globals.css's
                // chat-textarea-no-scrollbar).
                className="chat-textarea-no-scrollbar flex-1 resize-none bg-transparent text-[17px] leading-5 text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white dark:placeholder:text-[#98989f]"
              />
              {/* group: 2026-09-02 (Aleksandr: "анимацию на кота, чтобы он
                  глазками двигал") -- app/globals.css's own
                  `.group:hover .chat-cat-pupil` darts the icon's two
                  pupil paths side to side while this small wrapper (not
                  the whole pill) is hovered. */}
              {/* 2026-09-03 (Aleksandr, comparing this page's cat icon against
                  components/mini-chat-window.tsx's own: "в маленькой
                  модалке анимация этой иконки кота более прикольная,
                  лучше переставь на нее") -- adds that file's
                  animate-chat-wiggle (rotate+scale, app/globals.css) on
                  top of this icon's own pupil-dart hover (chat-cat-
                  pupil) rather than replacing it -- both fire off the
                  same .group hover already wrapping this icon, exactly
                  the combined motion the mini window's icon already has. */}
              <div className="group shrink-0 pb-0.5">
                <ChatCatFieldIcon className="h-5 w-5 animate-chat-wiggle text-[#989aa6] dark:text-[#adafbb]" />
              </div>
              </div>
            </div>
              </>
            )}
            {recorder.state === "idle" && (draft.trim() || attachments.length > 0 || pendingContacts.length > 0) ? (
              <button
                type="button"
                onClick={() => send()}
                // 2026-09-03 (Aleksandr, live test: "нельзя отправить
                // файл, пока он не подгрузится, это бесит") -- no longer
                // blocks on `status === "uploading"`, and no longer
                // requires at least one already-"ready" attachment --
                // send()'s own guard (mirrored here) only needs SOME
                // attachment staged (any status) or a caption or a
                // contact; a still-uploading one sends in the
                // background, see maybeFinalizePendingSend.
                disabled={
                  sending ||
                  (!draft.trim() && attachments.length === 0 && pendingContacts.length === 0) ||
                  // 2026-09-03 (Figma "4.1 ... exceeded limit": send
                  // button dims once the current selection alone would
                  // blow past today's remaining quota) -- blocks the
                  // click too, not just the visual dim, since chat-
                  // server would just reject the upload anyway.
                  quotaExceededBySelection
                }
                aria-label="Send"
                // 2026-09-02 (Aleksandr: "при наведении на кнопку отправки
                // сделай какой-то ховер, чтобы она ярче становилась...
                // анимацию на саму стрелку") -- group + hover:brightness
                // for the button itself, animate-send-arrow (app/
                // globals.css) nudges the arrow glyph on that same hover.
                className="group flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="animate-send-arrow"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            ) : (
              <VoiceRecordButton recorder={recorder} disabled={sending} lang={lang} />
            )}
              </>
            )}
          </div>
            </>
          )}
        </div>
      )}
      {dailyUploadsOpen && (
        <DailyUploadsModal lang={lang} prefetchedUsage={uploadUsage} onClose={() => setDailyUploadsOpen(false)} />
      )}
      {/* 2026-09-03 (Aleksandr, Telegram Desktop reference screenshot)
          -- clicking anywhere outside the active recording UI used to
          do nothing at all (voice-message.tsx's own header flagged
          this as deferred scope); now it asks instead of silently
          losing the recording or silently doing nothing. */}
      {discardConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setDiscardConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[280px] rounded-2xl bg-[#2c2c2e]/95 p-4 text-center shadow-2xl backdrop-blur-xl"
          >
            <p className="text-[15px] font-medium leading-snug text-white">
              <T
                uk="Зупинити запис і видалити голосове повідомлення?"
                en="Stop recording and discard this voice message?"
                ru="Остановить запись и удалить голосовое сообщение?"
                de="Aufnahme stoppen und Sprachnachricht verwerfen?"
                es="¿Detener la grabación y descartar el mensaje de voz?"
                fr="Arrêter l'enregistrement et supprimer le message vocal ?"
                pl="Zatrzymać nagrywanie i odrzucić wiadomość głosową?"
                ptBR="Parar a gravação e descartar a mensagem de voz?"
                zh="停止录音并放弃这条语音消息？"
              />
            </p>
            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => setDiscardConfirmOpen(false)}
                className="flex-1 rounded-full bg-white/10 py-2.5 text-[15px] font-medium text-white transition hover:bg-white/15"
              >
                <T uk="Ні" en="No" ru="Нет" de="Nein" es="No" fr="Non" pl="Nie" ptBR="Não" zh="否" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscardConfirmOpen(false);
                  recorder.cancelRecording();
                }}
                className="flex-1 rounded-full bg-[#0a84ff] py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110"
              >
                <T uk="Видалити" en="Discard" ru="Удалить" de="Verwerfen" es="Descartar" fr="Supprimer" pl="Odrzuć" ptBR="Descartar" zh="放弃" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* meetingsMenuOpen's own MeetingsMenuModal now renders nested
          inside the attach popover above (see attachPanelRef's own
          2026-09-04 comment) instead of as a second top-level modal
          here -- nothing left to render at this level for it. */}
      {/* 2026-09-04 (Aleksandr: "Время оставляй при переключении") --
          mounted unconditionally now (was `{scheduleMeetingOpen && ...}`,
          a full unmount/remount every time this closed) so the modal's
          own dayIndex/hourIndex/minuteIndex/link state survives backing
          out to the Meetings screen and reopening -- see that
          component's own `open` prop comment. */}
      <ScheduleMeetingModal
        open={scheduleMeetingOpen}
        lang={lang}
        peerName={headerTitle}
        peerAvatarUrl={headerAvatar}
        onClose={() => setScheduleMeetingOpen(false)}
        onBack={() => {
          // Backs out of the full Schedule form into the nested
          // Meetings quick-invite screen -- which now lives inside
          // the attach popover, so reopening THAT is part of going
          // back, not just flipping meetingsMenuOpen on its own.
          setScheduleMeetingOpen(false);
          setAttachMenuOpen(true);
          setMeetingsMenuOpen(true);
        }}
        onSchedule={(payload) => void scheduleMeeting(payload)}
        scheduling={schedulingMeeting}
      />
      {contactsPickerOpen && (
        <ContactsPickerModal
          lang={lang}
          pickedUserIds={new Set(pendingContacts.map((c) => c.userId))}
          onToggle={(picked) =>
            setPendingContacts((prev) =>
              prev.some((p) => p.userId === picked.userId)
                ? prev.filter((p) => p.userId !== picked.userId)
                : prev.length >= MAX_CONTACTS_PER_MESSAGE
                  ? prev
                  : [...prev, picked],
            )
          }
          onClose={() => setContactsPickerOpen(false)}
          // 2026-09-03 (Aleksandr: "Сделай прям тут кнопку отправки
          // снизу в попапе, широкую") -- see contacts-picker-modal.tsx's
          // own header comment. Same send() the compose-bar's own Send
          // button calls; it already reads pendingContacts (updated
          // above by onToggle) plus whatever's in `draft`/`attachments`
          // at the time it fires, same as a normal send always has.
          onSend={() => {
            setContactsPickerOpen(false);
            void send();
          }}
          sending={sending}
        />
      )}
      {viewerIndex !== null && chatViewerImages[viewerIndex] && (
        <ChatPhotoViewer
          lang={lang}
          images={chatViewerImages}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onShowInChat={handleShowInChatFromViewer}
          onReply={handleReplyFromViewer}
          onDelete={handleDeleteChatMessage}
        />
      )}
      {actionsMenu && (
        <MessageActionsMenu
          anchorRect={actionsMenu.anchorRect}
          mine={actionsMenu.mine}
          lang={lang}
          onClose={() => setActionsMenu(null)}
          onReply={() => {
            setReplyTarget(actionsMenu.message);
            window.requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}
