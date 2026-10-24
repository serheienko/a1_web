// components/github-tile.tsx
//
// 18.10.2026 (Александр): плитка GitHub под ссылками профиля, если среди ссылок есть
// github.com/<login>. Никаких отдельных полей -- логин берётся из ссылки (lib/github/core.ts).
//
// Данные грузятся, только когда плитка доезжает до экрана (IntersectionObserver), с нашего
// сервера (/api/github/<login>, кеш на сутки) -- браузер на GitHub не ходит. Пока грузится --
// тихий скелет. 404, ошибка или почти пустой профиль -> плитки нет совсем.
//
// Вид -- как остальные карточки сайта (rounded-card bg-card, тёмная тема как в post-card.tsx),
// шкала календаря -- в синих тонах A1. На узком экране -- последние 26 недель без прокрутки.
// Наведение на день -> «5 внесків · 12 жовтня 2026», клик -> страница этого дня на GitHub.
"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { LOCALE_TAG, type Locale } from "@/components/t";
import { useActiveLocale } from "@/lib/use-active-locale";
import { isGithubSummaryTooEmpty, OTHER_LANGUAGE, type GithubDay, type GithubSummary } from "@/lib/github/core";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

type Strings = {
  contributions: Forms;
  repositories: Forms;
  followers: Forms;
  /** «N внесків у 2026» -- {n}, {word} и {year} подставляются. */
  yearTotal: string;
  /** Подпись ряда кнопок-годов (для скринридеров). */
  yearsLabel: string;
  less: string;
  more: string;
  languages: string;
  topRepos: string;
  open: string;
  other: string;
  calendar: string;
  /** Значок в шапке: GitHub подтверждён через OAuth. */
  verified: string;
};

const STRINGS: Record<Locale, Strings> = {
  uk: {
    contributions: { one: "внесок", few: "внески", many: "внесків", other: "внеску" },
    repositories: { one: "репозиторій", few: "репозиторії", many: "репозиторіїв", other: "репозиторію" },
    followers: { one: "підписник", few: "підписники", many: "підписників", other: "підписника" },
    yearTotal: "{n} {word} у {year}",
    yearsLabel: "Рік календаря",
    less: "Менше",
    more: "Більше",
    languages: "Мови",
    topRepos: "Популярні репозиторії",
    open: "Відкрити на GitHub",
    other: "Інші",
    calendar: "Календар внесків на GitHub",
    verified: "GitHub підтверджено",
  },
  en: {
    contributions: { one: "contribution", other: "contributions" },
    repositories: { one: "repository", other: "repositories" },
    followers: { one: "follower", other: "followers" },
    yearTotal: "{n} {word} in {year}",
    yearsLabel: "Calendar year",
    less: "Less",
    more: "More",
    languages: "Languages",
    topRepos: "Top repositories",
    open: "Open on GitHub",
    other: "Other",
    calendar: "GitHub contribution calendar",
    verified: "GitHub verified",
  },
  ru: {
    contributions: { one: "вклад", few: "вклада", many: "вкладов", other: "вклада" },
    repositories: { one: "репозиторий", few: "репозитория", many: "репозиториев", other: "репозитория" },
    followers: { one: "подписчик", few: "подписчика", many: "подписчиков", other: "подписчика" },
    yearTotal: "{n} {word} в {year}",
    yearsLabel: "Год календаря",
    less: "Меньше",
    more: "Больше",
    languages: "Языки",
    topRepos: "Популярные репозитории",
    open: "Открыть на GitHub",
    other: "Другие",
    calendar: "Календарь вкладов на GitHub",
    verified: "GitHub подтверждён",
  },
  de: {
    contributions: { one: "Beitrag", other: "Beiträge" },
    repositories: { one: "Repository", other: "Repositorys" },
    followers: { one: "Follower", other: "Follower" },
    yearTotal: "{n} {word} im Jahr {year}",
    yearsLabel: "Kalenderjahr",
    less: "Weniger",
    more: "Mehr",
    languages: "Sprachen",
    topRepos: "Top-Repositorys",
    open: "Auf GitHub öffnen",
    other: "Andere",
    calendar: "GitHub-Beitragskalender",
    verified: "GitHub bestätigt",
  },
  es: {
    contributions: { one: "contribución", other: "contribuciones" },
    repositories: { one: "repositorio", other: "repositorios" },
    followers: { one: "seguidor", other: "seguidores" },
    yearTotal: "{n} {word} en {year}",
    yearsLabel: "Año del calendario",
    less: "Menos",
    more: "Más",
    languages: "Lenguajes",
    topRepos: "Repositorios destacados",
    open: "Abrir en GitHub",
    other: "Otros",
    calendar: "Calendario de contribuciones de GitHub",
    verified: "GitHub verificado",
  },
  fr: {
    contributions: { one: "contribution", other: "contributions" },
    repositories: { one: "dépôt", other: "dépôts" },
    followers: { one: "abonné", other: "abonnés" },
    yearTotal: "{n} {word} en {year}",
    yearsLabel: "Année du calendrier",
    less: "Moins",
    more: "Plus",
    languages: "Langages",
    topRepos: "Dépôts populaires",
    open: "Ouvrir sur GitHub",
    other: "Autres",
    calendar: "Calendrier des contributions GitHub",
    verified: "GitHub vérifié",
  },
  pl: {
    contributions: { one: "kontrybucja", few: "kontrybucje", many: "kontrybucji", other: "kontrybucji" },
    repositories: { one: "repozytorium", few: "repozytoria", many: "repozytoriów", other: "repozytorium" },
    followers: { one: "obserwujący", few: "obserwujących", many: "obserwujących", other: "obserwującego" },
    yearTotal: "{n} {word} w {year}",
    yearsLabel: "Rok kalendarza",
    less: "Mniej",
    more: "Więcej",
    languages: "Języki",
    topRepos: "Popularne repozytoria",
    open: "Otwórz w GitHub",
    other: "Inne",
    calendar: "Kalendarz kontrybucji GitHub",
    verified: "GitHub potwierdzony",
  },
  ptBR: {
    contributions: { one: "contribuição", other: "contribuições" },
    repositories: { one: "repositório", other: "repositórios" },
    followers: { one: "seguidor", other: "seguidores" },
    yearTotal: "{n} {word} em {year}",
    yearsLabel: "Ano do calendário",
    less: "Menos",
    more: "Mais",
    languages: "Linguagens",
    topRepos: "Repositórios em destaque",
    open: "Abrir no GitHub",
    other: "Outras",
    calendar: "Calendário de contribuições do GitHub",
    verified: "GitHub verificado",
  },
  zh: {
    contributions: { other: "次贡献" },
    repositories: { other: "个仓库" },
    followers: { other: "位关注者" },
    yearTotal: "{year} 年共 {n} {word}",
    yearsLabel: "日历年份",
    less: "少",
    more: "多",
    languages: "语言",
    topRepos: "热门仓库",
    open: "在 GitHub 上打开",
    other: "其他",
    calendar: "GitHub 贡献日历",
    verified: "GitHub 已验证",
  },
};

