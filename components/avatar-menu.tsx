// components/avatar-menu.tsx
//
// 2026-08-29 (Aleksandr, resuming an earlier-session ask): "давай сделаем
// тот UI профиля, который я говорил вместо кнопок выйти и тд, сделаем
// модалку" — replaces components/account-menu.tsx's signed-in state
// (email text + "Вийти" button) AND components/settings-menu.tsx's "•••"
// button with ONE avatar button. Clicking it opens a single panel: email
// at top, the same theme/language pickers settings-menu.tsx had, and a
// RED sign-out action at the very bottom.
//
// Signed OUT, this renders the exact same "Sign in" link account-menu.tsx
// always has, plus <SettingsMenu/> unchanged next to it — there is no
// avatar/account to attach a consolidated panel to yet, and someone who
// isn't signed in still needs a way to reach theme/language. So
// site-nav.tsx now mounts only <AvatarMenu/>; this component decides
// internally whether that means "one avatar button" or "sign-in link +
// settings button", the same way account-menu.tsx already decided
// "signed-in row" vs "sign-in link" internally. Reads the display cookie
// the same way account-menu.tsx did — see that file's own comment for
// why (client-side cookie read, not a server session, so mounting this
// in the nav never forces every page under it into dynamic rendering).
//
// KNOWN GAP, flagged rather than silently worked around: there is no
// confirmed backend call yet for "get my own username/photo" (PLAN.md's
// endpoint table has no `users.getMe`/`account.getProfile`-style read,
// only `account.updateProfile`, which returns a full user on WRITE, not
// on a plain read). DISPLAY_COOKIE only ever carried the signed-in
// email (lib/a1/session-constants.ts) — never a username or photo — so
// this can only render lib/avatars.ts's deterministic cat avatar (seeded
// on the email, the one stable per-user string available client-side
// today), never a real uploaded photo. When a real "get my profile"
// endpoint exists, swap the seed to the real username and add the real
// avatarUrl branch (same real-photo-vs-cat split app/u/[username]/
// page.tsx already does) — structured below so that only needs a new
// `photoUrl` variable, not a rewrite.
//
// Cat avatar shape: rounded-full here specifically, per Aleksandr's
// 2026-08-29 follow-up ("аватар тоже наверное сделай круглым") on a live
// screenshot of this exact button — overrides the rounded-xl choice
// pickDefaultCatAvatar's other 4 call sites still use (post-card.tsx,
// app/u/[username]/page.tsx, app/jobs/[slug]/page.tsx, app/talents/
// [slug]/page.tsx), where the square full-bleed gradient fill still
// needs to stay uncropped. This one small 36px nav button reads fine
// cropped to a circle in practice — verify live after deploy, and if a
// particular seed's crop looks bad, revisit.
//
// 2026-08-29, sign-out button follow-up (Aleksandr, from a live mobile
// screenshot: "Sign out сделай без заливки только красный stroke"):
// switched from a solid red fill to an outline — transparent
// background, red border + red text, a light red tint only on hover.
//
// 2026-08-30 (Aleksandr: "сделать в этой модалке возможность, чтобы мы
// переходили на этот профиль... посмотреть, что там у нас происходит и
// могли... нажать на наши посты"): a "View profile" row into this same
// panel. First pass piggybacked on /api/posts/mine's author id, which
// only resolved for a visitor with at least one post — Aleksandr caught
// that immediately ("должна быть возможность всегда посмотреть свой
// профиль"), so this now calls the dedicated /api/account/whoami route
// instead (see that route's own comment for how it gets a username with
// still no real whoami endpoint on the backend) and renders the row
// whenever a username comes back, with or without any posts.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { SettingsMenu } from "@/components/settings-menu";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { InlineAuthForm } from "@/components/inline-auth-form";
import { setAccountMenuOpen } from "@/lib/account-menu-open";
import { authFetch } from "@/lib/auth-fetch";
import { MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";

type Theme = "light" | "dark" | "auto";

// Same two tables settings-menu.tsx already has (theme names, language
// names) — kept as its own copy rather than importing from that file,
// matching how every other button/menu component in this app carries
// its own STRINGS table rather than sharing one (see e.g. google-sign-
// in-button.tsx's and apple-sign-in-button.tsx's near-identical STRINGS
// shapes) — settings-menu.tsx isn't set up to export these standalone.
const LANGUAGE_NAMES: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  pl: "Polski",
  ptBR: "Português (Brasil)",
  zh: "简体中文",
};

