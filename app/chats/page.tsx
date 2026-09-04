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
//
// 2026-09-02 follow-up (Aleksandr: "Зайди в Фигму, там есть UI который
// я хочу чтобы был в чат-листе" -- the same node, 24360:8794, "(2)
// Chats general", the populated-list screen): the one piece of that
// screen this pass hadn't picked up yet was the search bar sitting
// right under the header -- confirmed via get_design_context to be a
// plain rounded-pill "Search" field with a leading magnifier, present
// on both the empty and populated states. Filters the already-fetched
// `chats` list client-side (title + preview text) -- there's no
// dedicated chats-search endpoint to call instead, same MVP tradeoff
// this whole feature already runs on (poll instead of a WS relay). The
// icon row above THAT in Figma (hamburger / app logo / messenger) and
// the bottom floating pill (bell / grid / messenger / avatar) are the
// native app's own chrome, not this page's -- components/site-nav.tsx
// already covers that role here, so neither is reproduced.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { MessageTicks } from "@/components/chat/icons";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { LottiePlayer } from "@/components/lottie-player";
import { SearchIcon } from "@/components/search-icon";
import { GLASS } from "@/lib/glass";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { NewChatPickerModal } from "@/components/new-chat-picker-modal";

type LoadState = "loading" | "signed-out" | "error" | "ready";

// Same JS-usable-locale pattern as app/chats/[chatId]/page.tsx's own
// useActiveLocale (copied from components/profile-action-row.tsx) --
// needed here because the search placeholder has to reach an <input>'s
// `placeholder`/`aria-label` attributes as a plain string, not the <T>
// component's server-rendered-all-locales-at-once markup.
function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

const SEARCH_PLACEHOLDER_STRINGS: Record<Locale, string> = {
  uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar",
  fr: "Rechercher", pl: "Szukaj", ptBR: "Pesquisar", zh: "搜索",
};

type ChatListItem = {
  id: string;
  title: string;
  avatarUrl: string;
  // 2026-09-02: a real per-avatar blur placeholder computed server-side
  // (app/api/chats/list/route.ts's resolveAvatarBlurs, same lib/avatar-
  // blur.ts helper every other avatar/photo in this app already uses)
  // -- null for a cat-mascot fallback avatar or a failed/slow blur
  // fetch, both of which fall back to the shared generic shimmer
  // (lib/blur-placeholder.ts's BLUR_DATA_URL) at the render site below.
  avatarBlurDataUrl: string | null;
  // 2026-09-02: lets the chat window link its header name/avatar back
  // to this person's profile (Aleksandr: "при нажатии на аватар и на
  // имя должен открываться профіль") -- null for a group chat or an
  // unresolved participant, same as lib/a1/chat-mappers.ts's own
  // otherUsername this rides on.
  username: string | null;
  isPersonal: boolean;
  lastMessageId: string | null;
  // Added 2026-09-02 alongside lib/a1/chat-schemas.ts's widened
  // ChatSchema -- every field below is null/0/"" whenever the backend's
  // real response doesn't carry it under these guessed names, so a
  // wrong guess just means the row looks like it did before this pass,
  // never a broken render.
  previewText: string;
  // 2026-09-04 (Aleksandr, reference screenshots: chat-list preview for
  // a caption-less voice/photo/file/contact/calculation message) --
  // see components/chat/chat-preview-line.tsx's own header for the
  // full story. previewText itself is now only meaningful for kind
  // "text" (the real message text) or "file" (the real filename);
  // every other kind renders a localized label instead, sourced purely
  // from `previewKind`.
  previewKind: "text" | "voice" | "photo" | "video" | "sticker" | "file" | "contact" | "calc" | "meeting";
  previewPhotoUrl: string | null;
  previewMine: boolean;
  previewDateMs: number;
  previewTick: "read" | "delivered" | null;
  unreadCount: number;
  draftText: string;
};

// Poll-for-MVP transport (PLAN.md's chat master plan) -- no WS relay
// yet, so this is how the list finds out about new/updated chats.
const POLL_MS = 5000;

// 2026-09-04 (Aleksandr: "А чат лист нельзя никак кэшировать, чтобы
// каждый раз не загружать?") -- this page used to always mount into
// state "loading" and show the skeleton on every single visit, even
// when the list was just shown seconds ago. Same sessionStorage cache
// components/chats-flyout.tsx's own readCachedChats/writeCachedChats
// already use for exactly this reason (that file's header has the
// full "why sessionStorage, why per-account" reasoning) --
// deliberately reimplemented here rather than shared, same
// self-contained-by-file convention the rest of this codebase's chat
// UI already follows. A remount now paints the last-known list
// immediately; the poll below still runs right after and reconciles
// with the server, same as it always did.
function chatsCacheKey(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const email = match?.[1] ? decodeURIComponent(match[1]) : null;
  return email ? `a1:chats-page-cache:${email}` : null;
}