function plural(lang: Locale, n: number, forms: Forms): string {
  const rule = new Intl.PluralRules(LOCALE_TAG[lang]).select(n);
  return forms[rule] ?? forms.other;
}

function countLabel(lang: Locale, n: number, forms: Forms): string {
  return `${new Intl.NumberFormat(LOCALE_TAG[lang]).format(n)} ${plural(lang, n, forms)}`;
}

function formatDay(lang: Locale, date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat(LOCALE_TAG[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

// Шкала: 0 -- нейтральный оттенок карточки, 1..4 -- синие A1. Светлая тема -- от светлого к
// фирменному #335ef7, тёмная -- от тёмно-синего через #0c8ce9 к светло-голубому.
const LEVEL_CLASS: Record<GithubDay["level"], string> = {
  0: "bg-neutral-100 dark:bg-neutral-800",
  1: "bg-[#c9d6fd] dark:bg-[#0b3a63]",
  2: "bg-[#93acfb] dark:bg-[#0a5f9f]",
  3: "bg-[#5f83f9] dark:bg-[#0c8ce9]",
  4: "bg-[#335ef7] dark:bg-[#62bdff]",
};


function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

// align: у краёв сетки подсказка прижимается к краю, чтобы не вылезать за экран.
type Tip = { text: string; x: number; y: number; align: "left" | "center" | "right" };

type State = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: GithubSummary } | { kind: "hidden" };

const CAL_SLOTS = 54;

// 24.10.2026: initialData -- готовые данные вместо запроса (пример профиля Mr Kit на
// /spivbesida/kandydatu, components/profile-view.tsx). У настоящих профилей его нет.
export function GithubTile({ login, initialData }: { login: string; initialData?: GithubSummary }) {
  const lang = useActiveLocale();
  const s = STRINGS[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [shown, setShown] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  // Выбранный год и готовые ответы по годам (повторный клик по году -- мгновенно).
  const [year, setYear] = useState<number | null>(null);
  const [yearLoading, setYearLoading] = useState(false);
  const yearCache = useRef(new Map<number, GithubSummary>());
  const wantedYear = useRef<number | null>(null);
  // То, что сейчас нарисовано в календаре (при переключении остаётся прежнее, пока не придёт новое).
  const [cal, setCal] = useState<GithubSummary | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Грузим, только когда плитка подъехала к экрану.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || state.kind !== "idle") return;
    let cancelled = false;
    const load = async () => {
      setState({ kind: "loading" });
      try {
        // ?v=2: адрес без параметров мог застрять в кеше сервера в старом формате (без years/year) --
        // из-за этого у владельцев с уже закешированным ответом падала вся страница профиля.
        let data: GithubSummary;
        if (initialData) data = initialData;
        else {
          const res = await fetch(`/api/github/${encodeURIComponent(login)}?v=2`);
          if (!res.ok) throw new Error(String(res.status));
          data = (await res.json()) as GithubSummary;
        }
        if (cancelled) return;
        // Ответ старого формата (без years/year) -- плитку скрываем, но страницу не роняем.
        if (!data || !Array.isArray(data.weeks) || !Array.isArray(data.years) || typeof data.year !== "number" || isGithubSummaryTooEmpty(data)) setState({ kind: "hidden" });
        else {
          yearCache.current.set(data.year, data);
          setYear(data.year);
          wantedYear.current = data.year;
          setCal(data);
          setState({ kind: "ok", data });
        }
      } catch {
        if (!cancelled) setState({ kind: "hidden" });
      }
    };
    if (typeof IntersectionObserver === "undefined") {
      void load();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void load();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
    // state.kind в зависимостях не нужен: эффект только стартует загрузку один раз.
  }, [login, initialData]);

  // Плавное появление после загрузки.
  useEffect(() => {
    if (state.kind !== "ok") return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [state.kind]);

  // Календарь шире узкого экрана -- прокручивается; текущий год показываем с конца, прошлый -- с начала.
  const calYear = cal?.year ?? null;
  const currentYear = state.kind === "ok" ? state.data.years[0] : null;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || calYear === null) return;
    el.scrollLeft = calYear === currentYear ? el.scrollWidth : 0;
  }, [calYear, currentYear]);

  if (state.kind === "hidden") return null;

  if (state.kind !== "ok") {
    return (
      <div ref={rootRef} className="mt-6" aria-hidden="true">
        {state.kind === "loading" && (
          <div className="h-56 animate-pulse rounded-card bg-white/70 dark:bg-neutral-900/70" />
        )}
        {state.kind === "idle" && <div className="h-56" />}
      </div>
    );
  }

  const d = state.data;
  const c = cal ?? d;
  const weeks = c.weeks;
  const firstWeekPad = weeks[0]?.days[0] ? new Date(`${weeks[0].days[0].date}T00:00:00Z`).getUTCDay() : 0;
  const nf = new Intl.NumberFormat(LOCALE_TAG[lang]);

  const selectYear = async (y: number) => {
    if (y === year) return;
    setYear(y);
    wantedYear.current = y;
    setTip(null);
    const hit = yearCache.current.get(y);
    if (hit) {
      setYearLoading(false);
      setCal(hit);
      return;
    }
    setYearLoading(true);
    try {
      const res = await fetch(`/api/github/${encodeURIComponent(login)}?year=${y}`);
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as GithubSummary;
      if (!next || !Array.isArray(next.weeks)) throw new Error("bad");
      yearCache.current.set(y, next);
      if (wantedYear.current === y) {
        setCal(next);
        setYearLoading(false);
      }
    } catch {
      // Не загрузилось -- возвращаем прежний год.
      if (wantedYear.current === y) {
        setYear(cal?.year ?? null);
        wantedYear.current = cal?.year ?? null;
        setYearLoading(false);
      }
    }
  };

  const onGridOver = (e: ReactMouseEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-date]");
    const grid = gridRef.current;
    if (!cell || !grid) return;
    const date = cell.dataset.date!;
    const count = Number(cell.dataset.count ?? "0");
    const g = grid.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    setTip({
      text: `${countLabel(lang, count, s.contributions)} · ${formatDay(lang, date)}`,
      x: c.left - g.left + c.width / 2,
      y: c.top - g.top,
      align: c.left - g.left < g.width * 0.25 ? "left" : c.right - g.left > g.width * 0.75 ? "right" : "center",
    });
  };

  return (
    <section
      className={`mt-6 rounded-card bg-card p-4 shadow-sm transition-all duration-500 ease-out hover:shadow-md sm:p-5 dark:border dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <GithubMark className="shrink-0 text-neutral-900 dark:text-neutral-100" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={d.htmlUrl}
              target="_blank"
              rel="me noopener noreferrer"
              className="block min-w-0 truncate font-semibold text-neutral-900 transition-colors hover:text-accent dark:text-neutral-50"
            >
              {d.login}
            </a>
            {/* Плитка показывается только подтверждённым через GitHub OAuth -- отмечаем это. */}
            <span
              title={s.verified}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              <span className="hidden sm:inline">{s.verified}</span>
              <span className="sr-only sm:hidden">{s.verified}</span>
            </span>
          </div>
          <div className="truncate text-sm text-ink-faint">
            {countLabel(lang, d.publicRepos, s.repositories)} · {countLabel(lang, d.followers, s.followers)}
          </div>
        </div>
        <a
          href={d.htmlUrl}
          target="_blank"
          rel="me noopener noreferrer"
          aria-label={s.open}
          title={s.open}
          data-ext-open=""
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-accent dark:hover:text-white"
        >
          <ArrowIcon />
        </a>
      </div>

      {/* Годы: как на github.com -- от текущего к году создания аккаунта */}
      {d.years.length > 1 && (
        <div
          role="group"
          aria-label={s.yearsLabel}
          className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {d.years.map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={y === year}
              onClick={() => void selectYear(y)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                y === year
                  ? "bg-accent text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Календарь */}
      {(weeks.length > 0 || yearLoading) && (
        <div className="mt-1">
          {/* pt-8: место под подсказку над верхним рядом (иначе её обрежет прокрутка) */}
          <div ref={scrollRef} className="overflow-x-auto pt-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              ref={gridRef}
              role="img"
              aria-label={s.calendar}
              aria-busy={yearLoading}
              className={`relative flex min-w-[648px] gap-[3px] transition-opacity duration-300 ease-out sm:min-w-0 ${
                yearLoading ? "opacity-40" : "opacity-100"
              }`}
              onMouseOver={onGridOver}
              onMouseLeave={() => setTip(null)}
            >
              {weeks.map((w, wi) => (
                <div
                  key={w.days[0]?.date ?? wi}
                  className="flex min-w-0 flex-col gap-[3px]"
                  style={{ flex: `0 0 calc((100% - ${(CAL_SLOTS - 1) * 3}px) / ${CAL_SLOTS})` }}
                >
                  {wi === 0 &&
                    Array.from({ length: firstWeekPad }, (_, i) => <span key={`pad${i}`} className="aspect-square w-full" />)}
                  {w.days.map((day) => (
                    <a
                      key={day.date}
                      href={`https://github.com/${encodeURIComponent(d.login)}?tab=overview&from=${day.date}&to=${day.date}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      tabIndex={-1}
                      data-date={day.date}
                      data-count={day.count}
                      aria-label={`${countLabel(lang, day.count, s.contributions)} · ${formatDay(lang, day.date)}`}
                      className={`block aspect-square w-full rounded-[3px] transition-transform duration-150 ease-out hover:scale-125 hover:ring-1 hover:ring-accent/60 ${LEVEL_CLASS[day.level]}`}
                    />
                  ))}
                </div>
              ))}
              <div
                className={`pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap ${
                  tip?.align === "left" ? "-translate-x-2" : tip?.align === "right" ? "-translate-x-[calc(100%-0.5rem)]" : "-translate-x-1/2"
                } rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white shadow-md transition-opacity duration-150 dark:bg-neutral-100 dark:text-neutral-900 ${
                  tip ? "opacity-100" : "opacity-0"
                }`}
                style={tip ? { left: tip.x, top: tip.y - 6 } : { left: 0, top: 0 }}
              >
                {tip?.text}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
            <span>
              {s.yearTotal
                .replace("{n}", nf.format(c.totalContributions))
                .replace("{word}", plural(lang, c.totalContributions, s.contributions))
                .replace("{year}", String(c.year))}
            </span>
            <span className="flex items-center gap-1">
              {s.less}
              {([0, 1, 2, 3, 4] as const).map((l) => (
                <span key={l} className={`h-2.5 w-2.5 rounded-[3px] ${LEVEL_CLASS[l]}`} />
              ))}
              {s.more}
            </span>
          </div>
        </div>
      )}

      {/* Языки */}
      {d.languages.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{s.languages}</div>
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            {d.languages.map((l) => (
              <span
                key={l.name}
                className="h-full transition-[width] duration-700 ease-out"
                style={{ width: shown ? `${l.percent}%` : "0%", backgroundColor: l.color }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {d.languages.map((l) => (
              <span key={l.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name === OTHER_LANGUAGE ? s.other : l.name}
                <span className="text-ink-faint">{l.percent}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Топ-репозитории */}
      {d.topRepos.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{s.topRepos}</div>
          <div className="mt-2 flex flex-col gap-2">
            {d.topRepos.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex items-start gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 transition-all duration-200 hover:-translate-y-px hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-neutral-900 transition-colors group-hover:text-accent dark:text-neutral-100">{r.name}</div>
                  {r.description && <div className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{r.description}</div>}
                </div>
                <span className="shrink-0 text-xs text-ink-faint">★ {nf.format(r.stars)}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
