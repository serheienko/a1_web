// app/map/it-map.tsx — интерактивная часть страницы /map.
//
// Aleksandr, 2026-09-20: «давай может пока сделаем страницу на сайт, потом
// просто обновим цифры, как они у нас будут» — поэтому все числа живут
// отдельным файлом lib/a1/it-map-data.json, который пересобирается
// скриптом shtab/github/make_stats.py. Обновить цифры = перезапустить
// скрипт и запушить; эту вёрстку трогать не нужно.
//
// Клиентский компонент, а не серверный: карта и графики реагируют на
// наведение и клик. Статический текст страницы остался в page.tsx как
// серверный <T/> — чтобы девять языков рендерились без JS, как везде.
//
// Язык здесь определяется иначе, чем в <T/>: тот полагается на CSS
// (`lang-XX:inline`), но подписи внутри <svg> и в tooltip'е — обычные
// строки в JS, CSS-трюк к ним неприменим. Поэтому читаем тот самый
// `lang-XX` класс, который layout проставляет на <html> до первой
// отрисовки, и выбираем строку сами.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/components/t";

type City = {
  key: string; name: string; country: "UA" | "PL";
  lat: number; lon: number; n: number; hire: number;
  langs: [string, number][];
};

export type MapData = {
  generated: string; found: number; total: number; hireable: number; avgRepos: number;
  country: Record<string, number>;
  languages: [string, number][];
  langByCountry: Record<string, Record<string, number>>;
  cities: City[];
};

// Палитра для языков программирования. Проверена на различимость при
// дальтонизме, а не подобрана на глаз. Рядом с цветом везде стоит
// подпись — цвет нигде не единственный признак.
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
const UA_COLOR = "#3987e5";
const PL_COLOR = "#d95926";

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
  open: { uk: "Відкриті", en: "Open", ru: "Открыты", de: "Offen", es: "Abiertos",
    fr: "Ouverts", pl: "Otwarci", ptBR: "Abertos", zh: "接受机会" },
} as const;

function useLocale(): Locale {
  // До гидрации — украинский, как <html class="lang-uk"> в layout.
  // После монтирования читаем реальный класс.
  const [loc, setLoc] = useState<Locale>("uk");
  useEffect(() => {
    const m = /\blang-(uk|en|ru|de|es|fr|pl|ptbr|zh)\b/.exec(document.documentElement.className);
    if (m) setLoc((m[1] === "ptbr" ? "ptBR" : m[1]) as Locale);
  }, []);
  return loc;
}

const nf = (n: number) => n.toLocaleString("uk-UA").replace(/ /g, " ");