function readCachedChats(): ChatListItem[] {
  try {
    const key = chatsCacheKey();
    if (!key) return [];
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatListItem[]) : [];
  } catch {
    return [];
  }
}

function writeCachedChats(chats: ChatListItem[]): void {
  try {
    const key = chatsCacheKey();
    if (!key) return;
    sessionStorage.setItem(key, JSON.stringify(chats));
  } catch {
    // Storage disabled/full/private mode -- caching is a nice-to-have,
    // never worth failing the actual chat list load over.
  }
}

function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function NewChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M12 8.5v4M10 10.5h4" />
    </svg>
  );
}

export default function ChatsPage() {
  const lang = useActiveLocale();
  const [state, setState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [query, setQuery] = useState("");
  // Signed in to even be looking at a chat list, so unlike the global
  // FABs (which also have to cover signed-out visitors via
  // FabAuthPrompt) neither button here needs its own auth-prompt path.
  const [newChatOpen, setNewChatOpen] = useState(false);
  const inFlight = useRef(false);
  // 2026-09-02 (Aleksandr: "Аватары в чатах все равно моргают раз в 5
  // сек") -- root-caused live via Chrome devtools: chat.avatarUrl (built
  // in app/api/chats/list/route.ts from the OTHER participant's photo
  // doc, via lib/a1/mappers.ts's buildMediaProxyUrl) embeds that photo
  // doc's own `fileReference` as a query param, and a live A/B fetch of
  // /api/chats/list ten seconds apart proved that fileReference string
  // itself comes back DIFFERENT each call for the exact same photo
  // (contacts.search apparently re-signs/rotates it server-side, out of
  // our control) -- while avatarBlurDataUrl and everything else stayed
  // byte-identical between those two calls. So every single 5s poll
  // handed the very same avatar a brand-new /api/media/... URL, and the
  // browser correctly treated that as a genuinely different image to
  // load, causing exactly the periodic blink Aleksandr saw -- confirmed
  // via a live MutationObserver: the <img>'s own src attribute was being
  // rewritten on every poll tick even though nothing about the photo had
  // changed. Since the very first avatarUrl we ever see for a chat is
  // already a real, working, freshly-resolved link (and app/api/media's
  // own route caches ITS redirect response for 24h, so an older-but-
  // still-valid fileReference keeps serving fine), the fix is to simply
  // stop asking the <img> to re-resolve a link it already has: this map
  // pins each chat's avatarUrl to whatever value we first saw for it,
  // and every later poll reuses that pinned value instead of the fresh
  // (but pointlessly different) one the API just returned. A real new
  // profile photo only shows up after a full page reload, same
  // acceptable tradeoff every other avatar spot on this site already
  // makes (nothing here polls a photo's own "did it change" signal).
  const pinnedAvatarUrls = useRef<Map<string, string>>(new Map());

  // Paint from the cached list (if any) the moment this mounts, before
  // the first real fetch resolves -- a plain useEffect (not a lazy
  // useState initializer) so this stays client-only and never risks a
  // hydration mismatch against the server-rendered (always "loading")
  // markup, same reasoning as components/chats-flyout.tsx's own
  // identical effect.
  useEffect(() => {
    const cached = readCachedChats();
    if (cached.length === 0) return;
    for (const chat of cached) pinnedAvatarUrls.current.set(chat.id, chat.avatarUrl);
    setChats(cached);
    setState("ready");
  }, []);

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
        const rawChats: ChatListItem[] = data.chats ?? [];
        const stabilized = rawChats.map((chat) => {
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

  // 2026-09-02 (Figma search bar, see this file's own header comment) --
  // client-side filter over the already-fetched list, title + preview
  // text, case-insensitive. Empty query short-circuits to the full list
  // so the common "not searching" path never re-allocates a filtered
  // array.
  const trimmedQuery = query.trim().toLowerCase();
  const filteredChats = trimmedQuery
    ? chats.filter(
        (chat) =>
          chat.title.toLowerCase().includes(trimmedQuery) || chat.previewText.toLowerCase().includes(trimmedQuery),
      )
    : chats;

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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#262a34] sm:text-3xl dark:text-white">
            <T uk="Чати" en="Chats" ru="Чаты" de="Chats" es="Chats" fr="Discussions" pl="Czaty" ptBR="Conversas" zh="聊天" />
          </h1>
          {/* 2026-09-04 (Aleksandr: "Создание поста в правый нижний угол
              иконку и она вроде больше, как на главной") -- the create-
              post entry point moved out of this header row entirely:
              components/create-post-fab.tsx's own real floating "+" now
              shows on this route too (that file's own pathname guard
              narrowed from a blanket "/chats" prefix to "/chats/<id>"
              only), same size/position/cat+progress-bar popup as every
              other page instead of a smaller one-off copy here. Only
              the "new chat" entry point still has no FAB equivalent
              (ChatsFab stays hidden on every /chats route, redundant
              while already looking at the list -- see that file's own
              comment), so it's the only button left in this row. */}
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            aria-label="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          >
            <NewChatBubbleIcon />
          </button>
        </div>

        {/* 2026-09-02 (Figma node 24360:8794, see this file's own header
            comment) -- shown on both the empty and populated states,
            matching the Figma screen for each. */}
        {state === "ready" && (
          <div className="relative mt-4 shrink-0">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#989aa6] dark:text-[#8d8d93]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER_STRINGS[lang]}
              aria-label={SEARCH_PLACEHOLDER_STRINGS[lang]}
              className={
                "w-full rounded-full py-2.5 pl-10 pr-4 text-[16px] text-[#262a34] outline-none transition placeholder:text-[#989aa6] focus:ring-2 focus:ring-accent/30 dark:text-white dark:placeholder:text-[#8d8d93] " +
                GLASS +
                " sm:border-0 sm:bg-white sm:shadow-none sm:backdrop-blur-none sm:backdrop-saturate-100 sm:dark:border-0 sm:dark:bg-neutral-900 sm:dark:shadow-none"
              }
            />
          </div>
        )}

        {state === "loading" && (
          // 2026-09-02 (Aleksandr: "сделай подгузку чатов и чат листа
          // через скелетон лоад") -- was a bare "Завантаження…" line;
          // now the same animate-pulse gray-block skeleton every other
          // route-level loading state in this app already uses (app/
          // jobs/loading.tsx), sized to this page's own 52px-avatar row.
          <div className="mt-6 flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2.5" aria-hidden="true">
                <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
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
          // is). Started at 230px ("в таком же размере", matching the
          // old PNG's own w-[230px]), then doubled to 460px on request
          // ("сделай анимацию х2 больше"). LottiePlayer's box is always
          // square (every other usage in this app follows that same
          // convention). The max-w/max-h-[70vw] cap keeps 460px from
          // overflowing narrow phone widths -- it only ever binds below
          // ~657px viewports, so desktop still gets the full 460px.
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <LottiePlayer src="/animations/cat-pigeon.json" size={460} className="max-w-[70vw] max-h-[70vw]" />
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

        {state === "ready" && chats.length > 0 && filteredChats.length === 0 && (
          <p className="mt-6 text-sm text-[#989aa6] dark:text-[#8d8d93]">
            <T
              uk="Нічого не знайдено"
              en="No results found"
              ru="Ничего не найдено"
              de="Keine Ergebnisse gefunden"
              es="No se encontraron resultados"
              fr="Aucun résultat trouvé"
              pl="Nie znaleziono wyników"
              ptBR="Nenhum resultado encontrado"
              zh="未找到结果"
            />
          </p>
        )}

        {state === "ready" && filteredChats.length > 0 && (
          <div className="mt-6 flex flex-col gap-1">
            {filteredChats.map((chat) => (
              <Link
                key={chat.id}
                // Title/avatar ride along in the query string so the chat
                // window (app/chats/[chatId]/page.tsx) has something to
                // show in its header immediately, without a second
                // "get one chat" endpoint that doesn't exist yet -- purely
                // a display hint, the window's own polling loop is the
                // source of truth for anything else.
                href={`/chats/${chat.id}?title=${encodeURIComponent(chat.title)}&avatar=${encodeURIComponent(chat.avatarUrl)}${chat.avatarBlurDataUrl ? `&avatarBlur=${encodeURIComponent(chat.avatarBlurDataUrl)}` : ""}${chat.username ? `&username=${encodeURIComponent(chat.username)}` : ""}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <Image
                  src={chat.avatarUrl}
                  alt=""
                  width={52}
                  height={52}
                  className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
                  placeholder="blur"
                  blurDataURL={chat.avatarBlurDataUrl ?? BLUR_DATA_URL}
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    {/* 2026-09-03 (Aleksandr, live screenshot of the chat list:
                        "Увелич шрифты имени и текстов сообщений, где то
                        +2") -- name 16px -> 18px, preview/draft text
                        14px -> 16px below. */}
                    <div className="truncate text-[18px] font-medium text-[#262a34] dark:text-white">
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
                    <div className="truncate text-[16px]">
                      <span className="font-medium text-[#ef392c]">
                        <T uk="Чернетка" en="Draft" ru="Черновик" de="Entwurf" es="Borrador" fr="Brouillon" pl="Wersja robocza" ptBR="Rascunho" zh="草稿" />
                      </span>{" "}
                      <span className="text-[#989aa6] dark:text-[#8d8d93]">{chat.draftText}</span>
                    </div>
                  ) : (
                    <ChatPreviewLine
                      kind={chat.previewKind}
                      text={chat.previewText}
                      photoUrl={chat.previewPhotoUrl}
                      className="truncate text-[16px] text-[#989aa6] dark:text-[#8d8d93]"
                    />
                  )}
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

      {newChatOpen && <NewChatPickerModal lang={lang} onClose={() => setNewChatOpen(false)} />}
    </div>
  );
}
