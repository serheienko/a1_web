// components/settings-menu.tsx
//
// Aleksandr, 2026-08-27: "давайте... сделаем iOS нативные [попапы]... И
// там, где у нас выбор темы и выбор языка, давай сделаем просто сверху
// три точки... при нажатии будет открываться какая-то кастомная штука...
// чтобы выбор темы был автоматический, тёмный или светлый. И туда же
// как-то помести языки." — replaces the two separate icon buttons
// (components/theme-toggle.tsx, components/lang-toggle.tsx) with one
// "•••" button that opens a single panel combining both: a 3-way theme
// picker (Light/Dark/Auto, matching the native app's own appearance
// picker) and the full 9-language list below it.
//
// Presentation is responsive rather than one fixed style everywhere
// (confirmed with Aleksandr — mobile only): below Tailwind's `sm`
// breakpoint the panel is a bottom sheet fixed to the viewport (backdrop,
// rounded top corners, slide-up entrance — see the `sheet-up`/
// `sheet-backdrop-in` keyframes in app/globals.css), matching the native
// app's own bottom-sheet pickers (his reference screenshot). At `sm` and
// above it's the same compact anchored dropdown every other popover in
// this app already uses (components/filters-form.tsx's category/filter
// panels, the old lang-toggle.tsx this replaces).
//
// Portal note: this component is rendered inside components/site-nav.tsx's
// <nav>, which sets `transform: translateZ(0)` (an iOS Safari sticky-scroll
// jank fix — do not remove it to "simplify" this). Per the CSS spec, any
// transformed ancestor becomes the containing block for `position: fixed`
// descendants, which would pin the mobile sheet to the NAV's box instead
// of the viewport. Rendering the sheet through a portal into document.body
// sidesteps that entirely — the desktop dropdown doesn't need this (plain
// `position: absolute` anchors to its own nearest positioned ancestor
// regardless of transforms elsewhere), so only the mobile branch portals.
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";

type Theme = "light" | "dark" | "auto";

const LANGUAGE_NAMES: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  pl: "Polski",
  ptBR: "Português (Brasil)",
  zh: "简体中文",
};

// Plain-value strings this client component needs (aria-labels, section
// headers) — same reasoning as FILTERS_FORM_STRINGS in filters-form.tsx:
// <T/> can't help inside attribute values or text that isn't server-
// rendered per-locale spans, so this reads the active lang-XX class
// itself and looks values up here.
const SETTINGS_MENU_STRINGS: Record<string, Record<Locale, string>> = {
  settings: {
    uk: "Налаштування", en: "Settings", ru: "Настройки", de: "Einstellungen", es: "Ajustes",
    fr: "Paramètres", pl: "Ustawienia", ptBR: "Configurações", zh: "设置",
  },
  theme: {
    uk: "Тема", en: "Theme", ru: "Тема", de: "Design", es: "Tema",
    fr: "Thème", pl: "Motyw", ptBR: "Tema", zh: "主题",
  },
  language: {
    uk: "Мова", en: "Language", ru: "Язык", de: "Sprache", es: "Idioma",
    fr: "Langue", pl: "Język", ptBR: "Idioma", zh: "语言",
  },
  light: {
    uk: "Світла", en: "Light", ru: "Светлая", de: "Hell", es: "Claro",
    fr: "Clair", pl: "Jasny", ptBR: "Claro", zh: "浅色",
  },
  dark: {
    uk: "Темна", en: "Dark", ru: "Тёмная", de: "Dunkel", es: "Oscuro",
    fr: "Sombre", pl: "Ciemny", ptBR: "Escuro", zh: "深色",
  },
  auto: {
    uk: "Авто", en: "Auto", ru: "Авто", de: "Automatisch", es: "Automático",
    fr: "Automatique", pl: "Automatyczny", ptBR: "Automático", zh: "自动",
  },
};

const THEME_OPTIONS: Theme[] = ["light", "dark", "auto"];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [lang, setLang] = useState<Locale | null>(null);
  const [isGeoUa, setIsGeoUa] = useState(false);
  // null until measured client-side — nothing opens until we know which
  // presentation to render (avoids briefly mounting the wrong one).
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.classList.contains("dark") ? "dark" : root.classList.contains("light") ? "light" : "auto");
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    setLang(active ?? "uk");
    setIsGeoUa(root.classList.contains("geo-ua"));

    const mq = window.matchMedia("(min-width: 640px)");
    setIsMobile(!mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function selectTheme(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    try {
      if (next === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable (private mode, disabled) — still works
      // for the current page load via the class alone.
    }
  }

  function selectLocale(locale: Locale) {
    // Defensive, mirrors app/layout.tsx's LANG_INIT_SCRIPT: "ru" is never
    // a valid choice for geo-ua visitors.
    if (isGeoUa && locale === "ru") return;

    setLang(locale);
    const root = document.documentElement;
    for (const l of LOCALES) {
      root.classList.toggle(LOCALE_CLASS[l], l === locale);
    }
    root.lang = LOCALE_TAG[locale];
    try {
      localStorage.setItem("lang", locale);
    } catch {
      // Same as above — best-effort persistence, not required to work.
    }
  }

  const languageOptions = LOCALES.filter((l) => !(isGeoUa && l === "ru"));
  const str = (key: string) => (lang ? SETTINGS_MENU_STRINGS[key]?.[lang] ?? "" : "");

  const panelBody = (
    <>
      <div className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {str("theme")}
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1.5 px-1 sm:mb-2">
        {THEME_OPTIONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTheme(key)}
            className={
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition " +
              (theme === key
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800")
            }
          >
            <ThemeIcon theme={key} />
            {str(key)}
          </button>
        ))}
      </div>

      <div className="my-2 border-t border-neutral-100 dark:border-neutral-800" />

      <div className="px-1 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {str("language")}
      </div>
      <div className="max-h-64 overflow-y-auto sm:max-h-52">
        {languageOptions.map((l) => {
          const isSelected = l === lang;
          return (
            <button
              key={l}
              type="button"
              onClick={() => selectLocale(l)}
              className={
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition sm:py-1.5 " +
                (isSelected
                  ? "bg-accent/10 text-accent"
                  : "text-neutral-700 hover:bg-accent/10 hover:text-accent dark:text-neutral-300")
              }
            >
              <span>{LANGUAGE_NAMES[l]}</span>
              {isSelected && (
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="relative shrink-0" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={str("settings")}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <circle cx="4" cy="10" r="1.7" />
          <circle cx="10" cy="10" r="1.7" />
          <circle cx="16" cy="10" r="1.7" />
        </svg>
      </button>

      {open && isMobile === true &&
        createPortal(
          <>
            <div
              className="animate-sheet-backdrop fixed inset-0 z-30 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={panelRef}
              className="animate-sheet-up fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-neutral-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />
              {panelBody}
            </div>
          </>,
          document.body,
        )}

      {open && isMobile === false && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {panelBody}
        </div>
      )}
    </div>
  );
}
