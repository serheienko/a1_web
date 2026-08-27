// components/lang-toggle.tsx
//
// N-language switcher popover (Aleksandr, 2026-08-27: "давай добавлять
// локализацию на наш сайт... сделаем тоже возможность переключения
// языка", scoped to exactly the 9 languages the mobile app's own
// Settings → Language screen lists: English, Українська, Deutsch,
// Español, Français, Polski, Português (Brasil), 简体中文, Русский).
// Replaces the old binary UK/RU toggle button with a small popover
// listing every language by its native name and a checkmark on the
// active one — same button+popover UX already built for the category
// filter (see components/filters-form.tsx's filtersOpen/filtersRef
// pattern, mirrored here).
//
// Default (no stored choice) stays Ukrainian, matching the SSR markup
// in app/layout.tsx's anti-flash script. Selecting a language sets the
// matching lang-XX class from app/globals.css's custom-variants, sets
// <html lang>, and persists the choice to localStorage so it survives
// reloads — same mechanism the old toggle used, just generalized from
// one boolean to the full Locale union.
//
// Ukraine carve-out (Aleksandr, 2026-08-28, quoted verbatim because the
// scoping matters): "это только касается русского языка в гео
// Украине... все остальные языки... должны показываться как
// переключатель" — geo-ua excludes ONLY "ru" from this list, never the
// switcher itself. Unlike the old toggle (which hid its whole button
// behind `geo-ua:hidden` — a coincidence of only ever having two
// languages, uk and ru), this component stays visible for geo-ua
// visitors and simply omits the "ru" entry from the list they see.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import { GlobeIcon } from "@/components/globe-icon";

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

// Short code shown on the closed button itself — same spot the old
// toggle's "УКР"/"РУС" text occupied.
const LOCALE_SHORT: Record<Locale, string> = {
  uk: "УКР",
  en: "EN",
  ru: "РУС",
  de: "DE",
  es: "ES",
  fr: "FR",
  pl: "PL",
  ptBR: "PT",
  zh: "中",
};

export function LangToggle() {
  // null until mounted, same reasoning as ThemeToggle: don't render a
  // label that might not match what the anti-flash script already set.
  const [lang, setLang] = useState<Locale | null>(null);
  const [isGeoUa, setIsGeoUa] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    setLang(active ?? "uk");
    setIsGeoUa(root.classList.contains("geo-ua"));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function selectLocale(locale: Locale) {
    // Defensive, mirrors the anti-flash script's own rule in
    // app/layout.tsx — "ru" is never a valid choice for geo-ua visitors,
    // even if something tried to hand this function one directly.
    if (isGeoUa && locale === "ru") return;

    setLang(locale);
    setOpen(false);
    const root = document.documentElement;
    for (const l of LOCALES) {
      root.classList.toggle(LOCALE_CLASS[l], l === locale);
    }
    root.lang = LOCALE_TAG[locale];
    try {
      localStorage.setItem("lang", locale);
    } catch {
      // Storage can be unavailable (private mode, disabled) — the switch
      // still works for the current page load via the class alone.
    }
  }

  const options = LOCALES.filter((l) => !(isGeoUa && l === "ru"));

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        aria-expanded={open}
        className="flex h-9 min-w-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
      >
        <GlobeIcon className="h-4 w-4" />
        {lang === null ? null : LOCALE_SHORT[lang]}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 max-h-80 w-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {options.map((l) => {
            const isSelected = l === lang;
            return (
              <button
                key={l}
                type="button"
                onClick={() => selectLocale(l)}
                className={
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition " +
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
      )}
    </div>
  );
}
