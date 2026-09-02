// components/chats-flyout.tsx
//
// 2026-09-02 (Aleksandr, stepping away for a while: "давай следующим
// таском сделаем ту задачу, которую я говорил как в Фейсбуке... делай
// её типа по максимуму там и потом покажешь" -- "the Facebook one" being
// Messenger's own pattern: a chats bubble pinned in the corner that
// pops a recent-conversations list + search right there, without ever
// leaving the page you're on). This is that popover -- opened from
// components/chats-fab.tsx (hover or click, same lib/use-hover-panel.ts
// mechanics every other popover in this app already uses), listing
// recent chats and letting you search contacts to start a new one.
// Picking a row hands the caller a target to open in components/mini-
// chat-window.tsx, a small floating conversation window -- this file
// never navigates anywhere itself.
//
// Deliberately self-contained and NOT wired into app/chats/page.tsx or
// app/chats/[chatId]/page.tsx's own code at all: those are live,
// already-shipped, heavily-iterated pages, and this was built solo
// while Aleksandr was away with no one to catch a regression mid-flight
// -- safer to duplicate a modest amount of list/polling logic here than
// to risk a shared-hook refactor of that page going wrong unsupervised.
// Same reasoning app/chats/page.tsx's own poll-for-MVP transport
// already runs on (PLAN.md's chat master plan): no WS relay yet, so
// this polls too.
"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type RefObject } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { SearchIcon } from "@/components/search-icon";
import { MessageTicks } from "@/components/chat/icons";
import { chatRouteParamForUser } from "@/lib/a1/chat-schemas";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";

export type ChatFlyoutOpenTarget = {
  routeParam: string;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
  username: string | null;
};

type ChatRow = {
  id: string;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
  username: string | null;
  previewText: string;
  previewMine: boolean;
  previewDateMs: number;
  previewTick: "read" | "delivered" | null;
  unreadCount: number;
};

type ContactRow = {
  contactId: string;
  userId: string | null;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
  username: string | null;
};

type LoadState = "idle" | "loading" | "error" | "ready";

// Same recurring-poll cadence as app/chats/page.tsx's own POLL_MS --
// only runs while this popover is actually open (see the effect below),
// so it costs nothing while collapsed.
const POLL_MS = 5000;

// 2026-09-02 (Aleksandr, screenshot of the flyout open next to the feed:
// "эти подгруженные чаты надо кешировать, а то они загружаются чуть ли
// не каждый раз как заходишь на иконку чатов"): ChatsFab mounts this
// component once, globally, for the whole session, so re-opening the
// SAME tab's popover already reuses in-memory state (the `state ===
// "ready" ? prev : "loading"` guard below never re-shows the skeleton).
// What that guard can't survive is a hard page reload -- a fresh mount
// starts from state:"idle", chats:[] again, so every reload-then-reopen
// is where the "loads nearly every time" feeling actually comes from
// while testing live. sessionStorage.setItem/getItem persists the last-
// seen list across exactly that (reload within the same tab, cleared
// when the tab closes -- deliberately NOT localStorage, so nothing
// lingers indefinitely on a shared computer): read once on mount to
// paint instantly from what was last seen, keep polling for the real
// data underneath. Keyed per-account (DISPLAY_COOKIE, same cookie
// components/chats-fab.tsx already reads) so a different person signing
// in on the same tab never briefly sees the previous account's chat
// previews before the first real fetch overwrites them.
function chatsCacheKey(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const email = match?.[1] ? decodeURIComponent(match[1]) : null;
  return email ? `a1:chats-flyout-cache:${email}` : null;
}

function readCachedChats(): ChatRow[] {
  try {
    const key = chatsCacheKey();
    if (!key) return [];
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatRow[]) : [];
  } catch {
    return [];
  }
}

function writeCachedChats(chats: ChatRow[]): void {
  try {
    const key = chatsCacheKey();
    if (!key) return;
    sessionStorage.setItem(key, JSON.stringify(chats));
  } catch {
    // Storage disabled/full/private mode -- caching is a nice-to-have,
    // never worth failing the actual chat list load over.
  }
}

