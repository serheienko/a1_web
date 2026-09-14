// app/download/menu.tsx
//
// Aleksandr, 2026-09-14: «давай сделаем это одной кнопкой ⋯ и там в
// модалку поместим эти функции, по схеме сайта jobs.a1appp.com».
//
// Три отдельные кнопки в шапке (язык, тема, поделиться) заменены одной:
// панель повторяет меню профиля на сайте — секция «Тема» тремя
// вариантами (светлая/тёмная/авто) и список языков с галочкой у
// активного, плюс пункт «поділитися» внизу за разделителем.
//
// Механика раскрытия — тот же общий хук lib/use-hover-panel.ts, что у
// меню на остальном сайте и у превью рядом: наводишь — раскрывается,
// уводишь — плавно исчезает, на телефоне открывается с первого тапа.
//
// Тема и язык хранятся ровно там же, где их держит сайт: классы
// light/dark и lang-XX на <html> плюс localStorage("theme"/"lang"), эти
// же значения до первой отрисовки расставляют THEME_INIT_SCRIPT и
// LANG_INIT_SCRIPT в app/layout.tsx. Поэтому выбор здесь виден и на
// остальных страницах, и наоборот. «Авто» — это просто отсутствие
// сохранённого выбора: класс снимается, и страница идёт за системной
// настройкой (см. prefers-color-scheme в download.module.css).
//
// Украинская оговорка соблюдена: у посетителя из Украины (класс geo-ua)
// русского в списке языков нет вовсе.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import styles from "./download.module.css";

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

function SunIcon() {
  return (
    <svg className={styles.menuThemeIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className={styles.menuThemeIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg className={styles.menuThemeIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="currentColor" d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" />
    </svg>
  );
}

export function Menu() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Locale | null>(null);
  const [theme, setTheme] = useState<Theme>("auto");
  const [isGeoUa, setIsGeoUa] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen } = useHoverPanel(
    open,
    setOpen,
    [{ trigger: wrapRef, panel: panelRef }],
  );

  // Текущие язык и тему читаем из классов на <html>, а не из хранилища:
  // класс уже учитывает и сохранённый выбор, и определение по стране.
  useEffect(() => {
    const root = document.documentElement;
    setLang(LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l])) ?? "uk");
    setIsGeoUa(root.classList.contains("geo-ua"));
    setTheme(root.classList.contains("light") ? "light" : root.classList.contains("dark") ? "dark" : "auto");
    setCanShare(!!navigator.share || !!navigator.clipboard);
  }, []);

  // На телефоне hover'а нет — закрываем тапом мимо панели или Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectTheme(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("light", next === "light");
    root.classList.toggle("dark", next === "dark");
    try {
      if (next === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // приватный режим — тема переключится, просто не запомнится
    }
  }

  function selectLocale(locale: Locale) {
    if (isGeoUa && locale === "ru") return;
    setLang(locale);
    const root = document.documentElement;
    for (const l of LOCALES) root.classList.toggle(LOCALE_CLASS[l], l === locale);
    root.lang = LOCALE_TAG[locale];
    try {
      localStorage.setItem("lang", locale);
    } catch {
      // то же самое: язык сменится, но не запомнится
    }
  }

  async function share() {
    const copy = DOWNLOAD_COPY[lang ?? "uk"];
    const url = `${DOWNLOAD_LINKS.website}/download`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "A1", text: `${copy.headline} ${copy.headlineAccent}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // человек закрыл системное меню — это не ошибка
    }
  }

  const copy = DOWNLOAD_COPY[lang ?? "uk"];
  const options = LOCALES.filter((l) => !(isGeoUa && l === "ru"));
  const themes: { key: Theme; label: string; icon: React.ReactNode }[] = [
    { key: "light", label: copy.themeLight, icon: <SunIcon /> },
    { key: "dark", label: copy.themeDark, icon: <MoonIcon /> },
    { key: "auto", label: copy.themeAuto, icon: <AutoIcon /> },
  ];

  return (
    <div
      className={styles.menuWrap}
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={open ? `${styles.menuButton} ${styles.menuButtonOpen}` : styles.menuButton}
        onClick={() => {
          // см. lib/use-hover-panel.ts: на телефоне первый тап синтезирует
          // и mouseenter, и click — без этой проверки меню открылось бы
          // и тут же закрылось
          if (isRecentHoverOpen()) return;
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
      >
        {/* три точки: на наведении пробегают волной одна за другой */}
        <span className={styles.menuDot} />
        <span className={styles.menuDot} />
        <span className={styles.menuDot} />
      </button>

      {rendered && (
        /* внешняя обёртка держит отступ своим padding'ом — иначе между
           кнопкой и панелью остаётся ничей зазор и меню моргает */
        <div className={styles.menuPanelOuter} ref={panelRef}>
          <div className={visible ? `${styles.menuPanel} ${styles.menuPanelVisible}` : styles.menuPanel}>
            <p className={styles.menuSectionTitle}>{copy.menuTheme}</p>
            <div className={styles.menuThemes}>
              {themes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={
                    theme === t.key ? `${styles.menuTheme} ${styles.menuThemeActive}` : styles.menuTheme
                  }
                  onClick={() => selectTheme(t.key)}
                  aria-pressed={theme === t.key}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <p className={styles.menuSectionTitle}>{copy.menuLanguage}</p>
            <ul className={styles.menuLangs} role="listbox">
              {options.map((l) => (
                <li key={l}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={l === lang}
                    className={l === lang ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem}
                    onClick={() => selectLocale(l)}
                  >
                    <span>{LANGUAGE_NAMES[l]}</span>
                    {l === lang && (
                      <svg className={styles.menuCheck} viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 12.5 4.2 4.3L19 7"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {canShare && (
              <>
                <div className={styles.menuDivider} />
                <button type="button" className={styles.menuItem} onClick={share} data-track="share">
                  <span>{copied ? copy.shareCopied : copy.shareLabel}</span>
                  <svg className={styles.menuShareIcon} viewBox="0 0 24 24" aria-hidden="true">
                    {copied ? (
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12.5 4.2 4.3L19 7"
                      />
                    ) : (
                      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="17.5" cy="5.5" r="2.6" />
                        <circle cx="6.5" cy="12" r="2.6" />
                        <circle cx="17.5" cy="18.5" r="2.6" />
                        <path d="m8.9 10.8 6.2-3.6M8.9 13.2l6.2 3.6" />
                      </g>
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
