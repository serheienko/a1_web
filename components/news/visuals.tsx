// components/news/visuals.tsx
//
// 08.10.2026. Живые блоки страниц «IT новини»: счётчики, сетка «экспертов»,
// столбики оценок, калькулятор цены, живые цифры из базы вакансий.
//
// Правила: (1) без внешних библиотек -- SVG/CSS; (2) для поисковиков и
// браузеров без JS все числа уже в разметке (SSR отдаёт итоговые значения),
// анимация включается только после гидратации и только когда блок попал в
// экран; (3) prefers-reduced-motion -- анимаций нет, сразу итог.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StatItem } from "@/lib/news/types";

type Phase = "ssr" | "armed" | "run";

/** ssr -> armed (сразу после монтирования, значения «в нуле») -> run (блок в экране). */
function useReveal<T extends HTMLElement>(): [React.RefObject<T | null>, Phase] {
  const ref = useRef<T | null>(null);
  const [phase, setPhase] = useState<Phase>("ssr");
  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || typeof IntersectionObserver === "undefined") {
      setPhase("run");
      return;
    }
    setPhase("armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("run");
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, phase];
}

const nf = (n: number, decimals = 0, locale = "en-US") =>
  n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/ /g, " ");

function CountUp({ to, decimals = 0, run, locale }: { to: number; decimals?: number; run: boolean; locale: string }) {
  const [v, setV] = useState(to);
  const armed = useRef(false);
  useEffect(() => {
    if (!run) {
      // armed: показываем ноль, ждём экрана. ssr: оставляем итог.
      return;
    }
    if (armed.current) return;
    armed.current = true;
    const t0 = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(to * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{nf(v, decimals, locale)}</>;
}

// ───────── 1. Счётчики ─────────
export function StatsRow({ items, locale }: { items: StatItem[]; locale: string }) {
  const [ref, phase] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="not-prose my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={i}
          className="rounded-2xl bg-gradient-to-b from-[#0e1a52] to-[#03051f] px-4 py-4 text-white shadow-sm ring-1 ring-white/10"
          style={{ transition: "opacity .5s ease, transform .5s ease", transitionDelay: `${i * 80}ms`, opacity: phase === "armed" ? 0 : 1, transform: phase === "armed" ? "translateY(8px)" : "none" }}
        >
          <div className="text-[28px] font-bold leading-none tabular-nums sm:text-[32px]">
            {s.prefix}
            <CountUp to={s.value} decimals={s.decimals} run={phase === "run"} locale={locale} />
            <span className="text-[#7aa2ff]">{s.suffix}</span>
          </div>
          <div className="mt-2 text-[12px] leading-snug text-white/65">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ───────── 2. Сетка «экспертов»: active из total ─────────
export function ExpertsGrid({
  title, caption, total, active, totalLabel, activeLabel,
}: { title: string; caption: string; total: number; active: number; totalLabel: string; activeLabel: string }) {
  const [ref, phase] = useReveal<HTMLDivElement>();
  // Детерминированно «разбрасываем» активные точки по сетке.
  const lit = useMemo(() => {
    // mulberry32 с фиксированным зерном: «случайно», но одинаково на сервере и в браузере.
    let a = 0x9e3779b9;
    const rnd = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const s = new Set<number>();
    while (s.size < active) s.add(Math.floor(rnd() * total));
    return s;
  }, [active, total]);
  const order = useMemo(() => [...lit].sort((a, b) => a - b), [lit]);
  const rank = useMemo(() => new Map(order.map((n, i) => [n, i])), [order]);
  return (
    <figure ref={ref} className="not-prose my-8 overflow-hidden rounded-2xl bg-[#03051f] p-4 ring-1 ring-white/10 sm:p-6">
      <figcaption className="text-white">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-[13px] leading-snug text-white/60">{caption}</div>
      </figcaption>
      <div
        role="img"
        aria-label={`${active} / ${total}`}
        className="mt-4 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(50, minmax(0, 1fr))" }}
      >
        {Array.from({ length: total }, (_, i) => {
          const on = lit.has(i);
          const r = rank.get(i) ?? 0;
          return (
            <span
              key={i}
              className="block aspect-square rounded-full"
              style={{
                background: on ? "#7aa2ff" : "rgba(255,255,255,.14)",
                boxShadow: on && phase !== "armed" ? "0 0 8px 1px rgba(122,162,255,.8)" : "none",
                opacity: on ? (phase === "armed" ? 0.15 : 1) : 1,
                transform: on && phase === "armed" ? "scale(.4)" : "scale(1)",
                transition: "opacity .35s ease, transform .35s ease, box-shadow .35s ease",
                transitionDelay: on && phase === "run" ? `${200 + r * 28}ms` : "0ms",
              }}
            />
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/80">
        <span className="inline-flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7aa2ff] shadow-[0_0_8px_1px_rgba(122,162,255,.8)]" /><b className="tabular-nums text-white">{active}</b> {activeLabel}</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-white/20" /><b className="tabular-nums text-white">{total}</b> {totalLabel}</span>
      </div>
    </figure>
  );
}

// ───────── 3. Столбики оценок ─────────
export function ScoreBars({
  title, caption, min, max, rows, source, locale,
}: { title: string; caption: string; min: number; max: number; rows: { label: string; value: number; hl?: boolean }[]; source: string; locale: string }) {
  const [ref, phase] = useReveal<HTMLDivElement>();
  return (
    <figure ref={ref} className="not-prose my-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 sm:p-6">
      <figcaption>
        <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</div>
        <div className="mt-1 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{caption}</div>
      </figcaption>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((r, i) => {
          const pct = Math.max(4, ((r.value - min) / (max - min)) * 100);
          return (
            <li key={r.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_3rem]">
              <span className={"truncate " + (r.hl ? "font-semibold text-accent" : "text-neutral-700 dark:text-neutral-300")}>{r.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <span
                  className={"block h-full rounded-full " + (r.hl ? "bg-gradient-to-r from-[#2a78d6] to-[#7aa2ff]" : "bg-neutral-400/70 dark:bg-neutral-500/70")}
                  style={{ width: phase === "armed" ? "0%" : `${pct}%`, transition: "width .9s cubic-bezier(.2,.7,.2,1)", transitionDelay: `${i * 110}ms` }}
                />
              </span>
              <span className={"text-right tabular-nums " + (r.hl ? "font-semibold text-accent" : "text-neutral-500 dark:text-neutral-400")}>{nf(r.value, 2, locale)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] leading-snug text-neutral-400">{source}</p>
    </figure>
  );
}

// ───────── 4. Калькулятор цены ─────────
export function PriceCalc({
  title, caption, input, output, labels, locale,
}: { title: string; caption: string; input: number; output: number; labels: { input: string; output: string; total: string; unit: string; perMillion: string }; locale: string }) {
  const [inM, setInM] = useState(50);
  const [outM, setOutM] = useState(10);
  const cost = inM * input + outM * output;
  const inShare = cost > 0 ? (inM * input) / cost : 0.5;
  return (
    <figure className="not-prose my-8 rounded-2xl bg-gradient-to-br from-[#0e1a52] to-[#03051f] p-4 text-white ring-1 ring-white/10 sm:p-6">
      <figcaption>
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-[13px] leading-snug text-white/60">{caption}</div>
      </figcaption>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-baseline justify-between text-[13px] text-white/80">
            <span>{labels.input}</span>
            <span><b className="text-[15px] tabular-nums text-white">{nf(inM, 0, locale)}</b> <span className="text-white/50">· {labels.unit}{nf(input, 2, locale)} {labels.perMillion}</span></span>
          </span>
          <input type="range" min={0} max={500} step={5} value={inM} onChange={(e) => setInM(Number(e.target.value))} className="mt-2 w-full accent-[#7aa2ff]" />
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[13px] text-white/80">
            <span>{labels.output}</span>
            <span><b className="text-[15px] tabular-nums text-white">{nf(outM, 0, locale)}</b> <span className="text-white/50">· {labels.unit}{nf(output, 2, locale)} {labels.perMillion}</span></span>
          </span>
          <input type="range" min={0} max={200} step={1} value={outM} onChange={(e) => setOutM(Number(e.target.value))} className="mt-2 w-full accent-[#7aa2ff]" />
        </label>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-white/50">{labels.total}</div>
          <div className="text-[40px] font-bold leading-none tabular-nums" aria-live="polite">{labels.unit}{nf(cost, 2, locale)}</div>
        </div>
        <div className="w-40 sm:w-56" aria-hidden="true">
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full bg-[#7aa2ff]" style={{ width: `${inShare * 100}%`, transition: "width .25s ease" }} />
            <span className="block h-full bg-[#2a78d6]/60" style={{ width: `${(1 - inShare) * 100}%`, transition: "width .25s ease" }} />
          </div>
        </div>
      </div>
    </figure>
  );
}

// ───────── 5. Живые цифры из базы вакансий ─────────
export type LiveAi = {
  total: number;
  mlWorld: number;
  mlUa: number;
  aiShare: number; // доля вакансий с любым ML-тегом, %
  salary: { mlMedian: number; allMedian: number; n: number } | null;
};

export function LiveMarket({
  title, caption, data, locale, labels,
}: {
  title: string;
  caption: string;
  data: LiveAi;
  locale: string;
  labels: { world: string; ua: string; share: string; salaryMl: string; salaryAll: string; basedOn: string; open: string };
}) {
  const [ref, phase] = useReveal<HTMLDivElement>();
  const run = phase === "run";
  const cell = (value: number, label: string, decimals = 0, suffix = "", prefix = "") => (
    <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
      <div className="text-[26px] font-bold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">
        {prefix}<CountUp to={value} decimals={decimals} run={run} locale={locale} />{suffix}
      </div>
      <div className="mt-1.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
  return (
    <figure ref={ref} className="not-prose my-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 sm:p-6">
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</div>
          <div className="mt-1 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{caption}</div>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
          live
        </span>
      </figcaption>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cell(data.mlWorld, labels.world)}
        {cell(data.mlUa, labels.ua)}
        {cell(data.aiShare, labels.share, 1, "%")}
        {data.salary ? cell(Math.round(data.salary.mlMedian / 1000), labels.salaryMl, 0, "k", "$") : null}
        {data.salary ? cell(Math.round(data.salary.allMedian / 1000), labels.salaryAll, 0, "k", "$") : null}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-neutral-400">{labels.basedOn}</p>
    </figure>
  );
}