const STRINGS = {
  title: {
    uk: "Чати", en: "Chats", ru: "Чаты", de: "Chats", es: "Chats",
    fr: "Discussions", pl: "Czaty", ptBR: "Conversas", zh: "聊天",
  },
  viewAll: {
    uk: "Усі чати", en: "See all", ru: "Все чаты", de: "Alle Chats", es: "Ver todo",
    fr: "Tout voir", pl: "Wszystkie czaty", ptBR: "Ver tudo", zh: "查看全部",
  },
  searchPlaceholder: {
    uk: "Пошук людей і чатів", en: "Search people and chats", ru: "Поиск людей и чатов",
    de: "Personen und Chats suchen", es: "Buscar personas y chats", fr: "Rechercher des personnes et discussions",
    pl: "Szukaj osób i czatów", ptBR: "Buscar pessoas e conversas", zh: "搜索联系人和聊天",
  },
  empty: {
    uk: "Поки немає чатів", en: "No chats yet", ru: "Пока нет чатов", de: "Noch keine Chats",
    es: "Aún no hay chats", fr: "Pas encore de discussions", pl: "Brak czatów", ptBR: "Ainda sem conversas", zh: "暂无聊天",
  },
  noResults: {
    uk: "Нічого не знайдено", en: "No results found", ru: "Ничего не найдено", de: "Keine Ergebnisse",
    es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "未找到结果",
  },
  error: {
    uk: "Не вдалося завантажити", en: "Couldn't load", ru: "Не удалось загрузить", de: "Laden fehlgeschlagen",
    es: "No se pudo cargar", fr: "Échec du chargement", pl: "Nie udało się załadować", ptBR: "Falha ao carregar", zh: "加载失败",
  },
  contactsHeading: {
    uk: "Контакти", en: "Contacts", ru: "Контакты", de: "Kontakte", es: "Contactos",
    fr: "Contacts", pl: "Kontakty", ptBR: "Contatos", zh: "联系人",
  },
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// 2026-09-02 (Aleksandr: "сделай подгузку чатов и чат листа через
// скелетон лоад") -- same animate-pulse gray-block language app/jobs/
// loading.tsx already established for this app's route-level skeletons,
// sized to this popover's own 40px-avatar row (see the real row's own
// h-10 avatar + two-line text block below). SKELETON_ROW_COUNT (8)
// matches the list's own fixed h-[448px] (8 rows x 56px/row, see that
// className below) so the skeleton fills the exact space the real
// rows will occupy instead of leaving a gap or overflowing it.
const SKELETON_ROW_COUNT = 8;

function ChatRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2" aria-hidden="true">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
      <div className="min-w-0 flex-1">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

// Sits directly above the FAB stack, same anchor math as components/
// fab-auth-prompt.tsx's own FAB_POPOVER_BOTTOM (duplicated rather than
// imported -- that constant isn't exported, and this file is meant to
// stand alone, see this file's own header).
const FLYOUT_BOTTOM = "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))";

export function ChatsFlyout({
  open,
  onClose,
  panelRef,
  onMouseEnter,
  onMouseLeave,
  onOpenChat,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenChat: (target: ChatFlyoutOpenTarget) => void;
}) {
  const lang = useActiveLocale();
  const [state, setState] = useState<LoadState>("idle");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [query, setQuery] = useState("");
  const inFlight = useRef(false);
  // 2026-09-02: same avatar-blink fix as app/chats/page.tsx's own
  // pinnedAvatarUrls (see that file's header for the full live-debugged
  // root cause -- chat.avatarUrl's fileReference query param rotates on
  // the backend every poll even though the photo itself hasn't
  // changed). Pinned separately here rather than shared, same
  // self-contained-by-design rule as the rest of this file.
  const pinnedAvatarUrls = useRef<Map<string, string>>(new Map());

  // Paint from the cached list (if any) the moment this mounts --
  // before the popover is ever opened, so the very first open of a
  // fresh page load already has something to show instead of the
  // skeleton. A plain useEffect (not a lazy useState initializer) so
  // this stays client-only and never risks a hydration mismatch against
  // the server-rendered (always-empty, always-hidden) markup -- see
  // chatsCacheKey()'s own comment above for the full reasoning.
  useEffect(() => {
    const cached = readCachedChats();
    if (cached.length === 0) return;
    for (const chat of cached) pinnedAvatarUrls.current.set(chat.id, chat.avatarUrl);
    setChats(cached);
    setState("ready");
  }, []);

  // Recent chats: fetched once when first opened, then polled every 5s
  // while open (mirrors app/chats/page.tsx's own load()/POLL_MS,
  // deliberately not shared code -- see this file's header).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await authFetch("/api/chats/list");
        if (cancelled) return;
        if (res.status === 401) return;
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setState((prev) => (prev === "ready" ? prev : "error"));
          return;
        }
        const raw: ChatRow[] = data.chats ?? [];
        const stabilized = raw.map((chat) => {
          const pinned = pinnedAvatarUrls.current.get(chat.id);
          if (pinned) return chat.avatarUrl === pinned ? chat : { ...chat, avatarUrl: pinned };
          pinnedAvatarUrls.current.set(chat.id, chat.avatarUrl);
          return chat;
        });
        setChats(stabilized);
        setState("ready");
        writeCachedChats(stabilized);
      } catch {
        if (!cancelled) setState((prev) => (prev === "ready" ? prev : "error"));
      } finally {
        inFlight.current = false;
      }
    }

    setState((prev) => (prev === "ready" ? prev : "loading"));
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open]);

  // Contacts (for "start a new chat" search): fetched once, the first
  // time the popover opens, then cached in state for the rest of this
  // component's lifetime -- ChatsFab mounts this once globally, so
  // reopening later reuses the same list rather than re-fetching.
  useEffect(() => {
    if (!open || contacts !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/contacts/list");
        if (cancelled) return;
        const data = await res.json().catch(() => null);
        if (!data?.ok) return;
        const contactUsers = data.contactUsers ?? {};
        const rows: ContactRow[] = (data.contacts ?? [])
          .filter((c: { user: string | null }) => c.user)
          .map((c: { _id: string; user: string; firstName: string; lastName: string }) => {
            const u = contactUsers[c.user];
            const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
            const title = u?.fullName || fullName || u?.username || "";
            return {
              contactId: c._id,
              userId: c.user,
              title,
              avatarUrl: u?.avatarUrl ?? pickDefaultCatAvatar(c.user),
              avatarBlurDataUrl: u?.avatarBlurDataUrl ?? null,
              username: u?.username ?? null,
            };
          });
        setContacts(rows);
      } catch {
        // Best-effort -- search-to-start-new simply stays empty, the
        // recent-chats list above still works fine on its own.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contacts]);

  const trimmed = query.trim().toLowerCase();
  const filteredChats = trimmed
    ? chats.filter(
        (c) => c.title.toLowerCase().includes(trimmed) || c.previewText.toLowerCase().includes(trimmed),
      )
    : chats;
  const matchingContacts = trimmed
    ? (contacts ?? []).filter(
        (c) => c.title.toLowerCase().includes(trimmed) || (c.username ?? "").toLowerCase().includes(trimmed),
      )
    : [];

  function openChat(target: ChatFlyoutOpenTarget) {
    onOpenChat(target);
    onClose();
  }

  if (!open) return null;

  // Portaled to document.body with a z-30 backdrop strictly below the
  // z-40 FAB trigger, same structure (and same reason) as components/
  // fab-auth-prompt.tsx's own render -- see that file's header for the
  // open/close flicker loop this exact convention fixes.
  return createPortal(
    <div className="animate-backdrop-in fixed inset-0 z-30" onClick={onClose}>
    <div
      role="dialog"
      aria-label={STRINGS.title[lang]}
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="animate-popover-up fixed right-5 z-[70] flex max-h-[75vh] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      style={{ bottom: FLYOUT_BOTTOM }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <span className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</span>
        <Link
          href="/chats"
          onClick={onClose}
          className="text-[15px] font-medium text-[#335ef7] hover:opacity-80 dark:text-[#0c8ce9]"
        >
          {STRINGS.viewAll[lang]}
        </Link>
      </div>

      <div className="shrink-0 px-3 pt-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#989aa6] dark:text-[#8d8d93]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={STRINGS.searchPlaceholder[lang]}
            aria-label={STRINGS.searchPlaceholder[lang]}
            className="w-full rounded-full bg-[#f2f2f7] py-2 pl-8 pr-3 text-[15px] text-[#262a34] outline-none transition placeholder:text-[#989aa6] focus:ring-2 focus:ring-accent/30 dark:bg-neutral-800 dark:text-white dark:placeholder:text-[#8d8d93]"
          />
        </div>
      </div>

      <div className="mt-2 h-[448px] shrink-0 overflow-y-auto px-2 pb-2">
        {state === "loading" && chats.length === 0 && (
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <ChatRowSkeleton key={i} />
            ))}
          </div>
        )}
        {state === "error" && chats.length === 0 && (
          <p className="px-2 py-4 text-center text-[15px] text-[#989aa6] dark:text-[#8d8d93]">{STRINGS.error[lang]}</p>
        )}
        {state === "ready" && filteredChats.length === 0 && matchingContacts.length === 0 && (
          <p className="px-2 py-4 text-center text-[15px] text-[#989aa6] dark:text-[#8d8d93]">
            {trimmed ? STRINGS.noResults[lang] : STRINGS.empty[lang]}
          </p>
        )}

        {filteredChats.map((chat) => (
          <button
            key={chat.id}
            type="button"
            onClick={() =>
              openChat({
                routeParam: chat.id,
                title: chat.title,
                avatarUrl: chat.avatarUrl,
                avatarBlurDataUrl: chat.avatarBlurDataUrl,
                username: chat.username,
              })
            }
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
          >
            <Image
              src={chat.avatarUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              placeholder="blur"
              blurDataURL={chat.avatarBlurDataUrl ?? BLUR_DATA_URL}
              unoptimized
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate text-[16px] font-medium text-[#262a34] dark:text-white">{chat.title || "—"}</div>
                {chat.previewDateMs > 0 && (
                  <span className="shrink-0 text-[13px] text-[#989aa6] dark:text-[#8d8d93]">{formatTime(chat.previewDateMs)}</span>
                )}
              </div>
              <div className="flex items-center gap-1 truncate text-[14.5px] text-[#989aa6] dark:text-[#8d8d93]">
                {chat.previewMine && chat.previewTick && (
                  <MessageTicks
                    state={chat.previewTick}
                    className={`h-[8px] w-[14px] shrink-0 ${chat.previewTick === "read" ? "text-[#335ef7] dark:text-[#0c8ce9]" : ""}`}
                  />
                )}
                <span className="truncate">{chat.previewText}</span>
              </div>
            </div>
            {chat.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#335ef7] px-1 text-[12.5px] font-medium text-white dark:bg-[#0c8ce9]">
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </span>
            )}
          </button>
        ))}

        {matchingContacts.length > 0 && (
          <>
            <div className="mt-2 px-2.5 pb-1 text-[13px] font-medium uppercase tracking-wide text-[#989aa6] dark:text-[#8d8d93]">
              {STRINGS.contactsHeading[lang]}
            </div>
            {matchingContacts.map((c) => (
              <button
                key={c.contactId}
                type="button"
                onClick={() =>
                  c.userId &&
                  openChat({
                    routeParam: chatRouteParamForUser(c.userId),
                    title: c.title,
                    avatarUrl: c.avatarUrl,
                    avatarBlurDataUrl: c.avatarBlurDataUrl,
                    username: c.username,
                  })
                }
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <Image
                  src={c.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  placeholder="blur"
                  blurDataURL={c.avatarBlurDataUrl ?? BLUR_DATA_URL}
                  unoptimized
                />
                <div className="min-w-0 flex-1 truncate text-[16px] font-medium text-[#262a34] dark:text-white">{c.title || "—"}</div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
    </div>,
    document.body,
  );
}
