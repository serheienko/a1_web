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
// Место кнопки -- левый нижний угол, и это уже третий подход, каждый
// по его правке:
//   1) третьей в колонке над "+" -- "ее перекрывает модалка мини-чатов"
//      (список чатов, components/chats-flyout.tsx, раскрывается вверх
//      от своей кнопки и накрывает всё, что стоит выше);
//   2) слева от "+" на той же линии -- всё ещё в том же углу;
//   3) "Можно стрелку в принципе вообще повесить на левый край" -- то,
//      что сейчас: противоположный угол, где ничего не всплывает.
//
// Клавиша: "Можно... добавить функционал на клавиатуру, чтобы при
// нажатии на какую-то клавишу страницу поднимало вверх". Взял Home --
// не выдуманное сочетание, а та самая клавиша, которой это делают во
// всех браузерах, так что человеку не придётся запоминать наше личное.
// Обрабатываем её сами, чтобы прокрутка была такой же плавной, как по
// кнопке, и чтобы не срабатывать, когда человек печатает в поле.
//
// Про Mac (Александр: "Home это какая на маке?"). Отдельной клавиши
// Home на ноутбуках Apple нет -- там это Fn + Left, и браузер в этом
// случае присылает ровно тот же key: "Home", так что наш обработчик
// срабатывает. Но привычнее маководам Cmd + Up, и это встроенное
// поведение самого браузера -- перехватывать его мы не лезем, просто
// называем в подсказке именно его, а не Home. Определяем платформу
// один раз при монтировании (на сервере navigator нет).
//
// Подсказка: "Попап показывать 1 раз, как обучение, он должен быть
// прямо возле кнопки". Появляется рядом с кнопкой в первый раз, когда
// кнопка вообще показалась, и больше никогда -- отметка лежит в
// localStorage, там же, где тема и язык.
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

const LABEL: Record<Locale, string> = {
  uk: "Нагору", en: "Back to top", ru: "Наверх", de: "Nach oben",
  es: "Ir arriba", fr: "Haut de page", pl: "Do góry", ptBR: "Voltar ao topo", zh: "回到顶部",
};

// Подсказка намеренно короткая: одна мысль -- "есть клавиша". {key}
// подставляется по платформе, см. keyHint() ниже.
const HINT: Record<Locale, string> = {
  uk: "Нагору — або {key}",
  en: "Back to top — or {key}",
  ru: "Наверх — или {key}",
  de: "Nach oben — oder {key}",
  es: "Ir arriba — o {key}",
  fr: "Haut de page — ou {key}",
  pl: "Do góry — albo {key}",
  ptBR: "Voltar ao topo — ou {key}",
  zh: "回到顶部 — 或按 {key}",
};

const KEY_NAME: Record<Locale, { mac: string; other: string }> = {
  uk: { mac: "⌘ ↑", other: "клавіша Home" },
  en: { mac: "⌘ ↑", other: "the Home key" },
  ru: { mac: "⌘ ↑", other: "клавиша Home" },
  de: { mac: "⌘ ↑", other: "die Home-Taste" },
  es: { mac: "⌘ ↑", other: "la tecla Inicio" },
  fr: { mac: "⌘ ↑", other: "la touche Origine" },
  pl: { mac: "⌘ ↑", other: "klawisz Home" },
  ptBR: { mac: "⌘ ↑", other: "a tecla Home" },
  zh: { mac: "⌘ ↑", other: "Home 键" },
};

const HINT_CLOSE: Record<Locale, string> = {
  uk: "Зрозуміло", en: "Got it", ru: "Понятно", de: "Alles klar", es: "Entendido",
  fr: "Compris", pl: "Jasne", ptBR: "Entendi", zh: "知道了",
};

// Порог примерно в один экран: кнопка не мельтешит от случайного
// движения колёсика, но и не заставляет крутить полстраницы.
const SHOW_AFTER_PX = 600;

// Версия в ключе -- на случай, если подсказку когда-нибудь придётся
// показать заново с другим текстом.
const HINT_SEEN_KEY = "a1_scroll_top_hint_v1";

// Подсказка не висит вечно: если человек её не закрыл, она уходит сама.
const HINT_AUTO_HIDE_MS = 9000;

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

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function ScrollTopFab() {
  const pathname = usePathname();
  const [lang, setLang] = useState<Locale>("uk");
  const [shown, setShown] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  // Показать подсказку можно только один раз за всю жизнь вкладки и
  // только если её ещё ни разу не видели.
  const hintDoneRef = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
    // iPhone/iPad сюда тоже попадают -- физической клавиатуры у них
    // обычно нет, но подсказку они и так почти не увидят: кнопку там
    // нажимают пальцем.
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent));
    try {
      hintDoneRef.current = localStorage.getItem(HINT_SEEN_KEY) === "1";
    } catch {
      // Хранилище может быть недоступно -- тогда просто не показываем
      // подсказку вовсе, это лучше, чем показывать её каждый раз.
      hintDoneRef.current = true;
    }
  }, []);

  function closeHint() {
    setHintOpen(false);
    hintDoneRef.current = true;
    try {
      localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Не страшно: в этой вкладке подсказка всё равно больше не выйдет.
    }
  }

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY > SHOW_AFTER_PX;
      setShown(next);
      if (next && !hintDoneRef.current) {
        hintDoneRef.current = true;
        setHintOpen(true);
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (!hintOpen) return;
    const timer = window.setTimeout(() => closeHint(), HINT_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [hintOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Home") return;
      // С модификатором Home означает совсем другое (например, выделить
      // до начала документа) -- не перехватываем.
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      // Человек печатает -- Home должен ставить курсор в начало строки,
      // а не увозить страницу.
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      scrollToTop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 2026-09-14: /download -- отдельная установочная страница-плакат
  // (app/download/page.tsx), которую Александр шарит в соцсетях. Ни
  // навигации сайта, ни плавающих кнопок на ней быть не должно.
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/chats") || pathname === "/download") return null;

  return (
    <div
      className="fixed left-5 z-40 flex items-center gap-2"
      style={{ bottom: "calc(1.25rem + 4px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={() => {
          closeHint();
          scrollToTop();
        }}
        aria-label={LABEL[lang]}
        title={LABEL[lang]}
        aria-hidden={!shown}
        tabIndex={shown ? undefined : -1}
        className={`group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-lg transition duration-200 hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${
          shown ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0"
        }`}
      >
        <ArrowUpIcon />
      </button>

      {/* Подсказка стоит прямо рядом с кнопкой, как и просили, и не
          перекрывает её саму. На узком экране ограничена шириной
          вьюпорта минус место под саму кнопку и поля. */}
      {shown && hintOpen && (
        <div
          role="status"
          className="animate-popover-right flex max-w-[calc(100vw-6.5rem)] items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <span>{HINT[lang].replace("{key}", isMac ? KEY_NAME[lang].mac : KEY_NAME[lang].other)}</span>
          <button
            type="button"
            onClick={closeHint}
            className="shrink-0 rounded-full px-2 py-1 text-[12px] font-medium text-accent transition hover:bg-accent/10"
          >
            {HINT_CLOSE[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
