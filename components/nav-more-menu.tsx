// components/nav-more-menu.tsx
//
// Александр, 08.10.2026: «три боковые кнопки возле аватара ... сделаем три
// точки, и там на них повесим: скачать приложение, A1 Stats, игру в самый низ.
// Карту оставим отдельной иконкой. При наведении пусть окошки-превью остаются,
// просто чтобы красиво оверлеилось. Три точки при ховере тоже анимированные».
//
// Что здесь. Круглая кнопка «⋯» (44px, как все круги шапки). Наведение (или
// клик) открывает меню -- тем же useHoverPanel, что и меню аватара, поэтому
// открывается/закрывается одинаково. Наведение на строку меню показывает
// превью слева от меню -- те самые окошки, что раньше висели над отдельными
// кнопками «скачать» и «игра» (их разметка перенесена сюда, старые файлы
// get-app-button.tsx и game-button.tsx больше нигде не подключены), плюс новое
// окошко «A1 Stats» с живыми цифрами.
//
// Как устроено превью, чтобы не «залипало». Оно лежит ВНУТРИ панели меню
// (position:absolute, right-full) и отделено от неё отступом pr-2, а не
// зазором -- получается один сплошной прямоугольник наведения, как у остальных
// панелей (см. шапку lib/use-hover-panel.ts, пункт 1). Хук проверяет курсор по
// геометрии панели, а превью торчит за её границу, поэтому у превью есть своя
// пара ссылок (previewRef) -- иначе при наведении на него меню закрывалось бы.
//
// Цифры для превью Stats берём из /stats/data (тот же файл, что обновляет саму
// страницу) -- один раз, при первом наведении на строку, не при загрузке сайта.
//
// На телефоне кнопки нет (как и у соседних): там мало места, а установку
// предлагает <AppOpenBanner/>. Превью скрыто на узких экранах и на сенсорных.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DOWNLOAD_COPY } from "@/app/download/copy";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";

type Id = "app" | "news" | "stats" | "game";

function L(uk: string, en: string, ru: string, rest?: Partial<Record<Locale, string>>): Record<Locale, string> {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en, ...rest };
}

const TXT = {
  app: {
    title: L("Завантажити додаток", "Get the app", "Скачать приложение", {
      de: "App laden", es: "Descargar la app", fr: "Télécharger l'app", pl: "Pobierz aplikację", ptBR: "Baixar o app", zh: "下载应用",
    }),
    sub: L("Android та iOS", "Android and iOS", "Android и iOS"),
    prev: L(
      "Android та iOS — вакансії й чати в кишені",
      "Android and iOS — jobs and chats in your pocket",
      "Android и iOS — вакансии и чаты в кармане",
      {
        de: "Android und iOS — Jobs und Chats in der Tasche",
        es: "Android e iOS: vacantes y chats en tu bolsillo",
        fr: "Android et iOS — offres et messages dans votre poche",
        pl: "Android i iOS — oferty i czaty w kieszeni",
        ptBR: "Android e iOS — vagas e chats no bolso",
        zh: "Android 与 iOS——口袋里的职位和聊天",
      },
    ),
  },
  news: {
    title: L("IT новини", "IT News", "IT новости"),
    sub: L("Головне з техсвіту — з розбором", "Tech news with our take", "Главное из техмира — с разбором"),
    prev: L(
      "Найцікавіші IT-новини дня: цифри, графіки й що це означає для IT-ринку",
      "The day's best IT stories: numbers, charts and what they mean for the IT market",
      "Самые интересные IT-новости дня: цифры, графики и что это значит для IT-рынка",
    ),
    kicker: L("Свіже", "Latest", "Свежее"),
  },
  stats: {
    title: L("A1 Stats", "A1 Stats", "A1 Stats"),
    sub: L("Живі цифри ринку вакансій", "Live job-market numbers", "Живые цифры рынка вакансий"),
    prev: L(
      "Вакансії по країнах, технологіях і зарплатах — оновлюється наживо",
      "Jobs by country, technology and salary — updated live",
      "Вакансии по странам, технологиям и зарплатам — обновляется вживую",
    ),
    jobs: L("вакансій", "jobs", "вакансий"),
    companies: L("компаній", "companies", "компаний"),
    countries: L("країн", "countries", "стран"),
    today: L("за добу", "last 24h", "за сутки"),
  },
  game: {
    title: L("A1 Run", "A1 Run", "A1 Run"),
    sub: L("Пограй у нашу гру", "Play our game", "Поиграй в нашу игру"),
    prev: L(
      "Міні-гра про кота Mr Kit — біжи дахами й збирай зв’язки",
      "A mini-game about Mr Kit the cat — run the rooftops and collect connections",
      "Мини-игра про кота Mr Kit — беги по крышам и собирай связи",
      {
        de: "Ein Mini-Spiel über den Kater Mr Kit — über Dächer rennen, Kontakte sammeln",
        es: "Un minijuego sobre el gato Mr Kit: corre por los tejados y reúne conexiones",
        fr: "Un mini-jeu sur le chat Mr Kit — cours sur les toits et collecte des connexions",
        pl: "Mini-gra o kocie Mr Kit — biegnij po dachach i zbieraj kontakty",
        ptBR: "Um minijogo sobre o gato Mr Kit — corra pelos telhados e colete conexões",
        zh: "关于猫咪 Mr Kit 的小游戏——在屋顶奔跑，收集人脉",
      },
    ),
  },
  more: L("Ще", "More", "Ещё", { de: "Mehr", es: "Más", fr: "Plus", pl: "Więcej", ptBR: "Mais", zh: "更多" }),
};

