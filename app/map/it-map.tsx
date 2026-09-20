// app/map/it-map.tsx — интерактивная часть страницы /map.
//
// Aleksandr, 2026-09-20: «давай может пока сделаем страницу на сайт, потом
// просто обновим цифры» — поэтому все числа живут отдельным файлом
// lib/a1/it-map-data.json, который пересобирается скриптом
// shtab/github/make_stats.py. Обновить цифры = перезапустить скрипт и
// запушить; эту вёрстку трогать не нужно.
//
// Он же, тем же днём: «делай максимально офигенно, красиво, с анимациями,
// пульсом». Отсюда одно осознанное отступление от остального сайта: панель
// карты всегда тёмная, независимо от темы страницы. Это не случайность и не
// забытый dark:-вариант — карта читается как прибор, светящийся экран
// внутри светлой страницы, и свечение точек на белом фоне просто не
// работает. Всё остальное на странице следует теме сайта как обычно.
//
// Клиентский компонент: карта и графики реагируют на наведение. Статический
// текст остался в page.tsx серверным <T/>, чтобы девять языков рендерились
// без JS.
//
// Язык здесь определяется иначе, чем в <T/>: тот полагается на CSS
// (`lang-XX:inline`), но подписи внутри <svg> — обычные строки в JS, CSS-трюк
// к ним неприменим. Поэтому читаем `lang-XX` класс, который layout ставит на
// <html> до первой отрисовки, и выбираем строку сами.
"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/components/t";

type City = {
  key: string; name: string; country: "UA" | "PL";
  lat: number; lon: number; n: number; hire: number;
  langs: [string, number][];
};

export type MapData = {
  generated: string; found: number; total: number; hireable: number;
  avgRepos: number; medianRepos: number; citiesTotal: number;
  country: Record<string, number>;
  languages: [string, number][];
  langByCountry: Record<string, Record<string, number>>;
  cities: City[];
};

// Палитра для языков программирования. Прогнана через проверку на
// различимость при дальтонизме (протанопия/дейтеранопия/тританопия), а не
// подобрана на глаз. Рядом с цветом везде стоит подпись — цвет нигде не
// единственный признак.
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
const UA_COLOR = "#4f9bff";
const PL_COLOR = "#ff7a4d";

const STR = {
  devs: { uk: "розробників", en: "developers", ru: "разработчиков", de: "Entwickler",
    es: "desarrolladores", fr: "développeurs", pl: "programistów", ptBR: "desenvolvedores", zh: "名开发者" },
  ua: { uk: "Україна", en: "Ukraine", ru: "Украина", de: "Ukraine", es: "Ucrania",
    fr: "Ukraine", pl: "Ukraina", ptBR: "Ucrânia", zh: "乌克兰" },
  pl: { uk: "Польща", en: "Poland", ru: "Польша", de: "Polen", es: "Polonia",
    fr: "Pologne", pl: "Polska", ptBR: "Polônia", zh: "波兰" },
  mainLangs: { uk: "Основні мови", en: "Main languages", ru: "Основные языки", de: "Hauptsprachen",
    es: "Lenguajes principales", fr: "Langages principaux", pl: "Główne języki",
    ptBR: "Linguagens principais", zh: "主要语言" },
  openTo: { uk: "Відкриті до пропозицій", en: "Open to offers", ru: "Открыты к предложениям",
    de: "Offen für Angebote", es: "Abiertos a ofertas", fr: "Ouverts aux offres",
    pl: "Otwarci na oferty", ptBR: "Abertos a ofertas", zh: "接受机会" },
  outOf: { uk: "з", en: "of", ru: "из", de: "von", es: "de", fr: "sur", pl: "z", ptBR: "de", zh: "/" },
  pickCity: { uk: "Наведіть на інше місто на карті.", en: "Hover another city on the map.",
    ru: "Наведите на другой город на карте.", de: "Fahren Sie über eine andere Stadt.",
    es: "Pase el cursor por otra ciudad.", fr: "Survolez une autre ville.",
    pl: "Najedź na inne miasto na mapie.", ptBR: "Passe o cursor sobre outra cidade.",
    zh: "将鼠标悬停在地图上的其他城市" },
  areaNote: { uk: "Площа кола ∝ кількість людей", en: "Circle area ∝ number of people",
    ru: "Площадь круга ∝ количество людей", de: "Kreisfläche ∝ Anzahl der Personen",
    es: "Área del círculo ∝ número de personas", fr: "Aire du cercle ∝ nombre de personnes",
    pl: "Pole koła ∝ liczba osób", ptBR: "Área do círculo ∝ número de pessoas", zh: "圆面积 ∝ 人数" },
  city: { uk: "Місто", en: "City", ru: "Город", de: "Stadt", es: "Ciudad", fr: "Ville",
    pl: "Miasto", ptBR: "Cidade", zh: "城市" },
  share: { uk: "Частка", en: "Share", ru: "Доля", de: "Anteil", es: "Proporción",
    fr: "Part", pl: "Udział", ptBR: "Proporção", zh: "比例" },
  all: { uk: "Усі", en: "All", ru: "Все", de: "Alle", es: "Todos", fr: "Tous",
    pl: "Wszystkie", ptBR: "Todos", zh: "全部" },
  open: { uk: "Відкриті", en: "Open", ru: "Открыты", de: "Offen", es: "Abiertos",
    fr: "Ouverts", pl: "Otwarci", ptBR: "Abertos", zh: "接受机会" },
} as const;

