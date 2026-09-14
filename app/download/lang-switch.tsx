// app/download/lang-switch.tsx
//
// Aleksandr, 2026-09-14: «добавь где-то переключатель на все
// локализации» — на /download нет общей навигации сайта (она скрыта,
// см. app/download/page.tsx), а значит нет и обычного переключателя из
// components/settings-menu.tsx. Это его компактная версия для шапки
// страницы.
//
// Логика один в один как там же: класс lang-XX на <html> решает, какой
// из девяти отрендеренных вариантов текста видно, выбор запоминается в
// localStorage("lang") — тот самый ключ, который app/layout.tsx читает
// в LANG_INIT_SCRIPT ещё до первой отрисовки, так что выбранный тут
// язык подхватывается и на всех остальных страницах сайта.
//
// Украинская оговорка соблюдена и здесь: у посетителя из Украины
// (класс geo-ua, который ставит тот же скрипт по cookie из
// middleware.ts) русского в списке просто нет.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import styles from "./download.module.css";

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

// Короткая подпись на самой кнопке — полное название языка в шапку не
// влезает, особенно на телефоне.
const LANGUAGE_SHORT: Record<Locale, string> = {
  uk: "UA",
  en: "EN",
  ru: "RU",
  de: "DE",
  es: "ES",
  fr: "FR",
  pl: "PL",
  ptBR: "PT",
  zh: "中文",
};

export function LangSwitch() {
  const [lang, setLang] = useState<Locale | null>(null);
  const [isGeoUa, setIsGeoUa] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Активный язык читается из класса на <html>, а не из localStorage:
  // класс уже учитывает и сохранённый выбор, и определение по стране.
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    setLang(active ?? "uk");
    setIsGeoUa(root.classList.contains("geo-ua"));
  }, []);

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

  function selectLocale(locale: Locale) {
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
      // Хранилище может быть недоступно (приватный режим) — язык всё
      // равно переключится на текущей загрузке, просто не запомнится.
    }
  }

  const options = LOCALES.filter((l) => !(isGeoUa && l === "ru"));

  return (
    <div className={styles.langWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.langButton}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <svg className={styles.langGlobe} viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3ZM3.4 9.5h17.2M3.4 14.5h17.2"
          />
        </svg>
        {/* до гидратации язык ещё неизвестен — показываем украинский,
            тот же дефолт, что и <html lang="uk"> в app/layout.tsx */}
        <span>{LANGUAGE_SHORT[lang ?? "uk"]}</span>
      </button>

      {open && (
        <ul className={styles.langMenu} role="listbox">
          {options.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === lang}
                className={l === lang ? `${styles.langItem} ${styles.langItemActive}` : styles.langItem}
                onClick={() => selectLocale(l)}
              >
                {LANGUAGE_NAMES[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