const HREF: Record<Id, string> = { app: "/download", news: "/news", stats: "/stats", game: "/game" };

type StatsLite = { total: number; companies: number; countries: number; fresh24h: number; daily: { d: string; n: number }[] };

function fmtN(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ───────── значки (24px, штрих 1.8 -- как у остальных кнопок шапки) ─────────
const svgBase = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function AppIcon() {
  return (
    <svg {...svgBase}>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <g className="animate-app-install-arrow">
        <path d="M12 7.5v6" />
        <path d="M9.5 11l2.5 2.5L14.5 11" />
      </g>
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg {...svgBase}>
      <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z" />
      <path d="M18 9h2v8a2 2 0 0 1-2 2" />
      <path d="M7.5 9h6" />
      <path d="M7.5 12.5h6" />
      <path d="M7.5 16h3.5" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg {...svgBase}>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="3.4" height="7" rx="1" className="animate-stats-bar" style={{ animationDelay: "0ms" }} />
      <rect x="10.3" y="6" width="3.4" height="13" rx="1" className="animate-stats-bar" style={{ animationDelay: "70ms" }} />
      <rect x="15.6" y="9" width="3.4" height="10" rx="1" className="animate-stats-bar" style={{ animationDelay: "140ms" }} />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg {...svgBase}>
      <g className="animate-game-pad">
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
        <path d="M6 11h4" />
        <path d="M8 9v4" />
        <g className="animate-game-pad-press">
          <path d="M15 12h.01" />
          <path d="M18 10h.01" />
        </g>
      </g>
    </svg>
  );
}

// ───────── строка меню ─────────
function Row({
  id,
  icon,
  onHover,
  onPick,
}: {
  id: Id;
  icon: React.ReactNode;
  onHover: (id: Id) => void;
  onPick: () => void;
}) {
  const t = TXT[id];
  return (
    <Link
      href={HREF[id]}
      onClick={onPick}
      onMouseEnter={() => onHover(id)}
      onFocus={() => onHover(id)}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 text-neutral-500 transition duration-200 group-hover:bg-accent/15 group-hover:text-accent dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-accent/20">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          <T {...t.title} />
        </span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
          <T {...t.sub} />
        </span>
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 -translate-x-1 text-neutral-300 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100 dark:text-neutral-600"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// ───────── превью ─────────
function PreviewApp() {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/download/hero.webp" alt="" width={1672} height={941} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">
          {LOCALES.map((locale) => (
            <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
              {DOWNLOAD_COPY[locale].headline} <span className="text-[#7aa2ff]">{DOWNLOAD_COPY[locale].headlineAccent}</span>
            </span>
          ))}
        </span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.app.prev} />
        </span>
      </span>
    </>
  );
}

// Превью «IT новини». Данные пока вшиты (последняя новость), без запроса к серверу:
// превью должно открываться мгновенно. При выходе новой новости -- поменять здесь.
const NEWS_PREVIEW_LIT = new Set([6, 19, 41, 58, 77, 95, 108, 122, 139, 163, 176, 190, 207, 224, 239, 251, 271, 288, 312, 330, 347, 375, 402, 421, 431, 466]);

function PreviewNews() {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#1b3a95_0%,#0a1240_48%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7aa2ff]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7aa2ff]" />
            </span>
            IT news · <T {...TXT.news.kicker} />
          </span>
          <span className="mt-2 block text-[30px] font-bold leading-[1.05] text-white">Mistral Large 4</span>
          <span className="mt-2 flex flex-wrap gap-2 text-[12px] tabular-nums">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">1 000 B → <b className="text-[#7aa2ff]">52 B</b></span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">$1,36 / 1M tok</span>
          </span>
        </span>
        <span className="absolute inset-x-5 bottom-9 grid gap-[3px]" style={{ gridTemplateColumns: "repeat(50, minmax(0, 1fr))" }}>
          {Array.from({ length: 500 }, (_, i) => {
            const on = NEWS_PREVIEW_LIT.has(i);
            return (
              <span
                key={i}
                className={"block aspect-square rounded-full " + (on ? "animate-pulse" : "")}
                style={{
                  background: on ? "#7aa2ff" : "rgba(255,255,255,.14)",
                  boxShadow: on ? "0 0 7px 1px rgba(122,162,255,.85)" : "none",
                  animationDelay: on ? `${(i % 7) * 140}ms` : undefined,
                }}
              />
            );
          })}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white"><T {...TXT.news.title} /></span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.news.prev} />
        </span>
      </span>
    </>
  );
}

function PreviewGame() {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/game/preview.webp" alt="" width={880} height={546} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 RUN</span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.game.prev} />
        </span>
      </span>
    </>
  );
}

