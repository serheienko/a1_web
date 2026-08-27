// components/lang-toggle.tsx
//
// Manual UA/RU switch (Aleksandr, 2026-08-27: "дефолтный язык - укр. +
// добавить локализации на наши языки"). Mirrors components/theme-toggle.tsx
// exactly: default (no class, no stored choice) is Ukrainian; clicking
// pins an explicit "ru" or "uk" choice, storing it in localStorage and
// toggling .lang-ru on <html> — see the `lang-ru:` custom-variant in
// app/globals.css and components/t.tsx for how that's consumed. The
// anti-flash script in app/layout.tsx applies the stored choice before
// first paint, same as it already does for theme.
"use client";

import { useEffect, useState } from "react";

export function LangToggle() {
  // null until mounted, same reasoning as ThemeToggle: don't render a
  // label that might not match what the anti-flash script already set.
  const [isRu, setIsRu] = useState<boolean | null>(null);

  useEffect(() => {
    setIsRu(document.documentElement.classList.contains("lang-ru"));
  }, []);

  function toggle() {
    const next = !isRu;
    setIsRu(next);
    const root = document.documentElement;
    root.classList.toggle("lang-ru", next);
    root.lang = next ? "ru" : "uk";
    try {
      localStorage.setItem("lang", next ? "ru" : "uk");
    } catch {
      // Storage can be unavailable (private mode, disabled) — the toggle
      // still works for the current page load via the class alone.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isRu ? "Switch to Ukrainian" : "Переключить на русский"}
      className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
    >
      {isRu === null ? null : isRu ? "УКР" : "РУС"}
    </button>
  );
}
