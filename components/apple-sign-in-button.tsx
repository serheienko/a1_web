// components/apple-sign-in-button.tsx
//
// Phase 5b-Apple (PLAN.md §6.6/§6.16): the "Sign in with Apple" button
// on app/sign-in/page.tsx. Apple's own "Sign in with Apple JS" (the
// script below), not the Firebase Auth SDK — deliberately the same
// choice already made for Google (components/google-sign-in-button.tsx:
// no new npm dependency, no Firebase project config). This does depart
// from PLAN.md §6.10's original assumption that both buttons would go
// through Firebase's signInWithPopup — flagged there for exactly this
// reason, and resolved the same way here as it was for Google: use each
// platform's own lightest-weight first-party JS library and hand the
// resulting ID token straight to our own backend.
//
// API shape verified against Apple's own JS reference, 2026-08-29
// (developer.apple.com/documentation/sign_in_with_apple_js):
// AppleID.auth.init({clientId, scope, redirectURI, usePopup}), and with
// usePopup:true, AppleID.auth.signIn() returns a Promise resolving to
// { authorization: { code, id_token, state }, user?: {...} } — the
// id_token is exactly what app/api/auth/apple/route.ts forwards to
// auth.appleId.
//
// redirectURI caveat (PLAN.md §6.16): Apple requires this to exactly
// match one of the Services ID's registered Return URLs. The only
// Return URL on file for com.aone.aoneapp.web today is the Firebase
// generic handler (§6.10's assumption) — since this button bypasses
// Firebase, Aleksandr needs to add APPLE_REDIRECT_URI (lib/a1/oauth-
// public.ts) as an additional Return URL in Apple Developer before this
// button will work end-to-end. Flagged, not silently worked around.
//
// 2026-08-29, visual pass round 3 (Aleksandr, from a ChatGPT sign-in
// screenshot: "давай такой визуал сделаем как у GPT и кнопки можно
// скопировать по UI"): dropped the solid-black button (rounds 1/2 had
// both providers matching each other in black) for ChatGPT's own
// pattern instead — a white pill with a thin neutral border, full
// rounded-full corners, and dark text, brand icon at full color/detail.
// components/google-sign-in-button.tsx's visible overlay button was
// updated to the exact same classes so the two stay pixel-matched to
// each other, same as every round before this one.
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { APPLE_SERVICES_ID, APPLE_REDIRECT_URI } from "@/lib/a1/oauth-public";

// Minimal ambient shape for the bits of Apple's JS API this file
// actually calls — same rationale as google-sign-in-button.tsx's own
// `declare global`: no official @types package, and no npm registry
// access from this environment anyway (§0.4).
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<{ authorization: { id_token: string } }>;
      };
    };
  }
}

// Literal key union, not Record<string, ...> — same
// noUncheckedIndexedAccess fix as every other STRINGS table in this
// phase (see app/sign-in/page.tsx's SignInStringKey comment).
type AppleButtonStringKey = "label" | "error";

const STRINGS: Record<AppleButtonStringKey, Record<Locale, string>> = {
  label: {
    uk: "Продовжити з Apple", en: "Continue with Apple", ru: "Продолжить с Apple",
    de: "Weiter mit Apple", es: "Continuar con Apple", fr: "Continuer avec Apple",
    pl: "Kontynuuj z Apple", ptBR: "Continuar com a Apple", zh: "继续使用 Apple",
  },
  error: {
    uk: "Не вдалося увійти через Apple. Спробуйте ще раз.",
    en: "Couldn't sign in with Apple. Please try again.",
    ru: "Не удалось войти через Apple. Попробуйте ещё раз.",
    de: "Anmeldung mit Apple fehlgeschlagen. Bitte erneut versuchen.",
    es: "No se pudo iniciar sesión con Apple. Inténtalo de nuevo.",
    fr: "Connexion avec Apple impossible. Réessayez.",
    pl: "Nie udało się zalogować przez Apple. Spróbuj ponownie.",
    ptBR: "Não foi possível entrar com a Apple. Tente novamente.",
    zh: "无法通过 Apple 登录，请重试。",
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

export function AppleSignInButton() {
  const lang = useActiveLocale();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const initedRef = useRef(false);

  useEffect(() => {
    if (!scriptReady || !window.AppleID || initedRef.current) return;
    initedRef.current = true;
    window.AppleID.auth.init({
      clientId: APPLE_SERVICES_ID,
      scope: "name email",
      redirectURI: APPLE_REDIRECT_URI,
      usePopup: true,
    });
  }, [scriptReady]);

  async function handleClick() {
    if (!window.AppleID) return;
    setError(false);
    setPending(true);
    try {
      const res = await window.AppleID.auth.signIn();
      const idToken = res.authorization.id_token;
      const apiRes = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });
      const data = await apiRes.json().catch(() => ({ ok: false }));
      if (!apiRes.ok || !data.ok) {
        setError(true);
        setPending(false);
        return;
      }
      window.location.href = "/";
    } catch {
      // Includes the user closing the popup — Apple's SDK rejects the
      // promise for that too, not just a real failure, so this stays a
      // quiet no-op-looking retry rather than an alarming error for a
      // plain cancel. Good enough for now; revisit if that reads as
      // confusing in practice.
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !scriptReady}
        className="flex w-full max-w-[320px] items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
      >
        <AppleGlyph />
        {STRINGS.label[lang]}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.error[lang]}</p>}
    </div>
  );
}

// Apple's own glyph, per their Sign in with Apple button guidelines
// (a bare wordmark button still needs the logo). Inline SVG, no new
// asset/icon-font dependency.
function AppleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.98-3.17-14.35-3.17-4.58 0-9.5 1.05-14.77 3.17-5.28 2.13-9.53 3.24-12.77 3.35-4.93 .21-9.84-1.96-14.75-6.52-3.13-2.73-7.05-7.41-11.75-14.04-5.04-7.08-9.18-15.28-12.42-24.62-3.47-10.09-5.21-19.86-5.21-29.32 0-10.84 2.34-20.19 7.03-28.02 3.69-6.29 8.6-11.25 14.75-14.89 6.15-3.64 12.79-5.49 19.94-5.61 3.92 0 9.07 1.21 15.47 3.6 6.38 2.4 10.48 3.61 12.27 3.61 1.34 0 5.89-1.42 13.61-4.25 7.3-2.62 13.46-3.71 18.5-3.28 13.68 1.1 23.96 6.5 30.79 16.21-12.24 7.42-18.29 17.8-18.17 31.11 .11 10.37 3.86 18.99 11.23 25.83 3.34 3.17 7.07 5.63 11.22 7.38-.9 2.61-1.85 5.11-2.85 7.51zM119.11 4.36c0 8.09-2.96 15.65-8.86 22.65-7.12 8.32-15.73 13.13-25.07 12.37-.12-.98-.19-2.01-.19-3.09 0-7.77 3.38-16.09 9.4-22.88 3-3.44 6.82-6.29 11.45-8.56 4.62-2.24 8.99-3.48 13.1-3.68 .12 1.06 .17 2.13 .17 3.19z" />
    </svg>
  );
}
