// components/chats-fab.tsx
//
// Aleksandr, 2026-09-01: "Я хочу еще сделать кнопку чатов над кнопкой
// "создать пост", фиксированную" -- a second floating button, fixed,
// sitting directly above components/create-post-fab.tsx's own "+"
// button. Same global-mount/pathname-hiding pattern as that file (see
// its own header comment for the original reasoning); this one just
// links to /chats instead of opening the post editor.
//
// Deliberately NOT styled like the primary accent-blue "+" button --
// a plain neutral pill (white/near-black surface, thin border) so the
// create-post action stays visually primary and this one reads as
// secondary, sitting right above it. Slightly smaller (h-12 vs h-14)
// for the same reason.
//
// Hidden on /sign-in (identical reasoning to CreatePostFab -- nowhere
// to sit without overlapping the sign-in buttons) AND on any /chats
// route: app/chats/[chatId]/page.tsx has its own message composer
// pinned to the bottom of that page's own layout, which a fixed button
// stack in the same corner would sit on top of, and linking to /chats
// while already somewhere under /chats is redundant regardless.
//
// 2026-09-02 (live mobile screenshot, Aleksandr: "пусть иконка чаты...
// плавно исчезает затуханием, потому что сейчас она оверлапится на
// модалку в мобильной версии, и... UX wise тоже бессмысленно, потому
// что сверху есть кнопка чатов в самой модалке"): fades out (opacity +
// pointer-events, not unmounted -- unmounting would skip the transition
// entirely, same "needs a real closed frame to animate from" lesson
// lib/use-hover-panel.ts already applies) whenever the avatar/settings
// account panel is open, via lib/account-menu-open.ts's tiny shared
// store -- see that file's own header for why a plain external store
// instead of Context.
"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeAccountMenuOpen, getAccountMenuOpenSnapshot } from "@/lib/account-menu-open";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { FabAuthPrompt } from "@/components/fab-auth-prompt";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { ChatsFlyout, type ChatFlyoutOpenTarget } from "@/components/chats-flyout";
import { MiniChatWindow } from "@/components/mini-chat-window";

type FabStringKey = "label";

