// components/events/events-map.tsx -- карта рядом с календарём: подсвечивает страны, где есть события
// выбранного дня (или месяца), подписывает их названиями и даёт кликнуть по стране.
// Контуры лежат в public/events-map/*.json (Natural Earth, public domain) и грузятся только в браузере --
// поисковику карта не нужна, а страницы событий от неё не тяжелеют.
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EvLang } from "@/lib/events/types";

type MapData = { w: number; h: number; c: { n: string; d: string; x: number; y: number }[] };
export type MapCountry = { key: string; label: string; n: number };

const cache: Partial<Record<"europe" | "world", MapData>> = {};
const inflight: Partial<Record<"europe" | "world", Promise<MapData | null>>> = {};

function loadMap(view: "europe" | "world"): Promise<MapData | null> {
  const hit = cache[view];
  if (hit) return Promise.resolve(hit);
  const run = inflight[view] ?? (inflight[view] = fetch(`/events-map/${view}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<MapData>) : null))
    .then((d) => { if (d) cache[view] = d; return d; })
    .catch(() => null));
  return run;
}

/** Как страны из событий называются в контурах Natural Earth. */
const NE_NAME: Record<string, string> = {
  "U.S.A.": "United States of America", "U.K.": "United Kingdom", "Czech Republic": "Czechia", "North Macedonia": "Macedonia",
  "Bosnia and Herzegovina": "Bosnia and Herz.", "Dominican Republic": "Dominican Rep.", "Czechia": "Czechia",
};
export const neName = (country: string): string => NE_NAME[country] ?? country;

const TXT = {
  uk: { europe: "Європа", world: "Світ", online: "Онлайн", none: "Подій на карті немає", hint: "Натисніть на країну", showAll: "Усі країни", hide: "Згорнути", onlineHint: "Онлайн-події: без країни, дивитись можна звідки завгодно" },
  en: { europe: "Europe", world: "World", online: "Online", none: "No events on the map", hint: "Click a country", showAll: "All countries", hide: "Collapse", onlineHint: "Online events: no country, watch from anywhere" },
} as const;

export function EventsMap({
  lang, countries, onlineCount, selected, onSelect,
}: {
  lang: EvLang;
  countries: MapCountry[]; // key = страна как в событиях
  onlineCount: number;
  selected: string | null; // key страны или "__online"
  onSelect: (key: string | null) => void;
}) {
  const t = TXT[lang];
  const [view, setView] = useState<"europe" | "world">("europe");
  const [manual, setManual] = useState(false);
  const [data, setData] = useState<MapData | null>(cache[view] ?? null);
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [heights, setHeights] = useState<{ half: number; full: number } | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipCount = countries.length + (onlineCount ? 1 : 0);

  // Плашки стран занимают много места: показываем первую половину, остальное раскрываем плавно по стрелке.
  useLayoutEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      if (kids.length <= 6) return setHeights(null);
      const half = kids[Math.ceil(kids.length / 2) - 1];
      setHeights({ half: half ? Math.ceil(half.getBoundingClientRect().bottom - el.getBoundingClientRect().top) : 0, full: el.scrollHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [countries, onlineCount, lang]);

  // Если события дня целиком за пределами Европы -- сами показываем мир (пока человек не выбрал вид сам).
  const [europeData, setEuropeData] = useState<MapData | null>(cache.europe ?? null);
  useEffect(() => { void loadMap("europe").then(setEuropeData); }, []);
  useEffect(() => {
    if (manual || !europeData || !countries.length) return;
    const inEurope = new Set(europeData.c.map((c) => c.n));
    const any = countries.some((c) => inEurope.has(neName(c.key)));
    setView(any ? "europe" : "world");
  }, [countries, europeData, manual]);

  useEffect(() => {
    let live = true;
    void loadMap(view).then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [view]);

  const byNe = new Map(countries.map((c) => [neName(c.key), c]));
  const maxN = Math.max(1, ...countries.map((c) => c.n));

  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{countries.length ? t.hint : t.none}</span>
        <span className="inline-flex rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800" role="group">
          {(["europe", "world"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setManual(true); setView(v); }}
              className={"rounded-full px-3 py-1 text-[12px] font-medium transition " + (view === v ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white" : "text-neutral-500")}
            >
              {t[v]}
            </button>
          ))}
        </span>
      </div>

      <div className="relative mt-2 overflow-hidden rounded-xl bg-sky-50/60 dark:bg-neutral-950/60">
        {data ? (
          <svg viewBox={`0 0 ${data.w} ${data.h}`} className="block h-auto w-full" role="img" aria-label="map">
            {data.c.map((c) => {
              const info = byNe.get(c.n);
              const on = !!info;
              const sel = on && selected === info.key;
              const strength = info ? 0.45 + 0.4 * (info.n / maxN) : 0;
              return (
                <path
                  key={c.n}
                  d={c.d}
                  onClick={on ? () => onSelect(sel ? null : info.key) : undefined}
                  onMouseEnter={on ? () => setHover(c.n) : undefined}
                  onMouseLeave={on ? () => setHover(null) : undefined}
                  style={{ transition: "fill 300ms, opacity 300ms", cursor: on ? "pointer" : "default", ...(on ? { fillOpacity: sel || hover === c.n ? 1 : strength } : {}) }}
                  className={on ? "fill-accent stroke-white dark:stroke-neutral-900" : "fill-neutral-200 stroke-white dark:fill-neutral-800 dark:stroke-neutral-900"}
                  strokeWidth={view === "europe" ? 0.6 : 0.4}
                >
                  {on ? <title>{`${info.label}: ${info.n}`}</title> : null}
                </path>
              );
            })}
            {view === "europe"
              ? data.c.map((c) => {
                  const info = byNe.get(c.n);
                  if (!info) return null;
                  return (
                    <g key={c.n + "l"} pointerEvents="none">
                      <circle cx={c.x} cy={c.y} r={3.5} className="fill-white" />
                      <circle cx={c.x} cy={c.y} r={3.5} className="fill-white" opacity={0}>
                        <animate attributeName="r" values="3.5;11" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })
              : null}
          </svg>
        ) : (
          <div className="aspect-[8/7] w-full animate-pulse" />
        )}
      </div>

      <div
        ref={chipsRef}
        className="mt-3 flex flex-wrap content-start gap-1.5 overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={heights ? { maxHeight: open ? heights.full : heights.half } : undefined}
      >
        {onlineCount ? (
          <button
            type="button"
            title={t.onlineHint}
            onClick={() => onSelect(selected === "__online" ? null : "__online")}
            className={"rounded-full px-2.5 py-1 text-[12px] font-medium transition " + (selected === "__online" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300")}
          >
            {t.online} <span className="opacity-60">{onlineCount}</span>
          </button>
        ) : null}
        {countries.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(selected === c.key ? null : c.key)}
            onMouseEnter={() => setHover(neName(c.key))}
            onMouseLeave={() => setHover(null)}
            className={"rounded-full px-2.5 py-1 text-[12px] font-medium transition " + (selected === c.key ? "bg-accent text-white" : "bg-neutral-100 text-neutral-700 hover:bg-accent/15 dark:bg-neutral-800 dark:text-neutral-200")}
          >
            {c.label} <span className="opacity-60">{c.n}</span>
          </button>
        ))}
      </div>
      {heights ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-accent dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          {open ? t.hide : `${t.showAll} (${chipCount})`}
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={"transition-transform duration-500 ease-in-out " + (open ? "rotate-180" : "")}>
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
