// app/chats/page.tsx -- Phase 1 web chat list (Aleksandr, 2026-09-01:
// "я хочу добавить еще веб-версию чата... такие же примерно полноценные
// чаты, как у нас в приложении"). Same structure as app/contacts/page.tsx
// (client component -- inherently visitor-specific, same authFetch
// race-avoidance rationale that file's own header documents), just
// polling on top instead of a one-shot fetch.
//
// Placement is provisional, same as app/contacts/page.tsx was at first
// ("накидаешь, потом пересделаем") -- linked from components/avatar-
// menu.tsx's new "Чати" row for now, real UI placement (nav bar? a
// dedicated icon?) to react to once this is live.
//
// 2026-09-02: visual pass to match the app's own chat UI (Aleksandr:
// "хочу использовать определённый UI для чатов, такой же, как у нас в
// приложении"), pulled from Figma (node 24360:7305) via the Figma MCP.
// The empty-state illustration/copy below is the ONE part of that
// design that's a 1:1 asset+copy match -- "(1) No msgs", confirmed via
// get_design_context to be the whole-inbox-empty state (has the same
// search header as the populated list, not a single-chat's empty
// state). The row layout (avatar/title/preview/ticks/unread/draft) is
// styled to the same spacing and type scale, but the preview text,
// read ticks, unread badge and draft-red line are only ever rendered
// when the now-widened ChatSchema (lib/a1/chat-schemas.ts, same date)
// actually resolves that data -- those fields are unconfirmed guesses
// server-side, see that file's header, and simply don't render if the
// real chats.getChats response doesn't carry them under the guessed
// names. See PLAN.md's 2026-09-02 entry for the full writeup.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { MessageTicks } from "@/components/chat/icons";
import { LottiePlayer } from "@/components/lottie-player";

type LoadState = "loading" | "signed-out" | "error" | "ready";

type ChatListItem = {
  id: string;
  title: string;
  avatarUrl: string;
  isPersonal: boolean;
  lastMessageId: string | null;
  // Added 2026-09-02 alongside lib/a1/chat-schemas.ts's widened
  // ChatSchema -- every field below is null/0/"" whenever the backend's
  // real response doesn't carry it under these guessed names, so a
  // wrong guess just means the row looks like it did before this pass,
  // never a broken render.
  previewText: string;
  previewMine: boolean;
  previewDateMs: number;
  previewTick: "read" | "delivered" | null;
  unreadCount: number;
  draftText: string;
};

// Poll-for-MVP transport (PLAN.md's chat master plan) -- no WS relay
// yet, so this is how the list finds out about new/updated chats.
const POLL_MS = 5000;

