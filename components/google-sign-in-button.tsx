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
//
// 2026-08-29, visual-parity pass round 2 (Aleksandr, after round 1's
// `theme: "filled_black"` still wasn't enough — wanted the exact same
// corner radius as the blue Sign-in button and a normal font weight,
// neither of which Google's rendered widget lets CSS touch, since it's
// their own iframe content): switched to the "invisible overlay"
// pattern used across the industry for a fully custom Google button —
// render OUR OWN button, pixel-identical to Apple's (same classes, same
// icon size/position, same border-radius, same font), then lay the
// REAL Google-rendered button on top with opacity 0. A click still
// lands on Google's actual, official button and goes through its
// normal, always-reliable flow — nothing about auth.google's contract
// changes, only what's visible changed. This is why the fully-custom-
// via-prompt() idea from round 1's comment was rejected but this one
// isn't: prompt() replaces Google's mechanism with a weaker one (One
// Tap, suppressible); this replaces nothing — Google's button still
// does the work, just invisibly.
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
type GoogleButtonStringKey = "label" | "error";

const STRINGS: Record<GoogleButtonStringKey, Record<Locale, string>> = {
  label: {
    uk: "Продовжити з Google", en: "Continue with Google", ru: "Продолжить с Google",
    de: "Weiter mit Google", es: "Continuar con Google", fr: "Continuer avec Google",
    pl: "Kontynuuj z Google", ptBR: "Continuar com o Google", zh: "继续使用 Google",
  },
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
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);

  // Measures the same box our own visible button fills, so the
  // invisible real Google button underneath covers exactly the same
  // area — no dead edges that look clickable but aren't, no real
  // button peeking out past our custom one.
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
      // Theme/shape/text below don't matter for how this LOOKS anymore
      // (opacity-0 in the JSX) — kept as sensible, valid values since
      // they still shape the real click target's size via `width`.
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: buttonWidth,
    });
  }, [scriptReady, buttonWidth]);

  return (
    <div ref={wrapperRef} className="relative mx-auto flex w-full max-w-[320px] flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {/* Purely visual — pixel-matched to components/apple-sign-in-
          button.tsx's button (same radius, weight, icon size) per
          Aleksandr's ask. pointer-events-none so a click always falls
          through to the real Google button layered on top of it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none flex w-full items-center justify-center gap-2 rounded-xl border border-black bg-black px-4 py-2.5 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
      >
        <GoogleGlyph />
        {STRINGS.label[lang]}
      </div>
      {/* The real, official Google button — invisible, sized to cover
          the same box as the button above, and the thing that actually
          receives the click. */}
      <div ref={containerRef} className="absolute inset-0 top-0 h-full w-full overflow-hidden opacity-0" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.error[lang]}</p>}
    </div>
  );
}

// Google's official 4-color "G" glyph (the version they ship inside
// their own rendered button), reproduced here so the purely-visual
// button above matches it exactly rather than approximating with a
// generic icon.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
        c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
        c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
        l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
        c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
        c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24
        C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
