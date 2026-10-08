"use client";

// app/stats/stats-live.tsx -- живая часть страницы /stats (08.10.2026).
// Сервер отдаёт первые цифры прямо в HTML (их видит поисковик), а здесь они
// оживают: счётчики докручиваются, полосы вырастают при прокрутке, карта
// загорается точками, и раз в минуту страница сама спрашивает /stats/data --
// если вакансий стало больше или меньше, числа плавно меняются на глазах.
//
// Цвета -- по правилам датавиза: одна величина -- один оттенок (синяя шкала),
// категории (регионы, формат) -- фиксированный порядок проверенной палитры,
// подписи и числа -- цветом текста, а не цветом серии.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Insights, Named } from "@/lib/a1/insights";
import { T, type Locale } from "@/components/t";
import { WORLD_DOTS } from "@/lib/stats/world-dots";

type Props = { initial: Insights };

// ───────── подписи ─────────
function L(uk: string, en: string, ru: string): Record<Locale, string> {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en };
}
function TN({ n }: { n: Named | undefined | null }) {
  if (!n) return null;
  return <T {...n} />;
}

const REGION: Record<string, Record<Locale, string>> = {
  ua: L("Україна", "Ukraine", "Украина"),
  europe: L("Європа", "Europe", "Европа"),
  na: L("США і Канада", "US & Canada", "США и Канада"),
  latam: L("Латинська Америка", "Latin America", "Латинская Америка"),
  asia: L("Азія", "Asia", "Азия"),
  oceania: L("Океанія", "Oceania", "Океания"),
  mea: L("Близький Схід і Африка", "Middle East & Africa", "Ближний Восток и Африка"),
  ww: L("Віддалено з будь-якої країни", "Remote from anywhere", "Удалённо из любой страны"),
};
const LEVEL: Record<string, Record<Locale, string>> = {
  junior: L("Junior", "Junior", "Junior"),
  middle: L("Middle", "Middle", "Middle"),
  senior: L("Senior", "Senior", "Senior"),
  lead: L("Lead / Head", "Lead / Head", "Lead / Head"),
};

// ───────── числа ─────────
const NBSP = " ";
function fmt(n: number): string {
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}
function money(n: number): string {
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;
}
function flag(cc: string): string {
  if (cc === "WW") return "🌏";
  if (!/^[A-Z]{2}$/.test(cc)) return "🌍";
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return r;
}

