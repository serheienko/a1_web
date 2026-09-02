// components/inline-auth-form.tsx
//
// 2026-09-02 (Aleksandr: "давай не будем уходить на новую страницу при
// регистрации, а при нажатии... мы тут же просто будем увеличивать
// высоту этого попапа и добавим все элементы, которые нам нужны, типа
// прямо туда... даже иконка [A1] можно убрать, потому что у нас слева
// логотип A1"; then, about the nav's own signed-out "Увійти" button:
// "тут тоже при наведении... будем делать всплывающую модалку... e-mail,
// пароль, ОR, продовжити з Google, продовжити з Apple... і
// зареєструватися... не треба на окрему сторінку виводити") -- the
// actual email/password + OAuth form app/sign-in/page.tsx already had,
// pulled out here so three places can show it inline instead of
// navigating away: components/fab-auth-prompt.tsx (both FABs, once its
// own "Увійти або зареєструватися" button is pressed) and components/
// avatar-menu.tsx's signed-out "Увійти" nav link (straight on hover, no
// intermediate step -- that button's whole job IS signing in).
// app/sign-in/page.tsx still exists (direct links, no-JS fallback, a
// full page reads better there) and now just wraps this same component
// in its own page chrome instead of duplicating the form logic.
//
// `compact` drops the centered A1 logo (redundant next to a popover
// that's already anchored under/near the site's own nav-bar logo) and
// tightens spacing/type sizes so the whole thing reads right inside a
// ~320-360px popover instead of a full-page card.
"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AppleSignInButton } from "@/components/apple-sign-in-button";

export type AuthMode = "sign-in" | "sign-up";

type InlineAuthStringKey =
  | "signInTitle"
  | "signUpTitle"
  | "email"
  | "password"
  | "firstName"
  | "lastName"
  | "submitSignIn"
  | "submitSignUp"
  | "switchToSignUp"
  | "switchToSignIn"
  | "errorSignIn"
  | "errorSignUp"
  | "orDivider";