function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await authFetch("/api/chats/list");
        if (cancelled) return;
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setState((prev) => (prev === "ready" ? prev : "error"));
          return;
        }
        setChats(data.chats ?? []);
        setState("ready");
      } catch {
        if (!cancelled) setState((prev) => (prev === "ready" ? prev : "error"));
      } finally {
        inFlight.current = false;
      }
    }

    // Initial load always runs, even in a background/unfocused tab --
    // only the recurring poll below skips while hidden (2026-09-01
    // live-testing bug: the old code checked document.hidden inside
    // load() itself, which also silently skipped the very FIRST fetch
    // whenever this page happened to mount in a tab that wasn't
    // frontmost -- the list just sat on "Loading..." forever with no
    // error and no request ever sent).
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
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
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f2f2f7] dark:bg-black">
      {/* 2026-09-02 (Aleksandr, screenshot: "подвинь блок по центру
          экрана" -- the cat+pigeon empty state sat right under the
          heading instead of centered in the leftover viewport space).
          Both this wrapper and <main> below are now flex columns so
          the empty-state block further down can take flex-1 and center
          itself vertically in whatever room is left under the "Чати"
          heading -- every OTHER state (loading/error/signed-out/the
          populated list) stays a normal, non-flex-1 child, so this
          only changes that one block's own position. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:py-16">
        <h1 className="text-2xl font-semibold text-[#262a34] sm:text-3xl dark:text-white">
          <T uk="Чати" en="Chats" ru="Чаты" de="Chats" es="Chats" fr="Discussions" pl="Czaty" ptBR="Conversas" zh="聊天" />
        </h1>

        {state === "loading" && (
          <p className="mt-6 text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {state === "signed-out" && (
          <p className="mt-6 text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T
              uk="Увійдіть, щоб побачити свої чати."
              en="Sign in to see your chats."
              ru="Войдите, чтобы увидеть свои чаты."
              de="Melde dich an, um deine Chats zu sehen."
              es="Inicia sesión para ver tus chats."
              fr="Connectez-vous pour voir vos discussions."
              pl="Zaloguj się, aby zobaczyć swoje czaty."
              ptBR="Entre para ver suas conversas."
              zh="登录以查看您的聊天。"
            />
          </p>
        )}

        {state === "error" && (
          <p className="mt-6 text-sm text-[#989aa6] dark:text-[#adafbb]">
            <T
              uk="Не вдалося завантажити чати."
              en="Couldn't load chats."
              ru="Не удалось загрузить чаты."
              de="Chats konnten nicht geladen werden."
              es="No se pudieron cargar los chats."
              fr="Impossible de charger les discussions."
              pl="Nie udało się załadować czatów."
              ptBR="Não foi possível carregar as conversas."
              zh="无法加载聊天。"
            />
          </p>
        )}

        {state === "ready" && chats.length === 0 && (
          // 2026-09-02: static /chat/empty-chat.png replaced with the
          // animated version Aleksandr sent (Cat + pigeon.lottie -- a
          // dotLottie zip, unpacked to public/animations/cat-pigeon.json
          // the same way every other .tgs sticker in this app already
          // is). "в таком же размере" -- 230px, matching the old PNG's
          // own w-[230px]; LottiePlayer's box is always square (every
          // other usage in this app follows that same convention), so
          // the animation renders contained within a 230x230 box rather
          // than at the PNG's old 269x130 aspect ratio.
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <LottiePlayer src="/animations/cat-pigeon.json" size={230} />
            <p className="mt-6 text-xl font-semibold text-[#262a34] dark:text-white">
              <T
                uk="Повідомлень ще немає"
                en="No messages yet"
                ru="Пока нет сообщений"
                de="Noch keine Nachrichten"
                es="Aún no hay mensajes"
                fr="Pas encore de messages"
                pl="Brak wiadomości"
                ptBR="Ainda sem mensagens"
                zh="暂无消息"
              />
            </p>
            <Link href="/contacts" className="mt-2 text-[17px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
              <T
                uk="Нове повідомлення"
                en="New message"
                ru="Новое сообщение"
                de="Neue Nachricht"
                es="Nuevo mensaje"
                fr="Nouveau message"
                pl="Nowa wiadomość"
                ptBR="Nova mensagem"
                zh="新消息"
              />
            </Link>
          </div>
        )}

        {state === "ready" && chats.length > 0 && (
          <div className="mt-6 flex flex-col gap-1">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                // Title/avatar ride along in the query string so the chat
                // window (app/chats/[chatId]/page.tsx) has something to
                // show in its header immediately, without a second
                // "get one chat" endpoint that doesn't exist yet -- purely
                // a display hint, the window's own polling loop is the
                // source of truth for anything else.
                href={`/chats/${chat.id}?title=${encodeURIComponent(chat.title)}&avatar=${encodeURIComponent(chat.avatarUrl)}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <Image
                  src={chat.avatarUrl}
                  alt=""
                  width={52}
                  height={52}
                  className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-[16px] font-medium text-[#262a34] dark:text-white">
                      {chat.title || "—"}
                    </div>
                    {chat.previewDateMs > 0 && (
                      <div className="flex shrink-0 items-center gap-1 text-[13px] text-[#989aa6] dark:text-[#8d8d93]">
                        {chat.previewMine && chat.previewTick && (
                          <MessageTicks
                            state={chat.previewTick}
                            className={`h-[10px] w-[17px] ${chat.previewTick === "read" ? "text-[#335ef7] dark:text-[#0c8ce9]" : ""}`}
                          />
                        )}
                        <span>{formatTime(chat.previewDateMs)}</span>
                      </div>
                    )}
                  </div>
                  {chat.draftText ? (
                    <div className="truncate text-[14px]">
                      <span className="font-medium text-[#ef392c]">
                        <T uk="Чернетка" en="Draft" ru="Черновик" de="Entwurf" es="Borrador" fr="Brouillon" pl="Wersja robocza" ptBR="Rascunho" zh="草稿" />
                      </span>{" "}
                      <span className="text-[#989aa6] dark:text-[#8d8d93]">{chat.draftText}</span>
                    </div>
                  ) : chat.previewText ? (
                    <div className="truncate text-[14px] text-[#989aa6] dark:text-[#8d8d93]">{chat.previewText}</div>
                  ) : null}
                </div>
                {chat.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#335ef7] px-1.5 text-[12px] font-medium text-white dark:bg-[#0c8ce9]">
                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
