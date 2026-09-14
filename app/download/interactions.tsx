// app/download/interactions.tsx
//
// Aleksandr, 2026-09-14: «считать клики по кнопкам — это тоже делаем».
//
// Почему один слушатель на всю страницу, а не обработчик на каждой
// кнопке: кнопки лежат в серверной разметке (app/download/page.tsx) и
// остаются статическими — превратить их в клиентские компоненты значило
// бы тащить в браузер всю страницу ради двух счётчиков. Здесь же
// клиентский только этот невидимый компонент: он ловит клик на всплытии
// и смотрит, был ли тот внутри ссылки с data-track.
//
// События уходят в Vercel Analytics — тот же <Analytics/>, что уже
// стоит в app/layout.tsx, ничего доустанавливать не нужно. Если сбор
// событий недоступен (например, их лимит на тарифе исчерпан), track()
// просто ничего не делает и клик по кнопке от этого не страдает —
// отправка обёрнута в try/catch именно поэтому.
"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

export function Interactions() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("[data-track]") as HTMLElement | null;
      const name = link?.dataset?.track;
      if (!name) return;

      try {
        track("download_page_click", {
          target: name,
          // светлая/тёмная — интересно, влияет ли тема на поведение
          theme: document.documentElement.classList.contains("light") ? "light" : "dark",
        });
      } catch {
        // аналитика — вещь необязательная, клик важнее
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