const STRINGS: Record<FabStringKey, Record<Locale, string>> = {
  label: {
    uk: "Чати", en: "Chats", ru: "Чаты", de: "Chats", es: "Chats",
    fr: "Discussions", pl: "Czaty", ptBR: "Conversas", zh: "聊天",
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

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

// Speech-bubble glyph -- same shape as components/avatar-menu.tsx's own
// ChatsIcon, just scaled up to this button's icon size.
//
// 2026-09-02 (Aleksandr, screenshot of the two stacked FABs: "На иконку
// сообщения можно тоже добавить какую-то прикольную анимацию при
// наведении, что то похожее как на (+)"): components/create-post-fab.tsx's
// own "+" spins 90deg on hover -- a plain rotate reads fine on a
// symmetric plus, but a speech bubble rotated 90deg just looks knocked
// over, not "playful". Went with a quick wiggle instead (see globals.css's
// chat-bubble-wiggle keyframe) -- two or three little tilts with a touch
// of scale, like the bubble is shaking to get your attention, the same
// motion a chat app's own unread-badge bounce goes for. Takes a
// className (only ChunkyPlusIcon's own pattern in create-post-fab.tsx
// had this before) so the caller decides whether the hover trigger is
// this icon's own `group` or not -- both call sites below share one
// `group` button, so both just pass "animate-chat-wiggle" and get it.
function ChatsIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function ChatsFab() {
  const lang = useActiveLocale();
  const pathname = usePathname();
  // Server-rendered snapshot is always "closed" (the store starts
  // false and only ever flips client-side from a click), so this never
  // mismatches hydration -- same reasoning as any other client-only UI
  // toggle in this app.
  const accountMenuOpen = useSyncExternalStore(subscribeAccountMenuOpen, getAccountMenuOpenSnapshot, () => false);
  const [email, setEmail] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // 2026-09-02 (Aleksandr: "давай в разлогиненом стейте тоже добавим к
  // этим попапс эффект появления при наведении, без клика") -- same
  // hook components/avatar-menu.tsx/components/settings-menu.tsx use,
  // just with the trigger/panel as two separate elements (this button
  // and components/fab-auth-prompt.tsx's portaled card) instead of one
  // shared wrapping div, since the popover portals to document.body and
  // so isn't a DOM descendant of this button the way avatar-menu.tsx's
  // panel is of its own wrapper -- see fab-auth-prompt.tsx's own comment
  // on its panelRef/onMouseEnter/onMouseLeave props for why both need
  // the handlers wired explicitly.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { handleMouseEnter, handleMouseLeave } = useHoverPanel(authPromptOpen, setAuthPromptOpen, [
    { trigger: triggerRef, panel: panelRef },
  ]);
  // 2026-09-02 ("the Facebook one" -- see components/chats-flyout.tsx's
  // own header): the SIGNED-IN version of this button used to be a
  // plain `<Link href="/chats">`. Now it opens components/chats-
  // flyout.tsx's own recent-chats popover instead, same hover-panel
  // mechanics as the signed-out auth prompt just above, on its own
  // trigger/panel ref pair (kept separate from authPromptOpen's since
  // only one of the two is ever relevant for a given signed-in/out
  // state, but sharing one `open` boolean across two different popover
  // components would fight over what "open" even means).
  const flyoutTriggerRef = useRef<HTMLButtonElement>(null);
  const flyoutPanelRef = useRef<HTMLDivElement>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const { handleMouseEnter: handleFlyoutEnter, handleMouseLeave: handleFlyoutLeave } = useHoverPanel(
    flyoutOpen,
    setFlyoutOpen,
    [{ trigger: flyoutTriggerRef, panel: flyoutPanelRef }],
  );
  // Only one mini chat window open at a time in this pass (Aleksandr's
  // own "по максимуму" scope, see chats-flyout.tsx's header) -- picking
  // a different chat just swaps this to the new target.
  const [activeChat, setActiveChat] = useState<ChatFlyoutOpenTarget | null>(null);

  useEffect(() => {
    setEmail(readDisplayCookie());
  }, []);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/chats")) return null;

  const buttonClassName = `group fixed right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-lg transition duration-200 hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${
    accountMenuOpen ? "pointer-events-none opacity-0" : "opacity-100"
  }`;
  // Stacked directly above CreatePostFab: that button sits at
  // `1.25rem + safe-area` and is 56px (h-14) tall, so this one's own
  // bottom offset is that same 1.25rem, plus the FAB's height, plus a
  // 12px gap between them.
  const buttonStyle = { bottom: "calc(1.25rem + 56px + 12px + env(safe-area-inset-bottom))" };

  // 2026-09-02 (Aleksandr: "В незалогиненых тоже показывай модалку на
  // обе кнопки и не уводи со страницы") -- signed out, this used to be
  // a plain Link straight to /chats. Now it opens the same anchored
  // auth-prompt popover components/create-post-fab.tsx shows, instead
  // of navigating anywhere.
  if (!email) {
    return (
      <>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setAuthPromptOpen(true)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={STRINGS.label[lang]}
          aria-hidden={accountMenuOpen}
          tabIndex={accountMenuOpen ? -1 : undefined}
          className={buttonClassName}
          style={buttonStyle}
        >
          <ChatsIcon className="animate-chat-wiggle" />
        </button>
        <FabAuthPrompt
          open={authPromptOpen}
          onClose={() => setAuthPromptOpen(false)}
          signInHref="/sign-in?reason=profile-action"
          panelRef={panelRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={flyoutTriggerRef}
        onClick={() => setFlyoutOpen((v) => !v)}
        onMouseEnter={handleFlyoutEnter}
        onMouseLeave={handleFlyoutLeave}
        aria-label={STRINGS.label[lang]}
        aria-hidden={accountMenuOpen}
        tabIndex={accountMenuOpen ? -1 : undefined}
        className={buttonClassName}
        style={buttonStyle}
      >
        <ChatsIcon className="animate-chat-wiggle" />
      </button>
      <ChatsFlyout
        open={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
        panelRef={flyoutPanelRef}
        onMouseEnter={handleFlyoutEnter}
        onMouseLeave={handleFlyoutLeave}
        onOpenChat={(target) => setActiveChat(target)}
      />
      {activeChat && <MiniChatWindow target={activeChat} onClose={() => setActiveChat(null)} />}
    </>
  );
}