function useLocale(): Locale {
  // До гидрации — украинский, как <html class="lang-uk"> в layout.
  const [loc, setLoc] = useState<Locale>("uk");
  useEffect(() => {
    const m = /\blang-(uk|en|ru|de|es|fr|pl|ptbr|zh)\b/.exec(document.documentElement.className);
    if (m?.[1]) setLoc((m[1] === "ptbr" ? "ptBR" : m[1]) as Locale);
  }, []);
  return loc;
}

// Один общий флаг на всю страницу: пользователь мог попросить систему
// убрать анимации, и тогда всё появляется сразу, в конечном состоянии.
function useCalm(): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return calm;
}

// Полоски растут от нуля к своей длине — но только после монтирования,
// иначе при выключенном JS (и в момент до гидрации) они остались бы
// схлопнутыми в ноль и страница выглядела бы сломанной.
function useGrown(calm: boolean): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (calm) { setGrown(true); return; }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [calm]);
  return grown;
}

// Блок «ожил, когда до него доскроллили». Раньше всё отыгрывало при
// загрузке страницы, пока читатель был ещё наверху, и к графикам он
// приходил уже к отыгранной анимации (Aleksandr, 2026-09-20 — он же
// поймал это на скриншоте с наполовину пустыми полосами).
// Важно: прятать сам текст нельзя — в нулевом состоянии тут только
// ширина полос, все числа и подписи читаются сразу.
function useInView<T extends Element>(calm: boolean) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (calm) { setSeen(true); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [calm]);
  return [ref, seen] as const;
}

const nf = (n: number) => n.toLocaleString("uk-UA").replace(/ /g, " ");

