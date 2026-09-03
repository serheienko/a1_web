// app/onboarding/verify/page.tsx
//
// Phase 6 (PLAN.md §6.15): second of the two post-signup onboarding
// steps — email code verification. Whole page is a client component:
// the only server-side thing it would need (the visitor's email, to
// show "code sent to X") is already available client-side via the
// plain DISPLAY_COOKIE (lib/a1/session-constants.ts), same pattern
// components/account-menu.tsx uses — no reason to force this page into
// dynamic server rendering just for that.
//
// Confirmed API shape (PLAN.md §6.15, pulled from the live openapi.json
// 2026-08-29): POST /api/account/verify-email takes no body and returns
// {key, codeLength, expiresAt} — codeLength drives how many digit boxes
// render (4, matching both the app's own screenshots and the real
// verification email), expiresAt (unix seconds) drives the actual resend
// countdown instead of a guessed duration. POST /api/account/
// verify-email-confirm takes {key, code} and returns ok:true/false — no
// documented error shape for a wrong code, so a non-ok response just
// shows a generic "wrong code" message.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { LottiePlayer } from "@/components/lottie-player";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { authFetch } from "@/lib/auth-fetch";

type StringKey =
  | "title"
  | "codeSentTo"
  | "resendPrompt"
  | "resendAction"
  | "resendCountdown"
  | "changeEmail"
  | "errorWrongCode"
  | "errorGeneric";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Введіть код підтвердження", en: "Enter confirmation code", ru: "Введите код подтверждения",
    de: "Bestätigungscode eingeben", es: "Introduce el código de confirmación",
    fr: "Entrez le code de confirmation", pl: "Wprowadź kod potwierdzający",
    ptBR: "Digite o código de confirmação", zh: "输入确认码",
  },
  codeSentTo: {
    uk: "Код надіслано на", en: "Code sent to", ru: "Код отправлен на",
    de: "Code gesendet an", es: "Código enviado a", fr: "Code envoyé à",
    pl: "Kod wysłany na", ptBR: "Código enviado para", zh: "验证码已发送至",
  },
  resendPrompt: {
    uk: "Не отримали код?", en: "Didn't receive the code?", ru: "Не получили код?",
    de: "Keinen Code erhalten?", es: "¿No recibiste el código?", fr: "Vous n'avez pas reçu le code ?",
    pl: "Nie otrzymałeś kodu?", ptBR: "Não recebeu o código?", zh: "没有收到验证码?",
  },
  resendAction: {
    uk: "Надіслати ще раз", en: "Resend", ru: "Отправить ещё раз", de: "Erneut senden",
    es: "Reenviar", fr: "Renvoyer", pl: "Wyślij ponownie", ptBR: "Reenviar", zh: "重新发送",
  },
  resendCountdown: {
    uk: "Надіслати ще раз через", en: "Resend in", ru: "Отправить ещё раз через",
    de: "Erneut senden in", es: "Reenviar en", fr: "Renvoyer dans",
    pl: "Wyślij ponownie za", ptBR: "Reenviar em", zh: "重新发送倒计时",
  },
  changeEmail: {
    uk: "Змінити електронну пошту", en: "Change email", ru: "Изменить электронную почту",
    de: "E-Mail ändern", es: "Cambiar correo", fr: "Changer d'e-mail",
    pl: "Zmień adres e-mail", ptBR: "Alterar e-mail", zh: "更改邮箱",
  },
  errorWrongCode: {
    uk: "Невірний код. Спробуйте ще раз.", en: "Incorrect code. Please try again.",
    ru: "Неверный код. Попробуйте ещё раз.", de: "Falscher Code. Bitte erneut versuchen.",
    es: "Código incorrecto. Inténtalo de nuevo.", fr: "Code incorrect. Réessayez.",
    pl: "Nieprawidłowy kod. Spróbuj ponownie.", ptBR: "Código incorreto. Tente novamente.",
    zh: "验证码错误,请重试。",
  },
  errorGeneric: {
    uk: "Щось пішло не так. Спробуйте ще раз.", en: "Something went wrong. Please try again.",
    ru: "Что-то пошло не так. Попробуйте ещё раз.", de: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    es: "Algo salió mal. Inténtalo de nuevo.", fr: "Une erreur est survenue. Réessayez.",
    pl: "Coś poszło nie tak. Spróbuj ponownie.", ptBR: "Algo deu errado. Tente novamente.",
    zh: "出错了,请重试。",
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

function readDisplayEmail(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  // match[1] (a capture group) is typed string | undefined under this
  // project's noUncheckedIndexedAccess — same class of error as
  // components/account-menu.tsx's own readDisplayCookie() already
  // documents, and PLAN.md §6.12/§6.13's other build failures. Missed it
  // here despite that precedent existing in the same codebase.
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : "";
}

const DEFAULT_CODE_LENGTH = 4;

// mm:ss for anything a minute or longer, plain seconds otherwise — the
// app's own screenshot showed a bare seconds counter ("Не отримали
// код? 55"), this just also covers a longer expiresAt gracefully.
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0";
  if (totalSeconds < 60) return String(totalSeconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function OnboardingVerifyPage() {
  const lang = useActiveLocale();
  const [email, setEmail] = useState("");
  const [otpKey, setOtpKey] = useState<string | null>(null);
  const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [digits, setDigits] = useState<string[]>(Array(DEFAULT_CODE_LENGTH).fill(""));
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const requestCode = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const res = await authFetch("/api/account/verify-email", { method: "POST" });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError(STRINGS.errorGeneric[lang]);
        setSending(false);
        return;
      }
      setOtpKey(data.key);
      setCodeLength(data.codeLength || DEFAULT_CODE_LENGTH);
      setExpiresAt(data.expiresAt ? data.expiresAt * 1000 : null);
      setDigits(Array(data.codeLength || DEFAULT_CODE_LENGTH).fill(""));
      setSending(false);
    } catch {
      setError(STRINGS.errorGeneric[lang]);
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    setEmail(readDisplayEmail());
    requestCode();
    // Intentionally only on mount — requestCode is stable enough for
    // this page's lifetime, re-running it on every lang change would
    // send a needless extra code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0;
  const canResend = !sending && (expiresAt === null || secondsLeft <= 0);

  const submitCode = useCallback(
    async (code: string) => {
      if (!otpKey || pending) return;
      setPending(true);
      setError(null);
      try {
        const res = await authFetch("/api/account/verify-email-confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: otpKey, code }),
        });
        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) {
          setError(STRINGS.errorWrongCode[lang]);
          setDigits(Array(codeLength).fill(""));
          inputRefs.current[0]?.focus();
          setPending(false);
          return;
        }
        window.location.href = "/onboarding/profile";
      } catch {
        setError(STRINGS.errorGeneric[lang]);
        setPending(false);
      }
    },
    [otpKey, pending, lang, codeLength],
  );

  function handleDigitChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (value && index === codeLength - 1) {
      const full = digits.slice(0, index).concat(value).join("");
      if (full.length === codeLength) submitCode(full);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, codeLength);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(codeLength).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    if (pasted.length === codeLength) {
      submitCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }

  async function onChangeEmail() {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    window.location.href = "/sign-in";
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-12">
      <div className="rounded-card border border-neutral-200 bg-card p-8 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
        <div className="mb-6 flex justify-center">
          <LottiePlayer src="/animations/phone-verify-code.json" size={120} />
        </div>

        <h1 className="mb-1 text-center font-sans text-2xl font-bold tracking-tight text-ink dark:text-neutral-50">
          {STRINGS.title[lang]}
        </h1>
        {email && (
          <p className="mb-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            {STRINGS.codeSentTo[lang]} <span className="font-medium">{email}</span>
          </p>
        )}

        <div className="mb-4 flex justify-center gap-2.5">
          {Array.from({ length: codeLength }).map((_, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[i] ?? ""}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={pending || sending}
              className="h-14 w-12 rounded-xl border border-neutral-300 bg-white text-center text-2xl outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 disabled:opacity-50 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
              style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif' }}
            />
          ))}
        </div>

        {error && <p className="mb-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          {canResend ? (
            <button
              type="button"
              onClick={requestCode}
              className="font-medium text-accent hover:underline"
            >
              {STRINGS.resendAction[lang]}
            </button>
          ) : (
            <span>
              {STRINGS.resendPrompt[lang]} {formatCountdown(secondsLeft)}
            </span>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onChangeEmail}
            className="text-xs text-neutral-400 underline-offset-2 hover:underline dark:text-neutral-500"
          >
            {STRINGS.changeEmail[lang]}
          </button>
        </div>

        <Link
          href="/onboarding/profile"
          className="mt-6 block text-center text-xs text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400"
        >
          {/* Deliberately no translated "skip" copy — this isn't meant
              to be a prominent escape hatch, just a quiet way out for a
              visitor who's stuck (e.g. a code that never arrives). */}
          →
        </Link>
      </div>
    </main>
  );
}
