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

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { LottiePlayer } from "@/components/lottie-player";
import {
  extractMessageText,
  isImageMediaDocument,
  mediaDocumentFileName,
  messageDateMs,
  messageDocumentMedia,
  messageTickState,
  type ChatMessage,
} from "@/lib/a1/chat-schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";
import {
  ChatAttachmentSpinner,
  ChatBackArrow,
  ChatCatFieldIcon,
  ChatFileAttachIcon,
  ChatMicButton,
  ChatPaperclipButton,
  ChatPhotoAttachIcon,
  ChatTypingDots,
  MessageTicks,
} from "@/components/chat/icons";

type LoadState = "loading" | "signed-out" | "error" | "ready";

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
  kind: "image" | "file";
  fileName: string;
  mimetype: string;
  previewUrl?: string;
  status: "uploading" | "ready" | "error";
  fileReference?: string;
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
const MAX_ATTACHMENT_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;

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
const GREETING_TEXT: Record<Locale, string> = {
  uk: "👋 Привіт!",
  en: "👋 Hi!",
  ru: "👋 Привет!",
  de: "👋 Hallo!",
  es: "👋 ¡Hola!",
  fr: "👋 Salut !",
  pl: "👋 Cześć!",
  ptBR: "👋 Oi!",
  zh: "👋 你好！",
};

