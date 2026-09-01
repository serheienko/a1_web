// app/chats/[chatId]/page.tsx -- Phase 1 web chat window (Aleksandr,
// 2026-09-01). Message history + send box + a best-effort "typing"
// pulse on the input. Polling transport, no WS relay yet -- see
// app/api/chats/messages/route.ts and app/api/chats/typing/route.ts's
// own headers for exactly what that does and doesn't cover yet
// (notably: sending a typing action works, SEEING the other side's
// typing indicator does not, until Phase 2's realtime relay exists).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { extractMessageText, messageDateMs, type ChatMessage } from "@/lib/a1/chat-schemas";

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

  const load = useCallback(async () => {
    if (inFlight.current || document.hidden) return;
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
    load();
    const timer = window.setInterval(() => {
      if (!cancelled) load();
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
    <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
        <Link
          href="/chats"
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <Image
          src={headerAvatar}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          unoptimized
        />
        <div className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {headerTitle || "—"}
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        {state === "loading" && (
          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}
        {state === "signed-out" && (
          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <T
              uk="Повідомлень ще немає. Напишіть перше!"
              en="No messages yet. Say hi!"
              ru="Пока нет сообщений. Напишите первое!"
              de="Noch keine Nachrichten. Schreib die erste!"
              es="Aún no hay mensajes. ¡Escribe el primero!"
              fr="Pas encore de messages. Écrivez le premier !"
              pl="Brak wiadomości. Napisz pierwszą!"
              ptBR="Ainda sem mensagens. Escreva a primeira!"
              zh="暂无消息，来打个招呼吧！"
            />
          </p>
        )}
        {state === "ready" && messages.length > 0 && (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => {
              const mine = myUserId !== null && msg.fromId === myUserId;
              const text = extractMessageText(msg);
              return (
                <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                        : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{text || "…"}</div>
                    <div
                      className={`mt-0.5 text-right text-[10px] ${
                        mine ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {formatTime(messageDateMs(msg))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </div>

      {state !== "signed-out" && (
        <div className="mt-3 flex items-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
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
            placeholder="…"
            className="min-h-[40px] flex-1 resize-none rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:text-neutral-50 dark:focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 transition disabled:opacity-40 dark:bg-neutral-50 dark:text-neutral-900"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
