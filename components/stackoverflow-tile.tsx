// components/stackoverflow-tile.tsx
//
// 18.10.2026 (Александр): плитка Stack Overflow под ссылками профиля -- только у подтверждённых
// через Stack Exchange OAuth (id профиля совпадает с id из ссылки). Репутация, значки, самые сильные
// темы и лучший ответ. «Топ X%» не показываем: процентилей у API нет, выдумывать не будем.
//
// Данные грузятся, когда плитка доезжает до экрана, с нашего сервера (/api/stackoverflow/<id>,
// кеш на сутки) -- браузер на Stack Exchange не ходит. 404, ошибка или репутация < 1 -> плитки нет.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALE_TAG, type Locale } from "@/components/t";
import { useActiveLocale } from "@/lib/use-active-locale";
import { isStackoverflowSummaryHidden, tagBarPercent, type StackoverflowSummary } from "@/lib/stackoverflow/core";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
type Strings = {
  verified: string;
  answers: Forms;
  reputation: string;
  topics: string;
  bestAnswer: string;
  gold: string;
  silver: string;
  bronze: string;
  open: string;
};

const STRINGS: Record<Locale, Strings> = {
  uk: { verified: "Stack Overflow підтверджено", answers: { one: "відповідь", few: "відповіді", many: "відповідей", other: "відповіді" }, reputation: "репутація", topics: "Найсильніші теми", bestAnswer: "Найкраща відповідь", gold: "золото", silver: "срібло", bronze: "бронза", open: "Відкрити Stack Overflow" },
  en: { verified: "Stack Overflow verified", answers: { one: "answer", other: "answers" }, reputation: "reputation", topics: "Top topics", bestAnswer: "Best answer", gold: "gold", silver: "silver", bronze: "bronze", open: "Open Stack Overflow" },
  ru: { verified: "Stack Overflow подтверждён", answers: { one: "ответ", few: "ответа", many: "ответов", other: "ответа" }, reputation: "репутация", topics: "Сильнейшие темы", bestAnswer: "Лучший ответ", gold: "золото", silver: "серебро", bronze: "бронза", open: "Открыть Stack Overflow" },
  de: { verified: "Stack Overflow bestätigt", answers: { one: "Antwort", other: "Antworten" }, reputation: "Reputation", topics: "Top-Themen", bestAnswer: "Beste Antwort", gold: "Gold", silver: "Silber", bronze: "Bronze", open: "Stack Overflow öffnen" },
  es: { verified: "Stack Overflow verificado", answers: { one: "respuesta", other: "respuestas" }, reputation: "reputación", topics: "Temas destacados", bestAnswer: "Mejor respuesta", gold: "oro", silver: "plata", bronze: "bronce", open: "Abrir Stack Overflow" },
  fr: { verified: "Stack Overflow vérifié", answers: { one: "réponse", other: "réponses" }, reputation: "réputation", topics: "Sujets forts", bestAnswer: "Meilleure réponse", gold: "or", silver: "argent", bronze: "bronze", open: "Ouvrir Stack Overflow" },
  pl: { verified: "Stack Overflow potwierdzony", answers: { one: "odpowiedź", few: "odpowiedzi", many: "odpowiedzi", other: "odpowiedzi" }, reputation: "reputacja", topics: "Najmocniejsze tematy", bestAnswer: "Najlepsza odpowiedź", gold: "złoto", silver: "srebro", bronze: "brąz", open: "Otwórz Stack Overflow" },
  ptBR: { verified: "Stack Overflow verificado", answers: { one: "resposta", other: "respostas" }, reputation: "reputação", topics: "Principais temas", bestAnswer: "Melhor resposta", gold: "ouro", silver: "prata", bronze: "bronze", open: "Abrir o Stack Overflow" },
  zh: { verified: "Stack Overflow 已验证", answers: { other: "个回答" }, reputation: "声望", topics: "擅长主题", bestAnswer: "最佳回答", gold: "金牌", silver: "银牌", bronze: "铜牌", open: "打开 Stack Overflow" },
};

function countLabel(lang: Locale, n: number, forms: Forms): string {
  const tag = LOCALE_TAG[lang];
  return `${new Intl.NumberFormat(tag).format(n)} ${forms[new Intl.PluralRules(tag).select(n)] ?? forms.other}`;
}

function StackoverflowMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.5 21.5v-6h2v8h-17v-8h2v6z" fill="#bcbbbb" />
      <path d="M7.5 18.5h9v-2h-9zM7.7 14.5l8.8 1.9.4-1.9-8.8-1.9zm1.2-4.5 8.2 3.8.8-1.8-8.2-3.8zm2.3-4 6.9 5.8 1.3-1.5-6.9-5.8zM15.6 1.5 14 2.7l5.4 7.2 1.6-1.2z" fill="#f48024" />
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