/** Число, которое докручивается от прежнего значения к новому. */
function Count({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // первый показ: с нуля, когда блок попал на экран
    const el = ref.current;
    if (!el || started.current) return;
    if (reduce) { started.current = true; return; }
    setShown(0);
    from.current = 0;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { started.current = true; io.disconnect(); animate(0, value); }
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started.current) return;
    if (reduce) { setShown(value); return; }
    animate(from.current, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function animate(a: number, b: number) {
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      const v = a + (b - a) * e;
      from.current = v;
      setShown(v);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return <span ref={ref} className={className}>{fmt(shown)}</span>;
}

/** Блок, который «въезжает» при прокрутке; дочерние полосы растут, пока у блока нет класса st-in. */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setIn(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <section ref={ref} className={`st-card st-reveal ${inView ? "st-in" : ""} ${className}`}>{children}</section>;
}

function H2({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{children}</h2>
      {sub ? <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{sub}</p> : null}
    </header>
  );
}

/** Горизонтальная полоса: подпись, полоса одного оттенка, значение -- цветом текста. */
function Bar({ label, value, max, href, i, note }: { label: React.ReactNode; value: number; max: number; href?: string | null; i: number; note?: React.ReactNode }) {
  const w = max > 0 ? Math.max(1.5, (value / max) * 100) : 0;
  const inner = (
    <>
      <span className="st-bar-label">{label}</span>
      <span className="st-bar-track">
        <span className="st-bar-fill" style={{ ["--w" as string]: `${w}%`, transitionDelay: `${Math.min(i, 24) * 35}ms` }} />
      </span>
      <span className="st-bar-val"><Count value={value} />{note}</span>
    </>
  );
  return href ? <a href={href} className="st-bar st-bar-link">{inner}</a> : <div className="st-bar">{inner}</div>;
}

// ───────── карта ─────────
const SEQ_LIGHT = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
const SEQ_DARK = ["#104281", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef", "#9ec5f4", "#b7d3f6", "#cde2fb"];

function useDark(): boolean {
  const [d, setD] = useState(false);
  useEffect(() => {
    const read = () => {
      const r = document.documentElement;
      setD(r.classList.contains("dark") || (!r.classList.contains("light") && window.matchMedia("(prefers-color-scheme: dark)").matches));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    m.addEventListener?.("change", read);
    return () => { mo.disconnect(); m.removeEventListener?.("change", read); };
  }, []);
  return d;
}

function DotMap({ data }: { data: Insights }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const dark = useDark();
  const reduce = useReducedMotion();
  const [tip, setTip] = useState<{ x: number; y: number; cc: string } | null>(null);
  const counts = useMemo(() => new Map(data.byCountry.map((c) => [c.cc, c])), [data.byCountry]);
  const max = useMemo(() => Math.max(1, ...data.byCountry.filter((c) => c.cc !== "WW").map((c) => c.n)), [data.byCountry]);
  const { rows, cols, runs, cc: ccs, labels } = WORLD_DOTS;

  // сетка «клетка -> страна» для наведения
  const grid = useMemo(() => {
    const g = new Int16Array(rows * cols).fill(-1);
    for (let i = 0; i < runs.length; i += 4) {
      const [r, c0, c1, k] = [runs[i]!, runs[i + 1]!, runs[i + 2]!, runs[i + 3]!];
      for (let c = c0; c <= c1; c++) g[r * cols + c] = k;
    }
    return g;
  }, [rows, cols, runs]);
  // маленькие страны без клеток на сетке -- точка в месте подписи
  const extra = useMemo(() => {
    const has = new Set<string>();
    for (let i = 3; i < runs.length; i += 4) has.add(ccs[runs[i]!]!);
    return data.byCountry.filter((c) => c.cc !== "WW" && !has.has(c.cc) && labels[c.cc]).map((c) => c.cc);
  }, [data.byCountry, runs, ccs, labels]);

  const started = useRef<number | null>(null);
  useEffect(() => {
    const canvas = cv.current;
    const box = wrap.current;
    if (!canvas || !box) return;
    let raf = 0;
    let visible = false;
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible && started.current == null) started.current = performance.now(); if (visible) loop(); });
    io.observe(box);
    const ramp = dark ? SEQ_DARK : SEQ_LIGHT;
    const empty = dark ? "#2c2c2e" : "#e3e3e8";
    const colorOf = (code: string) => {
      const e = counts.get(code);
      if (!e || !e.n) return empty;
      const t = Math.log1p(e.n) / Math.log1p(max);
      return ramp[Math.min(ramp.length - 1, Math.floor(t * (ramp.length - 0.001)))]!;
    };
    const colors = ccs.map(colorOf);
    function draw(now: number) {
      const W = box!.clientWidth;
      const cell = W / cols;
      const H = cell * rows;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas!.width !== Math.round(W * dpr)) { canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr); canvas!.style.height = `${H}px`; }
      const ctx = canvas!.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const t = reduce || started.current == null ? 1e9 : now - started.current;
      const r0 = cell * 0.36;
      for (let i = 0; i < runs.length; i += 4) {
        const r = runs[i]!, c0 = runs[i + 1]!, c1 = runs[i + 2]!, k = runs[i + 3]!;
        ctx.fillStyle = colors[k]!;
        for (let c = c0; c <= c1; c++) {
          // волна слева направо при первом показе
          const appear = Math.min(1, Math.max(0, (t - c * 6 - r * 2) / 260));
          if (appear <= 0) continue;
          ctx.globalAlpha = appear;
          ctx.beginPath();
          ctx.arc(c * cell + cell / 2, r * cell + cell / 2, r0 * (0.6 + 0.4 * appear), 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      const proj = (lng: number, lat: number): [number, number] => [((lng + 180) / WORLD_DOTS.step) * cell, ((WORLD_DOTS.top - lat) / WORLD_DOTS.step) * cell + cell / 2];
      for (const code of extra) {
        const [x, y] = proj(...labels[code]!);
        ctx.fillStyle = colorOf(code);
        ctx.beginPath(); ctx.arc(x, y, r0 * 1.2, 0, 6.2832); ctx.fill();
      }
      // пульс там, где за сутки появились новые вакансии
      if (!reduce) {
        ctx.strokeStyle = dark ? "rgba(134,182,239,.9)" : "rgba(42,120,214,.85)";
        ctx.lineWidth = 1.5;
        let j = 0;
        for (const c of data.byCountry) {
          if (!c.fresh || c.cc === "WW" || !labels[c.cc]) continue;
          if (j++ > 40) break;
          const [x, y] = proj(...labels[c.cc]!);
          const ph = ((now / 1600) + (j * 0.37)) % 1;
          ctx.globalAlpha = (1 - ph) * 0.9;
          ctx.beginPath(); ctx.arc(x, y, cell * (0.6 + ph * 2.6), 0, 6.2832); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    function loop() {
      cancelAnimationFrame(raf);
      const step = (now: number) => { draw(now); if (visible && !reduce) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    draw(performance.now());
    const ro = new ResizeObserver(() => draw(performance.now()));
    ro.observe(box);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [dark, reduce, counts, max, extra, ccs, labels, runs, cols, rows, data.byCountry]);

  function onMove(e: React.MouseEvent) {
    const box = wrap.current!;
    const rect = box.getBoundingClientRect();
    const cell = rect.width / cols;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const c = Math.floor(x / cell), r = Math.floor(y / cell);
    let code: string | null = null;
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const k = grid[r * cols + c]!;
      if (k >= 0) code = ccs[k]!;
    }
    if (!code) {
      for (const cc of extra) {
        const [lng, lat] = labels[cc]!;
        const px = ((lng + 180) / WORLD_DOTS.step) * cell, py = ((WORLD_DOTS.top - lat) / WORLD_DOTS.step) * cell;
        if (Math.hypot(px - x, py - y) < cell * 2) { code = cc; break; }
      }
    }
    setTip(code ? { x, y, cc: code } : null);
  }
  function onClick() {
    if (tip && counts.get(tip.cc)?.n) window.location.href = `/jobs/country/${tip.cc.toLowerCase()}`;
  }
  const t = tip ? counts.get(tip.cc) : null;
  return (
    <div ref={wrap} className="relative select-none" onMouseMove={onMove} onMouseLeave={() => setTip(null)} onClick={onClick} style={{ cursor: t?.n ? "pointer" : "default" }}>
      <canvas ref={cv} className="block w-full" role="img" aria-label="Map of job counts by country" />
      {tip ? (
        <div className="st-tip" style={{ left: Math.min(tip.x + 14, (wrap.current?.clientWidth ?? 0) - 190), top: tip.y + 14 }}>
          <div className="font-semibold">{flag(tip.cc)} {data.names[tip.cc] ? <TN n={data.names[tip.cc]} /> : tip.cc}</div>
          <div className="st-tip-row"><span><T {...L("Вакансій", "Jobs", "Вакансий")} /></span><b>{fmt(t?.n ?? 0)}</b></div>
          {t?.fresh ? <div className="st-tip-row"><span><T {...L("Нових за добу", "New in 24h", "Новых за сутки")} /></span><b>+{fmt(t.fresh)}</b></div> : null}
        </div>
      ) : null}
    </div>
  );
}

// ───────── динамика ─────────
function Daily({ days }: { days: Insights["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Пара дней массовой заливки (30.09-01.10: 6-10 тыс.) сплющивает остальные столбики в ноль.
  // Если пик больше третьего по величине дня в 3+ раза, шкалу режем, а высокие столбики
  // помечаем разрывом и подписываем числом -- честно, но остальные дни видны.
  const sorted = [...days.map((d) => d.n)].sort((a, b) => b - a);
  const third = sorted[2] ?? 0;
  const cut = (sorted[0] ?? 0) > third * 3 && third > 0;
  const max = Math.max(1, cut ? third * 1.35 : (sorted[0] ?? 1));
  const W = 600, H = 160, pad = 2, bw = W / days.length;
  const ticks = [0, Math.round(max / 2), max];
  return (
    <div className="relative">
      <svg viewBox={`0 -16 ${W} ${H + 34}`} className="w-full overflow-visible" role="img" aria-label="New jobs per day">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={H - (v / max) * H} y2={H - (v / max) * H} className="st-grid" />
          </g>
        ))}
        {days.map((d, i) => {
          const over = d.n > max;
          const h = Math.max(d.n ? 2 : 0, (Math.min(d.n, max) / max) * H);
          return (
            <g key={d.d} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {over ? (
                <>
                  <text x={i * bw + bw / 2} y={-6} textAnchor="middle" className="st-axis st-axis-strong">{d.n >= 1000 ? `${(d.n / 1000).toFixed(1)}k` : d.n}</text>
                  <path d={`M${i * bw + pad} ${H - h + 10} l${(bw - pad * 2) / 2} -5 l${(bw - pad * 2) / 2} 5`} className="st-break" />
                </>
              ) : null}
              <rect
                x={i * bw + pad}
                y={H - h}
                width={bw - pad * 2}
                height={h}
                rx={Math.min(4, (bw - pad * 2) / 2)}
                className={`st-col ${hover === i ? "st-col-on" : ""}`}
                style={{ transitionDelay: `${i * 18}ms`, ["--h" as string]: `${h}px` }}
              />
            </g>
          );
        })}
        <text x={0} y={H + 14} className="st-axis">{days[0]?.d.slice(5).split("-").reverse().join(".")}</text>
        <text x={W} y={H + 14} textAnchor="end" className="st-axis">{days[days.length - 1]?.d.slice(5).split("-").reverse().join(".")}</text>
      </svg>
      {hover != null ? (
        <div className="st-tip" style={{ left: `${Math.min(80, (hover / days.length) * 100)}%`, top: 0 }}>
          <div className="font-semibold">{days[hover]!.d.split("-").reverse().join(".")}</div>
          <div className="st-tip-row"><span><T {...L("Додано", "Added", "Добавлено")} /></span><b>{fmt(days[hover]!.n)}</b></div>
        </div>
      ) : null}
    </div>
  );
}

// ───────── доли одной полосой ─────────
const CAT = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];
function Split({ parts }: { parts: { key: string; label: React.ReactNode; n: number }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return (
    <div>
      <div className="st-split" role="img">
        {parts.map((p, i) => (
          <span key={p.key} className="st-split-seg" style={{ ["--w" as string]: `${(p.n / total) * 100}%`, background: CAT[i], transitionDelay: `${i * 90}ms` }} title={`${fmt(p.n)}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {parts.map((p, i) => (
          <li key={p.key} className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CAT[i] }} />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <b className="tabular-nums text-neutral-900 dark:text-neutral-100"><Count value={p.n} /></b>
            <span className="w-11 text-right tabular-nums text-neutral-500">{Math.round((p.n / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────── страница ─────────
export function StatsLive({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [delta, setDelta] = useState<number | null>(null);
  const [techGroup, setTechGroup] = useState<string>("all");
  const prevTotal = useRef(initial.total);

  // живое обновление: раз в минуту, только пока вкладка открыта
  useEffect(() => {
    let stop = false;
    async function pull() {
      if (document.hidden) return;
      try {
        const r = await fetch("/stats/data", { cache: "no-store" });
        if (!r.ok) return;
        const next = (await r.json()) as Insights;
        if (stop || !next?.total) return;
        if (next.total !== prevTotal.current) {
          setDelta(next.total - prevTotal.current);
          prevTotal.current = next.total;
          setTimeout(() => setDelta(null), 6000);
        }
        setData(next);
      } catch {
        /* сеть моргнула -- попробуем через минуту */
      }
    }
    const id = setInterval(pull, 60_000);
    const vis = () => { if (!document.hidden) void pull(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const updated = new Date(data.updatedAt);
  const countriesTop = data.byCountry.filter((c) => c.cc !== "WW").slice(0, 15);
  const techShown = (techGroup === "all" ? data.tech : data.tech.filter((t) => t.group === techGroup)).slice(0, 24);
  const techMax = Math.max(1, ...techShown.map((t) => t.n));
  const salaryMax = Math.max(1, ...data.salary.map((s) => s.p75));

  return (
    <div className="st-root">
      <style>{CSS}</style>

      {/* ── главные числа ── */}
      <div className="st-hero">
        {[
          { v: data.total, l: L("вакансій зараз", "open jobs now", "вакансий сейчас"), big: true },
          { v: data.companies, l: L("компаній", "companies", "компаний") },
          { v: data.countries, l: L("країн", "countries", "стран") },
          { v: data.cities, l: L("міст", "cities", "городов") },
          { v: data.fresh24h, l: L("нових за добу", "new in 24h", "новых за сутки"), plus: true },
        ].map((s, i) => (
          <div key={i} className={`st-tile ${s.big ? "st-tile-big" : ""}`}>
            <div className="st-tile-num">{s.plus ? "+" : ""}<Count value={s.v} /></div>
            <div className="st-tile-lbl"><T {...s.l} /></div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
        <span className="st-live-dot" />
        <span><T {...L("Цифри живі: сторінка оновлюється сама, щохвилини", "Live numbers: the page refreshes itself every minute", "Цифры живые: страница обновляется сама, каждую минуту")} /></span>
        <span suppressHydrationWarning>· <T {...L("дані на", "data as of", "данные на")} /> {updated.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" })}</span>
        {delta ? <span className={`st-delta ${delta > 0 ? "st-delta-up" : ""}`}>{delta > 0 ? "+" : ""}{fmt(delta)}</span> : null}
      </div>

      {/* ── карта ── */}
      <Reveal className="mt-6">
        <H2 sub={<T {...L("Колір -- скільки вакансій у країні; кола, що розходяться, -- там, де за добу з'явилися нові. Наведіть на країну.", "Color shows how many jobs a country has; ripples mark countries with new jobs in the last 24h. Hover a country.", "Цвет -- сколько вакансий в стране; расходящиеся круги -- там, где за сутки появились новые. Наведите на страну.")} />}>
          <T {...L("Карта вакансій", "Job map", "Карта вакансий")} />
        </H2>
        <DotMap data={data} />
        <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
          <span>1</span>
          <span className="st-legend-ramp" />
          <span>{fmt(Math.max(...data.byCountry.filter((c) => c.cc !== "WW").map((c) => c.n)))}</span>
          <span className="ml-2"><T {...L("вакансій (логарифмічна шкала)", "jobs (log scale)", "вакансий (логарифмическая шкала)")} /></span>
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <H2 sub={<T {...L("Топ-15 країн за кількістю відкритих вакансій", "Top 15 countries by open jobs", "Топ-15 стран по количеству открытых вакансий")} />}>
            <T {...L("Країни", "Countries", "Страны")} />
          </H2>
          <div className="st-bars">
            {countriesTop.map((c, i) => (
              <Bar key={c.cc} i={i} max={countriesTop[0]?.n ?? 1} value={c.n} href={`/jobs/country/${c.cc.toLowerCase()}`}
                label={<>{flag(c.cc)} <TN n={data.names[c.cc]} /></>}
                note={c.fresh ? <span className="st-fresh">+{fmt(c.fresh)}</span> : null} />
            ))}
          </div>
        </Reveal>
        <Reveal>
          <H2 sub={<T {...L("Як розподілений увесь ринок A1 по світу", "How the whole A1 market splits across the world", "Как весь рынок A1 распределён по миру")} />}>
            <T {...L("Регіони", "Regions", "Регионы")} />
          </H2>
          <Split parts={data.regions.map((r) => ({ key: r.id, label: <T {...(REGION[r.id] ?? L(r.id, r.id, r.id))} />, n: r.n }))} />
          <div className="mt-6">
            <H2 sub={<T {...L("Віддалено, гібрид чи офіс", "Remote, hybrid or office", "Удалённо, гибрид или офис")} />}>
              <T {...L("Формат роботи", "Work format", "Формат работы")} />
            </H2>
            <Split parts={[
              { key: "remote", label: <T {...L("Віддалено", "Remote", "Удалённо")} />, n: data.format.remote },
              { key: "hybrid", label: <T {...L("Гібрид", "Hybrid", "Гибрид")} />, n: data.format.hybrid },
              { key: "office", label: <T {...L("Офіс або не вказано", "Office or not stated", "Офис или не указано")} />, n: data.format.office },
            ]} />
          </div>
        </Reveal>
      </div>

      {/* ── динамика ── */}
      <Reveal className="mt-4">
        <H2 sub={<T {...L("Скільки з нинішніх відкритих вакансій додано на A1 щодня за останні 30 днів", "How many of today's open jobs were added to A1 each day over the last 30 days", "Сколько из нынешних открытых вакансий добавлено на A1 каждый день за последние 30 дней")} />}>
          <T {...L("Динаміка: нові вакансії по днях", "New jobs per day", "Динамика: новые вакансии по дням")} />
        </H2>
        <Daily days={data.daily} />
        <div className="mt-3 flex gap-6 text-[13px] text-neutral-600 dark:text-neutral-400">
          <span><T {...L("За 7 днів:", "Last 7 days:", "За 7 дней:")} /> <b className="text-neutral-900 dark:text-neutral-100">+<Count value={data.fresh7d} /></b></span>
          <span><T {...L("За добу:", "Last 24h:", "За сутки:")} /> <b className="text-neutral-900 dark:text-neutral-100">+<Count value={data.fresh24h} /></b></span>
        </div>
      </Reveal>

      {/* ── технологии ── */}
      <Reveal className="mt-4">
        <H2 sub={<T {...L("Згадки технологій у вакансіях. Одна вакансія може назвати кілька.", "Technologies mentioned in job posts. One job can name several.", "Упоминания технологий в вакансиях. Одна вакансия может назвать несколько.")} />}>
          <T {...L("Технології та стеки", "Tech stacks", "Технологии и стеки")} />
        </H2>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setTechGroup("all")} className={`st-chip ${techGroup === "all" ? "st-chip-on" : ""}`}><T {...L("Усі", "All", "Все")} /></button>
          {data.techGroups.filter((g) => g.n > 0).map((g) => (
            <button key={g.id} type="button" onClick={() => setTechGroup(g.id)} className={`st-chip ${techGroup === g.id ? "st-chip-on" : ""}`}>
              <TN n={g.title} />
            </button>
          ))}
        </div>
        <div className="st-bars st-bars-2col" key={techGroup}>
          {techShown.map((t, i) => (
            <Bar key={t.tech} i={i} max={techMax} value={t.n} href={t.href} label={t.tech} />
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <H2 sub={<T {...L("Професія -- за назвою вакансії", "Role is read from the job title", "Профессия -- по названию вакансии")} />}>
            <T {...L("Ролі", "Roles", "Роли")} />
          </H2>
          <div className="st-bars">
            {data.roles.map((r, i) => (
              <Bar key={r.slug} i={i} max={data.roles[0]?.n ?? 1} value={r.n} href={r.href} label={r.label} />
            ))}
          </div>
        </Reveal>
        <Reveal>
          <H2 sub={<T {...L("Рівень -- коли він є в назві вакансії", "Seniority, when the title states it", "Уровень -- когда он есть в названии")} />}>
            <T {...L("Рівень (seniority)", "Seniority", "Уровень (seniority)")} />
          </H2>
          <div className="st-levels">
            {data.levels.map((l, i) => {
              const m = Math.max(1, ...data.levels.map((x) => x.n));
              return (
                <div key={l.level} className="st-level">
                  <div className="st-level-val"><Count value={l.n} /></div>
                  <div className="st-level-col"><span style={{ ["--h" as string]: `${(l.n / m) * 100}%`, background: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"][i], transitionDelay: `${i * 120}ms` }} /></div>
                  <div className="st-level-lbl"><T {...(LEVEL[l.level] ?? L(l.level, l.level, l.level))} /></div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      {/* ── зарплаты ── */}
      {data.salary.length ? (
        <Reveal className="mt-4">
          <H2 sub={<T {...L(
            `Лише вакансії з указаною зарплатою в доларах, рік. Смуга -- від 25-го до 75-го перцентиля, точка -- медіана. Вакансій із зарплатою: ${fmt(data.withSalary)}.`,
            `USD salaries stated in the job post, per year. Bar: 25th–75th percentile, dot: median. Jobs with a salary: ${fmt(data.withSalary)}.`,
            `Только вакансии с указанной зарплатой в долларах, в год. Полоса -- от 25-го до 75-го перцентиля, точка -- медиана. Вакансий с зарплатой: ${fmt(data.withSalary)}.`,
          )} />}>
            <T {...L("Зарплати за технологіями", "Salaries by technology", "Зарплаты по технологиям")} />
          </H2>
          <div className="st-sal">
            {data.salary.map((s, i) => (
              <div key={s.tech} className="st-sal-row" title={`${s.tech}: ${money(s.p25)}–${money(s.p75)}, median ${money(s.median)}, n=${s.n}`}>
                <span className="st-bar-label">{s.href ? <a href={s.href} className="hover:text-accent">{s.tech}</a> : s.tech}</span>
                <span className="st-sal-track">
                  <span className="st-sal-range" style={{ left: `${(s.p25 / salaryMax) * 100}%`, ["--w" as string]: `${((s.p75 - s.p25) / salaryMax) * 100}%`, transitionDelay: `${i * 40}ms` }} />
                  <span className="st-sal-med" style={{ left: `${(s.median / salaryMax) * 100}%`, transitionDelay: `${i * 40 + 300}ms` }} />
                </span>
                <span className="st-bar-val">{money(s.median)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <H2 sub={<T {...L("Хто зараз наймає найбільше", "Who is hiring the most right now", "Кто сейчас нанимает больше всех")} />}>
            <T {...L("Топ компаній", "Top companies", "Топ компаний")} />
          </H2>
          <div className="st-bars">
            {data.companiesTop.map((c, i) => (
              <Bar key={c.name + i} i={i} max={data.companiesTop[0]?.n ?? 1} value={c.n} href={c.href} label={c.name} />
            ))}
          </div>
        </Reveal>
        <Reveal>
          <H2 sub={<T {...L("Найбільші зв'язки «роль × країна»", "Largest role × country segments", "Крупнейшие связки «роль × страна»")} />}>
            <T {...L("Найбільші сегменти", "Biggest segments", "Крупнейшие сегменты")} />
          </H2>
          <div className="grid grid-cols-2 gap-2">
            {data.segments.map((s, i) => (
              <a key={`${s.role}${s.cc}`} href={s.href} className="st-seg" style={{ transitionDelay: `${i * 50}ms` }}>
                <div className="text-[12px] text-neutral-500 dark:text-neutral-400">{flag(s.cc)} <TN n={data.names[s.cc]} /></div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{s.label}</span>
                  <span className="tabular-nums text-neutral-700 dark:text-neutral-300"><Count value={s.n} /></span>
                </div>
              </a>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <H2 sub={<T {...L("Міста з найбільшою кількістю вакансій", "Cities with the most jobs", "Города с наибольшим числом вакансий")} />}>
            <T {...L("Міста", "Cities", "Города")} />
          </H2>
          <div className="st-bars">
            {data.cities_top.slice(0, 15).map((c, i) => (
              <Bar key={c.cc + c.city} i={i} max={data.cities_top[0]?.n ?? 1} value={c.n} label={<>{flag(c.cc)} {c.city}</>} />
            ))}
          </div>
        </Reveal>
        <Reveal>
          <H2 sub={<T {...L("Останні додані вакансії", "Latest jobs added", "Последние добавленные вакансии")} />}>
            <span className="inline-flex items-center gap-2"><span className="st-live-dot" /><T {...L("Щойно на A1", "Just in on A1", "Только что на A1")} /></span>
          </H2>
          <ul className="st-latest">
            {data.latest.map((j) => (
              <li key={j.href}>
                <a href={j.href} className="block rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-100">{j.title}</div>
                  <div className="truncate text-[12px] text-neutral-500">{flag(j.cc)} {j.company}{j.city ? ` · ${j.city}` : ""}</div>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </div>
  );
}

// Стили страницы -- свои токены цвета, светлая и тёмная тема (палитра проверена валидатором датавиза).
const CSS = `
.st-root{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--s6:#008300;--s7:#4a3aa7;--s8:#e34948;
  --bar:#2a78d6;--track:#f0f0f3;--grid:#e8e8ec;--tip-bg:#ffffff;--tip-ink:#1c1c1e;--card:#ffffff;--muted:#8e8e93}
.dark .st-root{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;
  --bar:#3987e5;--track:#232325;--grid:#2c2c2e;--tip-bg:#2c2c2e;--tip-ink:#f2f2f7;--card:#1c1c1e;--muted:#8e8e93}
@media (prefers-color-scheme: dark){:root:not(.light) .st-root{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;
  --bar:#3987e5;--track:#232325;--grid:#2c2c2e;--tip-bg:#2c2c2e;--tip-ink:#f2f2f7;--card:#1c1c1e}}
.st-hero{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
@media(min-width:640px){.st-hero{grid-template-columns:2fr 1fr 1fr 1fr 1fr}}
.st-tile{background:var(--card);border-radius:20px;padding:14px 16px}
.st-tile-big{grid-column:1/-1}
@media(min-width:640px){.st-tile-big{grid-column:auto}}
.st-tile-num{font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:inherit}
.st-tile-big .st-tile-num{font-size:40px;line-height:1.05}
.st-tile-lbl{font-size:12px;color:var(--muted);margin-top:2px}
.st-card{background:var(--card);border-radius:20px;padding:18px}
.st-reveal{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
.st-reveal.st-in{opacity:1;transform:none}
.st-bars{display:flex;flex-direction:column;gap:6px}
.st-bars-2col{display:grid;grid-template-columns:1fr;column-gap:24px;row-gap:6px}
@media(min-width:768px){.st-bars-2col{grid-template-columns:1fr 1fr}}
.st-bar{display:grid;grid-template-columns:minmax(0,9.5rem) 1fr auto;align-items:center;gap:10px;font-size:13px;border-radius:8px;padding:2px 4px}
.st-bar-link:hover{background:rgba(127,127,127,.08)}
.st-bar-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit}
.st-bar-track{height:10px;background:var(--track);border-radius:4px;overflow:hidden}
.st-bar-fill{display:block;height:100%;width:0;background:var(--bar);border-radius:0 4px 4px 0;transition:width .9s cubic-bezier(.2,.8,.2,1)}
.st-in .st-bar-fill{width:var(--w)}
.st-bar-val{font-variant-numeric:tabular-nums;font-weight:600;min-width:3.5rem;text-align:right}
.st-fresh{margin-left:6px;font-size:11px;font-weight:600;color:#0ca30c}
.st-split{display:flex;gap:2px;height:16px;border-radius:6px;overflow:hidden;background:var(--track)}
.st-split-seg{display:block;height:100%;width:0;transition:width .9s cubic-bezier(.2,.8,.2,1)}
.st-in .st-split-seg{width:var(--w)}
.st-grid{stroke:var(--grid);stroke-width:1}
.st-axis{font-size:11px;fill:var(--muted)}
.st-axis-strong{font-weight:600;fill:currentColor}
.st-break{fill:none;stroke:var(--card);stroke-width:3}
.st-col{fill:var(--bar);transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .2s}
.st-in .st-col{transform:scaleY(1)}
.st-col-on{opacity:.75}
.st-tip{position:absolute;z-index:5;pointer-events:none;min-width:170px;background:var(--tip-bg);color:var(--tip-ink);border-radius:12px;padding:8px 10px;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,.14)}
.st-tip-row{display:flex;justify-content:space-between;gap:12px;margin-top:2px}
.st-legend-ramp{display:inline-block;width:140px;height:8px;border-radius:4px;background:linear-gradient(90deg,#cde2fb,#86b6ef,#3987e5,#1c5cab,#104281)}
.dark .st-legend-ramp{background:linear-gradient(90deg,#104281,#1c5cab,#3987e5,#86b6ef,#cde2fb)}
@media (prefers-color-scheme: dark){:root:not(.light) .st-legend-ramp{background:linear-gradient(90deg,#104281,#1c5cab,#3987e5,#86b6ef,#cde2fb)}}
.st-chip{font-size:12px;padding:5px 10px;border-radius:999px;background:var(--track);transition:background .2s,color .2s}
.st-chip-on{background:var(--bar);color:#fff}
.st-levels{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:end;height:200px}
.st-level{display:flex;flex-direction:column;align-items:center;height:100%}
.st-level-val{font-weight:700;font-variant-numeric:tabular-nums;font-size:15px}
.st-level-col{flex:1;width:100%;display:flex;align-items:flex-end;margin:6px 0}
.st-level-col span{display:block;width:100%;height:0;border-radius:4px 4px 0 0;transition:height .9s cubic-bezier(.2,.8,.2,1)}
.st-in .st-level-col span{height:var(--h)}
.st-level-lbl{font-size:12px;color:var(--muted)}
.st-sal{display:flex;flex-direction:column;gap:8px}
.st-sal-row{display:grid;grid-template-columns:minmax(0,8rem) 1fr auto;align-items:center;gap:10px;font-size:13px}
.st-sal-track{position:relative;height:12px;background:var(--track);border-radius:4px}
.st-sal-range{position:absolute;top:2px;height:8px;width:0;background:var(--bar);opacity:.45;border-radius:4px;transition:width .9s cubic-bezier(.2,.8,.2,1)}
.st-in .st-sal-range{width:var(--w)}
.st-sal-med{position:absolute;top:-2px;width:16px;height:16px;margin-left:-8px;border-radius:999px;background:var(--bar);border:2px solid var(--card);transform:scale(0);transition:transform .4s cubic-bezier(.2,1.6,.4,1)}
.st-in .st-sal-med{transform:scale(1)}
.st-seg{display:block;border-radius:14px;padding:10px 12px;background:var(--track);opacity:0;transform:scale(.96);transition:opacity .5s,transform .5s,background .2s}
.st-in .st-seg{opacity:1;transform:none}
.st-seg:hover{background:rgba(42,120,214,.12)}
.st-latest{display:flex;flex-direction:column;gap:2px;max-height:520px;overflow:auto}
.st-live-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#0ca30c;box-shadow:0 0 0 0 rgba(12,163,12,.6);animation:st-pulse 1.8s infinite}
@keyframes st-pulse{0%{box-shadow:0 0 0 0 rgba(12,163,12,.55)}70%{box-shadow:0 0 0 8px rgba(12,163,12,0)}100%{box-shadow:0 0 0 0 rgba(12,163,12,0)}}
.st-delta{font-weight:700;padding:1px 8px;border-radius:999px;background:var(--track);animation:st-pop .5s ease}
.st-delta-up{color:#0ca30c}
@keyframes st-pop{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){.st-reveal,.st-bar-fill,.st-split-seg,.st-col,.st-level-col span,.st-sal-range,.st-sal-med,.st-seg{transition:none!important}.st-live-dot{animation:none}}
`;

