// components/events/events-explorer.tsx -- главная страница «Події»: фильтры, карусель ближайших,
// живой календарь месяца (клик по дню -- события дня справа) и лента по месяцам.
//
// Для поисковика: лента (внизу) рисуется на сервере целиком, обычными ссылками; фильтры только
// прячут/показывают строки в браузере. Календарь и карусель -- надстройка для людей.
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { EvLang } from "@/lib/events/types";
import { countryLabel, eventPath, fmtRange, monthKey, monthTitle, placeLabel, regionOf, utc, type Coll, type Region } from "@/lib/events/util";
import { DateTile } from "./date-tile";
import { EventCover } from "./event-cover";
import { EventRow, type ListEvent } from "./event-row";
import { EventsMap, type MapCountry } from "./events-map";
import { Pager } from "./pager";

const TXT = {
  uk: {
    all: "Усі", ua: "Україна", eu: "Європа", online: "Онлайн", world: "Світ",
    allTopics: "Усі теми", soon: "Найближчі", today: "Сьогодні", noDay: "Цього дня подій немає. Ось найближчі:",
    dayEvents: "Події дня", inCountry: "Події", more: "Показати ще", nothing: "За цими фільтрами нічого немає. Спробуйте змінити регіон або тему.",
    region: "Регіон", topic: "Тема", list: "Усі найближчі події", free: "Безкоштовно",
  },
  en: {
    all: "All", ua: "Ukraine", eu: "Europe", online: "Online", world: "World",
    allTopics: "All topics", soon: "Coming up", today: "Today", noDay: "No events on this day. Coming up next:",
    dayEvents: "Events on this day", inCountry: "Events", more: "Show more", nothing: "Nothing matches these filters. Try another region or topic.",
    region: "Region", topic: "Topic", list: "All upcoming events", free: "Free",
  },
} as const;

const PAGE = 20;
const DOT: Record<Region, string> = { ua: "bg-yellow-400", eu: "bg-sky-400", online: "bg-emerald-400", world: "bg-rose-400" };

function addMonths(key: string, d: number): string {
  const [y = 2026, m = 1] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + d, 1, 12));
  return dt.toISOString().slice(0, 7);
}

function daysOfMonth(key: string): { iso: string; inMonth: boolean }[] {
  const [y = 2026, m = 1] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1, 12));
  const shift = (first.getUTCDay() + 6) % 7; // понедельник первым
  const start = new Date(first);
  start.setUTCDate(1 - shift);
  const out: { iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ iso, inMonth: iso.slice(0, 7) === key });
  }
  // последнюю неделю, целиком чужую, не рисуем
  return out.slice(35).every((c) => !c.inMonth) ? out.slice(0, 35) : out;
}