export default function ChatWindowPage() {
  const lang = useActiveLocale();
  const params = useParams<{ chatId: string }>();
  const searchParams = useSearchParams();
  const chatId = params.chatId;
  const headerTitle = searchParams.get("title") ?? "";
  const headerAvatar = searchParams.get("avatar") ?? pickDefaultCatAvatar(chatId);
  // 2026-09-02 (Aleksandr: "Подгрузка всех аватаров на сайте должна
  // быть через blur эффект, как мы делали в карточках постов в феде") --
  // rides along the same query string as ?avatar= (see app/chats/
  // page.tsx's own Link href comment), computed server-side there via
  // lib/avatar-blur.ts's generateAvatarBlurDataUrl. Absent for a cat-
  // mascot default avatar (never computed for those -- see that
  // route's own comment) or on direct navigation with no query string
  // at all, both of which just fall back to the shared generic shimmer.
  const headerAvatarBlur = searchParams.get("avatarBlur") || null;
  // 2026-09-02 (Aleksandr: "при нажатии на аватар и на имя должен
  // открываться профіль цієї людини") -- ?username= travels alongside
  // ?title=/?avatar= from wherever the chat was opened (components/
  // profile-action-row.tsx, app/contacts/page.tsx), same convention.
  // Null (a chat opened some other way, or a group chat down the line)
  // just means the header name/avatar render as plain, non-clickable
  // elements below instead of a broken link to nowhere.
  const headerUsername = searchParams.get("username");
  const headerProfileHref = headerUsername ? profileHref(headerUsername) : null;

  const [state, setState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const pendingPopoverRef = useRef<HTMLDivElement>(null);
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
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setPendingMessages((prev) =>
        prev.filter(
          (p) =>
            !fetched.some(
              (m) =>
                resolvedMyUserId !== null &&
                m.fromId === resolvedMyUserId &&
                extractMessageText(m) === extractMessageText(p) &&
                messageDateMs(m) >= messageDateMs(p) - 5000,
            ),
        ),
      );
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
  async function attemptSend(localId: string, text: string, media?: { fileReference: string }[]) {
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Attachment feature: `text` may now be empty (attachment-only
        // send) and `media` may be present -- app/api/chats/send/
        // route.ts's own SendInput requires at least one of the two, and
        // only forwards whichever is actually present to messages.send.
        body: JSON.stringify({
          chatId,
          text: text || undefined,
          media: media && media.length > 0 ? media : undefined,
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
      const media = p.pendingAttachments
        ?.filter((a) => a.status === "ready" && a.fileReference)
        .map((a) => ({ fileReference: a.fileReference as string }));
      await attemptSend(p.localId, extractMessageText(p), media);
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

  // Runs the same create -> upload -> confirm flow components/post-
  // editor.tsx's handleFileSelected already uses for post photos --
  // confirmed reusable as-is for chat attachments this session (Upload/
  // Media is one unified service shared across every backend service,
  // not duplicated per service -- see app/api/upload/create/route.ts).
  // `kind` only affects client-side compression/preview; the two upload
  // routes themselves don't care which button triggered the pick.
  async function handleAttachFile(file: File, kind: "image" | "file") {
    if (attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) return;
    if (kind === "file" && file.size > MAX_ATTACHMENT_FILE_BYTES) return;
    const localId = `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toUpload = kind === "image" ? await compressAttachmentImage(file) : file;
    const previewUrl = kind === "image" ? URL.createObjectURL(toUpload) : undefined;
    setAttachments((prev) => [
      ...prev,
      {
        localId,
        kind,
        fileName: file.name,
        mimetype: toUpload.type || "application/octet-stream",
        previewUrl,
        status: "uploading",
      },
    ]);
    try {
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: toUpload.type || "application/octet-stream", bytes: toUpload.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, status: "error" as const } : a)));
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", toUpload);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, status: "error" as const } : a)));
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
        setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, status: "error" as const } : a)));
        return;
      }
      setAttachments((prev) =>
        prev.map((a) => (a.localId === localId ? { ...a, status: "ready" as const, fileReference } : a)),
      );
    } catch {
      setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, status: "error" as const } : a)));
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.localId !== localId);
    });
  }

  function onPickAttachment(kind: "image" | "file") {
    setAttachMenuOpen(false);
    (kind === "image" ? photoInputRef : fileInputRef).current?.click();
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

  async function send(overrideText?: string) {
    const text = (overrideText ?? draft).trim();
    // Attachment feature: only ready (fully uploaded+confirmed)
    // attachments are ever sent -- a message can go out with zero typed
    // text as long as at least one is ready (MessageInput.message is
    // optional, see app/api/chats/send/route.ts). uploadingCount guards
    // the Enter-key path the same way the send button's own `disabled`
    // does below (see that JSX) -- send() is never called mid-upload.
    const readyAttachments = attachments.filter((a) => a.status === "ready" && a.fileReference);
    const uploadingCount = attachments.filter((a) => a.status === "uploading").length;
    if ((!text && readyAttachments.length === 0) || uploadingCount > 0 || sending) return;
    setSending(true);
    if (!overrideText) {
      setDraft("");
      setAttachments([]);
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
      pendingAttachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    };
    setPendingMessages((prev) => [...prev, optimistic]);
    await attemptSend(
      localId,
      text,
      readyAttachments.map((a) => ({ fileReference: a.fileReference as string })),
    );
    setSending(false);
  }

  // Rendered list: real messages + any not-yet-reconciled optimistic
  // ones, re-sorted by date so a pending bubble (timestamped "now" the
  // moment it was created) always lands at the end where it belongs,
  // never briefly out of order against whatever load() last fetched.
  const displayMessages: (ChatMessage | PendingMessage)[] = [...messages, ...pendingMessages].sort(
    (a, b) => messageDateMs(a) - messageDateMs(b),
  );

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
          <Link
            href="/chats"
            aria-label="Back"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
          >
            <ChatBackArrow />
          </Link>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-3">
            {headerProfileHref ? (
              <Link
                href={headerProfileHref}
                className="pointer-events-auto max-w-[55%] truncate rounded-full bg-black/5 px-4 py-1.5 text-center transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
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
              <div className="pointer-events-auto max-w-[55%] truncate rounded-full bg-black/5 px-4 py-1.5 text-center dark:bg-white/10">
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
        <div className="mx-auto w-full max-w-[470px]">
        {state === "loading" && (
          <p className="mt-6 text-center text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
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
          // lottie-player.tsx). Tapping/clicking it sends GREETING_TEXT
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
              onClick={() => send(GREETING_TEXT[lang])}
              disabled={sending}
              aria-label={GREETING_TEXT[lang]}
              className="mt-2 rounded-full transition active:scale-95 disabled:opacity-60"
            >
              <LottiePlayer src="/animations/cat-hi.json" size={140} />
            </button>
          </div>
        )}
        {state === "ready" && displayMessages.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {displayMessages.map((msg, i) => {
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
              const pendingAttachments = pending?.pendingAttachments ?? [];
              const hasMedia = docMedia.length > 0 || pendingAttachments.length > 0;
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
                    <div
                      role={pending ? "button" : undefined}
                      tabIndex={pending ? 0 : undefined}
                      onClick={pending ? () => setOpenPendingId(pending.localId) : undefined}
                      className={`animate-message-in max-w-[78%] rounded-[18px] px-3 py-2 text-[17px] leading-snug ${pending ? "cursor-pointer" : ""} ${
                        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
                      } ${pending?.failed ? "opacity-70" : ""}`}
                    >
                      {pendingAttachments.length > 0 && (
                        <div className="mb-1 flex flex-col gap-1.5">
                          {pendingAttachments.map((a) => (
                            <div key={a.localId} className="relative overflow-hidden rounded-xl">
                              {a.kind === "image" && a.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- a
                                // local blob: URL, never a next/image-eligible remote src.
                                <img src={a.previewUrl} alt="" className="max-h-64 w-full object-cover" />
                              ) : (
                                <div
                                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                                    mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                                  }`}
                                >
                                  <ChatFileAttachIcon className="h-5 w-5 shrink-0" />
                                  <span className="truncate text-[14px]">{a.fileName}</span>
                                </div>
                              )}
                              {a.status === "uploading" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {docMedia.length > 0 && (
                        <div className="mb-1 flex flex-col gap-1.5">
                          {docMedia.map((doc) =>
                            isImageMediaDocument(doc) ? (
                              // eslint-disable-next-line @next/next/no-img-element -- proxied
                              // through /api/media, not a next/image-configured remote host.
                              <img
                                key={doc._id}
                                src={buildMediaProxyUrl(doc)}
                                alt=""
                                className="max-h-64 w-full rounded-xl object-cover"
                              />
                            ) : (
                              <a
                                key={doc._id}
                                href={buildMediaProxyUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:opacity-80 ${
                                  mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                                }`}
                              >
                                <ChatFileAttachIcon className="h-5 w-5 shrink-0" />
                                <span className="truncate text-[14px]">{mediaDocumentFileName(doc) || doc.mimetype}</span>
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      {text && <div className="whitespace-pre-wrap break-words">{text}</div>}
                      {!text && !hasMedia && <div className="whitespace-pre-wrap break-words">…</div>}
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
                        className="animate-popover-up absolute bottom-full right-0 z-10 mb-2 w-52 rounded-2xl bg-white p-3 shadow-xl dark:bg-neutral-900"
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
          {attachments.length > 0 && (
            <div className="mx-auto mb-2 flex w-full max-w-[470px] flex-wrap gap-2">
              {attachments.map((a) => (
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
                    <div className="flex h-16 w-40 items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-2.5 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
                      <ChatFileAttachIcon className="h-5 w-5 shrink-0 text-[#989aa6] dark:text-[#adafbb]" />
                      <span className="truncate text-[12px] text-[#262a34] dark:text-white">{a.fileName}</span>
                    </div>
                  )}
                  {a.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                      <ChatAttachmentSpinner className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {a.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/70">
                      <span className="text-[11px] font-medium text-white">
                        <T uk="Помилка" en="Failed" ru="Ошибка" de="Fehler" es="Error" fr="Erreur" pl="Błąd" ptBR="Erro" zh="失败" />
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
              ))}
            </div>
          )}
          <div className="mx-auto flex w-full max-w-[470px] items-end gap-2">
            <div ref={attachMenuRef} className="relative">
              <ChatPaperclipButton
                disabled={sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
                onClick={() => setAttachMenuOpen((v) => !v)}
              />
              {/* Attach menu (2026-09-02): mirrors the reference native
                  app's bottom-sheet ("Photos / Files / Meetings /
                  Calculations / Contacts") scoped down to the two rows
                  this pass actually implements -- Meetings/Calculations
                  need their own separate features to attach anything
                  real, and Contacts needs its own contact-picker UI, so
                  both are left for a later pass rather than wired to
                  nothing. Anchored above the button (same "popover sits
                  right at the click, no mouse travel" reasoning as
                  components/fab-auth-prompt.tsx), not portaled -- this
                  page has no backdrop/z-index conflict a plain absolute
                  popover would run into, unlike that FAB's own corner
                  case. */}
              {attachMenuOpen && (
                <div className="animate-popover-up absolute bottom-full left-0 z-10 mb-2 w-44 overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl dark:bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => onPickAttachment("image")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <ChatPhotoAttachIcon className="h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Фото" en="Photo" ru="Фото" de="Foto" es="Foto" fr="Photo" pl="Zdjęcie" ptBR="Foto" zh="照片" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPickAttachment("file")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <ChatFileAttachIcon className="h-5 w-5 text-[#335ef7] dark:text-[#0c8ce9]" />
                    <T uk="Файл" en="File" ru="Файл" de="Datei" es="Archivo" fr="Fichier" pl="Plik" ptBR="Arquivo" zh="文件" />
                  </button>
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
                  if (file) void handleAttachFile(file, "image");
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleAttachFile(file, "file");
                }}
              />
            </div>
            <div className="flex min-h-[44px] flex-1 items-end gap-2 rounded-[22px] border border-neutral-200 bg-white/90 px-3.5 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
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
              <div className="group shrink-0 pb-0.5">
                <ChatCatFieldIcon className="h-5 w-5 text-[#989aa6] dark:text-[#adafbb]" />
              </div>
            </div>
            {draft.trim() || attachments.length > 0 ? (
              <button
                type="button"
                onClick={() => send()}
                disabled={sending || attachments.some((a) => a.status === "uploading")}
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
              <ChatMicButton disabled={sending} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
