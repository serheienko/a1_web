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
    return mountGameMap(el, { companies, theme: dark ? "dark" : "light" });
  }, [companies]);

  return (
    <>
      <style>{GAME_MAP_CSS}</style>
      <div ref={ref} className="gm2" />
    </>
  );
}