export function EventsExplorer({ events, tags, lang, today, heading }: { events: ListEvent[]; tags: Coll[]; lang: EvLang; today: string; heading?: React.ReactNode }) {
  const t = TXT[lang];
  const [region, setRegion] = useState<"all" | Region>("all");
  const [tag, setTag] = useState("");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [country, setCountry] = useState<string | null>(null);
  const listTop = useRef<HTMLElement>(null);

  const filtered = useMemo(
    () => events.filter((e) => (region === "all" || regionOf(e) === region) && (!tag || e.tags.includes(tag))),
    [events, region, tag],
  );
  const upcoming = useMemo(() => filtered.filter((e) => e.end >= today), [filtered, today]);
  const counts = useMemo(() => {
    const c: Record<"all" | Region, number> = { all: 0, ua: 0, eu: 0, online: 0, world: 0 };
    for (const e of events) {
      if (e.end < today || (tag && !e.tags.includes(tag))) continue;
      c.all++;
      c[regionOf(e)]++;
    }
    return c;
  }, [events, today, tag]);

  const cells = useMemo(() => daysOfMonth(month), [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, ListEvent[]>();
    const lo = cells[0]?.iso ?? "";
    const hi = cells[cells.length - 1]?.iso ?? "";
    for (const e of filtered) {
      if (e.end < lo || e.start > hi) continue;
      const from = e.start < lo ? lo : e.start;
      const to = e.end > hi ? hi : e.end;
      const d = utc(from);
      for (let i = 0; i < 40; i++) {
        const iso = d.toISOString().slice(0, 10);
        if (iso > to) break;
        const arr = m.get(iso) ?? [];
        arr.push(e);
        m.set(iso, arr);
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
    return m;
  }, [filtered, cells]);

  const dayList = day ? byDay.get(day) ?? [] : [];
  const panelIsDay = !!day && dayList.length > 0;
  // события, по которым рисуем карту: выбранный день, а без дня -- весь видимый месяц
  const mapEvents = useMemo(() => {
    if (panelIsDay) return dayList;
    const seen = new Set<string>();
    const out: ListEvent[] = [];
    for (const iso of cells.filter((c) => c.inMonth).map((c) => c.iso)) {
      for (const e of byDay.get(iso) ?? []) if (!seen.has(e.slug)) { seen.add(e.slug); out.push(e); }
    }
    return out.sort((a, b) => (a.start < b.start ? -1 : 1));
  }, [panelIsDay, dayList, cells, byDay]);
  const mapCountries = useMemo<MapCountry[]>(() => {
    const m = new Map<string, number>();
    for (const e of mapEvents) if (e.country && !e.online) m.set(e.country, (m.get(e.country) ?? 0) + 1);
    return [...m.entries()].map(([key, n]) => ({ key, n, label: countryLabel(key, lang) })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [mapEvents, lang]);
  const onlineCount = useMemo(() => mapEvents.filter((e) => e.online || !e.country).length, [mapEvents]);
  const matchCountry = (e: ListEvent) => (sel === "__online" ? e.online || !e.country : e.country === sel && !e.online);
  const sel = country && (country === "__online" || mapCountries.some((c) => c.key === country)) ? country : null;
  const panel = sel ? mapEvents.filter(matchCountry) : panelIsDay ? dayList : upcoming.slice(0, 5);
  const selLabel = sel === "__online" ? (lang === "uk" ? "онлайн" : "online") : sel ? countryLabel(sel, lang) : "";
  const carousel = upcoming.slice(0, 8);
  const topTags = tags.filter((c) => c.upcoming > 0).slice(0, 16);

  const pages = Math.max(1, Math.ceil(upcoming.length / PAGE));
  const curPage = Math.min(page, pages);
  const groups = useMemo(() => {
    const g: { key: string; items: ListEvent[] }[] = [];
    for (const e of upcoming.slice((curPage - 1) * PAGE, curPage * PAGE)) {
      const k = monthKey(e.start < today ? today : e.start);
      const last = g[g.length - 1];
      if (last && last.key === k) last.items.push(e);
      else g.push({ key: k, items: [e] });
    }
    return g;
  }, [upcoming, curPage, today]);

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i, 12)).toLocaleDateString(lang === "uk" ? "uk-UA" : "en-GB", { weekday: "short", timeZone: "UTC" })), [lang]);

  const pill = (active: boolean) =>
    "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
    (active ? "bg-accent text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700");

  return (
    <div>
      {heading}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t.region}>
        {(["all", "ua", "eu", "online", "world"] as const).map((r) => (
          <button key={r} type="button" onClick={() => { setRegion(r); setPage(1); }} className={pill(region === r)}>
            {t[r]} <span className="opacity-60">{counts[r]}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t.topic}>
        <button type="button" onClick={() => { setTag(""); setPage(1); }} className={pill(!tag)}>{t.allTopics}</button>
        {topTags.map((c) => (
          <button key={c.slug} type="button" onClick={() => { setTag(tag === c.label ? "" : c.label); setPage(1); }} className={pill(tag === c.label)}>
            {c.label}
          </button>
        ))}
      </div>

      {carousel.length ? (
        <section className="mt-7" aria-label={t.soon}>
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.soon}</h2>
          <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {carousel.map((e) => (
              <li key={e.slug} className="w-[260px] shrink-0 snap-start">
                <Link href={eventPath(e.slug, lang)} className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900 dark:ring-neutral-800">
                  <span className="relative block">
                    <EventCover src={e.image} name={e.name} seed={e.slug} className="aspect-[16/10] w-full" big />
                    <span className="absolute left-3 top-3"><DateTile start={e.start} lang={lang} /></span>
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 block text-[15px] font-semibold leading-snug text-neutral-900 group-hover:text-accent dark:text-neutral-50">{e.name}</span>
                    <span className="mt-1 block truncate text-[12px] text-neutral-500 dark:text-neutral-400">{placeLabel(e, lang)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 md:grid-cols-[340px_1fr]" aria-label="calendar">
        <div className="self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="prev" onClick={() => setMonth(addMonths(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">‹</button>
            <button type="button" onClick={() => { setMonth(today.slice(0, 7)); setDay(today); }} className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50" title={t.today}>{monthTitle(month, lang)}</button>
            <button type="button" aria-label="next" onClick={() => setMonth(addMonths(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">›</button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
            {weekdays.map((w) => (
              <span key={w} className="pb-1 text-[11px] font-medium uppercase text-neutral-400">{w}</span>
            ))}
            {cells.map(({ iso, inMonth }) => {
              const list = byDay.get(iso) ?? [];
              const isToday = iso === today;
              const sel = iso === day;
              const regs = [...new Set(list.map((e) => regionOf(e)))].slice(0, 3);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!list.length}
                  onClick={() => setDay(sel ? null : iso)}
                  aria-pressed={sel}
                  className={
                    "mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-[14px] tabular-nums transition " +
                    (sel ? "bg-accent text-white " : list.length ? "font-semibold text-neutral-900 hover:bg-accent/10 dark:text-neutral-50 " : "text-neutral-400 dark:text-neutral-600 ") +
                    (!inMonth && !sel ? "opacity-40 " : "") +
                    (isToday && !sel ? "ring-1 ring-rose-500 " : "")
                  }
                >
                  <span className={isToday && !sel ? "text-rose-500" : ""}>{Number(iso.slice(8))}</span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {regs.map((r) => (
                      <span key={r} className={"h-1.5 w-1.5 rounded-full " + (sel ? "bg-white" : DOT[r])} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {(["ua", "eu", "online", "world"] as const).map((r) => (
              <span key={r} className="inline-flex items-center gap-1"><span className={"h-2 w-2 rounded-full " + DOT[r]} />{t[r]}</span>
            ))}
          </div>
        </div>

        <EventsMap lang={lang} countries={mapCountries} onlineCount={onlineCount} selected={sel} onSelect={setCountry} />
      </section>

      <section className="mt-6" aria-live="polite">
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {sel ? `${t.inCountry}: ${selLabel} · ${panelIsDay && day ? fmtRange(day, day, lang) : monthTitle(month, lang)}` : panelIsDay && day ? `${t.dayEvents}: ${fmtRange(day, day, lang)}` : day ? t.noDay : t.soon}
          </h2>
          {panel.length ? (
            <ul className="mt-2">
              {panel.map((e) => (
                <EventRow key={e.slug + (panelIsDay ? day : "")} e={e} lang={lang} showTags={false} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-neutral-500">{t.nothing}</p>
          )}
      </section>

      <section ref={listTop} className="mt-10 scroll-mt-24" aria-label={t.list}>
        <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.list}</h2>
        {groups.length ? (
          groups.map((g) => (
            <div key={g.key} className="mt-5">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-rose-500">{monthTitle(g.key, lang)}</h3>
              <ul className="mt-1">
                {g.items.map((e) => (
                  <EventRow key={e.slug} e={e} lang={lang} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="mt-3 text-neutral-500">{t.nothing}</p>
        )}
        <Pager page={curPage} pages={pages} onPage={(p) => { setPage(p); listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      </section>
    </div>
  );
}
