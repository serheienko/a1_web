// app/game-map/game-map.tsx -- обёртка игровой карты A1 (версия 2, 02.10.2026).
// Вся карта живёт в ./engine.ts (canvas без фреймворка); здесь только
// монтирование, тема сайта и язык сайта.
//
// Режим 1 -- карта в рамке на странице (как было изначально).
// Режим 2 -- кнопка «на весь екран» внутри карты: настоящий полный экран
// без меню сайта (engine.ts toggleFs).
//
// 02.10.2026 (Александр): «Зміна локалізації має одразу міняти інтерфейс
// карти» -- язык берём из useActiveLocale (он следит за классом lang-XX
// на <html>) и передаём в движок без перемонтирования карты.
"use client";

import { useEffect, useRef } from "react";
import { useActiveLocale } from "@/lib/use-active-locale";
import { GAME_MAP_CSS, mountGameMap, type MapCompany } from "./engine";

type MapHandle = (() => void) & { setLang?: (lang: string) => void };

export function GameMap({ companies }: { companies: MapCompany[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const lang = useActiveLocale();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dark = document.documentElement.classList.contains("dark");
    const h = mountGameMap(el, { companies, theme: dark ? "dark" : "light", lang: langRef.current }) as MapHandle;
    handle.current = h;
    return () => {
      handle.current = null;
      h();
    };
  }, [companies]);

  useEffect(() => {
    handle.current?.setLang?.(lang);
  }, [lang]);

  return (
    <>
      <style>{GAME_MAP_CSS}</style>
      <div ref={ref} className="gm2" />
    </>
  );
}
