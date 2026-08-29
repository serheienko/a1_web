// components/create-post-fab.tsx
//
// 2026-08-29 (Aleksandr, from the same 7-screenshot backlog as the nav-
// shadow/cat-avatar/Google-button fixes): a floating "+" button, bottom
// right, for creating a post — shown whether signed in or not
// ("С логином и без").
//
// Signed OUT: clicking navigates to /sign-in?reason=create-post rather
// than opening anything here. app/sign-in/page.tsx checks for that
// query param and shows one extra line above the form — "to create a
// post, sign up or sign in" — but ONLY on that path, never on a plain
// visit to /sign-in. Aleksandr's own words on this: "чтобы вело на
// аторизацию при нажатии, но там добавим текст... То стеста
// показваем только после нажатия на кнопку с +" — the text is
// conditional on having arrived via this button, not shown pre-emptively
// on the FAB itself or by default on the sign-in page.
//
// Signed IN: clicking opens a small stub dialog, not a real post-
// creation form — scope explicitly cut down via AskUserQuestion
// ("Просто заглушка пока"). The real form is separate future work;
// swap `setStubOpen(true)` below for a real flow when that's built.
//
// Reads the display cookie the same way components/avatar-menu.tsx and
// its predecessor account-menu.tsx do — a plain client-side cookie read
// in an effect, not a server session, so mounting this in the root
// layout (app/layout.tsx, right alongside <SiteNav/>) never forces the
// whole site into dynamic rendering (PLAN.md §6.2).
//
// Button color: `bg-accent` — already the site's one CSS variable for
// "the brand blue for the current theme" (app/globals.css: #335ef7
// light / #0c8ce9 dark), the same "2 брендовых синих в зависимости от
// темы" Aleksandr asked for, not two new hardcoded hexes.
//
// Icon: a chunky, rounded-cap plus (thick stroke + round linecaps) on a
// rounded-square (not fully circular) button, matching the mobile app's
// own FAB from Aleksandr's reference screenshot ("мне крест нравится
// более пухлый с скругленными углами, вот как у нас в апке").
"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";

type FabStringKey = "label" | "stubTitle" | "stubBody" | "close";

const STRINGS: Record<FabStringKey, Record<Locale, string>> = {
  label: {
    uk: "Створити пост", en: "Create post", ru: "Создать пост", de: "Beitrag erstellen",
    es: "Crear publicación", fr: "Créer une publication", pl: "Utwórz post",
    ptBR: "Criar publicação", zh: "创建帖子",
  },
  stubTitle: {
    uk: "Створення поста", en: "Create a post", ru: "Создание поста", de: "Beitrag erstellen",
    es: "Crear publicación", fr: "Créer une publication", pl: "Utwórz post",
    ptBR: "Criar publicação", zh: "创建帖子",
  },
  stubBody: {
    uk: "Ця функція скоро з'явиться.", en: "This feature is coming soon.",
    ru: "Эта функция скоро появится.", de: "Diese Funktion kommt bald.",
    es: "Esta función estará disponible pronto.", fr: "Cette fonctionnalité arrive bientôt.",
    pl: "Ta funkcja pojawi się wkrótce.", ptBR: "Esse recurso estará disponível em breve.",
    zh: "此功能即将推出。",
  },
  close: {
    uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar",
    fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭",
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

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

// Thick stroke + round caps/join is what makes this read as "chunky"
// rather than the thin, sharp-cornered plus a default icon set would
// give — deliberately not reused from anywhere else in this app since
// nothing else needed this weight.
function ChunkyPlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CreatePostFab() {
  const lang = useActiveLocale();
  const [email, setEmail] = useState<string | null>(null);
  const [stubOpen, setStubOpen] = useState(false);

  useEffect(() => {
    setEmail(readDisplayCookie());
  }, []);

  function handleClick() {
    if (email) {
      setStubOpen(true);
    } else {
      window.location.href = "/sign-in?reason=create-post";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={STRINGS.label[lang]}
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30 transition hover:opacity-90 active:scale-95"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <ChunkyPlusIcon />
      </button>

      {stubOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setStubOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h2 className="mb-1.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {STRINGS.stubTitle[lang]}
            </h2>
            <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
              {STRINGS.stubBody[lang]}
            </p>
            <button
              type="button"
              onClick={() => setStubOpen(false)}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {STRINGS.close[lang]}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
