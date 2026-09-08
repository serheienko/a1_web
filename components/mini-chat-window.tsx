// components/mini-chat-window.tsx
//
// 2026-09-02 (part of "the Facebook one" -- see components/chats-
// flyout.tsx's own header for the full context). This is the actual
// small floating conversation window Messenger-style chat pops open
// once you pick someone from that popover -- a real, working chat
// (poll, read, send, read-ticks) squeezed into a corner widget, not a
// preview.
//
// Deliberately self-contained, same reasoning as chats-flyout.tsx's own
// header: doesn't import anything from app/chats/[chatId]/page.tsx and
// never touches that file. It reuses the exact same already-shipped API
// routes that page already polls (app/api/chats/messages, .../send,
// .../read-state, .../mark-read, .../contacts, .../upload) and the same
// lib/a1/chat-schemas.ts pure helpers -- only the actual React/DOM side
// (state, polling effect, JSX) is a fresh, smaller build, on purpose,
// so a bug here can never be a bug THERE and vice versa. Shared,
// presentational-only components (icons, ChatCalculationCard,
// ContactMessageCard, ContactsPickerModal, CurrencyPickerModal,
// DailyUploadsModal, PdfPageThumbnail, ChatFileTypeIcon) are imported
// normally -- "self-contained" means never reaching into page.tsx
// itself, not re-inventing every shared building block.
//
// `target.routeParam` is either a real Chat _id or lib/a1/chat-
// schemas.ts's `u_<userId>` "no chat yet" sentinel -- both work
// completely transparently against every route below (chat-server
// resolves-or-creates the personal chat itself the moment a message
// actually sends, see chat-schemas.ts's own header), so this component
// never needs to know or care which one it has.
//
// 2026-09-03 (Aleksandr, live test: "Посели на эту скрепку модалку из
// основных чатов, там где уже много функционала") -- the paperclip used
// to open a native file picker directly, one image at a time. It now
// opens the same Photo/File/Meetings/Calculation/Contact popover app/
// chats/[chatId]/page.tsx's own compose bar has, reusing that page's
// exact confirmed backend shapes (upload.create/confirm, `contacts`,
// `calculation` on messages.send) -- calc-row/currency-picker/contacts-
// picker/daily-uploads UI all come from the same shared components that
// page already uses, just wired up locally here since this file never
// imports from that page itself.
//
// 2026-09-04 (Aleksandr, live test: "В мини-модалке шо то не работает
// кнопка 'зустрічі'") -- "Meetings" WAS a dead placeholder row (onClick
// just closed the popover). Now opens MeetingsMenuModal inline, same
// swap convention attachDailyUploadsOpen already uses -- but only its
// Quick Invites half: the full Schedule Meeting flow needs this file's
// own MeetingMessageCard rendering + accept plumbing, none of which
// exists here, so onOpenSchedule is intentionally omitted (see that
// component's own onOpenSchedule comment) and that row just doesn't
// show in this smaller widget.
"use client";

import { CachedAvatar } from "@/components/cached-avatar";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { profileHref } from "@/lib/profile-href";
import { formatBytes } from "@/lib/format";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { buildMediaProxyUrl, buildMediaDownloadUrl, decodeStickerPathPreview, strippedPreviewDataUrl } from "@/lib/a1/media-proxy";
import { encodeBase64Waveform, SELF_DESTRUCT_VOICE_FLAGS, SELF_DESTRUCT_VOICE_TTL_SECONDS } from "@/lib/a1/chat-schemas";
import { useVoiceRecorder, type VoiceRecordingResult } from "@/components/chat/voice-recorder";
import { rememberLocalVoiceWaveform } from "@/lib/voice-local-waveform-cache";
import { VoiceRecordButton, VoiceRecordingBar, VoiceMicDeniedNotice } from "@/components/chat/voice-message";
import { VoiceMessageBubble } from "@/components/chat/voice-bubble";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import {
  extractMessages,
  extractMessageText,
  messageDateMs,
  messageTickState,
  messageDocumentMedia,
  messageContactMedia,
  messageCalculation,
  isImageMediaDocument,
  isVideoMediaDocument,
  isStickerMediaDocument,
  isVoiceMediaDocument,
  mediaDocumentFileName,
  mediaDocumentThumbnail,
  mediaDocumentBytes,
  dedupeReactionsToLatestPerUser,
  isMessagePinned,
  MESSAGE_FLAG_PINNED,
  describeMessagePreview,
  type ChatMessage,
  type MessageMediaDocument,
  type MessagePeerReaction,
  type Peer,
} from "@/lib/a1/chat-schemas";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import {
  MessageTicks,
  ChatCatFieldIcon,
  ChatPaperclipGlyph,
  ChatBackArrow,
  ChatStorageIcon,
  ChatPhotoAttachIcon,
  ChatFileAttachIcon,
  ChatMeetingAttachIcon,
  ChatCalculatorAttachIcon,
  ChatContactAttachIcon,
  ChatAttachmentSpinner,
} from "@/components/chat/icons";
import { ChatFileTypeIcon, fileKindFromName, DocumentFallbackLabel } from "@/components/chat/file-type-icon";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { PdfPageThumbnail } from "@/components/chat/pdf-thumbnail";
import { ChatPhotoGrid } from "@/components/chat/photo-grid";
import { BlurredChatPhoto } from "@/components/chat/blurred-photo";
import { ChatPhotoViewer, type ChatViewerImage } from "@/components/chat/photo-viewer";
import { MessageActionsMenu, DeleteMessageConfirmDialog, ReactionsBar, EditComposeBar, ReplyComposeBar, MessageReplyQuote } from "@/components/chat/message-actions-menu";
import { PinnedMessageBanner } from "@/components/chat/pinned-message-banner";
import { AllPinsModal } from "@/components/chat/all-pins-modal";
import { RemindModal } from "@/components/chat/remind-modal";
import { ForwardPickerModal, type ForwardRowStatus } from "@/components/chat/forward-picker-modal";
import { MediaPickerPanel } from "@/components/chat/media-picker-panel";
import { TgsSticker } from "@/components/chat/tgs-sticker";
import type { MediaDocument } from "@/lib/a1/schemas";
import { CopyToast, type CopyToastState } from "@/components/chat/copy-toast";
import { ChatCalculationCard } from "@/components/chat/calculation-card";
import { ContactMessageCard } from "@/components/chat/contact-message-card";
import { ContactsPickerModal, type PickedContact } from "@/components/chat/contacts-picker-modal";
import { CurrencyPickerModal } from "@/components/chat/currency-picker-modal";
import { DailyUploadsModal } from "@/components/daily-uploads-modal";
import type { ChatFlyoutOpenTarget } from "@/components/chats-flyout";
import { LottiePlayer } from "@/components/lottie-player";
import { MeetingsMenuModal, quickInviteCatAnimation } from "@/components/chat/meetings-menu-modal";

const POLL_MS = 3000;
// Same throttle idea as app/chats/[chatId]/page.tsx's own readStateTick
// -- the peer's read position changes far less often than messages do,
// so this only asks every 2nd poll tick instead of every single one.
const READ_STATE_EVERY = 2;

// Same duplicated-on-purpose trick app/chats/[chatId]/page.tsx's own
// useActiveLocale uses (that function is private to that file, and this
// one never imports from it -- see this file's own header) -- reads
// which lang-XX class is active on <html> so the shared components
// below (DailyUploadsModal, ContactsPickerModal, ChatCalculationCard,
// CurrencyPickerModal, T) get a real Locale instead of a hardcoded one.
function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

const MAX_ATTACHMENT_FILE_BYTES = 20 * 1024 * 1024;

// 2026-09-03 -- small local port of app/chats/[chatId]/page.tsx's own
// calculator draft-row plumbing (CalcRow/calcBlankRow/calcParseDecimal/
// calcParseQuantity/calcRowSubtotal/calcFormatAmount/CALC_MAX_ROWS),
// none of it exported from that file (see this file's own header on
// why it never imports from there) -- copied verbatim rather than
// reinvented so the two calculators behave identically.
type CalcRow = { id: string; description: string; unitAmount: string; quantity: string };
const CALC_MAX_ROWS = 50;

function calcBlankRow(): CalcRow {
  return { id: `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`, description: "", unitAmount: "", quantity: "" };
}

