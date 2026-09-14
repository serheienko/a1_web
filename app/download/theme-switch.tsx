// app/download/theme-switch.tsx
//
// Aleksandr, 2026-09-14: «давай добавим светлую тему… и сделаем, чтобы
// темы переключались плавно через прозрачность».
//
// Кнопка работает тем же ключом, что и переключатель темы на остальном
// сайте (components/settings-menu.tsx): класс light/dark на <html> плюс
// localStorage("theme"). Значит выбор здесь подхватывается и всем
// остальным сайтом, и наоборот — а до первой отрисовки его уже
// расставляет THEME_INIT_SCRIPT в app/layout.tsx, так что мигания нет.
//
// Третье состояние («как в системе») кнопка не предлагает намеренно:
// это страница-плакат на один экран, и лишний выбор тут — шум. Если в
// localStorage ничего не выбрано, страница сама идёт за системной
// настройкой (см. prefers-color-scheme в download.module.css), а первое
// нажатие просто фиксирует противоположную тему.
"use client";

import { useEffect, useState } from "react";
import styles from "./download.module.css";

type Theme = "light" | "dark";

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("light")) setTheme("light");
    else if (root.classList.contains("dark")) setTheme("dark");
    else setTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("light", next === "light");
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // приватный режим — тема переключится, просто не запомнится
    }
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={styles.themeButton}
      onClick={toggle}
      aria-label={isLight ? "Dark theme" : "Light theme"}
      title={isLight ? "Dark theme" : "Light theme"}
    >
      {/* обе иконки в разметке, видимой остаётся одна — так переключение
          получается плавным (та же прозрачность, что и у фона) */}
      <svg className={styles.themeIconSun} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.4" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </g>
      </svg>

      <svg className={styles.themeIconMoon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z"
        />
      </svg>
    </button>
  );
}