// 30 дней столбиками; пики заливки сжимаем корнем, чтобы остальные дни были видны.
function PreviewStats({ data }: { data: StatsLite | null }) {
  const days = data?.daily?.length ? data.daily : Array.from({ length: 30 }, (_, i) => ({ d: String(i), n: 20 + ((i * 37) % 60) }));
  const vals = days.map((x) => Math.sqrt(Math.max(0, x.n)));
  const mx = Math.max(1, ...vals);
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#16307a_0%,#0a1240_45%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">A1 · live</span>
          <span className="mt-1 block text-[40px] font-bold leading-none tabular-nums text-white">{data ? fmtN(data.total) : "—"}</span>
          <span className="mt-1 block text-[13px] text-white/60">
            <T {...TXT.stats.jobs} />
          </span>
        </span>
        <span className="absolute inset-x-5 bottom-8 flex h-[46%] items-end gap-[3px]">
          {vals.map((v, i) => (
            <span
              key={i}
              className="nav-stats-col block flex-1 rounded-t-[3px] bg-gradient-to-t from-[#2a78d6] to-[#7aa2ff]"
              style={{ height: `${Math.max(4, (v / mx) * 100)}%`, animationDelay: `${i * 14}ms`, opacity: data ? 1 : 0.35 }}
            />
          ))}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 Stats</span>
        {data ? (
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums text-white/80">
            <span><b className="font-semibold text-white">{fmtN(data.companies)}</b> <T {...TXT.stats.companies} /></span>
            <span><b className="font-semibold text-white">{fmtN(data.countries)}</b> <T {...TXT.stats.countries} /></span>
            <span><b className="font-semibold text-[#7aa2ff]">+{fmtN(data.fresh24h)}</b> <T {...TXT.stats.today} /></span>
          </span>
        ) : null}
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.stats.prev} />
        </span>
      </span>
    </>
  );
}

export function NavMoreMenu() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Id | null>(null);
  const [stats, setStats] = useState<StatsLite | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  const { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
    { trigger: previewRef, panel: previewRef },
  ]);

  // Меню закрылось -- превью начинается заново, а не показывает прошлую строку.
  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  // Цифры для превью Stats: один запрос при первом наведении на эту строку.
  useEffect(() => {
    if (hovered !== "stats" || fetched.current) return;
    fetched.current = true;
    fetch("/stats/data")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.total === "number") setStats(j as StatsLite);
      })
      .catch(() => {
        fetched.current = false;
      });
  }, [hovered]);

  const pick = () => setOpen(false);
  const shell = (bg: string) =>
    `block overflow-hidden rounded-2xl ${bg} shadow-xl ring-1 ring-black/10 dark:ring-white/10`;

  return (
    <div ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative hidden shrink-0 sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          // lib/use-hover-panel.ts, запись от 04.09.2026: на айпаде первый тап = mouseenter + click.
          if (isRecentHoverOpen()) return;
          setOpen((v) => !v);
        }}
        className={
          "group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition dark:bg-neutral-900 " +
          (open
            ? "text-accent ring-accent/40 dark:ring-accent/40"
            : "text-neutral-500 ring-neutral-200 hover:text-accent hover:ring-accent/40 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:text-accent dark:hover:ring-accent/40")
        }
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {[5, 12, 19].map((cx, i) => (
            <circle key={cx} cx={cx} cy="12" r="1.9" className="animate-more-dot" style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </svg>
        <span className="sr-only">
          <T {...TXT.more} />
        </span>
      </button>

      {rendered && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 w-[288px] pt-2">
          <div
            role="menu"
            className={
              "rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-neutral-200 transition duration-200 ease-out dark:bg-neutral-900 dark:ring-neutral-800 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <Row id="app" icon={<AppIcon />} onHover={setHovered} onPick={pick} />
            <Row id="news" icon={<NewsIcon />} onHover={setHovered} onPick={pick} />
            <Row id="stats" icon={<StatsIcon />} onHover={setHovered} onPick={pick} />
            <div className="mx-2 my-1 border-t border-neutral-100 dark:border-neutral-800" />
            <Row id="game" icon={<GameIcon />} onHover={setHovered} onPick={pick} />
          </div>

          {/* Превью -- слева от меню, прижато к нему отступом pr-2 (без «мёртвой» полосы). */}
          {hovered && (
            <div
              ref={previewRef}
              className={
                "absolute right-full top-2 hidden w-[448px] pr-2 transition duration-200 ease-out lg:block [@media(hover:none)]:hidden " +
                (visible ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0")
              }
            >
              <Link key={hovered} href={HREF[hovered]} onClick={pick} className={`animate-nav-preview ${shell("bg-[#03051f]")}`}>
                {hovered === "app" ? <PreviewApp /> : hovered === "news" ? <PreviewNews /> : hovered === "stats" ? <PreviewStats data={stats} /> : <PreviewGame />}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
