// components/theme-toggle.tsx
//
// Manual light/dark toggle (Aleksandr, 2026-08-26: "надо ещё тогл по темам
// куда-то втулить"). Pairs with the @custom-variant dark setup in
// app/globals.css and the anti-flash inline script in app/layout.tsx:
// - No stored choice yet -> follows the OS preference (script sets no
//   class; the @custom-variant's media-query branch handles it).
// - User clicks this button -> pins an explicit "dark" or "light" class on
//   <html> and remembers it in localStorage, overriding the OS from then on.
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // null until mounted: avoids briefly rendering the wrong icon (or a
  // server/client mismatch) before we know what the anti-flash script
  // already decided.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(
      root.classList.contains("dark") ||
        (!root.classList.contains("light") && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.classList.toggle("light", !next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode, disabled) — the toggle
      // still works for the current page load via the class alone.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
    >
      {isDark === null ? null : isDark ? (
        // Sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
