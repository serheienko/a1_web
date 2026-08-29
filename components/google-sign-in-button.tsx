// components/google-sign-in-button.tsx
//
// Phase 5b (PLAN.md §6.6/§6.11): the "Sign in with Google" button on
// app/sign-in/page.tsx. Deliberately NOT the Firebase Auth SDK — Google
// Identity Services (the script below) is Google's own, lighter-weight
// library for exactly this one flow (get an ID token, hand it to our
// own backend), needs no extra npm dependency (can't `npm install`
// anyway, §0.4) and no Firebase project config. It only works because
// jobs.a1appp.com is already an authorized JavaScript origin on the Web
// client (§6.9) — GIS's popup/One Tap flow talks to Google directly from
// the browser and never redirects through our own server, so no
// server-side callback route is needed the way Apple's flow will need
// one (Phase 5b-Apple, not yet built).
//
// API shape verified against Google's own JS reference docs, 2026-08-28
// (developers.google.com/identity/gsi/web/reference/js-reference), not
// assumed: initialize({client_id, callback}), the callback receives a
// CredentialResponse whose .credential is the encoded JWT ID token —
// exactly what app/api/auth/google/route.ts forwards to auth.google.
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/a1/oauth-public";

// Minimal ambient shape for the bits of the GIS API this file actually
// calls — there is no official @types package, and installing an
// unofficial one isn't possible here anyway (§0.4: no npm registry
// access from this environment).
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: { type: string; theme: string; size: string; text: string; shape: string; width?: number },
          ): void;
        };
      };
    };
  }
}

// Literal key union, not Record<string, ...> — see app/sign-in/page.tsx's
// SignInStringKey comment for why.
type GoogleButtonStringKey = "error";

const STRINGS: Record<GoogleButtonStringKey, Record<Locale, string>> = {
  error: {
    uk: "Не вдалося увійти через Google. Спробуйте ще раз.",
    en: "Couldn't sign in with Google. Please try again.",
    ru: "Не удалось войти через Google. Попробуйте ещё раз.",
    de: "Anmeldung mit Google fehlgeschlagen. Bitte erneut versuchen.",
    es: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
    fr: "Connexion avec Google impossible. Réessayez.",
    pl: "Nie udało się zalogować przez Google. Spróbuj ponownie.",
    ptBR: "Não foi possível entrar com o Google. Tente novamente.",
    zh: "无法通过 Google 登录，请重试。",
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

export function GoogleSignInButton() {
  const lang = useActiveLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const initedRef = useRef(false);

  // Visual-parity pass, 2026-08-29 (Aleksandr, from a live mobile
  // screenshot): match components/apple-sign-in-button.tsx's black
  // button — "outline" → "filled_black" (one of Google's own supported
  // themes, verified against the JS reference, not guessed) is as close
  // as the OFFICIAL rendered button gets to Apple's custom one. Font and
  // exact icon/text layout inside the button stay Google's own — the
  // rendered button is Google's iframe content, not overridable CSS/
  // fonts. Rebuilding it as a fully custom clickable button (calling
  // accounts.id.prompt() on click instead of rendering the real widget)
  // was considered and rejected: prompt() is the One Tap surface, which
  // Google suppresses after a user has dismissed it a couple of times
  // (an exponential per-browser cooldown, separate from — and stricter
  // than — anything the always-clickable rendered button is subject to).
  // Trading a guaranteed-to-open button for a sometimes-silently-does-
  // nothing one isn't a fair trade for a purely cosmetic ask.
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);

  // Real pixel match instead of a hardcoded guess: measure the same
  // max-w-[320px] wrapper app/sign-in/page.tsx's other two buttons use,
  // so this button is exactly as wide as them at every viewport instead
  // of only "close enough" at the one width it happened to be tested at.
  useEffect(() => {
    function measure() {
      const w = wrapperRef.current?.clientWidth;
      // Google's own documented ceiling (js-reference: "the maximum
      // width is 400 pixels").
      if (w) setButtonWidth(Math.min(400, Math.round(w)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.google || initedRef.current) return;
    initedRef.current = true;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: async (response) => {
        setError(false);
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: response.credential }),
          });
          const data = await res.json().catch(() => ({ ok: false }));
          if (!res.ok || !data.ok) {
            setError(true);
            return;
          }
          window.location.href = "/";
        } catch {
          setError(true);
        }
      },
    });
  }, [scriptReady]);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.google || !buttonWidth) return;
    // renderButton appends into the node rather than replacing its
    // content — clear it first so a resize (a new width) redraws one
    // button instead of stacking a second one on top.
    containerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      // "rectangular" (not the default "pill") to match the site's own
      // rounded-xl inputs/buttons (app/sign-in/page.tsx) rather than a
      // fully round stadium shape — a deliberate visual-polish pass,
      // 2026-08-28.
      shape: "rectangular",
      width: buttonWidth,
    });
  }, [scriptReady, buttonWidth]);

  return (
    <div ref={wrapperRef} className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="w-full" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.error[lang]}</p>}
    </div>
  );
}
