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
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { SettingsMenu } from "@/components/settings-menu";
import { MyPostsPanel } from "@/components/my-posts-panel";

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

type AvatarMenuStringKey = "signIn" | "signOut" | "theme" | "language" | "light" | "dark" | "auto" | "myPosts";

const STRINGS: Record<AvatarMenuStringKey, Record<Locale, string>> = {
  signIn: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Iniciar sesión",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  signOut: {
    uk: "Вийти", en: "Sign out", ru: "Выйти", de: "Abmelden", es: "Cerrar sesión",
    fr: "Se déconnecter", pl: "Wyloguj się", ptBR: "Sair", zh: "退出",
  },
  // 2026-08-29 (Aleksandr: "посты должны быть CRUD, create / update /
  // delete") — entry point into components/my-posts-panel.tsx.
  myPosts: {
    uk: "Мої пости", en: "My posts", ru: "Мои посты", de: "Meine Beiträge",
    es: "Mis publicaciones", fr: "Mes publications", pl: "Moje posty",
    ptBR: "Minhas publicações", zh: "我的帖子",
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
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
  const [myPostsOpen, setMyPostsOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
    setTheme(root.classList.contains("dark") ? "dark" : root.classList.contains("light") ? "light" : "auto");
    setIsGeoUa(root.classList.contains("geo-ua"));
    setEmail(readDisplayCookie());
  }, []);

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

  if (!email) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/sign-in" aria-label={STRINGS.signIn[lang]} className={ICON_BUTTON_CLASS + " w-9"}>
          <UserIcon />
          <span className="hidden text-sm font-medium sm:inline">{STRINGS.signIn[lang]}</span>
        </Link>
        <SettingsMenu />
      </div>
    );
  }

  const languageOptions = LOCALES.filter((l) => !(isGeoUa && l === "ru"));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={email}
        aria-expanded={open}
        className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 transition hover:opacity-90 dark:ring-white/10"
      >
        {/* Always the cat fallback for now — see this file's header
            comment on why a real uploaded photo isn't wired up yet. */}
        <img src={pickDefaultCatAvatar(email)} alt="" className="h-full w-full object-cover" />
      </button>

      {open && (
        <>
          {/* Same portal-backdrop trick as settings-menu.tsx, for the
              same reason — this sits inside site-nav.tsx's
              `transform: translateZ(0)` <nav>, which becomes the
              containing block for a `position: fixed` descendant, so a
              non-portaled backdrop would be clipped to the nav's own
              small box instead of covering the page. See that
              component's own comment for the full history. */}
          {createPortal(
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />,
            document.body,
          )}
          <div className="animate-popover absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="truncate px-2 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-50" title={email}>
              {email}
            </div>

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
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition " +
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
            <div className="max-h-52 overflow-y-auto">
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

            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMyPostsOpen(true);
              }}
              className="mb-1.5 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {STRINGS.myPosts[lang]}
            </button>

            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-1 w-full rounded-lg border border-red-600 bg-transparent px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500/10"
            >
              {STRINGS.signOut[lang]}
            </button>
          </div>
        </>
      )}

      {myPostsOpen && <MyPostsPanel onClose={() => setMyPostsOpen(false)} />}
    </div>
  );
}
