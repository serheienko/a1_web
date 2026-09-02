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
  messageDateMs,
  messageTickState,
  type ChatMessage,
} from "@/lib/a1/chat-schemas";
import { ChatBackArrow, ChatCatFieldIcon, ChatMicButton, ChatPaperclipButton, ChatTypingDots, MessageTicks } from "@/components/chat/icons";

type LoadState = "loading" | "signed-out" | "error" | "ready";

// See the `pendingMessages` state comment (below, in the component) for
// why this exists -- a locally-built stand-in for a message that was
// just sent but hasn't shown up in a real messages.getMessages response
// yet. Same shape as ChatMessage (so every existing render/format
// helper -- extractMessageText, messageDateMs, messageTickState --
// works on it unchanged) plus two fields nothing server-side ever sets.
type PendingMessage = ChatMessage & { pending: true; localId: string };

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
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const lastTypingSentAt = useRef(0);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pendingMessages.length]);

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
    if (!text || sending) return;
    setSending(true);
    if (!overrideText) setDraft("");
    // Optimistic bubble, shown the instant the POST is fired -- see the
    // `pendingMessages` state comment above for why (load() right after
    // send() used to sometimes race chat-server's own indexing and show
    // nothing new for up to POLL_MS). localId is only ever used to find
    // this exact entry again (the `key` prop below and the removal
    // calls in the catch/error branches); real messages never collide
    // with it since chat-server's own _ids never contain a "-".
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: PendingMessage = {
      _id: localId,
      flags: 0,
      peerFrom: myUserId ? { object: "peer-user", user: myUserId } : null,
      peerTo: null,
      date: new Date().toISOString(),
      entities: [{ object: "entity-text", text }],
      media: [],
      fromId: myUserId,
      pending: true,
      localId,
    };
    setPendingMessages((prev) => [...prev, optimistic]);
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, text }),
      });
      if (res.ok) {
        // The optimistic bubble above already made this feel instant;
        // this refresh is just what eventually replaces it with the
        // real message (see load()'s reconciliation) and picks up
        // anything else new (the other side's replies, tick updates).
        load();
      } else if (res.status !== 401) {
        // Send failed but wasn't a session issue -- give the text back
        // so nothing typed is lost, and pull the optimistic bubble that
        // never actually went anywhere.
        setDraft(text);
        setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
      } else {
        setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
      }
    } catch {
      setDraft(text);
      setPendingMessages((prev) => prev.filter((p) => p.localId !== localId));
    } finally {
      setSending(false);
    }
  }

  // Rendered list: real messages + any not-yet-reconciled optimistic
  // ones, re-sorted by date so a pending bubble (timestamped "now" the
  // moment it was created) always lands at the end where it belongs,
  // never briefly out of order against whatever load() last fetched.
  const displayMessages: (ChatMessage | PendingMessage)[] = [...messages, ...pendingMessages].sort(
    (a, b) => messageDateMs(a) - messageDateMs(b),
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f2f2f7] text-[#262a34] dark:bg-black dark:text-white">
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
      <div className="sticky top-0 z-10 border-b border-black/5 bg-[#f2f2f7]/90 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
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

      {/* 2026-09-02: pb-28 clears the now-fixed compose bar below (it no
          longer takes up flex space of its own -- see that bar's own
          comment) so the last message/empty-state text never sits
          underneath it. Content itself is capped at the same max-w-2xl
          as the header right above. */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="mx-auto w-full max-w-2xl">
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
              return (
                <div key={msg._id}>
                  {showDate && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[13px] font-medium text-[#262a34] backdrop-blur-sm dark:bg-white/10 dark:text-white">
                        {formatDateLabel(ms)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`animate-message-in max-w-[78%] rounded-[18px] px-3 py-2 text-[15px] leading-snug ${
                        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{text || "…"}</div>
                      <div
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
                          mine ? "text-white/70" : "text-[#989aa6] dark:text-[#adafbb]"
                        }`}
                      >
                        <span>{formatTime(ms)}</span>
                        {mine && <MessageTicks state={messageTickState(msg)} className="h-[7.77px] w-3.5" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollAnchorRef} />
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
          className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-[#f2f2f7]/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/80"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-[470px] items-center gap-2">
            <ChatPaperclipButton disabled={sending} />
            <div className="flex min-h-[42px] flex-1 items-center gap-2 rounded-[21px] border border-neutral-200 bg-white/90 px-3.5 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
              <textarea
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
                className="min-h-[20px] flex-1 resize-none bg-transparent text-[15px] text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white dark:placeholder:text-[#98989f]"
              />
              <ChatCatFieldIcon className="h-5 w-5 shrink-0 text-[#989aa6] dark:text-[#adafbb]" />
            </div>
            {draft.trim() ? (
              <button
                type="button"
                onClick={() => send()}
                disabled={sending}
                aria-label="Send"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition disabled:opacity-40 dark:bg-[#0c8ce9]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