/** Число, которое набегает от нуля. Используется в плитках наверху страницы. */
export function Counter({ to, suffix = "", decimals = 0, dur = 1100 }: {
  to: number; suffix?: string; decimals?: number; dur?: number;
}) {
  const calm = useCalm();
  const [v, setV] = useState(to);
  const [box, seen] = useInView<HTMLSpanElement>(calm);
  useEffect(() => {
    if (calm || !seen) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setV(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, calm, seen, dur]);
  return <span ref={box}>{decimals ? v.toFixed(decimals) : nf(Math.round(v))}{suffix}</span>;
}

const KEYFRAMES = `
@keyframes a1DotIn { from { opacity: 0; transform: scale(.35) } to { opacity: 1; transform: scale(1) } }
@keyframes a1Ping  { 0% { r: 6; opacity: .6 } 70% { opacity: 0 } 100% { r: 40; opacity: 0 } }
@keyframes a1Draw  { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
.a1-link  { stroke-dasharray: 1; stroke-dashoffset: 1; animation: a1Draw 1.6s ease-out forwards }
@media (prefers-reduced-motion: reduce) {
  .a1-link { animation: none !important; stroke-dashoffset: 0 }
}
.a1-dot { animation: a1DotIn .55s cubic-bezier(.2,.9,.3,1.1) both; transform-box: fill-box; transform-origin: center }
.a1-dot > .a1-core, .a1-dot > .a1-halo { transition: opacity .18s ease }
.a1-dot:hover > .a1-halo { opacity: .5 }
.a1-ring { animation: a1Ping 3.6s cubic-bezier(.2,.7,.3,1) infinite }
@media (prefers-reduced-motion: reduce) {
  .a1-dot, .a1-ring { animation: none !important; opacity: 1 }
}
`;

type Head = { title: React.ReactNode; note: React.ReactNode };

export function ItMap({ data, heads }: {
  data: MapData; heads: Record<"langs" | "cmp" | "open", Head>;
}) {
  const loc = useLocale();
  const calm = useCalm();
  const [langsRef, langsIn] = useInView<HTMLDivElement>(calm);
  const [cmpRef, cmpIn] = useInView<HTMLDivElement>(calm);
  const [openRef, openIn] = useInView<HTMLDivElement>(calm);
  const t = (k: keyof typeof STR) => STR[k][loc];
  const cities = data.cities;
  const [tab, setTab] = useState<"UA" | "PL">("UA");
  const [sel, setSel] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  // Таблица внизу сортируется по доле открытых к предложениям, и наверху
  // оказываются одни польские города (Aleksandr, 2026-09-20: «а где тут
  // переключатель на Украину?»). Поэтому — фильтр по стране.

  const geo = useMemo(() => {
    const W = 1000, H = 600, PAD = 62;
    const lo = cities.map((c) => c.lon), la = cities.map((c) => c.lat);
    const lo0 = Math.min(...lo), lo1 = Math.max(...lo);
    const la0 = Math.min(...la), la1 = Math.max(...la);
    const maxN = Math.max(...cities.map((c) => c.n));
    return {
      W, H,
      x: (v: number) => PAD + ((v - lo0) / (lo1 - lo0)) * (W - 2 * PAD),
      y: (v: number) => PAD + ((la1 - v) / (la1 - la0)) * (H - 2 * PAD),
      r: (n: number) => 5 + Math.sqrt(n / maxN) * 42,
    };
  }, [cities]);

  // Тонкая сеть между крупнейшими городами: каждый соединён с двумя
  // ближайшими соседями. Это атмосфера, а не данные — поэтому очень
  // бледная и рисуется один раз при загрузке.
  const links = useMemo(() => {
    const top = [...cities].sort((a, b) => b.n - a.n).slice(0, 12);
    const seen = new Set<string>();
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    top.forEach((a) => {
      const near = top
        .filter((b) => b.key !== a.key)
        .sort((b1, b2) =>
          (b1.lat - a.lat) ** 2 + (b1.lon - a.lon) ** 2 -
          ((b2.lat - a.lat) ** 2 + (b2.lon - a.lon) ** 2))
        .slice(0, 2);
      near.forEach((b) => {
        const k = [a.key, b.key].sort().join("|");
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ x1: a.lon, y1: a.lat, x2: b.lon, y2: b.lat });
      });
    });
    return out;
  }, [cities]);

  const order = useMemo(
    () => cities.map((_, i) => i).sort((a, b) => (cities[b]?.n ?? 0) - (cities[a]?.n ?? 0)),
    [cities],
  );
  const c = cities[sel] ?? cities[0]!;
  const maxLang = Math.max(...c.langs.map((l) => l[1]));
  const langMax = data.languages[0]?.[1] ?? 1;
  const langTotal = data.languages.reduce((s, l) => s + l[1], 0);

  const uaTot = Object.values(data.langByCountry.UA ?? {}).reduce((a, b) => a + b, 0) || 1;
  const plTot = Object.values(data.langByCountry.PL ?? {}).reduce((a, b) => a + b, 0) || 1;
  const cmpKeys = data.languages.slice(0, 8).map((l) => l[0]);
  const cmpMax = Math.max(
    ...cmpKeys.map((k) =>
      Math.max(((data.langByCountry.UA?.[k] ?? 0) / uaTot) * 100,
               ((data.langByCountry.PL?.[k] ?? 0) / plTot) * 100)),
  ) || 1;

  const Legend = () => (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="inline-flex items-center gap-2">
        <i className="size-2.5 rounded-full" style={{ background: UA_COLOR }} />{t("ua")}
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="size-2.5 rounded-full" style={{ background: PL_COLOR }} />{t("pl")}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-16">
      <style>{KEYFRAMES}</style>

      {/* ---------- карта: тёмная панель-прибор в любой теме ---------- */}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Панель намеренно БЕЗ overflow-hidden: фон-градиент и так обрезается
            скруглением, а overflow резал подсказку про город у крайних точек
            (Aleksandr, 2026-09-20: «не влезло, показывай поверх»). */}
        <div
          className="rounded-3xl p-3 text-neutral-200 ring-1 ring-white/10"
          style={{
            background:
              "radial-gradient(900px 480px at 18% -10%, rgba(79,155,255,.20), transparent 60%)," +
              "radial-gradient(760px 420px at 92% 6%, rgba(255,122,77,.13), transparent 58%)," +
              "linear-gradient(180deg,#0b1020 0%,#0a0e1a 100%)",
          }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 pb-2 pt-1 text-neutral-300">
            <Legend />
            <span className="text-xs text-neutral-500">{t("areaNote")}</span>
          </div>

          <div className="relative">
          <svg viewBox={`0 0 ${geo.W} ${geo.H}`} className="block h-auto w-full max-w-full"
               role="img" aria-label={`${t("ua")} / ${t("pl")}`}>
            <defs>
              <radialGradient id="a1GlowUA">
                <stop offset="0%" stopColor={UA_COLOR} stopOpacity="0.55" />
                <stop offset="100%" stopColor={UA_COLOR} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="a1GlowPL">
                <stop offset="0%" stopColor={PL_COLOR} stopOpacity="0.5" />
                <stop offset="100%" stopColor={PL_COLOR} stopOpacity="0" />
              </radialGradient>
            </defs>

            {Array.from({ length: 7 }, (_, i) => {
              const yy = 62 + (i * (geo.H - 124)) / 6;
              return <line key={`h${i}`} x1="0" x2={geo.W} y1={yy} y2={yy}
                           stroke="rgba(148,163,196,.12)" strokeWidth={1} />;
            })}
            {Array.from({ length: 9 }, (_, i) => {
              const xx = 62 + (i * (geo.W - 124)) / 8;
              return <line key={`v${i}`} y1="0" y2={geo.H} x1={xx} x2={xx}
                           stroke="rgba(148,163,196,.12)" strokeWidth={1} />;
            })}

            {!calm && links.map((l, i) => (
              <line key={`lnk${i}`} className="a1-link"
                    x1={geo.x(l.x1)} y1={geo.y(l.y1)} x2={geo.x(l.x2)} y2={geo.y(l.y2)}
                    stroke="rgba(120,170,255,.22)" strokeWidth={1} pathLength={1}
                    style={{ animationDelay: `${300 + i * 45}ms` }} />
            ))}


            {order.map((idx, rank) => {
              const ct = cities[idx]!;
              const x = geo.x(ct.lon), y = geo.y(ct.lat), r = geo.r(ct.n);
              const col = ct.country === "UA" ? UA_COLOR : PL_COLOR;
              const glow = ct.country === "UA" ? "url(#a1GlowUA)" : "url(#a1GlowPL)";
              const active = idx === sel;
              return (
                <g key={ct.key}
                   className={calm ? "cursor-pointer" : "a1-dot cursor-pointer"}
                   style={calm ? undefined : { animationDelay: `${Math.min(rank * 26, 900)}ms` }}
                   onMouseEnter={() => { setSel(idx); setTip(idx); }}
                   onMouseLeave={() => setTip(null)}
                   onClick={() => { setSel(idx); setTip(idx); }}>
                  {rank < 3 && !calm && (
                    <circle className="a1-ring" cx={x} cy={y} r={6} fill="none"
                            stroke={col} strokeWidth={1.4}
                            style={{ animationDelay: `${rank * 1.2}s` }} />
                  )}
                  <circle cx={x} cy={y} r={r * 1.9} fill={glow} className="a1-halo"
                          opacity={active ? 0.5 : 0.32} />
                  <circle cx={x} cy={y} r={r} fill={col} opacity={0.2} />
                  <circle className="a1-core" cx={x} cy={y} r={Math.max(3.2, r * 0.42)}
                          fill={col} opacity={active ? 1 : 0.92}
                          stroke={active ? "#fff" : "none"} strokeWidth={active ? 1.6 : 0} />
                  <circle cx={x} cy={y} r={Math.max(r, 17)} fill="transparent" />
                  {rank < 9 && (
                    <text x={x} y={y - r - 10} textAnchor="middle"
                          className="pointer-events-none text-[11px] font-medium"
                          fill={active ? "#fff" : "rgba(226,232,240,.72)"}>
                      {ct.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {tip !== null && (() => {
            // Подсказка лежит поверх картинки и не обрезается. У городов
            // с краю её сдвигаем внутрь, у верхних — переворачиваем вниз,
            // иначе она вылезала бы за панель.
            const lx = (geo.x(cities[tip]!.lon) / geo.W) * 100;
            const ly = (geo.y(cities[tip]!.lat) / geo.H) * 100;
            const below = ly < 20;
            return (
              <div
                className={`pointer-events-none absolute z-30 -translate-x-1/2 rounded-xl bg-white px-3 py-2 text-sm whitespace-nowrap text-neutral-900 shadow-2xl ring-1 ring-black/10 ${below ? "translate-y-4" : "-translate-y-[135%]"}`}
                style={{ left: `${Math.min(86, Math.max(14, lx))}%`, top: `${ly}%` }}>
                <b className="block">{cities[tip]!.name}</b>
                <span className="text-neutral-500">{nf(cities[tip]!.n)} {t("devs")}</span>
              </div>
            );
          })()}
          </div>
        </div>

        {/* карточка выбранного города */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-semibold">{c.name}</div>
          <div className="mt-1 text-4xl font-bold tabular-nums"
               style={{ color: c.country === "UA" ? "#2f7fe0" : "#d9551f" }}>
            {/* key по городу — счётчик перезапускается и число перетекает
                в новое, вместо того чтобы прыгнуть. */}
            <Counter key={c.key} to={c.n} dur={420} />
          </div>
          <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t("devs")} · {c.country === "UA" ? t("ua") : t("pl")}
          </div>

          <hr className="my-5 border-neutral-200 dark:border-white/10" />
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {t("mainLangs")}
          </div>
          <div className="flex flex-col gap-2.5">
            {/* key по позиции, а не по названию языка: иначе при смене
                города React пересоздаёт строки и полосы прыгают вместо
                того, чтобы плавно переехать. */}
            {c.langs.map((l, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span>{l[0]}</span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{nf(l[1])}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white dark:bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-700 ease-out"
                       style={{ width: `${(l[1] / maxLang) * 100}%`,
                                background: SERIES[i % SERIES.length]! }} />
                </div>
              </div>
            ))}
          </div>

          <hr className="my-5 border-neutral-200 dark:border-white/10" />
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {t("openTo")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {Math.round((c.hire / c.n) * 100)}%
          </div>
          <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {nf(c.hire)} {t("outOf")} {nf(c.n)}
          </div>
          <p className="mt-4 text-sm text-neutral-400 dark:text-neutral-500">{t("pickCity")}</p>
        </div>
      </div>

      {/* ---------- языки ---------- */}
      <div>
        <header className="border-t border-neutral-200 pt-12 dark:border-white/10">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
            {heads.langs.title}
          </h2>
          <p className="mt-2 mb-8 max-w-2xl text-neutral-500 dark:text-neutral-400">{heads.langs.note}</p>
        </header>
        <div ref={langsRef} className="flex flex-col gap-3">
          {data.languages.slice(0, 10).map((l, i) => (
            <div key={l[0]}
                 className="grid grid-cols-[6rem_1fr_6rem] items-center gap-3 sm:grid-cols-[8rem_1fr_7rem] sm:gap-4">
              <div className="truncate text-sm font-semibold">{l[0]}</div>
              <div className="h-5 overflow-hidden rounded bg-white dark:bg-white/10">
                <div className="h-full rounded-r transition-[width] duration-1000 ease-out"
                     style={{
                       width: langsIn ? `${(l[1] / langMax) * 100}%` : "0%",
                       transitionDelay: calm ? undefined : `${i * 55}ms`,
                       background: SERIES[i % SERIES.length]!,
                     }} />
              </div>
              <div className="text-right text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                {nf(l[1])}
                <span className="ml-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                  {((l[1] / langTotal) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Украина и Польша ---------- */}
      <div>
        <header className="border-t border-neutral-200 pt-12 dark:border-white/10">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
            {heads.cmp.title}
          </h2>
          <p className="mt-2 mb-8 max-w-2xl text-neutral-500 dark:text-neutral-400">{heads.cmp.note}</p>
        </header>
        <div ref={cmpRef} className="flex flex-col gap-4">
          <div className="text-neutral-600 dark:text-neutral-300"><Legend /></div>
          {cmpKeys.map((k, ki) => {
            const a = ((data.langByCountry.UA?.[k] ?? 0) / uaTot) * 100;
            const b = ((data.langByCountry.PL?.[k] ?? 0) / plTot) * 100;
            const rows: [number, string][] = [[a, "#2f7fe0"], [b, "#d9551f"]];
            return (
              <div key={k}
                   className="grid grid-cols-[6rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                <div className="truncate text-sm font-semibold">{k}</div>
                <div className="flex flex-col gap-1">
                  {rows.map(([v, col], j) => (
                    <div key={j} className="grid grid-cols-[1fr_3.5rem] items-center gap-2">
                      <div className="h-3 overflow-hidden rounded-sm bg-white dark:bg-white/10">
                        <div className="h-full rounded-r-sm transition-[width] duration-1000 ease-out"
                             style={{
                               width: cmpIn ? `${(v / cmpMax) * 100}%` : "0%",
                               transitionDelay: calm ? undefined : `${ki * 50 + j * 25}ms`,
                               background: col,
                             }} />
                      </div>
                      <span className="text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {v.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- кто открыт к предложениям ---------- */}
      <div>
        <header className="border-t border-neutral-200 pt-12 dark:border-white/10">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
            {heads.open.title}
          </h2>
          <p className="mt-2 mb-8 max-w-2xl text-neutral-500 dark:text-neutral-400">{heads.open.note}</p>
        </header>
        {/* Aleksandr, 2026-09-20: «сделай, как у нас там на вакансии и
            фахівці, она таким синим цветом чуть приглушённым» — те же
            классы, что и у пилюли в шапке сайта (components/site-nav.tsx):
            круглая подложка, активная кнопка залита accent на 15%. */}
        <div ref={openRef}
             className="mb-5 inline-flex h-11 items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 dark:border-white/10 dark:bg-neutral-900">
          {([["UA", "\u{1F1FA}\u{1F1E6}", t("ua")], ["PL", "\u{1F1F5}\u{1F1F1}", t("pl")]] as const).map(([k, flag, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
                    aria-pressed={tab === k}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition sm:px-6 ${
                      tab === k
                        ? "bg-accent/15 text-accent"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
                    }`}>
              <span aria-hidden>{flag}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-white/10">
          <table className="w-full border-collapse bg-white text-sm sm:min-w-[32rem] dark:bg-white/[0.04]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <th className="border-b border-neutral-200 px-4 py-3 text-left font-bold dark:border-white/10">{t("city")}</th>
                <th className="border-b border-neutral-200 px-4 py-3 text-right font-bold dark:border-white/10">{t("devs")}</th>
                <th className="hidden border-b border-neutral-200 px-4 py-3 text-right font-bold sm:table-cell dark:border-white/10">{t("open")}</th>
                <th className="border-b border-neutral-200 px-4 py-3 text-right font-bold dark:border-white/10">{t("share")}</th>
              </tr>
            </thead>
            <tbody>
              {cities.filter((x) => x.n >= 30 && x.country === tab)
                .sort((a, b) => b.n - a.n)
                .map((x) => {
                  const pct = Math.round((x.hire / x.n) * 100);
                  return (
                    <tr key={x.key}
                        onMouseEnter={() => {
                          const i = cities.findIndex((y) => y.key === x.key);
                          if (i >= 0) { setSel(i); setTip(i); }
                        }}
                        onMouseLeave={() => setTip(null)}
                        className={`cursor-default transition-colors ${
                          c.key === x.key
                            ? "bg-neutral-100 dark:bg-white/10"
                            : "hover:bg-neutral-50 dark:hover:bg-white/5"
                        }`}>
                      <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-2.5 dark:border-white/5">
                        <span className="mr-2 inline-block size-2 rounded-full align-middle"
                              style={{ background: x.country === "UA" ? "#2f7fe0" : "#d9551f" }} />
                        {x.name}
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-2.5 text-right tabular-nums dark:border-white/5">{nf(x.n)}</td>
                      <td className="hidden border-b border-neutral-100 px-4 py-2.5 text-right tabular-nums sm:table-cell dark:border-white/5">{nf(x.hire)}</td>
                      <td className="border-b border-neutral-100 px-4 py-2.5 dark:border-white/5">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white sm:block dark:bg-white/10">
                            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
                                 style={{ width: openIn ? `${Math.min(pct * 2.2, 100)}%` : "0%" }} />
                          </div>
                          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