type AvatarMenuStringKey = "signIn" | "signOut" | "theme" | "language" | "light" | "dark" | "auto" | "viewProfile" | "contacts" | "myActivity" | "chats";

const STRINGS: Record<AvatarMenuStringKey, Record<Locale, string>> = {
  signIn: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Iniciar sesión",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  signOut: {
    uk: "Вийти", en: "Sign out", ru: "Выйти", de: "Abmelden", es: "Cerrar sesión",
    fr: "Se déconnecter", pl: "Wyloguj się", ptBR: "Sair", zh: "退出",
  },
  viewProfile: {
    uk: "Переглянути профіль", en: "View profile", ru: "Посмотреть профиль", de: "Profil ansehen",
    es: "Ver perfil", fr: "Voir le profil", pl: "Zobacz profil",
    ptBR: "Ver perfil", zh: "查看资料",
  },
  // 2026-09-01 (Aleksandr, second thoughts on the same panel: "надо
  // сделать это такими просто отдельными строчками, как сейчас у нас
  // контакты, и под ним контакты отображать отдельно. А этот My Activity
  // уже отображать тремя табами. Но ещё раз: мы в самой модалке ничего
  // не отображаем. Это всё кнопки-ссылки, которые ведут на страницу.")
  // -- reverses the same-day "embed the tabs directly in the dropdown"
  // pass (components/contacts-panel.tsx, since deleted, had that
  // history): the panel goes back to being link rows only, no fetching,
  // no lists rendered inline. This row is the new one, sitting above
  // the Контакти row below it; it points at app/my-activity/page.tsx,
  // which is where the Мої дописи/Збережені дописи/Збережені
  // користувачі tabs actually live now (as real page tabs, styled after
  // the native app's own My posts/Saved posts/Saved users screen he
  // screenshotted, not the Тема-style 3-button grid this dropdown briefly
  // had).
  myActivity: {
    uk: "Моя активність", en: "My Activity", ru: "Моя активность", de: "Meine Aktivität",
    es: "Mi actividad", fr: "Mon activité", pl: "Moja aktywność", ptBR: "Minha atividade", zh: "我的动态",
  },
  // 2026-08-31, first-pass placement for app/contacts/page.tsx (Aleksandr:
  // "где-то у нас какую-то контактную книгу... я пока не сильно знаю UI,
  // где и как это расположить") — restored as its own plain row per
  // 2026-09-01 follow-up ("контакты оставим как есть") once the tabbed
  // Мої дописи/Збережені experience moved into components/contacts-panel.tsx
  // below it (that panel has since been deleted; the tabs now live at
  // app/my-activity/page.tsx, opened by the "My Activity" row above).
  // 2026-09-01, Phase 1 of the web chat feature (Aleksandr: "я хочу
  // добавить еще веб-версию чата") -- same plain link-row treatment as
  // myActivity/contacts above, opening app/chats/page.tsx. Placement is
  // provisional, same "first pass, react to it live" framing app/
  // contacts/page.tsx's own entry point got.
  chats: {
    uk: "Чати", en: "Chats", ru: "Чаты", de: "Chats", es: "Chats",
    fr: "Discussions", pl: "Czaty", ptBR: "Conversas", zh: "聊天",
  },
  contacts: {
    uk: "Контакти", en: "Contacts", ru: "Контакты", de: "Kontakte", es: "Contactos",
    fr: "Contacts", pl: "Kontakty", ptBR: "Contatos", zh: "联系人",
  },
  theme: {
    uk: "Тема", en: "Theme", ru: "Тема", de: "Design", es: "Tema",
    fr: "Thème", pl: "Motyw", ptBR: "Tema", zh: "主题",
  },
  language: {
    uk: "Мова", en: "Language", ru: "Язык", de: "Sprache", es: "Idioma",
    fr: "Langue", pl: "Język", ptBR: "Idioma", zh: "语言",
  },
  light: {
    uk: "Світла", en: "Light", ru: "Светлая", de: "Hell", es: "Claro",
    fr: "Clair", pl: "Jasny", ptBR: "Claro", zh: "浅色",
  },
  dark: {
    uk: "Темна", en: "Dark", ru: "Тёмная", de: "Dunkel", es: "Oscuro",
    fr: "Sombre", pl: "Ciemny", ptBR: "Escuro", zh: "深色",
  },
  auto: {
    uk: "Авто", en: "Auto", ru: "Авто", de: "Automatisch", es: "Automático",
    fr: "Automatique", pl: "Automatyczny", ptBR: "Automático", zh: "自动",
  },
};

