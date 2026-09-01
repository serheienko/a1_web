// app/sign-in/page.tsx
//
// Phase 5a (PLAN.md §6.6): the whole first slice of Stage 2 in one page —
// sign in with an existing email+password account, or create one. On
// success the two API routes (app/api/auth/sign-in, sign-up) already set
// both session cookies (lib/a1/session.ts); this page's only job after
// that is to send the visitor back to "/" with a full navigation
// (`window.location.href`, not the router) so components/site-nav.tsx
// remounts and re-reads the client-visible display cookie fresh — it
// only checks that cookie once on mount, by design, to stay a plain
// client-side read with no shared auth context to wire up for this
// phase (PLAN.md "smallest possible slice").
//
// Deliberately plain visually — PLAN.md §4 Phase 5 (the *visual* design
// pass, a different "Phase 5" than this file's Stage-2 "Phase 5a") says
// not to invest in UI polish before that session; this reuses the same
// tokens (--color-accent, --radius-card) and input style already
// established in components/filters-form.tsx rather than inventing a new
// visual language for one page that will likely be restyled later.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AppleSignInButton } from "@/components/apple-sign-in-button";

type Mode = "sign-in" | "sign-up";

// Same "read the active lang-XX class client-side" trick as
// components/settings-menu.tsx — <T/> only helps for server-rendered
// spans, not for values needed as plain strings/props here.
//
// A literal key union (not Record<string, ...>) — same convention
// components/filters-form.tsx already uses, and for the same reason:
// with tsconfig's noUncheckedIndexedAccess on, a generic `string` key
// makes every STRINGS.foo[lang] read "possibly undefined" even for keys
// that always exist. This is a real fix, found the hard way — the first
// Vercel build of this page failed on exactly that (PLAN.md §6.12).
type SignInStringKey =
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
  | "backHome"
  | "orDivider"
  | "createPostNotice";

const STRINGS: Record<SignInStringKey, Record<Locale, string>> = {
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
  backHome: {
    uk: "← На головну", en: "← Back home", ru: "← На главную", de: "← Zur Startseite",
    es: "← Volver al inicio", fr: "← Retour à l'accueil", pl: "← Strona główna", ptBR: "← Voltar ao início",
    zh: "← 返回首页",
  },
  orDivider: {
    uk: "або", en: "or", ru: "или", de: "oder", es: "o",
    fr: "ou", pl: "lub", ptBR: "ou", zh: "或",
  },
  // Shown only when arrived via components/create-post-fab.tsx's
  // signed-out click (?reason=create-post) — see this page's own
  // `showCreatePostNotice` state below for why it's not shown by
  // default on a plain visit to this page.
  createPostNotice: {
    uk: "Щоб створити допис, зареєструйтесь або увійдіть.",
    en: "To create a post, please sign up or sign in.",
    ru: "Чтобы создать публикацию, зарегистрируйтесь или войдите.",
    de: "Um einen Beitrag zu erstellen, registrieren Sie sich oder melden Sie sich an.",
    es: "Para crear una publicación, regístrate o inicia sesión.",
    fr: "Pour créer une publication, inscrivez-vous ou connectez-vous.",
    pl: "Aby utworzyć post, zarejestruj się lub zaloguj.",
    ptBR: "Para criar uma publicação, cadastre-se ou entre.",
    zh: "要创建帖子，请注册或登录。",
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

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100";

const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

export default function SignInPage() {
  const lang = useActiveLocale();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 2026-08-29: true only when arrived via components/create-post-
  // fab.tsx's signed-out click, never on a plain visit to /sign-in —
  // see components/create-post-fab.tsx's own comment for the full
  // rationale ("текст показываем только после нажатия на кнопку с +").
  // Read with a plain URLSearchParams over `window.location.search` in
  // an effect rather than next/navigation's useSearchParams — same
  // "avoid a Next hook that needs a Suspense boundary for one purely
  // cosmetic client read" reasoning this page already applies to locale/
  // theme (see useActiveLocale above).
  const [showCreatePostNotice, setShowCreatePostNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowCreatePostNotice(params.get("reason") === "create-post");
  }, []);

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
        setError(mode === "sign-in" ? STRINGS.errorSignIn[lang] : STRINGS.errorSignUp[lang]);
        setPending(false);
        return;
      }
      // Full navigation on purpose — see the file-level comment above.
      // Sign-up (PLAN.md §6.15): a brand-new account has none of the
      // profile fields set yet and its email isn't verified — route it
      // through the two onboarding steps first. Sign-in (an existing
      // account) skips straight to "/" as before.
      window.location.href = mode === "sign-up" ? "/onboarding/verify" : "/";
    } catch {
      setError(mode === "sign-in" ? STRINGS.errorSignIn[lang] : STRINGS.errorSignUp[lang]);
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 w-fit text-sm text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-50">
        {STRINGS.backHome[lang]}
      </Link>

      {/* Visual pass, 2026-08-28 (Aleksandr: "красивый UI как у GPT/
          Claude") — layout/spacing/labels only, no logic changed. Still
          deliberately not the full §4 Phase 5 design pass (a different
          "Phase 5"): same tokens as every other card on the site
          (rounded-card/bg-card, PLAN.md's Figma-sourced values), just
          given the room a focal auth screen needs — a centered brand
          mark, labeled fields instead of placeholder-only ones, and more
          breathing room, the way a modern sign-in card usually reads. */}
      <div className="rounded-card border border-neutral-200 bg-card p-8 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
        <div className="mb-6 flex justify-center">
          <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-8 w-auto dark:hidden" />
          <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-8 w-auto dark:block" />
        </div>

        <h1 className="mb-6 text-center font-sans text-2xl font-bold tracking-tight text-ink dark:text-neutral-50">
          {mode === "sign-in" ? STRINGS.signInTitle[lang] : STRINGS.signUpTitle[lang]}
        </h1>

        {showCreatePostNotice && (
          <p className="-mt-3 mb-6 rounded-xl bg-accent/10 px-3 py-2 text-center text-sm text-accent">
            {STRINGS.createPostNotice[lang]}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "sign-up" && (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="firstName" className={labelClass}>{STRINGS.firstName[lang]}</label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="lastName" className={labelClass}>{STRINGS.lastName[lang]}</label>
                <input
                  id="lastName"
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
            <label htmlFor="email" className={labelClass}>{STRINGS.email[lang]}</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={labelClass}>{STRINGS.password[lang]}</label>
            <input
              id="password"
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
            className="mt-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            {mode === "sign-in" ? STRINGS.submitSignIn[lang] : STRINGS.submitSignUp[lang]}
          </button>
        </form>

        {/* Phase 5b (PLAN.md §6.6/§6.11/§6.16): both Google and Apple
            are unblocked now — Andrew accepted both client ids, see
            PLAN.md §6.16. */}
        <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          {STRINGS.orDivider[lang]}
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <GoogleSignInButton />
        <AppleSignInButton />

        <p className="mt-6 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
            }}
            className="font-medium text-accent transition hover:opacity-70"
          >
            {mode === "sign-in" ? STRINGS.switchToSignUp[lang] : STRINGS.switchToSignIn[lang]}
          </button>
        </p>
      </div>
    </main>
  );
}
