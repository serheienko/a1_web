// components/scroll-top-fab.tsx
//
// 2026-09-13 (Александр, три скриншота -- длинная вакансия, карточка
// вакансии и профиль BroTrades): "При скролле вниз добавь кнопку наверх
// со стрелочкой возле (+) на страницах: Главная, Страница вакансий/
// специалистов, Страница профилей. Сделай анимацию стрелки при
// наведении."
//
// Отдельный маленький компонент, а не ещё одна ветка внутри
// components/create-post-fab.tsx: та кнопка занята созданием дописа и
// тянет за собой редактор, черновики и окно входа -- этой не нужно
// ничего, кроме позиции прокрутки.
//
// Где показываем. Кнопка и так появляется только после того, как
// страницу прокрутили вниз, поэтому вместо перечисления маршрутов
// проще назвать те два, где она мешала бы: /sign-in (там и так прячутся
// обе плавающие кнопки) и /chats (переписка прокручивается внутри
// своего окна, а не страницей, так что кнопка ничего бы не делала).
// Ровно тот же список исключений, что у components/chats-fab.tsx.
//
// Позиция: третьей в той же колонке, что "+" (56px) и кнопка чатов
// (48px) -- см. их собственные комментарии про отступы. Считаем ту же
// сумму: нижний отступ страницы + высоты обеих кнопок + два зазора по
// 12px + безопасная зона снизу.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

const STRINGS: Record<Locale, string> = {
  uk: "Нагору", en: "Back to top", ru: "Наверх", de: "Nach oben",
  es: "Ir arriba", fr: "Haut de page", pl: "Do góry", ptBR: "Voltar ao topo", zh: "回到顶部",
};

// Порог в один экран: кнопка не мельтешит от случайного движения
// колёсика, но и не заставляет крутить полстраницы, чтобы её увидеть.
const SHOW_AFTER_PX = 600;

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-y-1"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

export function ScrollTopFab() {
  const pathname = usePathname();
  const [lang, setLang] = useState<Locale>("uk");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);

  useEffect(() => {
    function onScroll() {
      setShown(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/chats")) return null;

  return (
    <button
      type="button"
      onClick={() => {
        // Плавно, но уважая системную настройку "меньше движения" --
        // тот же принцип, что у анимаций в app/globals.css.
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      aria-label={STRINGS[lang]}
      title={STRINGS[lang]}
      aria-hidden={!shown}
      tabIndex={shown ? undefined : -1}
      className={`group fixed right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-lg transition duration-200 hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
      style={{ bottom: "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))" }}
    >
      <ArrowUpIcon />
    </button>
  );
}
