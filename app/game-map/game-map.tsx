// app/game-map/game-map.tsx -- обёртка карты всесвіту A1 (версия 2, 02.10.2026).
// Вся карта живёт в ./engine.ts (canvas без фреймворка); здесь --
// загрузка данных, монтирование, тема и язык сайта.
//
// Режим 1 -- карта в рамке на странице. Режим 2 -- кнопка «на весь екран»
// внутри карты: настоящий полный экран без меню сайта (engine.ts toggleFs).
//
// Данные -- из /game-map/data (отдельный JSON с кэшем), а не из HTML:
// страница открывается сразу, загрузка показывается внутри рамки.
// Язык: useActiveLocale следит за классом lang-XX на <html>, движок
// меняет подписи без перемонтирования («зміна мови -- одразу»).
"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveLocale } from "@/lib/use-active-locale";
import { GAME_MAP_CSS, mountGameMap, type MapCompany } from "./engine";
import { MapLoader } from "./map-loader";

type MapHandle = (() => void) & { setLang?: (lang: string) => void };

export function GameMap() {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const [companies, setCompanies] = useState<MapCompany[] | null>(null);
  const lang = useActiveLocale();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    let alive = true;
    fetch("/game-map/data")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: unknown) => {
        if (alive) setCompanies(Array.isArray(list) ? (list as MapCompany[]) : []);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !companies) return;
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
      <div className="relative">
        <div ref={ref} className="gm2" />
        {!companies && (
          <div className="gm2 gm-ov">
            <MapLoader />
          </div>
        )}
      </div>
    </>
  );
}
