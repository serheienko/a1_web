// components/cv-landing-fx2.tsx -- вторая порция «движухи» CV Builder (28.10.2026).
// Александр выбрал: заголовки проявляются по словам, шаги 1-2-3 связываются
// линией, живые иконки в «Що всередині», счётчики и фон из квадратиков GitHub.
// Текст остаётся в HTML целиком (для Google), анимируется только показ.
// prefers-reduced-motion: всё сразу в конечном виде.
"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";

export const CV_FX2_CSS = `
.cvl-words .cvl-wd{display:inline-block;opacity:0;transform:translateY(.45em);filter:blur(4px);transition:opacity .55s ease,transform .55s cubic-bezier(.2,.8,.2,1),filter .55s ease;transition-delay:calc(var(--i)*70ms)}
.cvl-words.cvl-in .cvl-wd{opacity:1;transform:none;filter:none}
.cvl-steps .cvl-line{transform:scaleX(0);transform-origin:left;transition:transform 1.2s cubic-bezier(.65,0,.35,1) .15s}
.cvl-steps.cvl-in .cvl-line{transform:scaleX(1)}
.cvl-steps .cvl-step{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s cubic-bezier(.2,.8,.2,1);transition-delay:calc(.2s + var(--i)*.35s)}
.cvl-steps.cvl-in .cvl-step{opacity:1;transform:none}
.cvl-steps .cvl-dot{transition:box-shadow .4s ease;transition-delay:calc(.35s + var(--i)*.35s)}
.cvl-steps.cvl-in .cvl-dot{box-shadow:0 0 0 6px rgba(51,94,247,.15)}
@keyframes cvl-ic-blink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes cvl-ic-grow{0%{transform:scaleY(.2)}60%{transform:scaleY(1.08)}100%{transform:scaleY(1)}}
@keyframes cvl-ic-slide{0%,100%{transform:translateX(0)}50%{transform:translateX(var(--dx,3px))}}
@keyframes cvl-ic-draw{from{stroke-dashoffset:14}to{stroke-dashoffset:0}}
@keyframes cvl-ic-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
@keyframes cvl-ic-wave{0%{opacity:.9;transform:scale(.7)}100%{opacity:0;transform:scale(1.35)}}
.cvl-ic *{transform-box:fill-box}
.cvl-ic .b1,.cvl-ic .b2,.cvl-ic .b3{transform-origin:bottom}
.cvl-card:hover .cvl-ic .q1,.cvl-in .cvl-ic .q1{animation:cvl-ic-blink 1.2s ease-in-out 2}
.cvl-card:hover .cvl-ic .q2,.cvl-in .cvl-ic .q2{animation:cvl-ic-blink 1.2s ease-in-out .3s 2}
.cvl-card:hover .cvl-ic .b1,.cvl-in .cvl-ic .b1{animation:cvl-ic-grow .7s ease-out}
.cvl-card:hover .cvl-ic .b2,.cvl-in .cvl-ic .b2{animation:cvl-ic-grow .7s ease-out .12s both}
.cvl-card:hover .cvl-ic .b3,.cvl-in .cvl-ic .b3{animation:cvl-ic-grow .7s ease-out .24s both}
.cvl-card:hover .cvl-ic .k1,.cvl-in .cvl-ic .k1{--dx:6px;animation:cvl-ic-slide 1s ease-in-out}
.cvl-card:hover .cvl-ic .k2,.cvl-in .cvl-ic .k2{--dx:-5px;animation:cvl-ic-slide 1s ease-in-out .1s}
.cvl-card:hover .cvl-ic .k3,.cvl-in .cvl-ic .k3{--dx:4px;animation:cvl-ic-slide 1s ease-in-out .2s}
.cvl-ic .t1,.cvl-ic .t2,.cvl-ic .t3{stroke-dasharray:14}
.cvl-card:hover .cvl-ic .t1,.cvl-in .cvl-ic .t1{animation:cvl-ic-draw .5s ease-out both}
.cvl-card:hover .cvl-ic .t2,.cvl-in .cvl-ic .t2{animation:cvl-ic-draw .5s ease-out .15s both}
.cvl-card:hover .cvl-ic .t3,.cvl-in .cvl-ic .t3{animation:cvl-ic-draw .5s ease-out .3s both}
.cvl-ic .lk{transform-origin:center}
.cvl-card:hover .cvl-ic .lk,.cvl-in .cvl-ic .lk{animation:cvl-ic-wiggle .6s ease-in-out}
.cvl-ic .w1,.cvl-ic .w2{transform-origin:center;opacity:0}
.cvl-card:hover .cvl-ic .w1,.cvl-in .cvl-ic .w1{animation:cvl-ic-wave 1.1s ease-out 2}
.cvl-card:hover .cvl-ic .w2,.cvl-in .cvl-ic .w2{animation:cvl-ic-wave 1.1s ease-out .35s 2}
.cvl-card{transition:transform .25s ease,box-shadow .25s ease}
.cvl-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px rgba(51,94,247,.45)}
@keyframes cvl-gh{0%,100%{opacity:.08}50%{opacity:var(--o,.5)}}
.cvl-ghbg i{animation:cvl-gh var(--t,4s) ease-in-out var(--d,0s) infinite}
@media (prefers-reduced-motion:reduce){
  .cvl-words .cvl-wd,.cvl-steps .cvl-step{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
  .cvl-steps .cvl-line{transform:none!important;transition:none!important}
  .cvl-ic *,.cvl-ghbg i{animation:none!important}
  .cvl-card:hover{transform:none}
}
`;

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

/** Обёртка шагов: линия между кружками и поочерёдное появление карточек. */
export function CvSteps({ children }: { children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={"cvl-steps relative " + (inView ? "cvl-in" : "")}>
      {/* линия на уровне кружков, только на широком экране (там шаги в ряд) */}
      <div className="pointer-events-none absolute left-[42px] right-[calc((100%-32px)/3-42px)] top-[41px] z-[1] hidden h-[2px] md:block" aria-hidden="true">
        <div className="cvl-line h-full w-full rounded-full bg-[linear-gradient(90deg,#335EF7,#6A4BF5,#A63DF2)]" />
      </div>
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
  const rows = 7;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const r = ((i * 9301 + 49297) % 233280) / 233280;
    return { o: 0.2 + r * 0.5, t: 3 + (r * 5) % 4, d: (r * 7) % 6 };
  });
  return (
    <div className="cvl-ghbg pointer-events-none absolute inset-0 grid content-end gap-[5px] p-5 opacity-60" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {cells.map((c, i) => (
        <i key={i} className="block aspect-square rounded-[3px] bg-white" style={{ ["--o" as string]: c.o, ["--t" as string]: `${c.t}s`, ["--d" as string]: `${c.d}s`, opacity: 0.08 }} />
      ))}
    </div>
  );
}
