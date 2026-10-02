// app/game-map/game-map.tsx -- обёртка игровой карты A1 (версия 2, 02.10.2026).
// Вся карта живёт в ./engine.ts (canvas без фреймворка); здесь только
// монтирование и выбор темы по теме сайта.
"use client";

import { useEffect, useRef } from "react";
import { GAME_MAP_CSS, mountGameMap, type MapCompany } from "./engine";

export function GameMap({ companies }: { companies: MapCompany[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dark = document.documentElement.classList.contains("dark");
    // Карта займає весь екран під шапкою сайту: висоту рахуємо від її верху.
    const fit = () => {
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY);
      el.style.height = `${Math.max(420, window.innerHeight - top)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    const unmount = mountGameMap(el, { companies, theme: dark ? "dark" : "light" });
    return () => {
      window.removeEventListener("resize", fit);
      unmount?.();
    };
  }, [companies]);

  return (
    <>
      <style>{GAME_MAP_CSS}</style>
      <div ref={ref} className="gm2 gm-page" />
    </>
  );
}
