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
// Deliberately reads lib/a1/session.ts's DISPLAY_COOKIE (just the email,
// non-httpOnly) rather than the real session cookie — that one is
// httpOnly by design and is not supposed to be readable here at all.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { DISPLAY_COOKIE } from "@/lib/a1/session";

const ACCOUNT_MENU_STRINGS: Record<string, Record<Locale, string>> = {
  signIn: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Iniciar sesión",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  signOut: {
    uk: "Вийти", en: "Sign out", ru: "Выйти", de: "Abmelden", es: "Cerrar sesión",
    fr: "Se déconnecter", pl: "Wyloguj się", ptBR: "Sair", zh: "退出",
  },
};

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
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
      <Link
        href="/sign-in"
        className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
      >
        {ACCOUNT_MENU_STRINGS.signIn[lang]}
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
        className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-50"
      >
        {ACCOUNT_MENU_STRINGS.signOut[lang]}
      </button>
    </div>
  );
}
