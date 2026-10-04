// app/game-map/game-map.tsx -- обёртка карты A1 (версия 2, 02.10.2026).
// Вся карта живёт в ./engine.ts (canvas без фреймворка); здесь --
// регион, загрузка данных, монтирование, тема и язык сайта.
//
// Режим 1 -- карта в рамке на странице. Режим 2 -- кнопка «на весь екран»
// внутри карты: настоящий полный экран без меню сайта (engine.ts toggleFs).
//
// 02.10.2026 (Александр: карта для інших країн). Регіони: Україна, Європа,
// Америка. За замовчуванням -- регіон людини: американцю одразу Америка.
// Країну беремо з часового поясу браузера (Railway, на відміну від Vercel,
// не передає країну відвідувача). Вибір запамʼятовується. Дані й підкладка
// регіону вантажаться лише тоді, коли його обрали.
"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveLocale } from "@/lib/use-active-locale";
import { GAME_MAP_CSS, mountGameMap, type MapCompany } from "./engine";
import { MapLoader } from "./map-loader";
import { disposeMapMusic } from "./music";

type MapHandle = (() => void) & { setLang?: (lang: string) => void; setTheme?: (theme: string) => void };
type Region = "ua" | "eu" | "us" | "latam" | "asia" | "oceania" | "mideast";
const REGIONS = ["ua", "eu", "us", "latam", "asia", "oceania", "mideast"];
const KEY = "a1-map-region";

// 04.10.2026: карта внутри приложения A1 (WebView) открывается как
// /game-map?app=1&theme=dark|light&lang=uk[&region=eu]. Тему и язык тогда
// задаёт приложение, а не сайт.
type AppParams = { app: boolean; theme: "dark" | "light" | null; lang: string | null };
function appParams(): AppParams {
  try {
    const q = new URLSearchParams(location.search);
    const t = q.get("theme");
    return { app: q.get("app") === "1", theme: t === "dark" || t === "light" ? t : null, lang: q.get("lang") };
  } catch {
    return { app: false, theme: null, lang: null };
  }
}
function mapDark(): boolean {
  const p = appParams();
  return p.app && p.theme ? p.theme === "dark" : siteDark();
}

// Тема сайту: клас .dark/.light на <html> (вибір людини), інакше -- тема
// системи (як @custom-variant dark у globals.css).
function siteDark(): boolean {
  const c = document.documentElement.classList;
  if (c.contains("dark")) return true;
  if (c.contains("light")) return false;
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

// Латинська Америка (03.10.2026): часові пояси Мексики, Центральної й
// Південної Америки, Карибів.
const LATAM_TZ =
  /^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Mazatlan|Hermosillo|Tijuana|Bahia_Banderas|Ojinaga|Guatemala|Belize|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama|Havana|Santo_Domingo|Port-au-Prince|Jamaica|Puerto_Rico|Bogota|Caracas|Guayaquil|Lima|La_Paz|Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe|Asuncion|Montevideo|Argentina\/.+|Buenos_Aires|Cordoba|Santiago|Punta_Arenas|Guyana|Paramaribo|Cayenne)$/;

// Близький Схід, Азія й Океанія (03.10.2026): за часовим поясом.
const MIDEAST_TZ = /^(Asia\/(Jerusalem|Tel_Aviv|Gaza|Hebron|Amman|Beirut|Damascus|Baghdad|Tehran|Riyadh|Kuwait|Bahrain|Qatar|Dubai|Muscat|Aden)|Africa\/Cairo)$/;
const OCEANIA_TZ = /^(Australia\/.+|Pacific\/(Auckland|Fiji|Port_Moresby|Noumea|Guadalcanal|Efate|Apia|Tongatapu)|Antarctica\/Macquarie)$/;

function defaultRegion(): Region {
  try {
    const q = new URLSearchParams(location.search).get("region");
    if (q && REGIONS.includes(q)) return q as Region;
    const saved = localStorage.getItem(KEY);
    if (saved && REGIONS.includes(saved)) return saved as Region;
  } catch {
    /* приватний режим */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/^Europe\/(Kiev|Kyiv|Uzhgorod|Zaporozhye|Simferopol)$/.test(tz)) return "ua";
    if (LATAM_TZ.test(tz)) return "latam";
    if (MIDEAST_TZ.test(tz)) return "mideast";
    if (OCEANIA_TZ.test(tz)) return "oceania";
    if (tz.startsWith("Asia/") && !/^Asia\/(Nicosia|Famagusta|Tbilisi|Yerevan|Baku|Istanbul|Yekaterinburg|Omsk|Novosibirsk|Krasnoyarsk|Irkutsk|Yakutsk|Vladivostok|Magadan|Kamchatka)$/.test(tz)) return "asia";
    if (tz.startsWith("America/") || tz.startsWith("US/") || tz.startsWith("Canada/")) return "us";
    if (tz.startsWith("Europe/") || tz.startsWith("Atlantic/")) return "eu";
  } catch {
    /* старий браузер */
  }
  return "ua";
}

export function GameMap() {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [data, setData] = useState<{ region: Region; companies: MapCompany[] } | null>(null);
  // Країна, обрана у списку регіонів (камера одразу на неї після монтування).
  const countryRef = useRef<string | null>(null);
  const [dark, setDark] = useState(false);
  // В приложении и экран загрузки сразу на весь экран, без меню сайта.
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(appParams().app), []);

  // 02.10.2026 (Александр): темна тема сайту -- темна карта, і одразу, коли
  // тему перемкнули.
  useEffect(() => {
    const sync = () => {
      const d = mapDark();
      setDark(d);
      handle.current?.setTheme?.(d ? "dark" : "light");
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", sync);
    return () => {
      mo.disconnect();
      mq?.removeEventListener?.("change", sync);
    };
  }, []);
  const lang = useActiveLocale();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    setRegion(defaultRegion());
  }, []);

  // Музика карти живе, поки відкрита сторінка карти (зміна регіону її не
  // обриває); пішли зі сторінки -- гасимо й запам'ятовуємо місце.
  useEffect(() => () => disposeMapMusic(), []);

  useEffect(() => {
    if (!region) return;
    let alive = true;
    setData(null);
    fetch(`/game-map/data?region=${region}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: unknown) => {
        if (alive) setData({ region, companies: Array.isArray(list) ? (list as MapCompany[]) : [] });
      });
    return () => {
      alive = false;
    };
  }, [region]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !data) return;
    const h = mountGameMap(el, {
      companies: data.companies,
      theme: mapDark() ? "dark" : "light",
      lang: appParams().lang || langRef.current,
      app: appParams().app,
      region: data.region,
      country: countryRef.current,
      onRegion: (next: Region, cc?: string | null) => {
        countryRef.current = cc ?? null;
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* приватний режим */
        }
        setRegion(next);
      },
    }) as MapHandle;
    handle.current = h;
    return () => {
      handle.current = null;
      h();
    };
  }, [data]);

  useEffect(() => {
    if (appParams().lang) return;
    handle.current?.setLang?.(lang);
  }, [lang]);

  return (
    <>
      <style>{GAME_MAP_CSS}</style>
      <div className="relative">
        <div ref={ref} className="gm2" />
        {!data && (
          <div className={"gm2 gm-ov" + (dark ? " gm-dark" : "") + (inApp ? " gm-full" : "")}>
            <MapLoader />
          </div>
        )}
      </div>
    </>
  );
}