export const INLINE_AUTH_STRINGS: Record<InlineAuthStringKey, Record<Locale, string>> = {
  signInTitle: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Iniciar sesión",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  signUpTitle: {
    uk: "Створити акаунт", en: "Create account", ru: "Создать аккаунт", de: "Konto erstellen",
    es: "Crear cuenta", fr: "Créer un compte", pl: "Utwórz konto", ptBR: "Criar conta", zh: "创建账户",
  },
  email: {
    uk: "Email", en: "Email", ru: "Email", de: "E-Mail", es: "Correo electrónico",
    fr: "E-mail", pl: "E-mail", ptBR: "E-mail", zh: "邮箱",
  },
  password: {
    uk: "Пароль", en: "Password", ru: "Пароль", de: "Passwort", es: "Contraseña",
    fr: "Mot de passe", pl: "Hasło", ptBR: "Senha", zh: "密码",
  },
  firstName: {
    uk: "Ім'я", en: "First name", ru: "Имя", de: "Vorname", es: "Nombre",
    fr: "Prénom", pl: "Imię", ptBR: "Nome", zh: "名",
  },
  lastName: {
    uk: "Прізвище", en: "Last name", ru: "Фамилия", de: "Nachname", es: "Apellido",
    fr: "Nom", pl: "Nazwisko", ptBR: "Sobrenome", zh: "姓",
  },
  submitSignIn: {
    uk: "Увійти", en: "Sign in", ru: "Войти", de: "Anmelden", es: "Entrar",
    fr: "Se connecter", pl: "Zaloguj się", ptBR: "Entrar", zh: "登录",
  },
  submitSignUp: {
    uk: "Зареєструватися", en: "Sign up", ru: "Зарегистрироваться", de: "Registrieren",
    es: "Registrarse", fr: "S'inscrire", pl: "Zarejestruj się", ptBR: "Cadastrar-se", zh: "注册",
  },
  switchToSignUp: {
    uk: "Немає акаунту? Зареєструватися", en: "No account? Sign up", ru: "Нет аккаунта? Зарегистрироваться",
    de: "Kein Konto? Registrieren", es: "¿Sin cuenta? Regístrate", fr: "Pas de compte ? Inscrivez-vous",
    pl: "Nie masz konta? Zarejestruj się", ptBR: "Sem conta? Cadastre-se", zh: "还没有账户？去注册",
  },
  switchToSignIn: {
    uk: "Вже є акаунт? Увійти", en: "Already have an account? Sign in", ru: "Уже есть аккаунт? Войти",
    de: "Schon ein Konto? Anmelden", es: "¿Ya tienes cuenta? Inicia sesión", fr: "Déjà un compte ? Connectez-vous",
    pl: "Masz już konto? Zaloguj się", ptBR: "Já tem conta? Entrar", zh: "已有账户？去登录",
  },
  errorSignIn: {
    uk: "Не вдалося увійти. Перевірте email і пароль.", en: "Couldn't sign in. Check your email and password.",
    ru: "Не удалось войти. Проверьте email и пароль.", de: "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.",
    es: "No se pudo iniciar sesión. Revisa tu correo y contraseña.", fr: "Connexion impossible. Vérifiez l'e-mail et le mot de passe.",
    pl: "Nie udało się zalogować. Sprawdź e-mail i hasło.", ptBR: "Não foi possível entrar. Verifique e-mail e senha.",
    zh: "登录失败，请检查邮箱和密码。",
  },
  errorSignUp: {
    uk: "Не вдалося зареєструватися. Можливо, такий email вже використовується.",
    en: "Couldn't create an account. That email may already be in use.",
    ru: "Не удалось зарегистрироваться. Возможно, этот email уже используется.",
    de: "Konto konnte nicht erstellt werden. Die E-Mail wird eventuell schon verwendet.",
    es: "No se pudo crear la cuenta. Puede que ese correo ya esté en uso.",
    fr: "Impossible de créer un compte. Cet e-mail est peut-être déjà utilisé.",
    pl: "Nie udało się utworzyć konta. Ten e-mail może być już zajęty.",
    ptBR: "Não foi possível criar a conta. Esse e-mail já pode estar em uso.",
    zh: "创建账户失败，该邮箱可能已被使用。",
  },
  orDivider: {
    uk: "або", en: "or", ru: "или", de: "oder", es: "o",
    fr: "ou", pl: "lub", ptBR: "ou", zh: "或",
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

export function InlineAuthForm({
  lang: langProp,
  notice,
  compact = false,
  initialMode = "sign-in",
  returnTo,
}: {
  /** Pass the caller's own already-resolved locale when it has one (avoids a
   * second, redundant document.documentElement class scan on mount). */
  lang?: Locale;
  notice?: string;
  compact?: boolean;
  initialMode?: AuthMode;
  /**
   * 2026-09-02 (Aleksandr: "все логины должны после залогинювання
   * оставаться на тій сторінці, на якій ти був, не повинно уводити на
   * інші сторінки") -- where a successful SIGN-IN (not sign-up, which
   * still needs /onboarding/verify) sends the visitor. Every inline
   * popover usage (components/fab-auth-prompt.tsx, components/avatar-
   * menu.tsx's nav button, components/profile-action-row.tsx and
   * components/post-viewer-menu.tsx's centered dialogs) leaves this
   * unset on purpose, so it falls back to reloading the CURRENT URL --
   * the visitor never navigated away in the first place, so "the page
   * they were on" is just wherever this popover happens to be mounted.
   * app/sign-in/page.tsx is the one exception: visiting that page IS a
   * real navigation away from wherever the visitor started, so it pins
   * this to "/" explicitly rather than reloading /sign-in itself.
   */
  returnTo?: string;
}) {
  const detectedLang = useActiveLocale();
  const lang = langProp ?? detectedLang;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100 " +
    (compact ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm");
  const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const endpoint = mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up";
    const body =
      mode === "sign-in" ? { email, password } : { email, password, firstName, lastName };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError(mode === "sign-in" ? INLINE_AUTH_STRINGS.errorSignIn[lang] : INLINE_AUTH_STRINGS.errorSignUp[lang]);
        setPending(false);
        return;
      }
      // Full navigation on purpose -- components/site-nav.tsx only reads
      // its display cookie once on mount, so a client-side route change
      // wouldn't pick up the new session. Sign-up still goes through
      // onboarding first (a brand-new account needs that regardless of
      // where the form was opened from); sign-in returns to `returnTo`
      // if the caller pinned one, otherwise reloads whatever page this
      // form is already sitting on -- see the `returnTo` prop's own
      // comment above.
      window.location.href =
        mode === "sign-up" ? "/onboarding/verify" : returnTo ?? window.location.pathname + window.location.search;
    } catch {
      setError(mode === "sign-in" ? INLINE_AUTH_STRINGS.errorSignIn[lang] : INLINE_AUTH_STRINGS.errorSignUp[lang]);
      setPending(false);
    }
  }

  return (
    <div className={compact ? "w-full" : ""}>
      {!compact && (
        <div className="mb-6 flex justify-center">
          <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-8 w-auto dark:hidden" />
          <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-8 w-auto dark:block" />
        </div>
      )}

      <h2
        className={
          "text-center font-sans font-bold tracking-tight text-ink dark:text-neutral-50 " +
          (compact ? "mb-3 text-base" : "mb-6 text-2xl")
        }
      >
        {mode === "sign-in" ? INLINE_AUTH_STRINGS.signInTitle[lang] : INLINE_AUTH_STRINGS.signUpTitle[lang]}
      </h2>

      {notice && (
        <p className={"rounded-xl bg-accent/10 text-center text-accent " + (compact ? "-mt-1 mb-3 px-2.5 py-1.5 text-xs" : "-mt-3 mb-6 px-3 py-2 text-sm")}>
          {notice}
        </p>
      )}

      <form onSubmit={onSubmit} className={compact ? "flex flex-col gap-2.5" : "flex flex-col gap-4"}>
        {mode === "sign-up" && (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="inline-firstName" className={labelClass}>{INLINE_AUTH_STRINGS.firstName[lang]}</label>
              <input
                id="inline-firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                autoComplete="given-name"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="inline-lastName" className={labelClass}>{INLINE_AUTH_STRINGS.lastName[lang]}</label>
              <input
                id="inline-lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                autoComplete="family-name"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inline-email" className={labelClass}>{INLINE_AUTH_STRINGS.email[lang]}</label>
          <input
            id="inline-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inline-password" className={labelClass}>{INLINE_AUTH_STRINGS.password[lang]}</label>
          <input
            id="inline-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className={
            "rounded-xl bg-accent font-semibold text-white shadow-sm transition hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:shadow-none " +
            (compact ? "mt-1 py-2.5 text-sm" : "mt-2 py-3 text-sm")
          }
        >
          {mode === "sign-in" ? INLINE_AUTH_STRINGS.submitSignIn[lang] : INLINE_AUTH_STRINGS.submitSignUp[lang]}
        </button>
      </form>

      <div className={"flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600 " + (compact ? "my-3" : "my-6")}>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        {INLINE_AUTH_STRINGS.orDivider[lang]}
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className={compact ? "flex flex-col gap-2" : ""}>
        <GoogleSignInButton />
        <AppleSignInButton />
      </div>

      <p className={"text-center text-sm " + (compact ? "mt-3" : "mt-6")}>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
          className="font-medium text-accent transition hover:opacity-70"
        >
          {mode === "sign-in" ? INLINE_AUTH_STRINGS.switchToSignUp[lang] : INLINE_AUTH_STRINGS.switchToSignIn[lang]}
        </button>
      </p>
    </div>
  );
}