function calcParseDecimal(raw: string): number {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function calcParseQuantity(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function calcRowSubtotal(row: CalcRow): number {
  if (!row.unitAmount.trim()) return 0;
  return calcParseDecimal(row.unitAmount) * calcParseQuantity(row.quantity);
}

function calcFormatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// 2026-09-02 (Aleksandr, reference screenshot of the native chat's own
// bubbles: "Надо показвать время сообщений, как у нас в чате на
// мобиле") -- same plain toLocaleTimeString formatting components/
// chats-flyout.tsx's own formatTime() already uses, duplicated here
// rather than imported (this file's own header explains why).
function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// 2026-09-02 (Aleksandr, live screenshot: the paperclip button itself
// turning into a spinner -- "Тут не должно показывать загрузку) ее
// надо показывать на медиа, которое отправляется, но кстати картинка
// не отправилась" -- both a UX correction AND a real bug: the old
// version uploaded and sent in one shot with no staged preview, so a
// slow/failed upload had nothing visible to retry and the button's own
// spinner was the only feedback). Now a proper staged attachment,
// mirroring app/chats/[chatId]/page.tsx's own PendingAttachment
// pattern trimmed to a single item: pick -> thumbnail/chip appears
// immediately with a spinner overlay -> upload finishes -> Send button
// includes it. The paperclip itself goes back to just opening the menu.
// 2026-09-03 (Aleksandr, attach-menu port): generalized from images
// only to `kind: "image" | "file"`, same as that page's own
// PendingAttachment -- fileName/mimetype/bytes now always carried so a
// document chip can show a real name/size/icon, not just a thumbnail.
type MiniAttachment = {
  kind: "image" | "file";
  fileName: string;
  mimetype: string;
  bytes: number;
  previewUrl?: string;
  status: "uploading" | "ready" | "error";
  fileReference?: string;
};

// 2026-09-02 (Aleksandr, screenshots: broken avatars in this popup and
// the flyout list both still showing next/image's "?" broken-image
// glyph -- being investigated separately; "Нажатие на аватар и имя в
// мелкой модалке с чатами должно переходить на профіль", and "Поставь
// имя по центру, аватар справа і стрілку назад зліва, як у великих
// чатах... тап поза чатами закриває чати"): header reworked to mirror
// app/chats/[chatId]/page.tsx's own layout (back arrow / centered name
// / avatar) instead of the old avatar-left-title-plus-X-close row. The
// X close button is gone entirely, same as the big chat page has none
// -- `onBack` (was `onClose`) now means "return to the recent-chats
// list", matching that arrow's Link there going to /chats; fully
// dismissing both popups is now components/chats-fab.tsx's job, fired
// by a tap anywhere outside them (see that file's own click-outside
// effect) -- `onNavigate` below is that same full-close, reused for
// when the header's own avatar/name link is clicked, since leaving for
// a profile page should close this floating window rather than leave
// it stranded on top of the destination page. `panelRef` lets that same
// outside-click effect tell "inside this window" apart from "outside
// it" the same way components/chats-flyout.tsx's own panelRef already
// does for the list popover.
// 2026-09-05 (Aleksandr: "Кешируй боковые маленькие чаты, если их
// ранее открывали") -- components/chats-fab.tsx mounts/unmounts this
// widget as the popup opens/closes (`{activeChat && <MiniChatWindow
// .../>}`, no `key`), so every reopen used to start from scratch:
// empty `messages`, loadState "loading", a blank spinner frame while
// /api/chats/messages made its round trip again -- even for a chat
// the visitor had open a minute ago. Module-scope (outside the
// component, so it survives that mount/unmount rather than resetting
// with component state) Map keyed by routeParam, holding the last
// messages/myUserId/peerReadMaxId this browser tab has seen for that
// chat. Deliberately in-memory only (not Cache Storage / sessionStorage
// like lib/avatar-image-cache.ts) -- this is live, fast-changing data
// where "instant on reopen within this visit" is the whole ask, not
// "survive a hard refresh"; the existing poll (POLL_MS below) still
// re-fetches immediately in the background on every mount, so a cache
// hit only removes the loading flash, it never shows stale-forever
// data.
type MiniChatCacheEntry = { messages: ChatMessage[]; myUserId: string | null; peerReadMaxId: number | null };
const miniChatMessageCache = new Map<string, MiniChatCacheEntry>();

// Fix Tracker (2026-09-07, order 106) -- same short label
// app/chats/[chatId]/page.tsx's own YOU_LABEL_TEXT uses for "you" as
// the photo-viewer's sender label; duplicated here (not imported --
// this file deliberately never imports from that page, see its own
// header comment) since ChatViewerImage needs a senderLabel too.
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

export function MiniChatWindow({
  target,
  onBack,
  onNavigate,
  panelRef,
}: {
  target: ChatFlyoutOpenTarget;
  onBack: () => void;
  onNavigate: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const lang = useActiveLocale();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => miniChatMessageCache.get(target.routeParam)?.messages ?? [],
  );
  const [myUserId, setMyUserId] = useState<string | null>(
    () => miniChatMessageCache.get(target.routeParam)?.myUserId ?? null,
  );
  const [peerReadMaxId, setPeerReadMaxId] = useState<number | null>(
    () => miniChatMessageCache.get(target.routeParam)?.peerReadMaxId ?? null,
  );
  // Fix Tracker (2026-09-08, Aleksandr: "сделай мини-чат таким же
  // функциональным, как основной чат" -- voice messages) -- same
  // one-shot /api/account/whoami fetch app/chats/[chatId]/page.tsx's
  // own myAvatarUrl already does, needed here for the exact same
  // reason: VoiceMessageBubble's now-playing-bar entry for a
  // self-sent clip shows this instead of falling back to a generic
  // mic glyph.
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (data.avatarUrl) setMyAvatarUrl(data.avatarUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    () => (miniChatMessageCache.has(target.routeParam) ? "ready" : "loading"),
  );
  const inFlight = useRef(false);
  const tick = useRef(0);
  const lastMarkedReadId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Fix Tracker (2026-09-08, voice messages) -- same voiceBlobsRef
  // pattern app/chats/[chatId]/page.tsx uses: the recorded Blob can't
  // ride along in message/pending state (not serializable the way
  // this file wants to cache messages -- see miniChatMessageCache
  // above), so it's held here, keyed by a throwaway localId, purely to
  // survive from handleVoiceFinish to uploadAndSendVoice.
  const voiceBlobsRef = useRef<Map<string, { blob: Blob; mimeType: string; durationSeconds: number; waveform: number[] }>>(new Map());
  const voiceReplyRef = useRef<Map<string, ChatMessage | null>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 2026-09-05 (Aleksandr: "правая кнопка тоже должна работать для
  // вызова купертино") -- this widget is desktop-only to begin with
  // (components/chats-fab.tsx redirects mobile straight to the full
  // /chats/[chatId] page instead of ever mounting this component), so
  // right-click alone (no isTouch/tap-to-open split needed, unlike the
  // big chat page) is the one trigger this window needs. Reply itself
  // stays out of scope here -- no replyTarget/quote-preview state exists
  // in this smaller widget yet -- so its own onReply below just focuses
  // the compose box, same "started a reply" gesture without the full
  // threading UI app/chats/[chatId]/page.tsx has.
  const [actionsMenu, setActionsMenu] = useState<{ message: ChatMessage; anchorRect: DOMRect; mine: boolean } | null>(null);
  // Fix Tracker (2026-09-07, order 106: "документы отображаются
  // по-старому... Ты можешь сделать, чтобы он полностью дублировал
  // весь функционал большого чата, просто был мини-версией??") --
  // photo bubbles below had zero onClick (dead thumbnails), unlike
  // app/chats/[chatId]/page.tsx's full-screen ChatPhotoViewer. These
  // two plus chatViewerImages/openViewerForDoc/handleShowInChatFromViewer
  // below port that same viewer in, scoped to this widget's own
  // `messages` array.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  // 2026-09-05 (Aleksandr: delete-for-self, see app/chats/[chatId]/
  // page.tsx's own copy of this same state for the full writeup) --
  // this mini widget gets the trivial delete win too (no backend or
  // UI to build, just wiring), same as its own onReply above already
  // does a scoped-down version of the big page's reply.
  // 2026-09-07 update (Aleksandr: "В мини-чате ВСЁ из этого должно
  // работать") -- Edit/Forward/Remind/Pin/Select, previously scoped
  // out on purpose here, are now wired up too (see editingMessage/
  // remindTarget/forwardSource/selectionMode state above and their
  // handlers below) -- same API routes page.tsx's own copies already
  // call, just against this widget's own local state.
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: number } | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deleteMessageFailed, setDeleteMessageFailed] = useState(false);
  // 2026-09-05 (Copy-action toast, see app/chats/[chatId]/page.tsx's
  // own copy of this same state for the full writeup) -- a fresh object
  // every copy (trigger + the copied bubble's own anchorRect) so the
  // pill both restarts its 3s timer and re-centers itself on whichever
  // bubble was copied this time.
  const [copyToast, setCopyToast] = useState<CopyToastState | null>(null);
  // Fix Tracker (2026-09-07, Aleksandr live screenshot: "В мини-чате
  // ВСЁ из этого должно работать" -- react/edit/remind/forward/pin/
  // select rows in the actions menu above all rendered but did
  // nothing here, unlike app/chats/[chatId]/page.tsx's full versions.
  // Ported below, same self-contained-widget convention this file's
  // own header draws elsewhere (own local state + the SAME already-
  // shipped API routes page.tsx's own copies of these features call,
  // no import from that page itself).
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  // Fix Tracker (2026-09-08, Aleksandr: "сделай мини-чат таким же
  // функциональным, как основной чат" -- real reply threading) -- this
  // used to be a stub: actionsMenu's own onReply just focused the
  // textarea with no quote captured anywhere (see this file's OLD
  // header comment on handleReplyFromViewer, now out of date). Same
  // replyTarget shape app/chats/[chatId]/page.tsx uses (a full
  // ChatMessage, not just an id, so the compose-bar quote can render
  // immediately without a lookup).
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editFailed, setEditFailed] = useState(false);
  // Fix Tracker (2026-09-08, Aleksandr: "Reply тоже сделай update по
  // UI, чтобы был такой же как в основных, а именно компоузер
  // анимацией выезжает наверх") -- same grid-template-rows 1fr/0fr
  // "grows the pill" trick app/chats/[chatId]/page.tsx's own
  // displayedReplyTarget/replyRowGrown and displayedEditingMessage/
  // editRowGrown pairs use, ported 1:1 (see that file's own header
  // comments on both for the full writeup) so entering/leaving reply
  // or edit mode animates here the same way it does on the main chat
  // page, instead of snapping.
  const REPLY_COLLAPSE_MS = 200;
  const [displayedReplyTarget, setDisplayedReplyTarget] = useState<ChatMessage | null>(null);
  const [replyRowGrown, setReplyRowGrown] = useState(false);
  useEffect(() => {
    if (replyTarget) {
      setDisplayedReplyTarget(replyTarget);
      if (!replyRowGrown) {
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => setReplyRowGrown(true));
        });
        return () => {
          window.cancelAnimationFrame(raf1);
          if (raf2) window.cancelAnimationFrame(raf2);
        };
      }
      return;
    }
    setReplyRowGrown(false);
    const t = window.setTimeout(() => setDisplayedReplyTarget(null), REPLY_COLLAPSE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTarget]);
  const EDIT_COLLAPSE_MS = 200;
  const [displayedEditingMessage, setDisplayedEditingMessage] = useState<ChatMessage | null>(null);
  const [editRowGrown, setEditRowGrown] = useState(false);
  useEffect(() => {
    if (editingMessage) {
      setDisplayedEditingMessage(editingMessage);
      if (!editRowGrown) {
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => setEditRowGrown(true));
        });
        return () => {
          window.cancelAnimationFrame(raf1);
          if (raf2) window.cancelAnimationFrame(raf2);
        };
      }
      return;
    }
    setEditRowGrown(false);
    const t = window.setTimeout(() => setDisplayedEditingMessage(null), EDIT_COLLAPSE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage]);
  const [remindTarget, setRemindTarget] = useState<{ messageId: number } | null>(null);
  const [remindSubmitting, setRemindSubmitting] = useState(false);
  const [remindFailed, setRemindFailed] = useState(false);
  const [pinBusyMessageId, setPinBusyMessageId] = useState<number | null>(null);
  // Fix Tracker (2026-09-08, Aleksandr: "закрепить функциональными в
  // мини-чатах, должно быть идентично по UX/UI как в основных чатах")
  // -- same pinnedMessages/activePinIndex/displayedPinnedMessage shape
  // app/chats/[chatId]/page.tsx uses, ported 1:1 so the shared
  // PinnedMessageBanner/AllPinsModal components behave identically
  // here.
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [activePinIndex, setActivePinIndex] = useState(0);
  const pinnedMessage = pinnedMessages[activePinIndex] ?? pinnedMessages[0] ?? null;
  const [displayedPinnedMessage, setDisplayedPinnedMessage] = useState<ChatMessage | null>(null);
  const [allPinsOpen, setAllPinsOpen] = useState(false);
  // forwardSource holds every message being forwarded at once -- one
  // entry from the actions menu's own "Переслати" row, or the whole
  // (oldest-first) selection when fired from selection mode's bottom
  // bar, same shape page.tsx's own forwardSource carries.
  const [forwardSource, setForwardSource] = useState<ChatMessage[] | null>(null);
  const [forwardPickedChatIds, setForwardPickedChatIds] = useState<Set<string>>(new Set());
  const [forwardSendingAll, setForwardSendingAll] = useState(false);
  const [forwardRowStatus, setForwardRowStatus] = useState<Record<string, ForwardRowStatus>>({});
  const [forwardFailed, setForwardFailed] = useState(false);
  // Multi-select mode ("Вибрати" row) -- same shape as page.tsx's own
  // selectionMode/selectedMessageIds pair.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [selectionDeleting, setSelectionDeleting] = useState(false);
  const [selectionDeleteFailed, setSelectionDeleteFailed] = useState(false);
  // 2026-09-04 (Aleksandr: "При выхове калькуляции сделай дефолтно
  // моргающий курсор возле 1.") -- same fix as app/chats/[chatId]/
  // page.tsx's own copy of this calculator panel: focus the first
  // row's Description field the instant the panel opens instead of
  // leaving nothing focused.
  const calcFirstRowInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<MiniAttachment | null>(null);

  // Fix Tracker (2026-09-07, order 97) -- whether the send button
  // should be shown at all (vs. the input pill claiming its space).
  // Same "something to actually send" condition the button's own
  // `disabled` already used, just also driving its own visibility now.
  const hasSendableContent = draft.trim().length > 0 || attachment?.status === "ready";

  // 2026-09-03 (Aleksandr, attach-menu port) -- attach popover open
  // state + its own outside-hover close, same useHoverPanel hook that
  // page's own attach menu uses (lib/use-hover-panel.ts, already a
  // shared lib, not a page.tsx internal).
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachPanelRef = useRef<HTMLDivElement>(null);
  // Fix Tracker (2026-09-07, order 119: "навесь полный функционал из
  // основных чатов на иконку кота в мини-чатах") -- the cat icon here
  // used to be pure decoration (just the wiggling SVG, no button, no
  // handler at all); app/chats/[chatId]/page.tsx's own cat icon opens
  // MediaPickerPanel (stickers/GIFs/emoji), anchored to the icon's own
  // rect exactly like this file's own attach-menu/forward/actions-menu
  // anchoring already works. MediaPickerPanel already portals itself
  // to document.body and clamps its own on-screen position (see that
  // file's own anchorRect comment), so no extra positioning work is
  // needed here beyond capturing the rect on click, same as page.tsx.
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [mediaPanelAnchorRect, setMediaPanelAnchorRect] = useState<DOMRect | null>(null);
  const mediaPanelRef = useRef<HTMLButtonElement>(null);
  const {
    handleMouseEnter: handleAttachMouseEnter,
    handleMouseLeave: handleAttachMouseLeave,
    isRecentHoverOpen: isAttachRecentHoverOpen,
  } = useHoverPanel(attachMenuOpen, setAttachMenuOpen, [{ trigger: attachMenuRef, panel: attachPanelRef }]);
  // 2026-09-02: STANDALONE backdrop modal (variant="modal", the
  // component's own default) -- used only by handleAttach's own
  // mid-upload quota-exceeded redirect below (the attach popover is
  // already closed by the time an upload is actually in flight, so
  // there's no popover left to embed into there).
  const [dailyUploadsOpen, setDailyUploadsOpen] = useState(false);
  // 2026-09-04 (Aleksandr, live test on app/chats/[chatId]/page.tsx's
  // own attach popover, mirrored here for the same reason -- see that
  // file's own comment on this same state for the full quote) -- the
  // INLINE variant, shown INSIDE the already-open attach popover
  // instead of opening a second, separate modal on top of it.
  const [attachDailyUploadsOpen, setAttachDailyUploadsOpen] = useState(false);
  useEffect(() => {
    if (!attachMenuOpen) setAttachDailyUploadsOpen(false);
  }, [attachMenuOpen]);
  // 2026-09-04 -- Meetings row's own inline swap, same pattern as
  // attachDailyUploadsOpen right above.
  const [meetingsMenuOpen, setMeetingsMenuOpen] = useState(false);
  useEffect(() => {
    if (!attachMenuOpen) setMeetingsMenuOpen(false);
  }, [attachMenuOpen]);
  const [contactsPickerOpen, setContactsPickerOpen] = useState(false);
  const [pickedContactIds, setPickedContactIds] = useState<Set<string>>(new Set());
  const [pickedContacts, setPickedContacts] = useState<PickedContact[]>([]);
  const [contactsSending, setContactsSending] = useState(false);

  // Calculator panel state -- same shape as app/chats/[chatId]/page.tsx's
  // own (calcOpen/calcRows/calcNote/calcCurrency/...), duplicated per
  // this file's own header.
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcRows, setCalcRows] = useState<CalcRow[]>([calcBlankRow()]);
  const [calcNote, setCalcNote] = useState("");
  const [calcCurrency, setCalcCurrency] = useState("usd");
  const [calcCurrencyPickerOpen, setCalcCurrencyPickerOpen] = useState(false);
  const [calcSending, setCalcSending] = useState(false);
  const [calcError, setCalcError] = useState(false);
  const calcCurrencyPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attachMenuOpen) return;
    function onDocPointerDown(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!calcCurrencyPickerOpen) return;
    function onDocPointerDown(e: MouseEvent) {
      if (calcCurrencyPickerRef.current && !calcCurrencyPickerRef.current.contains(e.target as Node)) {
        setCalcCurrencyPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [calcCurrencyPickerOpen]);

  // 2026-09-05 (mini-chat cache, see miniChatMessageCache's own header
  // comment above) -- covers the OTHER reopen path, switching straight
  // from one already-open chat to a different one without this widget
  // ever unmounting in between (components/chats-fab.tsx can call
  // setActiveChat(target) directly from the recent-chats list while a
  // mini window is already showing); the useState initializers above
  // only run once, on first mount, so without this a same-tab switch
  // would otherwise keep the PREVIOUS chat's messages on screen until
  // the load effect below finishes its round trip. Runs before that
  // effect (declared first, same commit) so a cache hit paints the new
  // chat's last-known messages immediately, and a miss clears down to
  // a real loading state instead of showing stale messages from the
  // chat just left.
  useEffect(() => {
    const cached = miniChatMessageCache.get(target.routeParam);
    if (cached) {
      setMessages(cached.messages);
      setMyUserId(cached.myUserId);
      setPeerReadMaxId(cached.peerReadMaxId);
      setLoadState("ready");
    } else {
      setMessages([]);
      setMyUserId(null);
      setPeerReadMaxId(null);
      setLoadState("loading");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.routeParam]);

  // Mirrors this chat's live state back into the cache on every change
  // (new message arrives via poll/send, read-state ticks over, etc.) --
  // whatever this window shows right now is exactly what the NEXT open
  // of this same chat should start from.
  useEffect(() => {
    miniChatMessageCache.set(target.routeParam, { messages, myUserId, peerReadMaxId });
  }, [target.routeParam, messages, myUserId, peerReadMaxId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await authFetch(`/api/chats/messages?chat=${encodeURIComponent(target.routeParam)}`);
        if (cancelled) return;
        if (res.status === 401) {
          setLoadState("error");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setLoadState((prev) => (prev === "ready" ? prev : "error"));
          return;
        }
        const fetched = extractMessages(data.messages ?? []);
        setMessages(fetched);
        setMyUserId(data.myUserId ?? null);
        setLoadState("ready");

        // Mark-read (see app/chats/[chatId]/page.tsx's own commit for
        // the full two-direction read-receipt writeup) -- advances MY
        // OWN read position so the other side's client sees their
        // message as read, same fire-and-forget pattern, duplicated
        // here on purpose (this file's own header explains why).
        if (!document.hidden && fetched.length > 0) {
          const highestId = Math.max(...fetched.map((m) => Number(m._id)).filter((n) => !Number.isNaN(n)));
          if (highestId > lastMarkedReadId.current) {
            lastMarkedReadId.current = highestId;
            authFetch("/api/chats/mark-read", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ chat: target.routeParam, lastMessage: highestId }),
            }).catch(() => {
              lastMarkedReadId.current = 0;
            });
          }
        }

        tick.current += 1;
        if (tick.current % READ_STATE_EVERY === 0) {
          authFetch(`/api/chats/read-state?chat=${encodeURIComponent(target.routeParam)}`)
            .then((r) => r.json())
            .then((d) => {
              if (!cancelled && d?.ok) setPeerReadMaxId(d.peerReadMaxId ?? null);
            })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setLoadState((prev) => (prev === "ready" ? prev : "error"));
      } finally {
        inFlight.current = false;
      }
    }

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [target.routeParam]);
  // "Pin" feature (2026-09-08 port) -- fetches the chat's current
  // pin(s) once per chat open, same reasoning as page.tsx's own
  // fetchPinned: a SEPARATE call from the regular messages poll above,
  // since a pin can be older than that poll's own recent-messages
  // window.
  const fetchPinned = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chats/pinned?chat=${encodeURIComponent(target.routeParam)}`);
      const data = await res.json().catch(() => null);
      if (data?.ok) setPinnedMessages(data.messages ?? []);
    } catch {
      // Best-effort -- a failed pinned-message lookup just means no
      // banner shows this time.
    }
  }, [target.routeParam]);

  useEffect(() => {
    setPinnedMessages([]);
    setActivePinIndex(0);
    // Instant, not animated -- this is a chat switch, not a real
    // unpin (see displayedPinnedMessage's own exit-animation effect
    // right below).
    setDisplayedPinnedMessage(null);
    setAllPinsOpen(false);
    fetchPinned();
  }, [fetchPinned]);

  // Matches .animate-pin-banner-out's own duration in app/globals.css.
  const PIN_BANNER_EXIT_MS = 200;
  useEffect(() => {
    if (pinnedMessage) {
      setDisplayedPinnedMessage(pinnedMessage);
      return;
    }
    if (!displayedPinnedMessage) return;
    const timer = window.setTimeout(() => setDisplayedPinnedMessage(null), PIN_BANNER_EXIT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedMessage]);

  const isPinnedToBottomRef = useRef(true);
  useEffect(() => {
    isPinnedToBottomRef.current = true;
  }, [target.routeParam]);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const BOTTOM_PIN_THRESHOLD_PX = 64;
    function onScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isPinnedToBottomRef.current = distanceFromBottom <= BOTTOM_PIN_THRESHOLD_PX;
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const ro = new ResizeObserver(() => {
      if (isPinnedToBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // 2026-09-05 (delete-for-self, see app/chats/[chatId]/page.tsx's own
  // handleDeleteChatMessage for the full writeup -- identical call,
  // just against this widget's own `messages`/`target.routeParam`).
  // 2026-09-05 follow-up (Aleksandr, reference screenshot: "delete for
  // me and X" as a second stacked option on the same confirm card) --
  // `revoke` mirrors that same page.tsx follow-up 1:1.
  const chatViewerImages: ChatViewerImage[] = useMemo(() => {
    const out: ChatViewerImage[] = [];
    for (const msg of messages) {
      const mine = myUserId !== null && msg.fromId === myUserId;
      const senderLabel = mine ? YOU_LABEL_TEXT[lang] : target.title || "—";
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
          thumbnail: mediaDocumentThumbnail(doc),
          fileName,
          messageId: numericId,
          senderLabel,
          dateMs: ms,
        });
      }
    }
    return out;
  }, [messages, myUserId, lang, target.title]);

  function openViewerForDoc(messageId: string, docId: string) {
    const i = chatViewerImages.findIndex((im) => im.messageId === Number(messageId) && im.docId === docId);
    if (i >= 0) setViewerIndex(i);
  }

  // Reply feature -- resolves a real message's `replyTo` (only ever a
  // numeric id, see lib/a1/chat-schemas.ts's MessageReplyToSchema
  // header) against whatever's already loaded in THIS window's own
  // `messages` array. Same "best-effort, no second round-trip" call as
  // app/chats/[chatId]/page.tsx's own messagesById/resolveReplyPreview
  // pair -- a target outside this window's history just renders no
  // quote rather than fetching it specially.
  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m._id, m);
    return map;
  }, [messages]);

  function resolveReplyPreview(replyMsg: ChatMessage | null | undefined): { authorLabel: string; node: ReactNode; thumbnail: ReactNode } | null {
    if (!replyMsg) return null;
    const authorLabel = replyMsg.fromId !== null && replyMsg.fromId === myUserId ? YOU_LABEL_TEXT[lang] : target.title || "—";
    const preview = describeMessagePreview(replyMsg);
    const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;
    let thumbnail: ReactNode = null;
    if (preview.kind === "text") {
      const docs = messageDocumentMedia(replyMsg);
      const captionPhoto = docs.find((d) => isImageMediaDocument(d));
      const captionFile = docs.find(
        (d) => !isVoiceMediaDocument(d) && !isImageMediaDocument(d) && !isVideoMediaDocument(d) && !isStickerMediaDocument(d),
      );
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

  // "Show in chat" (viewer's "•••" menu) -- same shape as
  // app/chats/[chatId]/page.tsx's own handleShowInChatFromViewer:
  // scrolls the source row into view and flashes it for ~2.2s. Relies
  // on the data-message-id this widget's message row now carries
  // (added right below, in the render loop).
  function handleShowInChatFromViewer(messageId: number) {
    setViewerIndex(null);
    window.requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector(`[data-message-id="${messageId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      window.setTimeout(() => {
        setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
      }, 2200);
    });
  }
  // Pinned banner's own "tap to jump" (components/chat/pinned-message-
  // banner.tsx's own onTap) -- identical scroll+flash mechanism to
  // handleShowInChatFromViewer right above, scoped to this widget's
  // own panelRef the same way; a no-op if the pinned message isn't in
  // the currently-loaded window.
  function handleJumpToPinnedMessage(messageId: number) {
    const el = panelRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
    }, 2200);
  }

  // Banner's own onTap -- jumps to the currently-shown pin, then
  // advances activePinIndex with wraparound so the next tap shows the
  // next pin in `pinnedMessages` (same as page.tsx's own
  // handleTapPinnedBanner).
  function handleTapPinnedBanner() {
    if (!pinnedMessage) return;
    handleJumpToPinnedMessage(Number(pinnedMessage._id));
    if (pinnedMessages.length > 1) {
      setActivePinIndex((i) => (i + 1) % pinnedMessages.length);
    }
  }

  // Reply from the viewer -- now a real reply (2026-09-08, Aleksandr:
  // "сделай мини-чат таким же функциональным, как основной чат"),
  // same replyTarget this window's own message-row actionsMenu sets.
  function handleReplyFromViewer(messageId: number) {
    const msg = messagesById.get(String(messageId));
    if (!msg) return;
    setViewerIndex(null);
    setEditingMessage(null);
    setReplyTarget(msg);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // Generalized to accept multiple ids (2026-09-07, selection-mode
  // batch delete) -- same single POST /api/chats/delete call page.tsx's
  // own handleConfirmDeleteSelected makes (that route already accepts
  // up to 50 ids per call). handleDeleteChatMessage below is now a
  // one-id wrapper so every existing single-delete call site (the
  // action menu's own delete confirm, the photo viewer) is unaffected.
  async function handleDeleteMessages(messageIds: number[], revoke = false) {
    const res = await authFetch("/api/chats/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId: target.routeParam, messageIds, revoke }),
    });
    if (!res.ok) {
      throw new Error("delete_failed");
    }
    setMessages((prev) => prev.filter((m) => !messageIds.includes(Number(m._id))));
  }

  async function handleDeleteChatMessage(messageId: number, revoke = false) {
    return handleDeleteMessages([messageId], revoke);
  }

  async function handleConfirmDeleteSelected() {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;
    setSelectionDeleting(true);
    setSelectionDeleteFailed(false);
    try {
      await handleDeleteMessages(ids);
      exitSelectionMode();
    } catch {
      setSelectionDeleteFailed(true);
    } finally {
      setSelectionDeleting(false);
    }
  }

  // Reactions (2026-09-07 port, see app/chats/[chatId]/page.tsx's own
  // handleToggleReaction for the full writeup) -- same optimistic-
  // update-then-revert-on-failure shape against this widget's own
  // `messages`, same two API routes.
  async function handleToggleReaction(message: ChatMessage, emoticon: string) {
    if (!myUserId) return;
    const messageId = Number(message._id);
    const myPeer: Peer = { object: "peer-user", user: myUserId };
    const existingMine = (message.reactions ?? []).find(
      (r) => r.peer?.object === "peer-user" && r.peer.user === myUserId && r.reaction.emoticon === emoticon,
    );

    function applyReactions(updater: (reactions: MessagePeerReaction[]) => MessagePeerReaction[]) {
      setMessages((prev) =>
        prev.map((m) => (Number(m._id) === messageId ? { ...m, reactions: updater(m.reactions ?? []) } : m)),
      );
    }

    if (existingMine) {
      applyReactions((reactions) => reactions.filter((r) => r !== existingMine));
      try {
        const res = await authFetch("/api/chats/reaction/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chatId: target.routeParam, messageId, emoticon, date: existingMine.date, peer: myPeer }),
        });
        if (!res.ok) throw new Error("reaction_delete_failed");
      } catch {
        applyReactions((reactions) => dedupeReactionsToLatestPerUser([...reactions, existingMine]));
      }
      return;
    }

    const optimistic: MessagePeerReaction = {
      peer: myPeer,
      date: new Date().toISOString(),
      reaction: { object: "reaction-emoji", emoticon },
    };
    applyReactions((reactions) => dedupeReactionsToLatestPerUser([...reactions, optimistic]));
    try {
      const res = await authFetch("/api/chats/reaction/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, messageId, emoticon }),
      });
      if (!res.ok) throw new Error("reaction_add_failed");
    } catch {
      applyReactions((reactions) => reactions.filter((r) => r !== optimistic));
    }
  }

  // Pin (2026-09-07 port; 2026-09-08 follow-up, Aleksandr: "закрепить
  // функциональными в мини-чатах, должно быть идентично по UX/UI как в
  // основных чатах") -- this used to only flip the message's own
  // `flags` bit with no pinned-banner UI at all (see this file's OLD
  // comment here, now out of date). Same optimistic-update-then-
  // revert-via-fetchPinned shape as page.tsx's own handleTogglePin,
  // including the same `forceUnpin` escape hatch for call sites that
  // already know for certain this is an unpin (the banner's own
  // confirm control, the all-pins modal) instead of re-deriving it
  // from that specific message object's own `flags` bit.
  async function handleTogglePin(message: ChatMessage, forceUnpin?: boolean) {
    const messageId = Number(message._id);
    const currentlyPinned = forceUnpin ?? isMessagePinned(message);
    setPinBusyMessageId(messageId);
    setPinnedMessages((prev) =>
      currentlyPinned
        ? prev.filter((m) => Number(m._id) !== messageId)
        : [message, ...prev.filter((m) => Number(m._id) !== messageId)],
    );
    if (!currentlyPinned) setActivePinIndex(0);
    setMessages((prev) =>
      prev.map((m) => {
        if (Number(m._id) !== messageId) return m;
        return { ...m, flags: currentlyPinned ? m.flags & ~MESSAGE_FLAG_PINNED : m.flags | MESSAGE_FLAG_PINNED };
      }),
    );
    try {
      const res = await authFetch("/api/chats/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, messageId, unpin: currentlyPinned }),
      });
      if (!res.ok) throw new Error("pin_failed");
    } catch {
      fetchPinned();
    } finally {
      setPinBusyMessageId(null);
    }
  }

  // Edit (2026-09-07 port, see page.tsx's own saveEditedMessage) --
  // POSTs /api/chats/edit, patches the message in place on success so
  // it re-renders immediately instead of waiting for the next poll.
  async function saveEditedMessage() {
    const target2 = editingMessage;
    const text = draft.trim();
    if (!target2 || !text || sending) return;
    setSending(true);
    try {
      const res = await authFetch("/api/chats/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, messageId: Number(target2._id), text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setEditFailed(true);
        return;
      }
      const updated = data.message as ChatMessage | null;
      setMessages((prev) =>
        prev.map((m) =>
          Number(m._id) === Number(target2._id)
            ? updated ?? { ...m, entities: [{ object: "entity-text", text }], editedAt: new Date().toISOString() }
            : m,
        ),
      );
      setEditingMessage(null);
      setDraft("");
      setEditFailed(false);
    } catch {
      setEditFailed(true);
    } finally {
      setSending(false);
    }
  }

  // Forward (2026-09-07 port, simplified from page.tsx's own "Форвард
  // 2.0": no pendingForward composer-preview step (that's a full-page,
  // navigation-based flow that doesn't fit this floating widget) --
  // "tap" mode sends immediately to the one chat tapped, "select" mode
  // (the picker's own header toggle) fans out to every picked chat,
  // same forwardToOneChat POST /api/chats/send per target either way.
  async function forwardToOneChat(source: ChatMessage, targetChatId: string): Promise<boolean> {
    const originalAuthorId = (source.forwardFrom?.object === "peer-user" ? source.forwardFrom.user : null) ?? source.fromId;
    const docs = messageDocumentMedia(source);
    const contactsMedia = messageContactMedia(source);
    const text = extractMessageText(source);
    if (!originalAuthorId || (!text && docs.length === 0 && contactsMedia.length === 0)) return false;
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: targetChatId,
          text: text || undefined,
          media: docs.length > 0 ? docs.map((d) => ({ fileReference: d.fileReference })) : undefined,
          contacts:
            contactsMedia.length > 0
              ? contactsMedia.map((c) => ({ userId: c.userId, phoneNumber: c.phoneNumber, firstName: c.firstName, lastName: c.lastName }))
              : undefined,
          forwardFrom: { userId: originalAuthorId },
        }),
      });
      const data = await res.json().catch(() => null);
      return !!res.ok && !!data?.ok;
    } catch {
      return false;
    }
  }

  async function handleForwardPickSingle(targetChatId: string) {
    const sources = forwardSource;
    if (!sources || sources.length === 0) return;
    setForwardSource(null);
    setForwardPickedChatIds(new Set());
    setForwardRowStatus({});
    setForwardFailed(false);
    for (const source of sources) {
      await forwardToOneChat(source, targetChatId);
    }
    exitSelectionMode();
  }

  async function handleForwardSend() {
    const sources = forwardSource;
    if (!sources || sources.length === 0 || forwardSendingAll || forwardPickedChatIds.size === 0) return;
    const targets = Array.from(forwardPickedChatIds);
    setForwardSendingAll(true);
    setForwardFailed(false);
    const succeeded: string[] = [];
    const failedIds: string[] = [];
    for (const targetChatId of targets) {
      setForwardRowStatus((prev) => ({ ...prev, [targetChatId]: "sending" }));
      let ok = true;
      for (const source of sources) {
        const sent = await forwardToOneChat(source, targetChatId);
        if (!sent) {
          ok = false;
          break;
        }
      }
      setForwardRowStatus((prev) => ({ ...prev, [targetChatId]: ok ? "done" : "failed" }));
      if (ok) succeeded.push(targetChatId);
      else failedIds.push(targetChatId);
    }
    setForwardSendingAll(false);
    if (failedIds.length === 0) {
      setForwardSource(null);
      setForwardPickedChatIds(new Set());
      setForwardRowStatus({});
      exitSelectionMode();
      return;
    }
    setForwardFailed(true);
    setForwardPickedChatIds(new Set(failedIds));
  }

  // Multi-select mode (2026-09-07 port, see page.tsx's own
  // enterSelectionMode/exitSelectionMode/toggleMessageSelected for the
  // full writeup) -- entered from the actions menu's own "Вибрати" row.
  function enterSelectionMode(initialMessageId: number) {
    setSelectionMode(true);
    setSelectedMessageIds(new Set([initialMessageId]));
  }
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
    setSelectionDeleteFailed(false);
  }
  function toggleMessageSelected(messageId: number) {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }
  function selectedMessagesOldestFirst(): ChatMessage[] {
    return messages
      .filter((m) => selectedMessageIds.has(Number(m._id)))
      .sort((a, b) => Number(a._id) - Number(b._id));
  }

  // Remind (2026-09-07 port, see page.tsx's own handleConfirmRemind) --
  // POSTs /api/chats/reminders/create, no local message-list effect
  // (the backend delivers it server-side at scheduleAt regardless of
  // whether this widget is even open).
  async function handleConfirmRemind(scheduleAt: number, local: boolean) {
    if (!remindTarget) return;
    setRemindSubmitting(true);
    setRemindFailed(false);
    try {
      const res = await authFetch("/api/chats/reminders/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, messageId: remindTarget.messageId, scheduleAt, local }),
      });
      if (!res.ok) throw new Error("reminder_failed");
      setRemindTarget(null);
    } catch {
      setRemindFailed(true);
    } finally {
      setRemindSubmitting(false);
    }
  }

  async function handleConfirmDeleteMessage(revoke: boolean) {
    if (!deleteConfirm) return;
    setDeletingMessage(true);
    setDeleteMessageFailed(false);
    try {
      await handleDeleteChatMessage(deleteConfirm.messageId, revoke);
      setDeleteConfirm(null);
    } catch {
      setDeleteMessageFailed(true);
    } finally {
      setDeletingMessage(false);
    }
  }

  async function handleSend(extra?: { contacts?: PickedContact[]; overrideText?: string }) {
    // Edit feature (2026-09-07 port) -- while editingMessage is set,
    // this SAME textarea/Send-button pair saves the edit instead of
    // sending a new message, same guard shape as page.tsx's own send().
    if (editingMessage && !extra?.overrideText && !(extra?.contacts && extra.contacts.length > 0)) {
      await saveEditedMessage();
      return;
    }
    const text = (extra?.overrideText ?? draft).trim();
    const readyAttachment = attachment && attachment.status === "ready" ? attachment : null;
    const contactsToSend = extra?.contacts ?? [];
    if ((!text && !readyAttachment && contactsToSend.length === 0) || sending) return;
    setSending(true);
    setDraft("");
    if (readyAttachment) {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      setAttachment(null);
    }
    // Reply feature (2026-09-08) -- same "only a real, hands-on send
    // clears the staged reply" rule app/chats/[chatId]/page.tsx's own
    // send() follows; captured before clearing so a concurrent second
    // reply-start can't race this in-flight request.
    const replyToSend = replyTarget;
    setReplyTarget(null);
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: target.routeParam,
          text: text || undefined,
          media: readyAttachment?.fileReference ? [{ fileReference: readyAttachment.fileReference }] : undefined,
          contacts:
            contactsToSend.length > 0
              ? contactsToSend.map((c) => ({
                  userId: c.userId,
                  phoneNumber: c.phoneNumber,
                  firstName: c.firstName,
                  lastName: c.lastName,
                }))
              : undefined,
          replyTo: replyToSend && replyToSend.fromId ? { messageId: replyToSend._id, userId: replyToSend.fromId } : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
    } catch {
      // Best-effort -- the next poll tick will reconcile either way,
      // same "poll is the source of truth" contract app/chats/[chatId]/
      // page.tsx already runs on.
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  // Fix Tracker (2026-09-07, order 119) -- MediaPickerPanel's own
  // onSendMedia callback for a picked sticker/GIF. Modeled on page.tsx's
  // own sendMediaDocument, but this window has no pendingMessages/
  // optimistic-bubble machinery of its own (messages here just append
  // on the actual /api/chats/send response, same as every other send
  // path in this file) -- so this is the same POST handleSend's own
  // media branch already makes, just fired directly with the picked
  // doc's fileReference instead of routing through the attach/draft
  // staging state (there's no staged attachment here to reuse).
  async function sendMediaDocument(doc: MediaDocument) {
    if (sending) return;
    setSending(true);
    const replyToSend = replyTarget;
    setReplyTarget(null);
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: target.routeParam,
          media: [{ fileReference: doc.fileReference }],
          replyTo: replyToSend && replyToSend.fromId ? { messageId: replyToSend._id, userId: replyToSend.fromId } : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
    } catch {
      // Best-effort, same "next poll reconciles" contract as handleSend.
    } finally {
      setSending(false);
    }
  }

  // Fix Tracker (2026-09-08, Aleksandr: "сделай мини-чат таким же
  // функциональным, как основной чат" -- voice messages) -- this
  // window had zero voice-message support (no mic button, no recorder,
  // no playback bubble). Ported using the SAME shared components
  // app/chats/[chatId]/page.tsx's own voice feature already uses
  // (useVoiceRecorder/VoiceRecordButton/VoiceRecordingBar/
  // VoiceMessageBubble) rather than rebuilding any of the recording UI
  // or waveform math from scratch -- only the send plumbing below is
  // new, adapted to this file's own simpler "append on the real /api/
  // chats/send response" send model (no optimistic PendingMessage
  // machinery exists here, unlike that page -- see sendMediaDocument's
  // own header above for why every send path in this file already
  // works this way).
  //
  // Same create -> S3 PUT -> confirm upload pipeline handleAttach
  // above already runs for photos/files, just off a recorded Blob
  // (voiceBlobsRef) instead of a picked File, plus the voice-specific
  // create-body fields (duration/waveform/self-destruct flags) page.tsx's
  // own uploadAndSendVoice sends -- same reasoning, see that function's
  // own comment on why the self-destruct flags are the mobile app's
  // own default for every voice note, not optional here either.
  async function uploadAndSendVoice(localId: string) {
    const stored = voiceBlobsRef.current.get(localId);
    if (!stored) return;
    setSending(true);
    try {
      const file = new File([stored.blob], `voice-${Date.now()}.webm`, { type: stored.mimeType });
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mimetype: file.type || "audio/webm",
          bytes: file.size,
          voiceDuration: stored.durationSeconds,
          voiceWaveform: encodeBase64Waveform(stored.waveform),
          flags: SELF_DESTRUCT_VOICE_FLAGS,
          ttlSeconds: SELF_DESTRUCT_VOICE_TTL_SECONDS,
        }),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok || !createData?.ok || !createData.result?.url) return;
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) return;
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json().catch(() => null);
      const fileReference = confirmData?.media?.fileReference as string | undefined;
      const mediaId = confirmData?.media?._id as string | undefined;
      if (!confirmRes.ok || !confirmData?.ok || !fileReference || !mediaId) return;
      // Same doc._id-keyed local-waveform cache write as page.tsx's own
      // uploadAndSendVoice -- see lib/voice-local-waveform-cache.ts's
      // own header for why fileReference (which rotates on every poll)
      // would be a guaranteed miss here instead.
      rememberLocalVoiceWaveform(mediaId, stored.waveform);
      const replyToSend = voiceReplyRef.current.get(localId) ?? null;
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: target.routeParam,
          media: [{ fileReference }],
          replyTo: replyToSend && replyToSend.fromId ? { messageId: replyToSend._id, userId: replyToSend.fromId } : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
    } catch {
      // Best-effort, same "next poll reconciles" contract every other
      // send path in this file already follows -- no retry-on-failure
      // UI exists here (unlike page.tsx's PendingMessage machinery), so
      // a failed voice upload just silently doesn't appear, same as a
      // failed sticker/GIF send already does.
    } finally {
      voiceBlobsRef.current.delete(localId);
      voiceReplyRef.current.delete(localId);
      setSending(false);
    }
  }

  // Record-button release (components/chat/voice-recorder.ts's own
  // onFinish). No optimistic bubble here (see uploadAndSendVoice's own
  // header) -- the Blob is stashed and upload starts immediately.
  function handleVoiceFinish(result: VoiceRecordingResult) {
    const localId = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Reply feature (2026-09-08): captured now, same as every other
    // send path in this file, so a staged reply survives into the
    // voice note it applies to rather than whatever's staged by the
    // time the upload finishes.
    voiceReplyRef.current.set(localId, replyTarget);
    setReplyTarget(null);
    voiceBlobsRef.current.set(localId, {
      blob: result.blob,
      mimeType: result.mimeType,
      durationSeconds: result.durationSeconds,
      waveform: result.waveform,
    });
    void uploadAndSendVoice(localId);
  }

  const recorder = useVoiceRecorder(handleVoiceFinish);

  // 2026-09-03 (Aleksandr, attach-menu port) -- Contacts row opens
  // components/chat/contacts-picker-modal.tsx (a shared component, not
  // a page.tsx internal); its own bottom "Send" button fires this
  // directly rather than staging picks into the compose row the way
  // the big chat page does -- this window has no room for a pills
  // strip, and the picker's own onSend prop is exactly built for
  // firing send() straight from inside it (see that file's own header).
  async function sendPickedContacts() {
    if (pickedContacts.length === 0 || contactsSending) return;
    setContactsSending(true);
    try {
      await handleSend({ contacts: pickedContacts });
      setContactsPickerOpen(false);
      setPickedContacts([]);
      setPickedContactIds(new Set());
    } finally {
      setContactsSending(false);
    }
  }
  function toggleContact(contact: PickedContact) {
    setPickedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.userId)) next.delete(contact.userId);
      else next.add(contact.userId);
      return next;
    });
    setPickedContacts((prev) =>
      prev.some((c) => c.userId === contact.userId) ? prev.filter((c) => c.userId !== contact.userId) : [...prev, contact],
    );
  }

  // Calculator panel -- draft-row mutations, all pure state updates
  // (same as app/chats/[chatId]/page.tsx's own calcAddRow/calcUpdateRow/
  // calcRemoveLastRow/calcClose).
  function calcAddRow() {
    setCalcRows((prev) => (prev.length >= CALC_MAX_ROWS ? prev : [...prev, calcBlankRow()]));
  }
  function calcUpdateRow(id: string, patch: Partial<Omit<CalcRow, "id">>) {
    setCalcRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
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
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: target.routeParam,
          calculation: { note: calcNote.trim(), currency: calcCurrency, rows },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setCalcError(true);
        return;
      }
      if (data.message) setMessages((prev) => [...prev, data.message as ChatMessage]);
      calcClose();
    } catch {
      setCalcError(true);
    } finally {
      setCalcSending(false);
    }
  }

  // 2026-09-02 (Aleksandr, "Sofia Benett" screenshot: "надо добавить
  // скрепку слева, а кота поставить справа как в обычных чатах") -- a
  // real paperclip, not just repositioned chrome: mirrors app/chats/
  // [chatId]/page.tsx's own three-step image-attach flow (create -> PUT
  // to the signed URL -> confirm -> fileReference). Deliberately skips
  // that page's own compressAttachmentImage() -- a local, non-exported
  // helper there, and this file's own header explains why it never
  // imports from that page -- an uncompressed upload is the one
  // accepted trade-off for staying self-contained.
  // 2026-09-03 (Aleksandr, attach-menu port): generalized from images
  // only to `kind: "image" | "file"`, same real-filename `attributes`
  // passthrough that page's own handleAttachFile sends, so a document
  // sent from this window shows its actual name too, not "Документ".
  async function handleAttach(file: File, kind: "image" | "file") {
    if (attachment) {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    }
    const bytes = file.size;
    const previewUrl =
      kind === "image" || fileKindFromName(file.name, file.type) === "pdf" ? URL.createObjectURL(file) : undefined;
    if (bytes > MAX_ATTACHMENT_FILE_BYTES) {
      setAttachment({ kind, fileName: file.name, mimetype: file.type || "application/octet-stream", bytes, previewUrl, status: "error" });
      return;
    }
    setAttachment({ kind, fileName: file.name, mimetype: file.type || "application/octet-stream", bytes, previewUrl, status: "uploading" });
    try {
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: file.type || "application/octet-stream", bytes: file.size, fileName: file.name }),
      });
      const createData = await createRes.json().catch(() => null);
      if (createData?.message === "quota_exceeded") {
        setAttachment((prev) => (prev && prev.fileName === file.name ? { ...prev, status: "error" } : prev));
        setDailyUploadsOpen(true);
        return;
      }
      if (!createRes.ok || !createData?.ok || !createData.result?.url) throw new Error("create_failed");
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("upload_failed");
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json().catch(() => null);
      const fileReference = confirmData?.media?.fileReference as string | undefined;
      if (!confirmRes.ok || !confirmData?.ok || !fileReference) throw new Error("confirm_failed");
      // Guard against a stale response landing after the user already
      // removed/replaced this attachment (compare by fileName+bytes,
      // stable for this specific pick).
      setAttachment((prev) => (prev && prev.fileName === file.name && prev.bytes === bytes ? { ...prev, status: "ready", fileReference } : prev));
    } catch {
      setAttachment((prev) => (prev && prev.fileName === file.name && prev.bytes === bytes ? { ...prev, status: "error" } : prev));
    }
  }

  function removeAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  const targetProfileHref = target.username ? profileHref(target.username) : null;
  // 2026-09-05 (Aleksandr: "кешировать вообще всё, если оно хотя бы
  // 1 раз открывалось") -- same persistent Cache Storage-backed
  // CachedAvatar every other avatar surface on the site now uses.
  const avatarImg = (
    <CachedAvatar
      src={target.avatarUrl}
      blurDataURL={target.avatarBlurDataUrl ?? BLUR_DATA_URL}
      size={32}
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  );
  const nameText = <span className="block truncate text-[16px] font-medium leading-tight">{target.title || "—"}</span>;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={target.title}
      // 2026-09-04 (Aleksandr, 2 screenshots of the Meetings row's
      // own new inline panel: "Не поместилась инфа из попапа, надо
      // делать его выше видимо") -- this card is a small FIXED-height
      // (26rem) `overflow-hidden` box; the attach popover growing
      // upward from the compose bar is `position: absolute` so it
      // escapes normal flow, but it's still clipped by THIS card's own
      // overflow-hidden the instant it needs more room than fits
      // between the compose bar and the card's own top edge (~366px --
      // less than even the popover's own max-h-[min(60vh,420px)] cap,
      // let alone Meetings' actual content). The row-list/Daily-
      // Uploads/Meetings popover already gets its own internal
      // max-height + scroll (see that div's own comment) -- this is
      // the SEPARATE, outer constraint: growing the whole card taller
      // while a tall popover is open moves the card's fixed-`bottom`-
      // anchored TOP edge further up the screen, literally "делает его
      // выше" the way Aleksandr described it, giving that already-
      // capped popover genuine room instead of clipping it early.
      // 2026-09-04 (Aleksandr, 2 screenshots of this same card floating
      // over the messages window behind it: "Добавь под модалку чуть
      // легкую белую тень, чтобы отделить от окна сообщений, прям
      // очень сильно легкую") -- plain `shadow-xl` is a dark/black
      // shadow, which reads fine separating the card from a light page
      // behind it but barely shows against the dark chat window this
      // widget actually floats over (both screenshots). Folded a third,
      // very low-opacity WHITE layer into shadow-xl's own two layers
      // (Tailwind's default shadow-xl value, since `shadow-xl` and a
      // second separate `shadow-[...]` utility would both just set
      // `box-shadow` and one would silently overwrite the other rather
      // than stacking) -- kept faint on purpose per "очень сильно
      // легкую", present in both themes since it's harmless/invisible
      // enough on a light backdrop but does the separating job a black
      // shadow can't on a dark one.
      className={`animate-popover-up fixed right-5 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1),0_12px_36px_-8px_rgba(255,255,255,0.06)] transition-[height] duration-200 dark:border-neutral-700 dark:bg-neutral-900 ${
        attachMenuOpen && (attachDailyUploadsOpen || meetingsMenuOpen) ? "h-[32rem]" : "h-[26rem]"
      }`}
      style={{ bottom: "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative flex shrink-0 items-center border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          // Fix Tracker (2026-09-07, order 96: "Анимируй стрелку назад
          // в мини-чатах") -- every other back arrow in the app
          // (app/chats/[chatId]/page.tsx, chats-flyout.tsx,
          // daily-uploads-modal.tsx) already nudges left on hover via
          // `group` + `.animate-back-arrow` (app/globals.css); this
          // widget's own back button just never got either class.
          className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <ChatBackArrow className="h-3 w-[7px] animate-back-arrow" />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-10 text-[#262a34] dark:text-white">
          {targetProfileHref ? (
            <Link href={targetProfileHref} onClick={onNavigate} className="pointer-events-auto max-w-full truncate">
              {nameText}
            </Link>
          ) : (
            <div className="max-w-full truncate">{nameText}</div>
          )}
        </div>

        {targetProfileHref ? (
          // Fix Tracker (2026-09-07, order 109) -- ?photo=1 opens the
          // profile page straight into components/profile-photo-
          // viewer.tsx's full-size lightbox, same as the chat-list's
          // own avatar link (app/chats/page.tsx) and the main chat
          // page's own header avatar below.
          <Link href={`${targetProfileHref}?photo=1`} onClick={onNavigate} aria-label={target.title || undefined} className="ml-auto shrink-0">
            {avatarImg}
          </Link>
        ) : (
          <div className="ml-auto shrink-0">{avatarImg}</div>
        )}
      </div>
      {/* "Pin" feature (2026-09-08 port, Aleksandr: "закрепить
          функциональными в мини-чатах, должно быть идентично по
          UX/UI как в основных чатах") -- same shared
          PinnedMessageBanner/AllPinsModal app/chats/[chatId]/page.tsx
          renders between its own header and scrollable message list;
          this widget has no `max-w-[470px] px-4` header row to match
          (fixed w-80 card instead), so it just reuses the header's own
          px-3 horizontal padding. */}
      {displayedPinnedMessage && (
        <div className={`px-3 pt-2 ${pinnedMessage ? "" : "pointer-events-none animate-pin-banner-out"}`}>
          <PinnedMessageBanner
            pinnedMessage={displayedPinnedMessage}
            onTap={handleTapPinnedBanner}
            onUnpin={() => handleTogglePin(displayedPinnedMessage, true)}
            unpinning={pinBusyMessageId === Number(displayedPinnedMessage._id)}
            pinCount={pinnedMessages.length}
            onOpenAll={() => setAllPinsOpen(true)}
          />
        </div>
      )}
      {allPinsOpen && (
        <AllPinsModal
          pinnedMessages={pinnedMessages}
          unpinningId={pinBusyMessageId}
          onClose={() => setAllPinsOpen(false)}
          onJumpToMessage={handleJumpToPinnedMessage}
          onUnpin={(message) => void handleTogglePin(message, true)}
        />
      )}

      <div ref={listRef} className="relative flex-1 overflow-y-auto px-3 py-2.5">
      <div className="space-y-1.5">
        {loadState === "loading" && messages.length === 0 && (
          // 2026-09-04 (Aleksandr: "На лоадер поставь нашу планету, пока
          // чат грузится", then "Поставь иконку планеты по центру
          // модалки" once a plain `py-10` wrapper -- shrink-to-content,
          // not stretched -- left it sitting near the top of this empty
          // list instead of centered in the widget) -- same public/
          // animations/planet-loader.json LottiePlayer app/chats/
          // [chatId]/page.tsx's own full-page loading state already
          // uses, sized down for this widget's own h-[26rem]/w-80
          // footprint. `absolute inset-0` against listRef's own
          // `relative` centers it against the FULL scrollable area's
          // real height (nothing else renders in the space-y-1.5
          // sibling while messages is still empty, so there's nothing
          // for this to overlap).
          <div className="absolute inset-0 flex items-center justify-center">
            <LottiePlayer src="/animations/planet-loader.json" size={72} />
          </div>
        )}
        {messages.map((msg) => {
          const mine = myUserId !== null && msg.fromId === myUserId;
          const text = extractMessageText(msg);
          const docMedia = messageDocumentMedia(msg);
          // 2026-09-05 (Aleksandr, live screenshot: a multi-photo
          // message in this widget rendering as N separate full-width
          // rows instead of a grouped album -- "Комбинирование фото не
          // работают в маленьком окне, надо полечить") -- this window
          // never got the app/chats/[chatId]/page.tsx grouping pass
          // (imageGroupStartId/ChatPhotoGrid, 6.116/6.179) at all when
          // it was first built. Same logic, ported verbatim: a RUN of
          // 2+ consecutive image docs renders as one ChatPhotoGrid;
          // imageGroupStartId maps the run's first doc id to the whole
          // run, imageGroupSkipIds is every other doc in it (skipped
          // below since the grid already draws it). No full-size
          // viewer exists in this widget (onOpen is a no-op, same as
          // page.tsx's own pending-attachment ChatPhotoGrid usage) --
          // out of scope for this fix, which is specifically about the
          // grouping shape, not adding a new lightbox to this window.
          const imageGroupStartId = new Map<string, typeof docMedia>();
          const imageGroupSkipIds = new Set<string>();
          for (let gi = 0; gi < docMedia.length; ) {
            if (!isImageMediaDocument(docMedia[gi]!)) {
              gi++;
              continue;
            }
            let gj = gi + 1;
            while (gj < docMedia.length && isImageMediaDocument(docMedia[gj]!)) gj++;
            const run = docMedia.slice(gi, gj);
            if (run.length >= 2) {
              imageGroupStartId.set(run[0]!._id, run);
              for (const d of run.slice(1)) imageGroupSkipIds.add(d._id);
            }
            gi = gj;
          }
          const contactMedia = messageContactMedia(msg);
          const calc = messageCalculation(msg);
          // 2026-09-03 (Aleksandr, attach-menu port) -- this used to
          // bail out of a message entirely once it had no text
          // (`if (!text) return null`), which silently dropped every
          // photo/file/contact/calculation this window itself could
          // already send (Send never blocked on attachment-only sends,
          // there was just nothing here to render one). Now renders
          // whichever of the four kinds a message actually carries,
          // same as the big chat page, just without that page's own
          // flat/no-chrome treatment -- this corner widget keeps one
          // simple bubble shape for everything, image included.
          if (!text && docMedia.length === 0 && contactMedia.length === 0 && !calc) return null;
          // 2026-09-05 follow-up (Aleksandr, live screenshot: this
          // widget's photo/photo-group messages still sitting inside
          // the solid blue/white bubble card app/chats/[chatId]/
          // page.tsx's own isFlatMedia already dropped for the same
          // shapes there -- "Убери рамку у фото в маленькое окне чатов
          // тоже") -- this widget never got that pass (see this
          // block's own 2026-09-03 comment on why: "this corner widget
          // keeps one simple bubble shape for everything" was a
          // deliberate scope cut, now revisited). Scoped to the one
          // shape actually complained about: image-only (single OR
          // grouped, doesn't matter which -- ChatPhotoGrid handles
          // both), no text/contact/calc riding along. A mixed message
          // (photo + caption, photo + contact, ...) keeps the original
          // bubble treatment unchanged.
          const isPhotoOnly = !text && contactMedia.length === 0 && !calc && docMedia.length > 0 && docMedia.every(isImageMediaDocument);
          // Fix Tracker (2026-09-07, Aleksandr: "Вид документа тоже
          // должен быть как в основном чате") -- a lone file (no
          // caption/calc/contact riding along) now gets the same
          // wide, self-backgrounded card app/chats/[chatId]/page.tsx's
          // own isFileOnly draws, instead of always sitting inside a
          // compact translucent chip meant for a MIXED message.
          const isFileOnly = !text && contactMedia.length === 0 && !calc && docMedia.length === 1 && !isImageMediaDocument(docMedia[0]!);
          const dateMs = messageDateMs(msg);
          const flatFooter = (dateMs > 0 || mine) && (
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
              {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
              {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
            </span>
          );
          // Plain (non-absolute) time+ticks row -- used both as the
          // regular below-bubble footer (any non-flat shape) and, for
          // isFileOnly, tucked inside the file card itself (flatFooter
          // above is pre-styled as an absolute photo overlay, wrong
          // fit for a card that isn't relatively positioned).
          const timeFooter = (dateMs > 0 || mine) && (
            <div
              className={`mt-0.5 flex items-center justify-end gap-1 text-[12px] ${
                mine ? "text-white/80" : "text-[#989aa6] dark:text-[#8d8d93]"
              }`}
            >
              {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
              {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
            </div>
          );
          const footer = !isPhotoOnly && !isFileOnly && timeFooter;
          const selected = selectedMessageIds.has(Number(msg._id));
          return (
            <div
              key={msg._id}
              className={`flex items-end gap-1.5 rounded-lg transition-colors duration-500 ${mine ? "justify-end" : "justify-start"} ${
                highlightedMessageId === Number(msg._id) ? "bg-[#335ef7]/10 dark:bg-[#0c8ce9]/20" : "bg-transparent"
              }`}
            >
              {/* Fix Tracker (2026-09-07, select-mode port) -- same
                  checkbox-before-bubble shape page.tsx's own selection
                  slot uses, simplified (no width-collapse animation --
                  mounts/unmounts with selectionMode outright). `order-
                  last` for `mine` keeps it at the row's own outer edge,
                  same reasoning page.tsx's order 104 comment gives. */}
              {selectionMode && (
                <button
                  type="button"
                  onClick={() => toggleMessageSelected(Number(msg._id))}
                  aria-label="Select message"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${mine ? "order-last" : ""} ${
                    selected
                      ? "border-[#335ef7] bg-[#335ef7] text-white dark:border-[#0c8ce9] dark:bg-[#0c8ce9]"
                      : "border-neutral-300 bg-white/70 dark:border-neutral-600 dark:bg-black/30"
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                data-message-id={msg._id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (selectionMode) return;
                  setActionsMenu({ message: msg, anchorRect: e.currentTarget.getBoundingClientRect(), mine });
                }}
                onClick={selectionMode ? () => toggleMessageSelected(Number(msg._id)) : undefined}
                className={
                  isPhotoOnly || isFileOnly
                    ? `w-full ${selectionMode ? "cursor-pointer" : ""}`
                    : `w-full rounded-2xl px-3 py-1.5 text-[15.5px] leading-snug ${selectionMode ? "cursor-pointer" : ""} ${
                        mine
                          ? "rounded-br-sm bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
                          : "rounded-bl-sm bg-[#f2f2f7] text-[#262a34] dark:bg-neutral-800 dark:text-white"
                      }`
                }
              >
                {(() => {
                  // Fix Tracker (2026-09-08, real reply threading) --
                  // same non-pending-only lookup app/chats/[chatId]/
                  // page.tsx's own render does (this window has no
                  // optimistic pending-message concept, see
                  // sendMediaDocument's own header, so there is no
                  // pending.replySnapshot branch to mirror here).
                  const quote = msg.replyTo ? resolveReplyPreview(messagesById.get(msg.replyTo.message) ?? null) : null;
                  if (!quote) return null;
                  return (
                    <MessageReplyQuote
                      authorLabel={quote.authorLabel}
                      previewText={quote.node}
                      thumbnail={quote.thumbnail}
                      mine={mine}
                      onClick={
                        msg.replyTo && messagesById.has(msg.replyTo.message)
                          ? () => handleShowInChatFromViewer(Number(msg.replyTo!.message))
                          : undefined
                      }
                    />
                  );
                })()}
                {docMedia.length > 0 && (
                  <div className={`flex flex-col gap-1.5 ${text ? "mb-1" : ""}`}>
                    {docMedia.map((doc: MessageMediaDocument) =>
                      imageGroupSkipIds.has(doc._id) ? null : imageGroupStartId.has(doc._id) ? (
                        <ChatPhotoGrid
                          key={doc._id}
                          docs={imageGroupStartId.get(doc._id)!.map((d) => ({ id: d._id, src: getStableMediaProxyUrl(d), thumbnail: mediaDocumentThumbnail(d) }))}
                          onOpen={(docId) => openViewerForDoc(msg._id, docId)}
                          footer={isPhotoOnly ? flatFooter : undefined}
                        />
                      ) : isImageMediaDocument(doc) ? (
                        <div key={doc._id} className="relative">
                          <BlurredChatPhoto
                            docId={doc._id}
                            src={getStableMediaProxyUrl(doc)}
                            serverThumb={mediaDocumentThumbnail(doc)}
                            className="max-h-48 w-full cursor-pointer rounded-xl object-cover"
                            onClick={() => openViewerForDoc(msg._id, doc._id)}
                          />
                          {isPhotoOnly && flatFooter}
                        </div>
                      ) : isVoiceMediaDocument(doc) ? (
                        // Fix Tracker (2026-09-08, Aleksandr: "сделай
                        // мини-чат таким же функциональным, как основной
                        // чат") -- voice messages had no rendering here
                        // at all (fell through to the generic file-link
                        // card, same "Документ" bug class as the video/
                        // sticker cases below). Same shared
                        // VoiceMessageBubble component and props
                        // app/chats/[chatId]/page.tsx's own isVoiceMediaDocument
                        // branch uses -- playback, waveform, now-playing-bar
                        // entry all come for free from that component.
                        <VoiceMessageBubble
                          key={doc._id}
                          doc={doc}
                          mine={mine}
                          messageDateMs={dateMs}
                          lang={lang}
                          peerName={target.title}
                          peerAvatarUrl={target.avatarUrl}
                          myAvatarUrl={myAvatarUrl}
                          footer={isFileOnly ? flatFooter : undefined}
                        />
                      ) : isVideoMediaDocument(doc) ? (
                        // Fix Tracker (2026-09-08, Aleksandr: "в миничате
                        // стикеры/GIF показываются как карточка
                        // 'Документ'") -- this map() had no branch at all
                        // for a video/GIF MessageMediaDocument, so it fell
                        // through to the generic file-link case below and
                        // rendered as a plain "Документ" card instead of
                        // playing the GIF. Same GIF-as-looping-video
                        // treatment as app/chats/[chatId]/page.tsx's own
                        // isVideoMediaDocument branch (every video message
                        // here is a GIF in practice, per that branch's own
                        // comment) -- getStableMediaProxyUrl, not
                        // buildMediaProxyUrl, for the same reason commit
                        // 7112a63 just fixed there: a stable src stops the
                        // backend's per-poll fileReference rotation from
                        // restarting the video and causing it to blink.
                        <div key={doc._id} className="flex flex-col items-end gap-1">
                          <video
                            src={getStableMediaProxyUrl(doc)}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="max-h-48 w-full rounded-xl bg-black object-cover"
                          />
                          {/* Fix Tracker (2026-09-08, Aleksandr, screenshot:
                              "Время в гифках надо тоже опустить чуть ниже")
                              -- flatFooter overlays the time+ticks pill
                              absolutely INSIDE the media's own bottom-right
                              corner, which for a GIF sat right at (and
                              visually crowded) the frame's bottom edge. A
                              plain non-absolute row under the video --
                              same pill look, no positioning classes --
                              puts it below the frame instead, with real
                              clearance, matching the "opustit nizhe" ask.
                              Same fix shape as the sticker branch below. */}
                          {isFileOnly && (dateMs > 0 || mine) && (
                            <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
                              {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
                              {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
                            </span>
                          )}
                        </div>
                      ) : isStickerMediaDocument(doc) ? (
                        // Same "Документ" fallback bug as the video case
                        // just above, same fix shape: render the actual
                        // sticker (gunzip+Lottie decode via TgsSticker,
                        // same component and props app/chats/[chatId]/
                        // page.tsx's own sticker branch uses) instead of
                        // falling through to the generic file card.
                        <div key={doc._id} className="flex flex-col items-end gap-1">
                        <TgsSticker
                          src={getStableMediaProxyUrl(doc)}
                          size={112}
                          previewUrl={strippedPreviewDataUrl(doc)}
                          pathPreview={decodeStickerPathPreview(doc)}
                          fallback={
                            <div
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
                          }
                        />
                        {/* Fix Tracker (2026-09-08, Aleksandr, screenshot:
                            "время не должно перекрывать котов, надо
                            опускать время чуть ниже так же как и в
                            основных чатах") -- flatFooter's absolute
                            bottom-right overlay sat directly on top of
                            the sticker's own artwork (a sticker's
                            transparent canvas often has the character
                            drawn right into that corner, unlike a
                            rectangular photo/video). Plain non-absolute
                            row below the sticker instead -- same pill,
                            no overlap, ever, regardless of a given
                            sticker's own drawn bounds. */}
                        {isFileOnly && (dateMs > 0 || mine) && (
                          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
                            {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
                            {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
                          </span>
                        )}
                        </div>
                      ) : (
                        <a
                          key={doc._id}
                          href={buildMediaProxyUrl(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          // Fix Tracker (2026-09-07, "Вид документа тоже
                          // должен быть як в основному чаті") -- a lone
                          // file (isFileOnly) now gets the same wide
                          // self-backgrounded card page.tsx's own
                          // isFileOnly draws, icon/name/size sized up to
                          // match and its own flatFooter-equivalent
                          // tucked under the name/size column instead of
                          // this row sitting inside the colored bubble.
                          // A file inside a MIXED message (with text, or
                          // alongside other attachments) keeps the
                          // original compact translucent-chip styling.
                          className={
                            isFileOnly
                              ? `flex w-64 max-w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 transition hover:opacity-90 ${
                                  mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
                                }`
                              : `flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:opacity-80 ${
                                  mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                                }`
                          }
                        >
                          {fileKindFromName(mediaDocumentFileName(doc), doc.mimetype) === "pdf" ? (
                            // 2026-09-04 (Aleksandr: "В мелкой модалке
                            // опять моргает PDF") -- this call site never
                            // got the PLAN.md 6.128 fix app/chats/
                            // [chatId]/page.tsx's own confirmed-message
                            // PdfPageThumbnail already has: the backend
                            // reissues a different fileReference for the
                            // SAME doc on every poll, so buildMediaProxyUrl
                            // (doc)'s own `?ref=...` rotates every ~poll,
                            // and the thumbnail cache/effect keyed by that
                            // URL alone (the component's `src` default)
                            // was a guaranteed miss -> blank -> re-render
                            // -> flicker. `cacheKey={doc._id}` is stable
                            // across polls the same way it now is there.
                            <PdfPageThumbnail
                              src={buildMediaProxyUrl(doc)}
                              cacheKey={doc._id}
                              className={isFileOnly ? "h-11 w-11 shrink-0 rounded-[12px] object-cover object-top" : "h-9 w-9 shrink-0 rounded-[10px] object-cover object-top"}
                              fallback={<ChatFileTypeIcon kind="pdf" className={isFileOnly ? "h-11 w-11" : "h-9 w-9"} />}
                            />
                          ) : (
                            <ChatFileTypeIcon kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} className={isFileOnly ? "h-11 w-11" : "h-9 w-9"} />
                          )}
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className={isFileOnly ? "truncate text-[14px] font-medium" : "truncate text-[13px] font-medium"}>
                              {mediaDocumentFileName(doc) || (
                                // 2026-09-04: see DocumentFallbackLabel's own
                                // header comment (components/chat/file-type-icon.tsx)
                                <DocumentFallbackLabel kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} />
                              )}
                            </span>
                            {mediaDocumentBytes(doc) !== null && (
                              <span className={`text-[11px] ${mine ? "opacity-80" : "opacity-60"}`}>{formatBytes(mediaDocumentBytes(doc) as number)}</span>
                            )}
                            {isFileOnly && <span className="mt-0.5">{timeFooter}</span>}
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                )}
                {contactMedia.length > 0 && (
                  <div className={`flex flex-col gap-1.5 ${text ? "mb-1" : ""}`}>
                    {contactMedia.map((c) => (
                      <ContactMessageCard
                        key={c.userId}
                        userId={c.userId}
                        firstName={c.firstName}
                        lastName={c.lastName}
                        phoneNumber={c.phoneNumber}
                        summary={null}
                        mine={mine}
                        canAddContact={false}
                        onMessage={onNavigate}
                      />
                    ))}
                  </div>
                )}
                {calc && <ChatCalculationCard calc={calc} mine={mine} />}
                {text && (
                  // 2026-09-04 (Aleksandr: "В бабле сообщения должна
                  // быть анімація з котом. Текст + анімація") -- same
                  // quick-invite cat animation app/chats/[chatId]/
                  // page.tsx's own message list just picked up.
                  // 2026-09-04, follow-up ("Кошак есть, но посели его с
                  // правого края, а текст слева") -- text first so the
                  // cat, last in this LTR row, lands at the bubble's
                  // own right edge.
                  quickInviteCatAnimation(text) ? (
                    <div className="flex items-center gap-2">
                      <div className="whitespace-pre-wrap break-words">{text}</div>
                      <LottiePlayer src={quickInviteCatAnimation(text)!} size={40} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{text}</div>
                  )
                )}
                {footer}
              </div>
              <ReactionsBar
                reactions={msg.reactions ?? []}
                mine={mine}
                myUserId={myUserId}
                otherAvatarUrl={target.avatarUrl}
                otherInitial={(target.title || "?").trim().charAt(0).toUpperCase() || "?"}
                onToggle={(emoticon) => void handleToggleReaction(msg, emoticon)}
              />
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
        {selectionMode ? (
          // Fix Tracker (2026-09-07, select-mode port) -- replaces the
          // normal compose row while selecting, same "the compose bar
          // becomes an action bar" swap page.tsx's own selectionMode
          // header does, shrunk to a single row for this widget.
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]"
              >
                <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
              </button>
              <span className="text-[13px] font-medium tabular-nums text-[#262a34] dark:text-white">{selectedMessageIds.size}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={selectedMessageIds.size === 0}
                  onClick={() => {
                    setForwardFailed(false);
                    setForwardPickedChatIds(new Set());
                    setForwardRowStatus({});
                    setForwardSource(selectedMessagesOldestFirst());
                  }}
                  aria-label="Forward selected"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#335ef7] transition hover:bg-black/5 disabled:opacity-40 dark:text-[#0c8ce9] dark:hover:bg-white/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path d="M4 12h15M13 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={selectedMessageIds.size === 0 || selectionDeleting}
                  onClick={() => void handleConfirmDeleteSelected()}
                  aria-label="Delete selected"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m1 0-.8 12.2A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.8L6 7" />
                  </svg>
                </button>
              </div>
            </div>
            {selectionDeleteFailed && (
              <p className="px-1 text-[12px] text-red-500 dark:text-red-400">
                <T uk="Не вдалося видалити" en="Couldn't delete" ru="Не удалось удалить" de="Löschen fehlgeschlagen" es="No se pudo eliminar" fr="Échec de la suppression" pl="Nie udało się usunąć" ptBR="Não foi possível excluir" zh="删除失败" />
              </p>
            )}
          </div>
        ) : calcOpen ? (
          // 2026-09-03 (Aleksandr, attach-menu port) -- same calculator
          // panel app/chats/[chatId]/page.tsx's own compose bar swaps in
          // for the normal draft row, shrunk to fit this window's own
          // 320px width (its own version sits inside a 470px-wide row).
          <div className="w-full">
            <div className="overflow-hidden rounded-xl bg-[#e4e9ff] dark:bg-[#151a30]">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="text-[#4f71eb] dark:text-[#8fb1ff]">
                    <th className="py-1.5 pl-2 text-left font-semibold">
                      <T uk="Опис" en="Description" ru="Описание" de="Beschr." es="Descr." fr="Descr." pl="Opis" ptBR="Descr." zh="描述" />
                    </th>
                    <th className="py-1.5 px-1 text-right font-semibold">
                      <T uk="Варт." en="Cost" ru="Стоим." de="Preis" es="Coste" fr="Coût" pl="Koszt" ptBR="Custo" zh="单价" />
                    </th>
                    <th className="py-1.5 px-1 text-right font-semibold">
                      <T uk="К-сть" en="Qty" ru="Кол-во" de="Anz." es="Cant." fr="Qté" pl="Ilość" ptBR="Qtd." zh="数量" />
                    </th>
                    <th className="py-1.5 pr-2 text-right font-semibold">
                      <T uk="Разом" en="Total" ru="Итого" de="Summe" es="Total" fr="Total" pl="Razem" ptBR="Total" zh="小计" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calcRows.map((row, i) => {
                    const subtotal = calcRowSubtotal(row);
                    return (
                      <tr key={row.id} className="border-t border-[#c7d3f7] dark:border-[#28345c]">
                        <td className="py-1 pl-2 align-top">
                          <div className="flex items-start gap-1">
                            <span className="pt-1 text-[10px] text-[#4f71eb]/70 dark:text-[#8fb1ff]/70">{i + 1}.</span>
                            <input
                              ref={i === 0 ? calcFirstRowInputRef : undefined}
                              value={row.description}
                              onChange={(e) => calcUpdateRow(row.id, { description: e.target.value.slice(0, 300) })}
                              className="w-full min-w-0 bg-transparent py-0.5 text-[#262a34] outline-none dark:text-white"
                            />
                          </div>
                        </td>
                        <td className="py-1 px-1 align-top text-right">
                          <input
                            inputMode="decimal"
                            value={row.unitAmount}
                            onChange={(e) => calcUpdateRow(row.id, { unitAmount: e.target.value.replace(/[^0-9.,]/g, "") })}
                            placeholder="+"
                            className="w-14 bg-transparent py-0.5 text-right text-[#262a34] outline-none placeholder:font-semibold placeholder:text-[#335ef7] dark:text-white dark:placeholder:text-[#0c8ce9]"
                          />
                        </td>
                        <td className="py-1 px-1 align-top text-right">
                          <input
                            inputMode="numeric"
                            value={row.quantity}
                            onChange={(e) => calcUpdateRow(row.id, { quantity: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
                            placeholder="+"
                            className="w-8 bg-transparent py-0.5 text-right text-[#262a34] outline-none placeholder:font-semibold placeholder:text-[#335ef7] dark:text-white dark:placeholder:text-[#0c8ce9]"
                          />
                        </td>
                        <td className="py-1 pr-2 align-top text-right tabular-nums text-[#262a34] dark:text-white">
                          {subtotal > 0 ? calcFormatAmount(subtotal) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={4} className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={calcAddRow}
                        disabled={calcRows.length >= CALC_MAX_ROWS}
                        className="flex items-center gap-1 text-[12px] font-semibold text-[#335ef7] disabled:opacity-40 dark:text-[#0c8ce9]"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#335ef7]/15 text-[12px] leading-none dark:bg-[#0c8ce9]/20">+</span>
                        <T uk="Рядок" en="Row" ru="Строка" de="Zeile" es="Fila" fr="Ligne" pl="Wiersz" ptBR="Linha" zh="行" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-[#c7d3f7] px-2 py-1.5 text-[13px] font-semibold text-[#262a34] dark:border-[#28345c] dark:text-white">
                <T uk="Разом" en="Total" ru="Итого" de="Summe" es="Total" fr="Total" pl="Razem" ptBR="Total" zh="小计" />
                <span className="tabular-nums">
                  {calcFormatAmount(calcTotal)} {calcCurrency.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                value={calcNote}
                onChange={(e) => setCalcNote(e.target.value.slice(0, 200))}
                placeholder="Note"
                className="min-w-0 flex-1 rounded-full bg-[#f2f2f7] px-3 py-2 text-[13px] text-[#262a34] outline-none placeholder:text-neutral-400 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-neutral-500"
              />
              <div ref={calcCurrencyPickerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCalcCurrencyPickerOpen((v) => !v)}
                  aria-label="Currency"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#335ef7] bg-white text-[13px] font-bold text-[#335ef7] transition hover:bg-[#335ef7]/10 dark:border-[#0c8ce9] dark:bg-transparent dark:text-[#0c8ce9]"
                >
                  $
                </button>
                {calcCurrencyPickerOpen && (
                  <CurrencyPickerModal lang={lang} selected={calcCurrency} onSelect={setCalcCurrency} onClose={() => setCalcCurrencyPickerOpen(false)} />
                )}
              </div>
            </div>
            {calcError && (
              <p className="mt-1 px-1 text-[12px] text-red-500">
                <T
                  uk="Не вдалося надіслати. Спробуйте ще раз."
                  en="Couldn't send. Try again."
                  ru="Не удалось отправить. Попробуйте ещё раз."
                  de="Senden fehlgeschlagen. Erneut versuchen."
                  es="No se pudo enviar. Inténtalo de nuevo."
                  fr="Échec de l'envoi. Réessayez."
                  pl="Nie udało się wysłać. Spróbuj ponownie."
                  ptBR="Falha ao enviar. Tente novamente."
                  zh="发送失败，请重试。"
                />
              </p>
            )}
            <div className="mt-2 flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={calcClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#262a34] transition hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={calcRemoveLastRow}
                  disabled={calcRows.length <= 1}
                  aria-label="Remove row"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#262a34] transition hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={sendCalculation}
                disabled={calcSending || !calcHasContent}
                aria-label="Send"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* 2026-09-02 (Aleksandr, live screenshot: the paperclip button
            itself was showing a spinner -- "Тут не должно показывать
            загрузку) ее надо показывать на медиа, которое отправляется"
            -- staged thumbnail instead, same overlay-spinner/remove-x
            convention app/chats/[chatId]/page.tsx's own attachment strip
            already uses, just a single item instead of an array. */}
        {attachment && (
          <div className="flex justify-start">
            <div className="group relative">
              {attachment.kind === "image" && attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a
                // local blob: URL preview, not a next/image remote src.
                <img src={attachment.previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-40 items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-2.5 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
                  {fileKindFromName(attachment.fileName, attachment.mimetype) === "pdf" && attachment.previewUrl ? (
                    <PdfPageThumbnail
                      src={attachment.previewUrl}
                      className="h-8 w-8 shrink-0 rounded-[8px] object-cover object-top"
                      fallback={<ChatFileTypeIcon kind="pdf" className="h-8 w-8" />}
                    />
                  ) : (
                    <ChatFileTypeIcon kind={fileKindFromName(attachment.fileName, attachment.mimetype)} className="h-8 w-8" />
                  )}
                  {/* 2026-09-04 (Aleksandr: "Показывай вес файла тут") --
                      same pairing as app/chats/[chatId]/page.tsx's own
                      compose-bar staging preview just picked up. */}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[12px] text-[#262a34] dark:text-white">{attachment.fileName}</span>
                    <span className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">{formatBytes(attachment.bytes)}</span>
                  </span>
                </div>
              )}
              {attachment.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                  <ChatAttachmentSpinner className="h-5 w-5 text-white" />
                </div>
              )}
              {attachment.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/70">
                  <span className="text-[12px] font-medium text-white">Failed</span>
                </div>
              )}
              <button
                type="button"
                onClick={removeAttachment}
                aria-label="Remove attachment"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* Fix Tracker (2026-09-08, Aleksandr: "Reply тоже сделай
            update по UI, чтобы был такой же как в основных, а именно
            компоузер анимацией выезжает наверх") -- app/chats/
            [chatId]/page.tsx's own WhatsApp-style "grows the textarea
            pill" variant (displayedReplyTarget/replyRowGrown) is now
            this window's default too, rendered INSIDE the compose pill
            further down. This floating non-inline card is kept only
            for the one state that isn't that pill -- an active voice
            recording -- exact same split page.tsx's own copy of this
            card uses. Edit mode has no equivalent here: editingMessage
            and an active recording are mutually exclusive already, so
            EditComposeBar only needs the one (inline, in-pill) copy,
            moved there together with editFailed. */}
        {displayedReplyTarget &&
          recorder.state !== "idle" &&
          (() => {
            const quote = resolveReplyPreview(displayedReplyTarget);
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
        <div className="flex items-end gap-2">
          {/* Fix Tracker (2026-09-08, voice messages) -- same three-way
              swap app/chats/[chatId]/page.tsx's own compose row does:
              a denied mic permission replaces the whole row with a
              dismissible notice; an active recording replaces just the
              attach+textarea pair with VoiceRecordingBar (the mic
              button itself, further down, stays mounted the whole time
              -- see its own comment on why unmounting it mid-gesture
              broke pointer capture there, same risk here). */}
          {recorder.state === "denied" ? (
            <VoiceMicDeniedNotice lang={lang} onDismiss={recorder.dismissDenied} />
          ) : recorder.state !== "idle" ? (
            {/* Fix Tracker (2026-09-08, Aleksandr: "Размер кнопки
                микрофона должен быть такой же по высоте как инпут
                филд") -- mini-chat's own compose pill is 36px
                (min-h-[36px]), not the main chat page's 44px, so both
                voice-message.tsx components need their own `compact`
                variant here to match it. */}
            <VoiceRecordingBar recorder={recorder} lang={lang} compact />
          ) : (
            <>
          {/* 2026-09-02 (Aleksandr: "надо добавить скрепку слева, а кота
              поставить справа как в обычных чатах" + "надо тут тоже
              анимации при наведении на иконки") -- paperclip leads the
              row (matching app/chats/[chatId]/page.tsx's own compose
              order) and wiggles on hover via the same `group` +
              animate-paperclip-wiggle pair that page's own
              ChatPaperclipButton already uses (app/globals.css).
              2026-09-03 (attach-menu port) -- now opens the same
              Photo/File/Meetings/Calculation/Contact popover that page
              has instead of a native file picker directly. */}
          <div ref={attachMenuRef} className="relative shrink-0" onMouseEnter={handleAttachMouseEnter} onMouseLeave={handleAttachMouseLeave}>
            <button
              type="button"
              // lib/use-hover-panel.ts, 2026-09-04 entry: same "•••"-menu
              // tap bug -- skip the toggle when this click is the same
              // tap that just hover-opened the menu, or it flips straight
              // back closed.
              onClick={() => {
                if (isAttachRecentHoverOpen()) return;
                setAttachMenuOpen((v) => !v);
              }}
              disabled={sending || !!editingMessage}
              aria-label="Attach"
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 disabled:opacity-40 dark:text-[#8d8d93] dark:hover:bg-white/10 dark:hover:text-neutral-200"
            >
              <ChatPaperclipGlyph className="h-4 w-4 animate-paperclip-wiggle" />
            </button>
            {attachMenuOpen && (
              <div
                ref={attachPanelRef}
                onMouseEnter={handleAttachMouseEnter}
                onMouseLeave={handleAttachMouseLeave}
                // 2026-09-04 (Aleksandr, mobile screenshots of this
                // same popover pattern on the main chat page cut off at
                // the bottom: "Попапы обрезались на мобе") -- same
                // `bottom-full`-anchored-with-no-height-cap issue could
                // just as easily hit this floating window's own copy,
                // so it gets the same guard even without its own
                // separate mobile report: a max-height + internal
                // scroll instead of letting content taller than the
                // available room above the paperclip go unreachable.
                className={`animate-popover-up absolute bottom-full left-0 z-10 mb-2 max-h-[min(60vh,420px)] overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-xl transition-[width] duration-200 dark:bg-neutral-900 ${
                  attachDailyUploadsOpen || meetingsMenuOpen ? "w-72 p-4" : "w-40 py-1.5"
                }`}
              >
                {meetingsMenuOpen ? (
                  // 2026-09-04 (Aleksandr: "шо то не работает кнопка
                  // 'зустрічі'") -- same inline-swap convention as
                  // attachDailyUploadsOpen's own DailyUploadsModal branch
                  // right below. onOpenSchedule intentionally omitted --
                  // see this file's own header comment and meetings-menu-
                  // modal.tsx's own onOpenSchedule comment for why.
                  <MeetingsMenuModal
                    lang={lang}
                    onBack={() => setMeetingsMenuOpen(false)}
                    onSendQuickInvite={(text) => {
                      setMeetingsMenuOpen(false);
                      setAttachMenuOpen(false);
                      void handleSend({ overrideText: text });
                    }}
                  />
                ) : attachDailyUploadsOpen ? (
                  // 2026-09-04 -- see this file's own attachDailyUploadsOpen
                  // comment above for why this is inline instead of a
                  // second backdrop modal.
                  <DailyUploadsModal
                    lang={lang}
                    variant="inline"
                    onBack={() => setAttachDailyUploadsOpen(false)}
                    onClose={() => {
                      setAttachDailyUploadsOpen(false);
                      setAttachMenuOpen(false);
                    }}
                  />
                ) : (
                  <>
                <button
                  type="button"
                  onClick={() => setAttachDailyUploadsOpen(true)}
                  aria-label="Daily uploads"
                  className="group absolute right-2 top-2 rounded-full p-1 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                >
                  <ChatStorageIcon className="animate-storage-icon h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    photoInputRef.current?.click();
                  }}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  <ChatPhotoAttachIcon className="animate-photo-attach h-4 w-4 text-[#335ef7] dark:text-[#0c8ce9]" />
                  <T uk="Фото" en="Photo" ru="Фото" de="Foto" es="Foto" fr="Photo" pl="Zdjęcie" ptBR="Foto" zh="照片" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  <ChatFileAttachIcon className="animate-file-attach h-4 w-4 text-[#335ef7] dark:text-[#0c8ce9]" />
                  <T uk="Файл" en="File" ru="Файл" de="Datei" es="Archivo" fr="Fichier" pl="Plik" ptBR="Arquivo" zh="文件" />
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingsMenuOpen(true)}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  <ChatMeetingAttachIcon className="animate-meeting-attach h-4 w-4 text-[#335ef7] dark:text-[#0c8ce9]" />
                  <T uk="Зустрічі" en="Meetings" ru="Встречи" de="Treffen" es="Reuniones" fr="Rendez-vous" pl="Spotkania" ptBR="Reuniões" zh="会议" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setCalcOpen(true);
                    window.requestAnimationFrame(() => calcFirstRowInputRef.current?.focus());
                  }}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  <ChatCalculatorAttachIcon className="animate-calc-attach h-4 w-4 text-[#335ef7] dark:text-[#0c8ce9]" />
                  <T uk="Розрахунок" en="Calculation" ru="Калькуляция" de="Berechnung" es="Cálculo" fr="Calcul" pl="Kalkulacja" ptBR="Cálculo" zh="计算" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setContactsPickerOpen(true);
                  }}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  <ChatContactAttachIcon className="animate-contact-attach h-4 w-4 text-[#335ef7] dark:text-[#0c8ce9]" />
                  <T uk="Контакт" en="Contact" ru="Контакт" de="Kontakt" es="Contacto" fr="Contact" pl="Kontakt" ptBR="Contato" zh="联系人" />
                </button>
                  </>
                )}
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleAttach(file, "image");
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              // 2026-09-05 (Aleksandr, screen recording: "При надатии на
              // файл все равно сначала вызывается окно apple") -- same
              // bug app/chats/[chatId]/page.tsx's own fileInputRef had
              // (see that input's own comment, commit 89c1e3b): with no
              // `accept` attribute at all, iOS Safari treats the input as
              // ambiguous (could be an image/video too) and shows its own
              // "Photo Library / Take Video / Choose Files" sheet instead
              // of going straight to Files. This mini floating chat
              // widget has its own separate copy of the attach inputs
              // (not shared with the main chat page's), so it never
              // picked up that fix. Same accept list, same reasoning:
              // covers every file-type-icon.tsx-recognized kind while
              // excluding image/* and video/* -- the two categories that
              // trigger the sheet.
              accept="application/*,text/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleAttach(file, "file");
              }}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col rounded-[18px] bg-[#f2f2f7] dark:bg-[#1c1c1e]">
            {displayedEditingMessage && (
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  editRowGrown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <EditComposeBar
                    inline
                    previewText={extractMessageText(displayedEditingMessage)}
                    onCancel={() => {
                      setEditingMessage(null);
                      setDraft("");
                      setEditFailed(false);
                    }}
                  />
                  {editFailed && (
                    <p className="border-b border-neutral-200 px-3.5 py-1.5 text-[12px] text-red-500 dark:border-[#2b2b2b] dark:text-red-400">
                      <T uk="Не вдалося зберегти зміни" en="Couldn't save changes" ru="Не удалось сохранить изменения" de="Änderungen konnten nicht gespeichert werden" es="No se pudieron guardar los cambios" fr="Impossible d'enregistrer les modifications" pl="Nie udało się zapisać zmian" ptBR="Não foi possível salvar as alterações" zh="无法保存更改" />
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Fix Tracker (2026-09-08, Aleksandr: "Reply тоже сделай
                update по UI, чтобы был такой же как в основных, а
                именно компоузер анимацией выезжает наверх") -- this
                grows the SAME pill the textarea sits in, exact same
                grid-template-rows 1fr/0fr trick app/chats/[chatId]/
                page.tsx's own inline ReplyComposeBar uses, instead of
                the old separate floating card (that card is now kept
                ONLY for the active-voice-recording state right above,
                where this pill isn't mounted at all). */}
            {displayedReplyTarget &&
              recorder.state === "idle" &&
              (() => {
                const quote = resolveReplyPreview(displayedReplyTarget);
                if (!quote) return null;
                return (
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      replyRowGrown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ReplyComposeBar
                        inline
                        authorLabel={quote.authorLabel}
                        previewText={quote.node}
                        thumbnail={quote.thumbnail}
                        onRemove={() => setReplyTarget(null)}
                      />
                    </div>
                  </div>
                );
              })()}
            <div className="flex min-h-[36px] items-center gap-1.5 px-3 py-1.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message"
                className="max-h-24 min-h-[20px] flex-1 resize-none bg-transparent text-[15.5px] leading-5 text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white dark:placeholder:text-[#8d8d93]"
              />
              <button
                type="button"
                ref={mediaPanelRef}
                onClick={() => {
                  setMediaPanelAnchorRect(mediaPanelRef.current?.getBoundingClientRect() ?? null);
                  setMediaPanelOpen((v) => !v);
                }}
                disabled={sending || !!editingMessage}
                aria-label="Stickers, GIFs and emoji"
                className="group flex shrink-0 items-center disabled:opacity-40"
              >
                <ChatCatFieldIcon className="h-4 w-4 animate-chat-wiggle text-neutral-400 dark:text-[#adafbb]" />
              </button>
            </div>
          </div>
            </>
          )}
          {recorder.state === "idle" && hasSendableContent ? (
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || attachment?.status === "uploading" || !hasSendableContent}
            aria-label="Send"
            // Fix Tracker (2026-09-07, order 97: "кнопка 'отправить'
            // должна появляться после ввода первого символа. До этого
            // инпут филд должен быть шире... Потом она должна
            // появляться через анимацию и быть такой же высоты как и
            // инпут филд") -- this used to always render at full size,
            // just `disabled`+dimmed to 40% opacity when empty, so the
            // input pill next to it never actually got any wider.
            // Collapsing width+opacity (with a matching negative
            // margin to close this row's own gap-2) instead lets the
            // pill's `flex-1` claim that space for real, and the
            // reverse transition on the way back in reads as the
            // button animating into existence rather than just fading.
            //
            // 2026-09-07 follow-up (orders 115 + 118, live-measured:
            // this button rendered 40.5px tall/wide against the pill's
            // real 36px) -- `h-9`/`w-9` are REM-based (2.25rem), and
            // this app's root font-size is 18px (not the Tailwind-
            // default 16px), so `h-9` actually computes to 40.5px here
            // while the pill next to it uses a literal `min-h-[36px]`
            // px value. The two "36px"s only matched on paper; the
            // button rendering 4.5px taller than the pill (with this
            // row's own `items-end` alignment) is exactly the
            // misalignment Aleksandr's order-115 screenshot shows as
            // the send button having "уехала" (drifted) during edit --
            // it was never actually edit-specific, just easiest to
            // notice there once the pill briefly grows. Switching both
            // to the same literal px unit fixes it in every state.
            className={`group flex h-[36px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#335ef7] text-white transition-all duration-200 ease-out hover:brightness-110 active:scale-95 disabled:hover:brightness-100 dark:bg-[#0c8ce9] ${
              hasSendableContent ? "w-[36px] ml-0 opacity-100" : "w-0 -ml-2 opacity-0"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-send-arrow shrink-0">
              <path d="M4 12h15M13 5l7 7-7 7" />
            </svg>
          </button>
          ) : recorder.state !== "denied" ? (
            <VoiceRecordButton recorder={recorder} disabled={sending} lang={lang} compact />
          ) : null}
        </div>
          </>
        )}
      </div>

      {dailyUploadsOpen && <DailyUploadsModal lang={lang} onClose={() => setDailyUploadsOpen(false)} />}
      {contactsPickerOpen && (
        <ContactsPickerModal
          lang={lang}
          pickedUserIds={pickedContactIds}
          onToggle={toggleContact}
          onClose={() => {
            setContactsPickerOpen(false);
            setPickedContacts([]);
            setPickedContactIds(new Set());
          }}
          onSend={() => void sendPickedContacts()}
          sending={contactsSending}
        />
      )}
      {actionsMenu && (
        <MessageActionsMenu
          anchorRect={actionsMenu.anchorRect}
          mine={actionsMenu.mine}
          lang={lang}
          onClose={() => setActionsMenu(null)}
          onReply={() => {
            setEditingMessage(null);
            setReplyTarget(actionsMenu.message);
            window.requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          onReact={(emoticon) => void handleToggleReaction(actionsMenu.message, emoticon)}
          myReactionEmoticon={
            myUserId
              ? ((actionsMenu.message.reactions ?? []).find(
                  (r) => r.peer?.object === "peer-user" && r.peer.user === myUserId,
                )?.reaction.emoticon ?? null)
              : null
          }
          onEdit={
            extractMessageText(actionsMenu.message)
              ? () => {
                  setEditingMessage(actionsMenu.message);
                  setReplyTarget(null);
                  setDraft(extractMessageText(actionsMenu.message));
                  setEditFailed(false);
                  window.requestAnimationFrame(() => textareaRef.current?.focus());
                }
              : undefined
          }
          onForward={
            extractMessageText(actionsMenu.message) ||
            messageDocumentMedia(actionsMenu.message).length > 0 ||
            messageContactMedia(actionsMenu.message).length > 0
              ? () => {
                  setForwardFailed(false);
                  setForwardPickedChatIds(new Set());
                  setForwardRowStatus({});
                  setForwardSource([actionsMenu.message]);
                }
              : undefined
          }
          onCopy={
            extractMessageText(actionsMenu.message)
              ? () => {
                  const copyText = extractMessageText(actionsMenu.message);
                  navigator.clipboard?.writeText(copyText).catch(() => {});
                  setCopyToast({ trigger: Date.now(), anchorRect: actionsMenu.anchorRect });
                }
              : undefined
          }
          onDelete={() => setDeleteConfirm({ messageId: Number(actionsMenu.message._id) })}
          onSelect={() => enterSelectionMode(Number(actionsMenu.message._id))}
          onRemind={() => {
            setRemindFailed(false);
            setRemindTarget({ messageId: Number(actionsMenu.message._id) });
          }}
          onPin={() => void handleTogglePin(actionsMenu.message)}
          pinState={isMessagePinned(actionsMenu.message) ? "unpin" : "pin"}
        />
      )}
      {deleteConfirm && (
        <DeleteMessageConfirmDialog
          deleting={deletingMessage}
          failed={deleteMessageFailed}
          // Fix Tracker (2026-09-07, order 116: "надо убрать возможность
          // видаляти у другого користувача, оставить только у себя")
          // -- this used to pass deleteForEveryoneLabel (+ a matching
          // "who to delete for" description), which swaps in the
          // three-button "delete for me and X / delete only for me /
          // cancel" variant. Dropping both falls back to the
          // component's own default two-button copy+behavior
          // ("Delete?" / Cancel+Delete, onConfirm(false) == for-me-
          // only) -- exactly the one remaining option Aleksandr asked
          // for, no new prop needed.
          anchorRect={panelRef.current?.getBoundingClientRect() ?? null}
          onCancel={() => {
            if (deletingMessage) return;
            setDeleteConfirm(null);
            setDeleteMessageFailed(false);
          }}
          onConfirm={(revoke) => void handleConfirmDeleteMessage(revoke)}
        />
      )}
      {remindTarget && (
        <RemindModal
          peerDisplayName={target.title}
          submitting={remindSubmitting}
          failed={remindFailed}
          // Fix Tracker (2026-09-07, order 113): recenter over this
          // mini-chat panel instead of the full desktop viewport.
          anchorRect={panelRef.current?.getBoundingClientRect() ?? null}
          onCancel={() => {
            if (remindSubmitting) return;
            setRemindTarget(null);
            setRemindFailed(false);
          }}
          onConfirm={(scheduleAt, local) => void handleConfirmRemind(scheduleAt, local)}
        />
      )}
      {forwardSource && (
        <ForwardPickerModal
          lang={lang}
          // Fix Tracker (2026-09-07, order 117): same recenter-over-
          // the-mini-chat-panel fix as RemindModal/
          // DeleteMessageConfirmDialog just above.
          anchorRect={panelRef.current?.getBoundingClientRect() ?? null}
          onClose={() => {
            if (forwardSendingAll) return;
            setForwardSource(null);
            setForwardFailed(false);
            setForwardPickedChatIds(new Set());
            setForwardRowStatus({});
          }}
          onPickSingle={(targetChatId) => void handleForwardPickSingle(targetChatId)}
          pickedChatIds={forwardPickedChatIds}
          onToggle={(chatId) =>
            setForwardPickedChatIds((prev) => {
              const next = new Set(prev);
              if (next.has(chatId)) next.delete(chatId);
              else next.add(chatId);
              return next;
            })
          }
          onSend={() => void handleForwardSend()}
          sending={forwardSendingAll}
          rowStatus={forwardRowStatus}
          failed={forwardFailed}
        />
      )}
      {mediaPanelOpen && mediaPanelAnchorRect && (
        <MediaPickerPanel
          anchorRect={mediaPanelAnchorRect}
          onClose={() => setMediaPanelOpen(false)}
          onPickEmoji={(emoji) => {
            setDraft((d) => d + emoji);
            textareaRef.current?.focus();
          }}
          onSendMedia={(doc) => {
            setMediaPanelOpen(false);
            void sendMediaDocument(doc);
          }}
        />
      )}
      <CopyToast state={copyToast} lang={lang} />
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
    </div>,
    document.body,
  );
}