type State = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; data: StackoverflowSummary } | { kind: "hidden" };

// 24.10.2026: initialData -- готовые данные вместо запроса (пример профиля Mr Kit).
export function StackoverflowTile({ id, initialData }: { id: number; initialData?: StackoverflowSummary }) {
  const lang = useActiveLocale();
  const s = STRINGS[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [shown, setShown] = useState(false);

  // Грузим, только когда плитка подъехала к экрану.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || state.kind !== "idle") return;
    let cancelled = false;
    const load = async () => {
      setState({ kind: "loading" });
      try {
        let data: StackoverflowSummary;
        if (initialData) data = initialData;
        else {
          const res = await fetch(`/api/stackoverflow/${id}`);
          if (!res.ok) throw new Error(String(res.status));
          data = (await res.json()) as StackoverflowSummary;
        }
        if (cancelled) return;
        if (!data || typeof data.reputation !== "number" || isStackoverflowSummaryHidden(data)) setState({ kind: "hidden" });
        else setState({ kind: "ok", data });
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
  }, [id, initialData]);

  // Плавное появление после загрузки.
  useEffect(() => {
    if (state.kind !== "ok") return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [state.kind]);

  if (state.kind === "hidden") return null;

  if (state.kind !== "ok") {
    return (
      <div ref={rootRef} className="mt-6" aria-hidden="true">
        {state.kind === "loading" && <div className="h-56 animate-pulse rounded-card bg-white/70 dark:bg-neutral-900/70" />}
        {state.kind === "idle" && <div className="h-56" />}
      </div>
    );
  }

  const d = state.data;
  const nf = new Intl.NumberFormat(LOCALE_TAG[lang]);
  const maxScore = Math.max(0, ...d.topTags.map((t) => t.score));
  const badges = [
    { key: "gold", color: "#ffcc01", label: s.gold, n: d.badges.gold },
    { key: "silver", color: "#b4b8bc", label: s.silver, n: d.badges.silver },
    { key: "bronze", color: "#d1a684", label: s.bronze, n: d.badges.bronze },
  ];

  return (
    <section
      className={`mt-6 rounded-card bg-card p-4 shadow-sm transition-all duration-500 ease-out hover:shadow-md sm:p-5 dark:border dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0">
          <StackoverflowMark />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={d.htmlUrl}
              target="_blank"
              rel="me noopener noreferrer"
              className="block min-w-0 truncate font-semibold text-neutral-900 transition-colors hover:text-accent dark:text-neutral-50"
            >
              {d.displayName}
            </a>
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
            Stack Overflow · {countLabel(lang, d.answerCount, s.answers)}
          </div>
        </div>
        <a
          href={d.htmlUrl}
          target="_blank"
          rel="me noopener noreferrer"
          aria-label={s.open}
          title={s.open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-accent dark:hover:text-white"
        >
          <ArrowIcon />
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col">
          <span className="text-3xl font-bold leading-none text-neutral-900 dark:text-neutral-50">{nf.format(d.reputation)}</span>
          <span className="mt-1 text-sm text-ink-faint">{s.reputation}</span>
        </div>
        <div className="flex gap-3 pb-0.5 text-sm text-neutral-700 dark:text-neutral-300">
          {badges.map((b) => (
            <span key={b.key} title={b.label} aria-label={`${b.label}: ${b.n}`} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} aria-hidden="true" />
              {nf.format(b.n)}
            </span>
          ))}
        </div>
      </div>

      {d.topTags.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{s.topics}</div>
          <div className="mt-2 flex flex-col gap-2">
            {d.topTags.map((t) => (
              <div key={t.name} className="flex items-center gap-2.5 text-sm">
                <a
                  href={`https://stackoverflow.com/questions/tagged/${encodeURIComponent(t.name)}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="w-24 shrink-0 truncate rounded-lg bg-neutral-100 px-2 py-0.5 text-center text-accent transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  {t.name}
                </a>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <span
                    className="block h-full rounded-full bg-[#f48024] transition-[width] duration-700 ease-out"
                    style={{ width: shown ? `${tagBarPercent(t.score, maxScore)}%` : "0%" }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-ink-faint">{nf.format(t.score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.bestAnswer && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{s.bestAnswer}</div>
          <a
            href={d.bestAnswer.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group mt-2 flex items-start justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 transition-all duration-200 hover:-translate-y-px hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
          >
            <span className="min-w-0 text-sm font-medium text-neutral-900 transition-colors group-hover:text-accent dark:text-neutral-100">{d.bestAnswer.title}</span>
            <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">▲ {nf.format(d.bestAnswer.score)}</span>
          </a>
        </div>
      )}
    </section>
  );
}
