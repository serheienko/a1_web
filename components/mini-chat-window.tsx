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
import { useEffect, useRef, useState, type RefObject } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { BLUR_DATA_URL, MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";
import { profileHref } from "@/lib/profile-href";
import { formatBytes } from "@/lib/format";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { buildMediaProxyUrl } from "@/lib/a1/media-proxy";
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
  mediaDocumentFileName,
  mediaDocumentBytes,
  type ChatMessage,
  type MessageMediaDocument,
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
import { PdfPageThumbnail } from "@/components/chat/pdf-thumbnail";
import { ChatPhotoGrid } from "@/components/chat/photo-grid";
import { MessageActionsMenu } from "@/components/chat/message-actions-menu";
import { CopyToast } from "@/components/chat/copy-toast";
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
  // 2026-09-05 (Copy-action toast, see app/chats/[chatId]/page.tsx's
  // own copy of this same state for the full writeup) -- bump-only
  // counter so copying twice in a row restarts CopyToast's 3s timer.
  const [copyToastTrigger, setCopyToastTrigger] = useState(0);
  // 2026-09-04 (Aleksandr: "При выхове калькуляции сделай дефолтно
  // моргающий курсор возле 1.") -- same fix as app/chats/[chatId]/
  // page.tsx's own copy of this calculator panel: focus the first
  // row's Description field the instant the panel opens instead of
  // leaving nothing focused.
  const calcFirstRowInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<MiniAttachment | null>(null);

  // 2026-09-03 (Aleksandr, attach-menu port) -- attach popover open
  // state + its own outside-hover close, same useHoverPanel hook that
  // page's own attach menu uses (lib/use-hover-panel.ts, already a
  // shared lib, not a page.tsx internal).
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachPanelRef = useRef<HTMLDivElement>(null);
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

  async function handleSend(extra?: { contacts?: PickedContact[]; overrideText?: string }) {
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <ChatBackArrow className="h-3 w-[7px]" />
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
          <Link href={targetProfileHref} onClick={onNavigate} aria-label={target.title || undefined} className="ml-auto shrink-0">
            {avatarImg}
          </Link>
        ) : (
          <div className="ml-auto shrink-0">{avatarImg}</div>
        )}
      </div>

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
          const dateMs = messageDateMs(msg);
          const footer = (dateMs > 0 || mine) && (
            <div
              className={`mt-0.5 flex items-center justify-end gap-1 text-[12px] ${
                mine ? "text-white/80" : "text-[#989aa6] dark:text-[#8d8d93]"
              }`}
            >
              {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
              {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
            </div>
          );
          return (
            <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActionsMenu({ message: msg, anchorRect: e.currentTarget.getBoundingClientRect(), mine });
                }}
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[15.5px] leading-snug ${
                  mine
                    ? "rounded-br-sm bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
                    : "rounded-bl-sm bg-[#f2f2f7] text-[#262a34] dark:bg-neutral-800 dark:text-white"
                }`}
              >
                {docMedia.length > 0 && (
                  <div className={`flex flex-col gap-1.5 ${text ? "mb-1" : ""}`}>
                    {docMedia.map((doc: MessageMediaDocument) =>
                      imageGroupSkipIds.has(doc._id) ? null : imageGroupStartId.has(doc._id) ? (
                        <ChatPhotoGrid
                          key={doc._id}
                          docs={imageGroupStartId.get(doc._id)!.map((d) => ({ id: d._id, src: getStableMediaProxyUrl(d) }))}
                          onOpen={() => {}}
                        />
                      ) : isImageMediaDocument(doc) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- proxied
                        // through /api/media, not a next/image-configured remote host.
                        <img
                          key={doc._id}
                          src={getStableMediaProxyUrl(doc)}
                          alt=""
                          className="max-h-48 w-full rounded-xl object-cover"
                          style={MEDIA_BLUR_STYLE}
                        />
                      ) : (
                        <a
                          key={doc._id}
                          href={buildMediaProxyUrl(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:opacity-80 ${
                            mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                          }`}
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
                              className="h-9 w-9 shrink-0 rounded-[10px] object-cover object-top"
                              fallback={<ChatFileTypeIcon kind="pdf" className="h-9 w-9" />}
                            />
                          ) : (
                            <ChatFileTypeIcon kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} className="h-9 w-9" />
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13px] font-medium">
                              {mediaDocumentFileName(doc) || (
                                // 2026-09-04: see DocumentFallbackLabel's own
                                // header comment (components/chat/file-type-icon.tsx)
                                <DocumentFallbackLabel kind={fileKindFromName(mediaDocumentFileName(doc), doc.mimetype)} />
                              )}
                            </span>
                            {mediaDocumentBytes(doc) !== null && (
                              <span className={`text-[11px] ${mine ? "opacity-80" : "opacity-60"}`}>{formatBytes(mediaDocumentBytes(doc) as number)}</span>
                            )}
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
            </div>
          );
        })}
      </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
        {calcOpen ? (
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
        <div className="flex items-end gap-2">
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
              disabled={sending}
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
          <div className="flex min-h-[36px] flex-1 items-center gap-1.5 rounded-full bg-[#f2f2f7] px-3 py-1.5 dark:bg-[#1c1c1e]">
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
              // 2026-09-03 (Aleksandr, live test: "В пустой инпут добавь
              // слово message серым текстом, так же как в главных
              // чатах") -- this was an empty string (no visible
              // placeholder at all) even though the gray placeholder:*
              // classes below were already there and unused; app/chats/
              // [chatId]/page.tsx's own textarea already shows "Message"
              // the same way.
              placeholder="Message"
              // 2026-09-02 (Aleksandr, live screenshot: a Cyrillic "у"'s
              // descender getting clipped by the pill's own bottom edge)
              // -- leading-[18px] on 13.5px text left no room below the
              // baseline for a descender; leading-5 (20px, same value
              // app/chats/[chatId]/page.tsx's own textarea already uses)
              // fixes it. min-h matched to the same 20px so the single-
              // line pill height doesn't visibly jump.
              className="max-h-24 min-h-[20px] flex-1 resize-none bg-transparent text-[15.5px] leading-5 text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white dark:placeholder:text-[#8d8d93]"
            />
            {/* group: own small wrapper (not the whole pill, which would
                fire on every keystroke) -- same reasoning app/chats/
                [chatId]/page.tsx's own cat-icon wrapper comment gives.
                This particular glyph has no chat-cat-pupil sub-paths for
                the eye-dart treatment that page's icon supports, so it
                reuses ChatsFab's own generic animate-chat-wiggle
                (rotate+scale) instead -- still a real hover reaction,
                just a different motion. */}
            <div className="group shrink-0">
              <ChatCatFieldIcon className="h-4 w-4 animate-chat-wiggle text-neutral-400 dark:text-[#adafbb]" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || attachment?.status === "uploading" || (!draft.trim() && attachment?.status !== "ready")}
            aria-label="Send"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-send-arrow">
              <path d="M4 12h15M13 5l7 7-7 7" />
            </svg>
          </button>
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
            window.requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          onCopy={
            extractMessageText(actionsMenu.message)
              ? () => {
                  const copyText = extractMessageText(actionsMenu.message);
                  navigator.clipboard?.writeText(copyText).catch(() => {});
                  setCopyToastTrigger((n) => n + 1);
                }
              : undefined
          }
        />
      )}
      <CopyToast trigger={copyToastTrigger} lang={lang} />
    </div>,
    document.body,
  );
}
