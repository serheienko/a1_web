// app/download/interactions.tsx
//
// Две вещи, которые нужны рядом и потому живут вместе: счёт нажатий и
// красивый уход в магазин.
//
// 1. Счёт нажатий (Aleksandr, 14.09.2026: «считать клики по кнопкам —
//    это тоже делаем»). Один делегированный слушатель на всю страницу, а
//    не обработчик на каждой кнопке: кнопки лежат в серверной разметке
//    (app/download/page.tsx) и остаются статическими — превращать их в
//    клиентские компоненты ради двух счётчиков значило бы тащить в
//    браузер всю страницу. События уходят в тот же <Analytics/>, что уже
//    стоит в app/layout.tsx; если сбор недоступен, track() просто ничего
//    не делает и клик от этого не страдает.
//
// 2. Уход в магазин (он же, тем же вечером): при нажатии кнопка коротко
//    вспыхивает, экран мягко гаснет — и только потом происходит переход.
//    Резкий скачок в App Store из такой сцены выглядел обрывом.
//
//    Что здесь сделано аккуратно:
//    — переход перехватывается ТОЛЬКО для обычного клика левой кнопкой.
//      Cmd/Ctrl/Shift-клик и клик колесом открывают ссылку в новой
//      вкладке — ломать это нельзя, поэтому такие клики уходят браузеру
//      как есть;
//    — при системной настройке «уменьшить движение» перехвата нет вовсе;
//    — страховочный таймер: если по какой-то причине переход не
//      случился, вуаль сама снимается через секунду, и посетитель не
//      остаётся перед затемнённым экраном.
"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import styles from "./download.module.css";

// Столько длится затемнение перед уходом. Меньше 300 мс глаз не
// замечает, больше 500 — начинает раздражать ожиданием.
const LEAVE_MS = 380;

export function Interactions() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest?.("[data-track]") as HTMLElement | null;
      const name = el?.dataset?.track;
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

      // дальше — только про уход в магазин
      const href = el instanceof HTMLAnchorElement ? el.href : "";
      if (!href || (name !== "android" && name !== "ios")) return;
      if (reduced.matches) return;
      // новая вкладка/окно — отдаём браузеру как есть
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      event.preventDefault();
      el.classList.add(styles.btnLeaving ?? "");
      setLeaving(true);
      // ./sound.tsx слушает это событие и гасит музыку вместе с экраном
      window.dispatchEvent(new CustomEvent("a1:leave"));
      window.setTimeout(() => {
        window.location.href = href;
      }, LEAVE_MS);
      // страховка: переход мог не произойти (например, посетитель вернулся
      // назад из магазина) — не оставляем его перед тёмным экраном
      window.setTimeout(() => {
        setLeaving(false);
        el.classList.remove(styles.btnLeaving ?? "");
      }, LEAVE_MS + 1000);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Возврат «назад» из магазина в Safari отдаёт страницу из кеша ровно в
  // том виде, в каком её покинули, — вместе с затемнением. Это событие
  // как раз о таком возврате.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setLeaving(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <div
      className={leaving ? `${styles.leaveVeil} ${styles.leaveVeilActive}` : styles.leaveVeil}
      aria-hidden="true"
    />
  );
}
