// components/cv-landing-fx2.tsx -- вторая порция «движухи» CV Builder (28.10.2026).
// Александр выбрал: заголовки проявляются по словам, шаги 1-2-3 связываются
// линией, живые иконки в «Що всередині», счётчики и фон из квадратиков GitHub.
// Текст остаётся в HTML целиком (для Google), анимируется только показ.
// prefers-reduced-motion: всё сразу в конечном виде.
"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";


function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setIn(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Заголовок, который проявляется по словам при прокрутке. */
export function CvWords({ text, as = "h2", className }: { text: string; as?: "h2" | "h3"; className?: string }) {
  const [ref, inView] = useInView<HTMLHeadingElement>(0.6);
  const words = text.split(/(\s+)/);
  let i = 0;
  return createElement(
    as,
    { ref, className: "cvl-words " + (inView ? "cvl-in " : "") + (className ?? "") },
    words.map((w, k) =>
      /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={k} className="cvl-wd" style={{ ["--i" as string]: i++ }}>
          {w}
        </span>
      ),
    ),
  );
}

/** Обёртка шагов: поочерёдное появление карточек. */
export function CvSteps({ children }: { children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={"cvl-steps relative " + (inView ? "cvl-in" : "")}>
      {/* 28.10.2026: линию между кружками убрали (Александр: «выглядит как баг») */}
      {children}
    </div>
  );
}

/** Карточка «Що всередині» с живой иконкой (анимация при появлении и при наведении). */
export function CvFeatureCard({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.6);
  return (
    <div ref={ref} className={"cvl-card " + (inView ? "cvl-in " : "") + className}>
      <FeatureIcon index={index} />
      {children}
    </div>
  );
}

function FeatureIcon({ index }: { index: number }) {
  const p = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "cvl-ic text-accent", "aria-hidden": true };
  switch (index % 6) {
    case 0:
      return (
        <svg {...p}>
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
          <path className="q1" d="M14 14h2v2h-2zM18 18h2v2h-2z" />
          <path className="q2" d="M14 18h2M18 14h2" />
        </svg>
      );
    case 1:
      return (
        <svg {...p}>
          <path d="M2 20h20" />
          <path className="b1" d="M5 20v-8" />
          <path className="b2" d="M11 20V5" />
          <path className="b3" d="M17 20v-11" />
        </svg>
      );
    case 2:
      return (
        <svg {...p}>
          <path d="M4 6h16M4 12h16M4 18h16" opacity=".35" />
          <circle className="k1" cx="9" cy="6" r="2" fill="currentColor" />
          <circle className="k2" cx="15" cy="12" r="2" fill="currentColor" />
          <circle className="k3" cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    case 3:
      return (
        <svg {...p}>
          <path d="M6 4v16" />
          <path className="t1" d="M6 7h12" />
          <path className="t2" d="M6 13h9" />
          <path className="t3" d="M6 19h12" />
        </svg>
      );
    case 4:
      return (
        <svg {...p}>
          <g className="lk">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </g>
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
          <circle className="w1" cx="12" cy="9" r="9" strokeWidth="1.2" />
          <circle className="w2" cx="12" cy="9" r="9" strokeWidth="1.2" />
        </svg>
      );
  }
}

/** Число, которое отсчитывается от 0 при появлении на экране. */
export function CvCount({ to, className }: { to: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.6);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      setV(to);
      return;
    }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref} className={className}>
      {v.toLocaleString("en-US").replace(/,/g, " ")}
    </span>
  );
}

/** Фон из квадратиков GitHub, которые медленно загораются (за фиолетовым блоком). */
export function GhCellsBg() {
  const cols = 40;
  const rows = 4;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const r = ((i * 9301 + 49297) % 233280) / 233280;
    return { o: 0.2 + r * 0.5, t: 3 + (r * 5) % 4, d: (r * 7) % 6 };
  });
  return (
    <div data-pause-offscreen className="cvl-ghbg pointer-events-none mt-8 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[4px] opacity-70 [mask-image:linear-gradient(to_bottom,transparent,#000_70%)] max-sm:[&>i:nth-child(n+81)]:hidden sm:grid-cols-[repeat(40,minmax(0,1fr))] sm:gap-[5px]" aria-hidden="true">
      {cells.map((c, i) => (
        <i key={i} className="block aspect-square rounded-[3px] bg-white" style={{ ["--o" as string]: c.o, ["--t" as string]: `${c.t}s`, ["--d" as string]: `${c.d}s`, opacity: 0.08 }} />
      ))}
    </div>
  );
}
