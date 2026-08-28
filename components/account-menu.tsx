// components/account-menu.tsx
//
// Phase 5a (PLAN.md §6.6): "a session, 'signed in as X' in the nav." Lives
// in components/site-nav.tsx next to <SettingsMenu>, and follows the
// exact same constraint that component already documents — reads its
// state from a plain cookie via a client-side effect, never via
// cookies()/headers() on the server, so mounting this in the nav (which
// sits above every page, including the ISR'd feed) does not force those
// pages into dynamic rendering (PLAN.md §6.2).
//
// Deliberately reads lib/a1/session-constants.ts's DISPLAY_COOKIE (just
// the email, non-httpOnly) rather than the real session cookie — that
// one is httpOnly by design and is not supposed to be readable here at
// all. (The constant lives in its own tiny module, not lib/a1/session.ts
// — see that file's own comment for why: this component can't afford to
// pull in next/headers.)
//
// 2026-08-28, mobile overflow fix (Aleksandr: "sign in не влазит на
// мобильной"): reproduced at 375px — the centered pill nav
// (site-nav.tsx) leaves very little room on the right, and several
// locales' "Sign in"/"Sign out" text (e.g. Spanish "Iniciar sesión")
// simply doesn't fit next to <SettingsMenu>'s circular button, so it got
// visually clipped/overlapped. Fixed the same way this codebase already
// hides the email on narrow screens: icon-only, same h-9 w-9 circular
// button style as SettingsMenu (so the two sit as a matched pair), text
// label added back from `sm:` up. This is locale-length-independent —
// works whether the label is "Entrar" or "Se déconnecter" — rather than
// a fix tuned to fit today's specific translations.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
// From the constants-only module, not lib/a1/session.ts itself — that
// one also imports next/headers, which a client component can't bundle
// (this is exactly the bug that broke the first build, 2026-08-28; see
// lib/a1/session-constants.ts's own comment).
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";

// Literal key union, not Record<string, ...> — see app/sign-in/page.tsx's
// SignInStringKey comment for why (noUncheckedIndexedAccess + a generic
// string key otherwise makes every lookup "possibly undefined").
type AccountMenuStringKey = "signIn" | "signOut";

const ACCOUNT_MENU_STRINGS: Record<AccountMenuStringKey, Record<Locale, string>> = {
  signIn: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Iniciar sesión",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  signOut: {
    uk: "Вийти", en: "Sign out", ru: "Выйти", de: "Abmelden", es: "Cerrar sesión",
    fr: "Se déconnecter", pl: "Wyloguj się", ptBR: "Sair", zh: "退出",
  },
};

// Same 18px/viewBox-24/stroke-2 style as ThemeIcon in settings-menu.tsx.
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// Matches SettingsMenu's own circular button exactly (components/
// settings-menu.tsx) so the two form a matched pair in the nav —
// h-9 w-9 icon-only below `sm`, growing into a labeled pill from `sm` up.
const ICON_BUTTON_CLASS =
  "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-0 text-neutral-500 shadow-sm ring-1 ring-black/5 transition hover:text-neutral-900 sm:w-auto sm:px-3.5 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-white/10 dark:hover:text-neutral-50";

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  // match[1] (a capture group) is typed string | undefined under this
  // project's noUncheckedIndexedAccess — same class of error as
  // PLAN.md §6.12/§6.13's other two build failures, caught before
  // pushing this time.
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

export function AccountMenu() {
  const [lang, setLang] = useState<Locale>("uk");
  // null = "not signed in", not "still loading" — a brief flash from
  // "Sign in" to the signed-in state on a hard reload is an accepted
  // tradeoff for this phase (PLAN.md "smallest possible slice"), same
  // spirit as the theme/lang anti-flash scripts existing for the things
  // that DID need to be flash-free, and not extending that machinery
  // here for a much lower-stakes flash.
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
    setEmail(readDisplayCookie());
  }, []);

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
      <Link href="/sign-in" aria-label={ACCOUNT_MENU_STRINGS.signIn[lang]} className={ICON_BUTTON_CLASS + " w-9"}>
        <UserIcon />
        <span className="hidden text-sm font-medium sm:inline">{ACCOUNT_MENU_STRINGS.signIn[lang]}</span>
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-sm text-neutral-500 dark:text-neutral-400 sm:inline" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        aria-label={ACCOUNT_MENU_STRINGS.signOut[lang]}
        className={ICON_BUTTON_CLASS + " w-9 disabled:opacity-50"}
      >
        <LogOutIcon />
        <span className="hidden text-sm font-medium sm:inline">{ACCOUNT_MENU_STRINGS.signOut[lang]}</span>
      </button>
    </div>
  );
}
