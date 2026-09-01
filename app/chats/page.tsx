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
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

type LoadState = "loading" | "signed-out" | "error" | "ready";

type ChatListItem = {
  id: string;
  title: string;
  avatarUrl: string;
  isPersonal: boolean;
  lastMessageId: string | null;
};

// Poll-for-MVP transport (PLAN.md's chat master plan) -- no WS relay
// yet, so this is how the list finds out about new/updated chats.
const POLL_MS = 5000;

export default function ChatsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (inFlight.current || document.hidden) return;
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

    load();
    const timer = window.setInterval(load, POLL_MS);
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
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Чати" en="Chats" ru="Чаты" de="Chats" es="Chats" fr="Discussions" pl="Czaty" ptBR="Conversas" zh="聊天" />
      </h1>

      {state === "loading" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
        </p>
      )}

      {state === "signed-out" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
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
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
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
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Поки немає жодного чату."
            en="No chats yet."
            ru="Пока нет ни одного чата."
            de="Noch keine Chats."
            es="Aún no hay chats."
            fr="Aucune discussion pour l'instant."
            pl="Brak czatów."
            ptBR="Ainda sem conversas."
            zh="暂无聊天。"
          />
        </p>
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
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <Image
                src={chat.avatarUrl}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                unoptimized
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {chat.title || "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