const THEME_OPTIONS: Theme[] = ["light", "dark", "auto"];

// Identical to settings-menu.tsx's ThemeIcon — see that component's own
// comment for the icon style rationale (18px/viewBox-24/stroke-2,
// matches account-menu.tsx's UserIcon/LogOutIcon).
function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-theme-pop" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-theme-pop" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-theme-pop" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-person-hop">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

// 2026-08-31, app/contacts/page.tsx's entry point — same 18px/viewBox-24/
// stroke-2 style as ThemeIcon/UserIcon above.
function ContactsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-person-hop" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

// 2026-09-01, app/chats/page.tsx's entry point -- speech-bubble glyph,
// same 18px/viewBox-24/stroke-2 style as the icons around it.
function ChatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-chat-wiggle" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

// 2026-09-01, app/my-activity/page.tsx's entry point -- same 18px/
// viewBox-24/stroke-2 style as the icons above. Document/list glyph so
// it reads distinctly from ContactsIcon's people glyph.
function MyActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-share-lift" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

// Aleksandr, 2026-08-30 (live screenshot: "профиль и посты сливаются с
// выбором языка... надо поднимать выше, это более нужная информация"):
// small icons so the new merged account block below reads as its own
// distinct thing at a glance, not just more text rows in the same list
// as theme/language.
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-neutral-300 dark:text-neutral-600">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Same circular icon-button style account-menu.tsx used for its
// signed-out "Sign in" link, kept byte-for-byte so nothing shifts in the
// signed-out layout.
const ICON_BUTTON_CLASS =
  "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-0 text-neutral-500 shadow-sm ring-1 ring-black/5 transition hover:text-neutral-900 sm:w-auto sm:px-3.5 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-white/10 dark:hover:text-neutral-50";

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

