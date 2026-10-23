// app/download-new/live-number.tsx
//
// Aleksandr, 23.10.2026: «счётчик лайв, количество вакансий — на установочной
// странице». Берёт настоящие цифры из /api/public/summary (тот же ответ, что
// питает главную a1appp.com; на сервере он кешируется на 10 минут) и плавно
// «накручивает» число до значения. Раз в минуту спрашивает снова и, если
// вакансий стало больше или меньше, докручивает до нового числа. Цифры только
// настоящие: пока ответа нет, показывается тире, а не выдуманное число.
"use client";

import { useEffect, useRef, useState } from "react";

type Summary = { jobs: number; companies: number; countries: number; today: number };
export type LiveField = keyof Summary;

// Один запрос и один таймер на всю страницу, сколько бы чисел на ней ни стояло.
let latest: Summary | null = null;
const listeners = new Set<(s: Summary) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
const POLL_MS = 60_000;

async function pull() {
  try {
    const res = await fetch("/api/public/summary", { headers: { accept: "application/json" } });
    if (!res.ok) return;
    const d = (await res.json()) as Partial<Summary>;
    if (typeof d.jobs !== "number" || d.jobs <= 0) return;
    latest = {
      jobs: d.jobs,
      companies: Number(d.companies) || 0,
      countries: Number(d.countries) || 0,
      today: Number(d.today) || 0,
    };
    listeners.forEach((fn) => latest && fn(latest));
  } catch {
    // нет сети или сервер занят — число просто не обновится, страница от этого не страдает
  }
}

function subscribe(fn: (s: Summary) => void): () => void {
  listeners.add(fn);
  if (latest) fn(latest);
  else if (listeners.size === 1) void pull();
  if (!timer) {
    timer = setInterval(() => {
      if (document.visibilityState === "visible") void pull();
    }, POLL_MS);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Тонкий неразрывный пробел между тысячами: одинаково читается во всех языках.
function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function LiveNumber({ field, prefix = "", className }: { field: LiveField; prefix?: string; className?: string }) {
  const [shown, setShown] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const target = useRef<number | null>(null);
  const current = useRef(0);
  const visible = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function run() {
      cancelAnimationFrame(raf.current);
      const to = target.current;
      if (to == null || !visible.current) return;
      if (reduced) {
        current.current = to;
        setShown(to);
        return;
      }
      const from = current.current;
      if (from === to) {
        setShown(to);
        return;
      }
      const start = performance.now();
      // дальше от нуля — дольше крутим; небольшая подкрутка при обновлении — быстро
      const ms = from === 0 ? 1600 : 700;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = from + (to - from) * eased;
        current.current = v;
        setShown(v);
        if (t < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }

    const unsub = subscribe((s) => {
      target.current = s[field];
      run();
    });

    let io: IntersectionObserver | null = null;
    const el = ref.current;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          const seen = entries.some((e) => e.isIntersecting);
          if (seen && !visible.current) {
            visible.current = true;
            run();
          }
        },
        { threshold: 0.3 },
      );
      io.observe(el);
    } else {
      visible.current = true;
      run();
    }

    return () => {
      unsub();
      io?.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [field]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown == null ? "—" : `${prefix}${fmt(shown)}`}
    </span>
  );
}
