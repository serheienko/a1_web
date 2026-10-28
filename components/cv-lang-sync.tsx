// components/cv-lang-sync.tsx -- CV Builder идёт за языком сайта (28.10.2026).
//
// Александр: «а чё CV страница не переведена на 9 языков?» -- переведена, но язык
// страницы задаёт адрес (/cv-builder, /cv-builder/pt-br, ...), а язык сайта --
// класс lang-xx на <html> (меню аватарки). Переключил язык -- меню сменилось,
// текст остался. Теперь:
//   - переключили язык прямо на странице -- сразу уходим на её версию на этом языке;
//   - зашли на страницу с ранее выбранным языком сайта (localStorage "lang") --
//     тоже переводим на свою версию. Без явного выбора (как у поисковых роботов)
//     ничего не делаем: каждая языковая страница должна оставаться сама собой для Google.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CLASS_TO_LOCALE: Record<string, string> = {
  "lang-uk": "uk",
  "lang-en": "en",
  "lang-ru": "ru",
  "lang-de": "de",
  "lang-es": "es",
  "lang-fr": "fr",
  "lang-pl": "pl",
  "lang-ptbr": "ptBR",
  "lang-zh": "zh",
};

const PICK_KEY = "a1-cv-lang-pick";

function uiLocale(): string | null {
  for (const c of Array.from(document.documentElement.classList)) {
    const l = CLASS_TO_LOCALE[c];
    if (l) return l;
  }
  return null;
}

export function CvLangSync({ lang, paths }: { lang: string; paths: Record<string, string> }) {
  const router = useRouter();
  useEffect(() => {
    const go = (l: string | null) => {
      if (!l || l === lang) return;
      const to = paths[l];
      if (to && to !== window.location.pathname) router.replace(to);
    };
    try {
      // Сам выбрал язык внизу страницы («Українська», «English»...) -- в этой вкладке не спорим.
      if (localStorage.getItem("lang") && !sessionStorage.getItem(PICK_KEY)) go(uiLocale());
    } catch {
      /* без хранилища -- только живое переключение */
    }
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('nav[aria-label="languages"] a')) {
        try {
          sessionStorage.setItem(PICK_KEY, "1");
        } catch {
          /* не страшно */
        }
      }
    };
    document.addEventListener("click", onClick, true);
    // На <html> меняются и другие классы (тема) -- реагируем только на смену языка.
    let prev = uiLocale();
    const mo = new MutationObserver(() => {
      const now = uiLocale();
      if (now !== prev) go(now);
      prev = now;
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mo.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, [lang, paths, router]);
  return null;
}