export function AvatarMenu() {
  const [lang, setLang] = useState<Locale>("uk");
  const [theme, setTheme] = useState<Theme>("auto");
  const [isGeoUa, setIsGeoUa] = useState(false);
  // null = "not signed in" — same accepted brief-flash tradeoff
  // account-menu.tsx already documented (its own comment), unchanged
  // here.
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  // Aleksandr, 2026-08-30: "у вас (Claude) это сделано для левого меню...
  // наводишь на кнопку, не нажимаешь, оно появляется. Если ушёл не
  // выбрав, исчезает плавно, с opacity. Хочу такое же при наведении на
  // аватара." First pass had two real bugs, both reported back with a
  // screen recording:
  //
  // 1) "не исчезает всегда... по горизонтали сверху исчезает, вниз по
  //    вертикали не исчезает, зависает" -- the panel sat `mt-2` below
  //    the button, a real gap where NOTHING is painted. Whether a
  //    mouseleave/re-entering mouseenter fires correctly while crossing
  //    that dead strip depends on the exact pixels the cursor happens to
  //    cross and how fast -- exactly the "sometimes works, sometimes
  //    doesn't, direction-dependent" symptom described. The robust fix
  //    used by basically every hover-menu isn't a longer delay (still
  //    racy), it's removing the dead zone: the outer positioning wrapper
  //    below now uses `pt-2` (padding) instead of `mt-2` (margin) and
  //    starts flush at `top-full`, so the hoverable rectangle is
  //    CONTINUOUS from the button's bottom edge through to the visible
  //    card -- there is no pixel in between that belongs to neither. The
  //    visible card (background/border/shadow) is a separate inner div
  //    so the padding itself stays invisible.
  // 2) "появляется не плавно... скопируй точно, как у вас" -- mounting
  //    the panel already at its OPEN opacity/scale (which the previous
  //    version did, since `open` was already true the instant `rendered`
  //    flipped true in the same commit) gives CSS nothing to transition
  //    FROM -- a transition only plays on a CHANGE after paint, not on
  //    an element's very first frame. `visible` is the fix: the panel
  //    mounts in its closed style, then a rAF (guaranteed to run only
  //    after that closed frame has actually painted) flips it to open,
  //    so the opacity/scale change is a real, animated transition
  //    exactly like a native hover-card rather than a pop.
  //
  // Hover-intent open/close (onMouseEnter/onMouseLeave on the wrapper)
  // is additive to the existing onClick toggle -- click still works as
  // before, which matters since mobile has no hover at all. The close
  // side keeps a short delay (not instant setOpen(false)): even with the
  // dead-zone gone, a brief grace period is still what makes "moved
  // toward the panel and back" or a jittery cursor path feel forgiving
  // rather than twitchy.
  // 2026-08-30 follow-up: extracted into lib/use-hover-panel.ts once
  // Aleksandr asked for components/filters-form.tsx's filter button to
  // get "такой же идентичный эффект... надо переиспользовать, чтобы
  // работало идентично" -- see that hook's own header comment for the
  // two real bugs (dead-zone gap, no-transition-on-mount) and the
  // no-leave-event edge case that shaped it; this call site is
  // unchanged behavior, just relocated.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelOuterRef = useRef<HTMLDivElement | null>(null);
  const { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen } = useHoverPanel(open, setOpen, [
    { trigger: wrapperRef, panel: panelOuterRef },
  ]);
  // 2026-09-02 (Aleksandr, live mobile screenshot: this panel's own
  // "Chats" row sits under components/chats-fab.tsx's fixed button on
  // mobile) -- mirror `open` into the shared store that button reads,
  // so it can fade itself out while this panel is up instead of
  // overlapping it. See lib/account-menu-open.ts's own header for why
  // a plain external store rather than Context.
  useEffect(() => {
    setAccountMenuOpen(open);
    return () => setAccountMenuOpen(false);
  }, [open]);
  // 2026-09-01 (Aleksandr, live screenshot: "чем мы можем показать, что
  // языки можно скроллить и есть еще?" -- after the max-h-36 cut above
  // landed exactly on a 4-row boundary with no partial row peeking
  // through, the list just looked like it ended at the 4th language,
  // not like it scrolled). A bottom edge-fade (same trick iOS pickers/
  // Notion dropdowns use) that's hidden once actually scrolled to the
  // bottom -- langMoreBelow starts true (there IS more below on open)
  // and the scroll handler keeps it honest as the visitor scrolls.
  const langScrollRef = useRef<HTMLDivElement>(null);
  const [langMoreBelow, setLangMoreBelow] = useState(true);
  const updateLangMoreBelow = () => {
    const el = langScrollRef.current;
    if (!el) return;
    setLangMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };
  // `rendered` (not `open`) -- this panel unmounts/remounts with the
  // hover-panel's own open/close animation (see useHoverPanel above),
  // so re-measure every time it's actually back in the DOM.
  useEffect(() => {
    updateLangMoreBelow();
  }, [rendered]);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  // Aleksandr, 2026-08-30 (live screenshot): "может быть поставь не
  // цветная векторное синее, поставь аватар, персональный этот
  // профиль" -- app/api/account/whoami now also returns a real
  // avatarUrl (same buildMediaProxyUrl pipeline as every other real-
  // photo-or-cat-fallback spot in this app), closing the gap this
  // file's own header comment used to flag. Shared between the nav
  // button and the merged account row below so they never show two
  // different pictures for the same account.
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
    setTheme(root.classList.contains("dark") ? "dark" : root.classList.contains("light") ? "light" : "auto");
    setIsGeoUa(root.classList.contains("geo-ua"));
    setEmail(readDisplayCookie());
  }, []);

  // Resolve a "View profile" target once we know the visitor is signed
  // in. Aleksandr, 2026-08-30, correcting my first pass at this (which
  // piggybacked on /api/posts/mine and so only worked for a visitor with
  // at least one post): "должна быть возможность всегда посмотреть свой
  // профиль" — now calls the dedicated /api/account/whoami route
  // instead, which resolves independently of whether the visitor has
  // ever posted anything (see that route's own comment for how it gets
  // a username with no whoami endpoint to call).
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    // authFetch, not a bare fetch: on /contacts, app/contacts/
    // page.tsx fires its own list fetch at roughly the same moment
    // this effect fires -- see lib/auth-fetch.ts for why racing two
    // authenticated fetches could make ONE of them (wrongly) throw
    // away the session after the access token expires.
    authFetch("/api/account/whoami")
      .then((r) => {
        // 2026-09-03 (Aleksandr, live screenshots: after the access
        // token expires -- roughly an hour, hour and a half idle --
        // /chats correctly flips to "Увійдіть, щоб побачити свої
        // чати" (app/chats/page.tsx's own 401 handling), but THIS
        // menu kept showing the old signed-in email/avatar with a
        // working-looking "Вийти" button until clicked a couple
        // times. Root cause: `email` above is only ever set ONCE, at
        // mount, from a cookie snapshot (see the effect above this
        // one) -- nothing ever told this component the session had
        // since died, even though this exact whoami call proves it on
        // every fire. `clearSession()` (lib/a1/session.ts) already
        // wipes the display cookie server-side the moment ANY route
        // hits a real NoSessionError, so a 401 here is authoritative,
        // not a fluke worth ignoring -- flip back to the signed-out
        // render immediately instead of quietly discarding the
        // 401 and leaving the stale identity on screen.
        if (cancelled) return null;
        if (r.status === 401) {
          setEmail(null);
          setProfileUsername(null);
          setProfileAvatarUrl(null);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (data.username) setProfileUsername(data.username);
        if (data.avatarUrl) setProfileAvatarUrl(data.avatarUrl);
      })
      .catch(() => {
        // Best-effort — the row just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  function selectTheme(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    try {
      if (next === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable — same best-effort fallback settings-
      // menu.tsx already accepted.
    }
  }

  function selectLocale(locale: Locale) {
    if (isGeoUa && locale === "ru") return;
    setLang(locale);
    const root = document.documentElement;
    for (const l of LOCALES) {
      root.classList.toggle(LOCALE_CLASS[l], l === locale);
    }
    root.lang = LOCALE_TAG[locale];
    try {
      localStorage.setItem("lang", locale);
    } catch {
      // Same as above.
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  // 2026-09-02 (Aleksandr: "тут тоже при наведении на UVT (Увійти) тоже
  // будем делать всплывающую модалку... e-mail, пароль, ОR, продовжити
  // з Google, продовжити з Apple... і зареєструватися... не треба на
  // окрему сторінку виводити") -- reuses this same component's own
  // hover-panel plumbing (`open`/`wrapperRef`/`panelOuterRef`/`rendered`/
  // `visible`, already declared above for the signed-in dropdown) since
  // only one of the two branches ever renders per mount. Straight to
  // components/inline-auth-form.tsx's form on hover, unlike components/
  // fab-auth-prompt.tsx's own two-step version -- this button's whole
  // job IS signing in, so there's no separate short pitch to show
  // first. A plain tap with no prior hover (touch devices, where hover
  // never fires) still just navigates through the Link as before.
  if (!email) {
    return (
      <div className="flex items-center gap-1">
        <div className="relative shrink-0 cursor-pointer" ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <Link
            href="/sign-in"
            aria-label={STRINGS.signIn[lang]}
            aria-expanded={open}
            onClick={(e) => {
              if (open) e.preventDefault();
            }}
            className={ICON_BUTTON_CLASS + " w-9 group"}
          >
            <UserIcon />
            <span className="hidden text-sm font-medium sm:inline">{STRINGS.signIn[lang]}</span>
          </Link>

          {rendered && (
            <>
              {open &&
                createPortal(
                  <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />,
                  document.body,
                )}
              <div className="absolute right-0 top-full z-50 w-80 max-w-[calc(100vw-2rem)] origin-top-right pt-2" ref={panelOuterRef}>
                <div
                  className={
                    "max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-lg transition duration-150 ease-out dark:border-neutral-700 dark:bg-neutral-900 " +
                    (visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")
                  }
                >
                  <InlineAuthForm lang={lang} compact />
                </div>
              </div>
            </>
          )}
        </div>
        <SettingsMenu />
      </div>
    );
  }

  const languageOptions = LOCALES.filter((l) => !(isGeoUa && l === "ru"));

  return (
    <div className="relative shrink-0 cursor-pointer" ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        // lib/use-hover-panel.ts, 2026-09-04 entry: same "•••"-menu tap
        // bug (iOS synthesizes mouseenter+click together on a first tap,
        // and a plain toggle here flips this panel straight back closed).
        onClick={() => {
          if (isRecentHoverOpen()) return;
          setOpen((v) => !v);
        }}
        aria-label={email}
        aria-expanded={open}
        className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 transition hover:opacity-90 dark:ring-white/10"
      >
        {/* Real uploaded photo when whoami resolved one, cat fallback
            otherwise (e.g. still loading, or no photo set) -- see
            profileAvatarUrl's own comment above. */}
        <img src={profileAvatarUrl ?? pickDefaultCatAvatar(email)} alt="" className="h-full w-full object-cover" style={MEDIA_BLUR_STYLE} />
      </button>

      {rendered && (
        <>
          {/* Same portal-backdrop trick as settings-menu.tsx, for the
              same reason — this sits inside site-nav.tsx's
              `transform: translateZ(0)` <nav>, which becomes the
              containing block for a `position: fixed` descendant, so a
              non-portaled backdrop would be clipped to the nav's own
              small box instead of covering the page. See that
              component's own comment for the full history. Tied to
              `open`, not `rendered` -- once closing has started, clicks
              elsewhere on the page should work immediately, not be
              swallowed by a backdrop for a fading-out panel. */}
          {open &&
            createPortal(
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />,
              document.body,
            )}
          {/* Outer wrapper: `pt-2` PADDING (not `mt-2` margin) is the
              actual fix for the "hangs open / closes inconsistently"
              bug -- see this component's state-block comment above. The
              wrapper itself stays visually invisible (no background/
              border/shadow of its own) so it doesn't change how the
              panel looks; it only extends the real, continuous
              mouse-hoverable rectangle from the button down through
              what used to be a dead-space gap. All the actual card
              styling that used to live on this same div moved to the
              inner child div below. */}
          <div className="absolute right-0 top-full z-50 w-72 max-w-[calc(100vw-2rem)] origin-top-right pt-2" ref={panelOuterRef}>
            <div
              className={
                "overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg transition duration-150 ease-out dark:border-neutral-700 dark:bg-neutral-900 " +
                (visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")
              }
            >
            {/* Aleksandr, 2026-08-30: "мои посты и просмотр профиля
                должны жить в одном месте... поднять выше, это более
                нужная информация" -- one grouped, tinted block instead
                of two plain text rows buried below theme/language. */}
            <div className="overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
              {profileUsername ? (
                <Link
                  href={profileHref(profileUsername)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileAvatarUrl ?? pickDefaultCatAvatar(email)}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    style={MEDIA_BLUR_STYLE}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50" title={email}>
                      {email}
                    </span>
                    <span className="block text-xs text-accent">{STRINGS.viewProfile[lang]}</span>
                  </span>
                  <ChevronRightIcon />
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 px-2.5 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileAvatarUrl ?? pickDefaultCatAvatar(email)}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    style={MEDIA_BLUR_STYLE}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50" title={email}>
                    {email}
                  </span>
                </div>
              )}
            </div>

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            {/* 2026-09-01 (Aleksandr, final word on this same panel):
                both of these are plain link rows -- nothing fetches or
                renders inline here anymore. My Activity sits above
                Контакти, in that order, and opens app/my-activity/
                page.tsx, which is where the three tabs (Мої дописи/
                Збережені дописи/Збережені користувачі) actually live. */}
            <Link
              href="/my-activity"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <MyActivityIcon />
              {STRINGS.myActivity[lang]}
            </Link>

            <Link
              href="/chats"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ChatsIcon />
              {STRINGS.chats[lang]}
            </Link>

            <Link
              href="/contacts"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ContactsIcon />
              {STRINGS.contacts[lang]}
            </Link>

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            <div className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {STRINGS.theme[lang]}
            </div>
            <div className="mb-2 grid grid-cols-3 gap-1.5 px-1">
              {THEME_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTheme(key)}
                  className={
                    "group flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition " +
                    (theme === key
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800")
                  }
                >
                  <ThemeIcon theme={key} />
                  {STRINGS[key][lang]}
                </button>
              ))}
            </div>

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            <div className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {STRINGS.language[lang]}
            </div>
            {/* 2026-09-01 (Aleksandr, live screenshot: "сделай высоту окна
                где именно языки... ниже, где-то на 30%, т е сделай чтобы
                помещалось 4 языка, а остальное скролл"): max-h-52 (208px,
                ~6 rows) -> max-h-36 (144px, ~4 rows at this list's own
                py-2/text-sm row height) -- a ~31% cut, everything past
                the 4th language scrolls same as before. */}
            <div className="relative">
              <div ref={langScrollRef} onScroll={updateLangMoreBelow} className="max-h-36 overflow-y-auto">
                {languageOptions.map((l) => {
                  const isSelected = l === lang;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => selectLocale(l)}
                      className={
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition " +
                        (isSelected
                          ? "bg-accent/10 text-accent"
                          : "text-neutral-700 hover:bg-accent/10 hover:text-accent dark:text-neutral-300")
                      }
                    >
                      <span>{LANGUAGE_NAMES[l]}</span>
                      {isSelected && (
                        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {langMoreBelow && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-b-md bg-gradient-to-t from-white to-transparent dark:from-neutral-900" />
              )}
            </div>

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-1 w-full rounded-lg border border-red-600 bg-transparent px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500/10"
            >
              {STRINGS.signOut[lang]}
            </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
