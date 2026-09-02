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
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import {
  extractMessageText,
  messageDateMs,
  messageTickState,
  type ChatMessage,
} from "@/lib/a1/chat-schemas";
import { ChatBackArrow, ChatCatFieldIcon, ChatMicButton, ChatPaperclipButton, ChatTypingDots, MessageTicks } from "@/components/chat/icons";

type LoadState = "loading" | "signed-out" | "error" | "ready";

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

export default function ChatWindowPage() {
  const params = useParams<{ chatId: string }>();
  const searchParams = useSearchParams();
  const chatId = params.chatId;
  const headerTitle = searchParams.get("title") ?? "";
  const headerAvatar = searchParams.get("avatar") ?? pickDefaultCatAvatar(chatId);

  const [state, setState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      setMessages(data.messages ?? []);
      setMyUserId(data.myUserId ?? null);
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
  }, [messages.length]);

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

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, text }),
      });
      if (res.ok) {
        // Optimistic refresh -- the real message (with its real _id/
        // date from the backend) shows up on the next poll tick; this
        // just makes "did it send" feel instant instead of waiting up
        // to POLL_MS.
        load();
      } else if (res.status !== 401) {
        // Send failed but wasn't a session issue -- give the text back
        // so nothing typed is lost.
        setDraft(text);
      }
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f2f2f7] text-[#262a34] dark:bg-black dark:text-white">
      {/* 2026-09-02 (Aleksandr, screen recording + follow-up: "Поставь
          аватар и имя по центру 'вакансії і фахівці', а кнопку назад
          примерно на уровне нижней скрепки"): back button stays a
          normal in-flow item in this max-w-2xl row (so it lines up with
          the compose bar's own max-w-2xl row -- its first child, the
          paperclip button, sits at the same x as this one below), but
          avatar+name are pulled OUT of that row and absolutely centered
          over the header's full width instead -- same "pointer-events-
          none absolute inset-0 flex items-center justify-center" trick
          components/site-nav.tsx already uses to keep ITS OWN centered
          tabs pill dead-center regardless of what's in the side
          columns (see that file's own header comment for the technique
          in full). The relative row below stays mx-auto max-w-2xl (a
          box that's itself centered on the page), so centering inside
          it lands at the same page-x as the nav bar's own full-width-
          centered tabs. */}
      <div className="sticky top-0 z-10 border-b border-black/5 bg-[#f2f2f7]/90 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
        <div className="relative mx-auto flex w-full max-w-2xl items-center px-4 py-3">
          <Link
            href="/chats"
            aria-label="Back"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
          >
            <ChatBackArrow />
          </Link>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 px-4 py-3">
            <Image
              src={headerAvatar}
              alt=""
              width={42}
              height={42}
              className="pointer-events-auto h-[42px] w-[42px] shrink-0 rounded-full object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              unoptimized
            />
            <div className="pointer-events-auto min-w-0 max-w-[50vw]">
              <div className="truncate text-[15px] font-medium leading-tight">{headerTitle || "—"}</div>
              {peerTyping && (
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#335ef7] dark:text-[#0c8ce9]">
                  <T uk="набирає" en="typing" ru="печатает" de="tippt" es="escribiendo" fr="écrit" pl="pisze" ptBR="digitando" zh="正在输入" />
                  <ChatTypingDots />
                </div>
              )}
            </div>
          </div>
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
        {state === "ready" && messages.length === 0 && (
          // 2026-09-02 (Aleksandr, screenshot of the mobile app's own
          // empty state: "ставим надпись по центру и добавляем
          // анимацию" -- bold headline + lighter instruction line,
          // both centered, matching that reference): the animated
          // greeting cat itself is a separate follow-up ("в след
          // сообщении скину анимацию этого кота") -- once that .tgs is
          // decompressed into public/animations/ the same way
          // cat-blink.json was, it renders here via components/lottie-
          // player.tsx (same convention every other cat animation in
          // this app already uses), tap/click-able to send the
          // greeting text. Left as a plain centered text block for now
          // so this doesn't point at a file that doesn't exist yet.
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
          </div>
        )}
        {state === "ready" && messages.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {messages.map((msg, i) => {
              const mine = myUserId !== null && msg.fromId === myUserId;
              const text = extractMessageText(msg);
              const ms = messageDateMs(msg);
              // 2026-09-02: messages[i - 1] types as ChatMessage | undefined
              // under this project's noUncheckedIndexedAccess (tsconfig.json)
              // -- messageDateMs doesn't accept undefined, so this was a
              // silent `next build` failure (TS2345 at this exact line) that
              // blocked every deploy since this file's own 2026-09-02 Figma
              // redesign pass landed, discovered only now by reading a failed
              // deployment's build log directly (Vercel dashboard's own build
              // log panel wasn't automatable this round -- see PLAN.md).
              const prevMsg = i > 0 ? messages[i - 1] : undefined;
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
                      className={`max-w-[78%] rounded-[18px] px-3 py-2 text-[15px] leading-snug ${
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
        // inline style). Row itself narrowed to roughly the width of the
        // "Повідомлень ще немає..." empty-state text, per that same feedback.
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-[#f2f2f7]/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/80"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
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
                onClick={send}
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