export function ItMap({ data }: { data: MapData }) {
  const loc = useLocale();
  const t = (k: keyof typeof STR) => STR[k][loc];
  const cities = data.cities;
  const [sel, setSel] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const geo = useMemo(() => {
    const W = 1000, H = 600, PAD = 60;
    const lo = cities.map((c) => c.lon), la = cities.map((c) => c.lat);
    const lo0 = Math.min(...lo), lo1 = Math.max(...lo);
    const la0 = Math.min(...la), la1 = Math.max(...la);
    const maxN = Math.max(...cities.map((c) => c.n));
    return {
      W, H,
      x: (v: number) => PAD + ((v - lo0) / (lo1 - lo0)) * (W - 2 * PAD),
      y: (v: number) => PAD + ((la1 - v) / (la1 - la0)) * (H - 2 * PAD),
      r: (n: number) => 5 + Math.sqrt(n / maxN) * 40,
    };
  }, [cities]);

  const order = useMemo(
    () => cities.map((_, i) => i).sort((a, b) => cities[b].n - cities[a].n),
    [cities],
  );
  const c = cities[sel];
  const maxLang = Math.max(...c.langs.map((l) => l[1]));
  const langMax = data.languages[0][1];
  const langTotal = data.languages.reduce((s, l) => s + l[1], 0);

  const uaTot = Object.values(data.langByCountry.UA ?? {}).reduce((a, b) => a + b, 0) || 1;
  const plTot = Object.values(data.langByCountry.PL ?? {}).reduce((a, b) => a + b, 0) || 1;
  const cmpKeys = data.languages.slice(0, 8).map((l) => l[0]);
  const cmpMax = Math.max(
    ...cmpKeys.map((k) =>
      Math.max(((data.langByCountry.UA?.[k] ?? 0) / uaTot) * 100,
               ((data.langByCountry.PL?.[k] ?? 0) / plTot) * 100)),
  ) || 1;

  return (
    <div className="flex flex-col gap-16">
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div ref={boxRef}
             className="relative rounded-2xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 pb-3 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="inline-flex items-center gap-2">
              <i className="size-2.5 rounded-full" style={{ background: UA_COLOR }} />{t("ua")}
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="size-2.5 rounded-full" style={{ background: PL_COLOR }} />{t("pl")}
            </span>
            <span className="text-neutral-400 dark:text-neutral-500">{t("areaNote")}</span>
          </div>

          <svg viewBox={`0 0 ${geo.W} ${geo.H}`} className="block h-auto w-full max-w-full"
               role="img" aria-label={`${t("ua")} / ${t("pl")}`}>
            {Array.from({ length: 7 }, (_, i) => {
              const yy = 60 + (i * (geo.H - 120)) / 6;
              return <line key={`h${i}`} x1="0" x2={geo.W} y1={yy} y2={yy}
                           className="stroke-neutral-200 dark:stroke-white/10" strokeWidth={1} />;
            })}
            {Array.from({ length: 9 }, (_, i) => {
              const xx = 60 + (i * (geo.W - 120)) / 8;
              return <line key={`v${i}`} y1="0" y2={geo.H} x1={xx} x2={xx}
                           className="stroke-neutral-200 dark:stroke-white/10" strokeWidth={1} />;
            })}
            {order.map((idx, rank) => {
              const ct = cities[idx];
              const x = geo.x(ct.lon), y = geo.y(ct.lat), r = geo.r(ct.n);
              const col = ct.country === "UA" ? UA_COLOR : PL_COLOR;
              return (
                <g key={ct.key} className="cursor-pointer"
                   onMouseEnter={() => { setSel(idx); setTip(idx); }}
                   onMouseLeave={() => setTip(null)}
                   onClick={() => { setSel(idx); setTip(idx); }}>
                  <circle cx={x} cy={y} r={r} fill={col} opacity={0.22} />
                  <circle cx={x} cy={y} r={Math.max(3, r * 0.42)} fill={col}
                          opacity={idx === sel ? 1 : 0.9} />
                  <circle cx={x} cy={y} r={Math.max(r, 16)} fill="transparent" />
                  {rank < 9 && (
                    <text x={x} y={y - r - 9} textAnchor="middle"
                          className="pointer-events-none fill-neutral-500 text-[11px] dark:fill-neutral-300">
                      {ct.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {tip !== null && (
            <div className="pointer-events-none absolute z-10 -tranneutral-x-1/2 -tranneutral-y-[130%] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-white/15 dark:bg-neutral-800"
                 style={{
                   left: `${(geo.x(cities[tip].lon) / geo.W) * 100}%`,
                   top: `${(geo.y(cities[tip].lat) / geo.H) * 100}%`,
                 }}>
              <b className="block">{cities[tip].name}</b>
              <span className="text-neutral-500 dark:text-neutral-400">
                {nf(cities[tip].n)} {t("devs")}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-semibold">{c.name}</div>
          <div className="mt-1 text-4xl font-bold tabular-nums"
               style={{ color: c.country === "UA" ? UA_COLOR : PL_COLOR }}>
            {nf(c.n)}
          </div>
          <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t("devs")} · {c.country === "UA" ? t("ua") : t("pl")}
          </div>

          <hr className="my-5 border-neutral-200 dark:border-white/10" />
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {t("mainLangs")}
          </div>
          <div className="flex flex-col gap-2.5">
            {c.langs.map((l, i) => (
              <div key={l[0]}>
                <div className="flex items-center justify-between text-sm">
                  <span>{l[0]}</span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{nf(l[1])}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-500"
                       style={{ width: `${(l[1] / maxLang) * 100}%`, background: SERIES[i % SERIES.length] }} />
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

      <div id="langs" className="flex flex-col gap-3">
        {data.languages.slice(0, 10).map((l, i) => (
          <div key={l[0]} className="grid grid-cols-[6rem_1fr_6rem] items-center gap-3 sm:grid-cols-[8rem_1fr_7rem] sm:gap-4">
            <div className="truncate text-sm font-semibold">{l[0]}</div>
            <div className="h-5 overflow-hidden rounded bg-neutral-100 dark:bg-white/10">
              <div className="h-full rounded-r transition-[width] duration-700"
                   style={{ width: `${(l[1] / langMax) * 100}%`, background: SERIES[i % SERIES.length] }} />
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

      <div id="cmp" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-2">
            <i className="size-2.5 rounded-full" style={{ background: UA_COLOR }} />{t("ua")}
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="size-2.5 rounded-full" style={{ background: PL_COLOR }} />{t("pl")}
          </span>
        </div>
        {cmpKeys.map((k) => {
          const a = ((data.langByCountry.UA?.[k] ?? 0) / uaTot) * 100;
          const b = ((data.langByCountry.PL?.[k] ?? 0) / plTot) * 100;
          const rows: [number, string][] = [[a, UA_COLOR], [b, PL_COLOR]];
          return (
            <div key={k} className="grid grid-cols-[6rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <div className="truncate text-sm font-semibold">{k}</div>
              <div className="flex flex-col gap-1">
                {rows.map(([v, col], j) => (
                  <div key={j} className="grid grid-cols-[1fr_3.5rem] items-center gap-2">
                    <div className="h-3 overflow-hidden rounded-sm bg-neutral-100 dark:bg-white/10">
                      <div className="h-full rounded-r-sm transition-[width] duration-700"
                           style={{ width: `${(v / cmpMax) * 100}%`, background: col }} />
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

      <div id="open" className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-white/10">
        <table className="w-full min-w-[32rem] border-collapse bg-white text-sm dark:bg-white/[0.04]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              <th className="border-b border-neutral-200 px-4 py-3 text-left font-bold dark:border-white/10">{t("city")}</th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right font-bold dark:border-white/10">{t("devs")}</th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right font-bold dark:border-white/10">{t("open")}</th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right font-bold dark:border-white/10">{t("share")}</th>
            </tr>
          </thead>
          <tbody>
            {cities.filter((x) => x.n >= 30)
              .sort((a, b) => b.hire / b.n - a.hire / a.n)
              .slice(0, 12)
              .map((x) => (
                <tr key={x.key}>
                  <td className="border-b border-neutral-100 px-4 py-2.5 dark:border-white/5">
                    {x.name} <span className="text-xs text-neutral-400 dark:text-neutral-500">{x.country}</span>
                  </td>
                  <td className="border-b border-neutral-100 px-4 py-2.5 text-right tabular-nums dark:border-white/5">{nf(x.n)}</td>
                  <td className="border-b border-neutral-100 px-4 py-2.5 text-right tabular-nums dark:border-white/5">{nf(x.hire)}</td>
                  <td className="border-b border-neutral-100 px-4 py-2.5 text-right font-bold tabular-nums text-emerald-600 dark:border-white/5 dark:text-emerald-400">
                    {Math.round((x.hire / x.n) * 100)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
