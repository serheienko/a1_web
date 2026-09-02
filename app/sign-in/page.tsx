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
import { InlineAuthForm } from "@/components/inline-auth-form";

// Same "read the active lang-XX class client-side" trick as
// components/settings-menu.tsx — <T/> only helps for server-rendered
// spans, not for values needed as plain strings/props here.
type SignInStringKey = "backHome" | "createPostNotice" | "profileActionNotice";

const STRINGS: Record<SignInStringKey, Record<Locale, string>> = {
  backHome: {
    uk: "← На головну", en: "← Back home", ru: "← На главную", de: "← Zur Startseite",
    es: "← Volver al inicio", fr: "← Retour à l'accueil", pl: "← Strona główna", ptBR: "← Voltar ao início",
    zh: "← 返回首页",
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
  // 2026-09-02: shown when arrived via components/profile-action-row.tsx's
  // signed-out click on Add contact / Message / Save (?reason=
  // profile-action) -- same pattern as createPostNotice above, just for
  // the profile action row Aleksandr asked to keep visible (not hidden)
  // for signed-out visitors, gating the real actions on sign-in instead.
  profileActionNotice: {
    uk: "Щоб скористатися цією дією, зареєструйтесь або увійдіть.",
    en: "To use this action, please sign up or sign in.",
    ru: "Чтобы воспользоваться этим действием, зарегистрируйтесь или войдите.",
    de: "Um diese Aktion zu nutzen, registrieren Sie sich oder melden Sie sich an.",
    es: "Para usar esta acción, regístrate o inicia sesión.",
    fr: "Pour utiliser cette action, inscrivez-vous ou connectez-vous.",
    pl: "Aby skorzystać z tej funkcji, zarejestruj się lub zaloguj.",
    ptBR: "Para usar esta ação, cadastre-se ou entre.",
    zh: "要使用此功能，请注册或登录。",
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

export default function SignInPage() {
  const lang = useActiveLocale();
  // 2026-08-29: true only when arrived via components/create-post-
  // fab.tsx's signed-out click, never on a plain visit to /sign-in —
  // see components/create-post-fab.tsx's own comment for the full
  // rationale ("текст показываем только после нажатия на кнопку с +").
  // Read with a plain URLSearchParams over `window.location.search` in
  // an effect rather than next/navigation's useSearchParams — same
  // "avoid a Next hook that needs a Suspense boundary for one purely
  // cosmetic client read" reasoning this page already applies to locale
  // (see useActiveLocale above).
  const [showCreatePostNotice, setShowCreatePostNotice] = useState(false);
  const [showProfileActionNotice, setShowProfileActionNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowCreatePostNotice(params.get("reason") === "create-post");
    setShowProfileActionNotice(params.get("reason") === "profile-action");
  }, []);

  const notice = showCreatePostNotice
    ? STRINGS.createPostNotice[lang]
    : showProfileActionNotice
      ? STRINGS.profileActionNotice[lang]
      : undefined;

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
          breathing room, the way a modern sign-in card usually reads.
          2026-09-02: the actual form now lives in components/inline-
          auth-form.tsx, shared with the popover versions of this same
          form (components/fab-auth-prompt.tsx, components/avatar-
          menu.tsx's signed-out nav button) -- this page is just that
          component's own chrome (back link, card, full-page layout). */}
      <div className="rounded-card border border-neutral-200 bg-card p-8 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
        <InlineAuthForm lang={lang} notice={notice} />
      </div>
    </main>
  );
}
