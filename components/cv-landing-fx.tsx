// components/cv-landing-fx.tsx -- «движуха» страницы CV Builder (28.10.2026).
//
// Александр выбрал все четыре идеи:
//  1. CV собирается на глазах: на первом экране живой лист (HTML, не картинка),
//     фото проявляется, имя печатается, полоски навыков растут, квадратики
//     GitHub загораются, в конце «печатается» QR.
//  2. Лист следит за мышкой: лёгкий 3D-наклон и блик, как у глянцевой карточки.
//  3. Скан QR телефоном: телефон наезжает на QR, на экране открывается профиль
//     с играющим голосовым.
//  4. Сравнение оживает: при прокрутке строки получают галочки у A1 и
//     зачёркивания у «типичного конструктора».
// Всё на CSS + два маленьких обработчика (наклон и «вошло в экран»).
// prefers-reduced-motion: всё сразу в конечном виде, без движения.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cvText } from "@/lib/cv/i18n";
import type { CvLang } from "@/lib/cv/detect-lang";

export const CV_FX_CSS = `
@keyframes cvl-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes cvl-pop{0%{opacity:0;transform:scale(.6)}70%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes cvl-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes cvl-caret{50%{border-color:transparent}}
@keyframes cvl-bar{from{width:0}}
@keyframes cvl-cell{from{background:#EDF0FA}}
@keyframes cvl-print{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes cvl-scanline{0%,100%{top:8%}50%{top:88%}}
@keyframes cvl-phone{0%,12%{transform:translate(78%,30%) rotate(10deg)}30%,78%{transform:translate(8%,2%) rotate(-3deg)}92%,100%{transform:translate(78%,30%) rotate(10deg)}}
@keyframes cvl-screen{0%,30%{opacity:0}38%,76%{opacity:1}84%,100%{opacity:0}}
@keyframes cvl-flash{0%,29%{opacity:0}31%{opacity:.85}38%,100%{opacity:0}}
@keyframes cvl-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes cvl-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes cvl-gradmove{to{background-position:300% 0}}
.cvl-grad{background:linear-gradient(90deg,#335EF7,#6A4BF5,#A63DF2,#6A4BF5,#335EF7);background-size:300% 100%;animation:cvl-gradmove 6s linear infinite}
@keyframes cvl-strike{from{background-size:0 2px}to{background-size:100% 2px}}
.cvl-sheet .cvl-a{opacity:0;animation:cvl-fade .55s cubic-bezier(.2,.8,.2,1) forwards}
.cvl-sheet .cvl-photo{opacity:0;animation:cvl-pop .6s cubic-bezier(.2,.8,.2,1) forwards}
.cvl-sheet .cvl-name{display:inline-block;clip-path:inset(0 100% 0 0);animation:cvl-type .9s steps(9,end) .45s forwards}
.cvl-sheet .cvl-bar{animation:cvl-bar 1s cubic-bezier(.2,.8,.2,1) both}
.cvl-sheet .cvl-cell{animation:cvl-cell .5s ease-out both}
.cvl-sheet .cvl-qr{clip-path:inset(0 0 100% 0);animation:cvl-print 1.1s steps(12,end) 2.6s forwards}
.cvl-tilt{transform:perspective(1100px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out;will-change:transform}
.cvl-glare{background:radial-gradient(circle at var(--gx,50%) var(--gy,0%),rgba(255,255,255,.45),transparent 45%);opacity:var(--go,0);transition:opacity .3s}
.cvl-phone{animation:cvl-phone 6s cubic-bezier(.45,.05,.25,1) infinite}
.cvl-screen{animation:cvl-screen 6s linear infinite}
.cvl-flash{animation:cvl-flash 6s linear infinite}
.cvl-scan{animation:cvl-scanline 1.6s ease-in-out infinite}
.cvl-w{transform-origin:bottom;animation:cvl-wave .9s ease-in-out infinite}
.cvl-row .cvl-check path{stroke-dasharray:24;stroke-dashoffset:24}
.cvl-row.cvl-in .cvl-check path{animation:cvl-draw .45s ease-out forwards;animation-delay:var(--d,0s)}
.cvl-row .cvl-them{background:linear-gradient(currentColor,currentColor) no-repeat 0 55%/0 2px}
.cvl-row.cvl-in .cvl-them{animation:cvl-strike .45s ease-out forwards;animation-delay:calc(var(--d,0s) + .2s)}
.cvl-row .cvl-us{opacity:.25;transition:opacity .4s}
.cvl-row.cvl-in .cvl-us{opacity:1;transition-delay:var(--d,0s)}
@media (prefers-reduced-motion:reduce){
  .cvl-grad,.cvl-sheet *,.cvl-phone,.cvl-screen,.cvl-flash,.cvl-scan,.cvl-w,.cvl-row *{animation:none!important;transition:none!important;opacity:1!important;clip-path:none!important}
  .cvl-row .cvl-check path{stroke-dashoffset:0}
  .cvl-row .cvl-them{background-size:100% 2px}
  .cvl-tilt{transform:none!important}
}
`;

/** Наклон за мышкой + блик. На телефоне (без наведения) ничего не делает. */
export function CvTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.style.setProperty("--go", "1");
    };
    const leave = () => {
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--go", "0");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div ref={ref} className={"cvl-tilt relative " + (className ?? "")}>
      {children}
      <div className="cvl-glare pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" />
    </div>
  );
}

/** Добавляет .cvl-in, когда элемент показался на экране (один раз). */
export function CvReveal({ children, className, as = "tr", delay }: { children: ReactNode; className?: string; as?: "tr" | "div"; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("cvl-in");
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const style = delay !== undefined ? ({ "--d": `${delay}s` } as React.CSSProperties) : undefined;
  if (as === "div")
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className={"cvl-row " + (className ?? "")} style={style}>
        {children}
      </div>
    );
  return (
    <tr ref={ref as React.RefObject<HTMLTableRowElement>} className={"cvl-row " + (className ?? "")} style={style}>
      {children}
    </tr>
  );
}

export function CvCheck() {
  return (
    <svg className="cvl-check inline-block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const HEAT = ["#EDF0FA", "#C7D2FB", "#8FA3F8", "#335EF7", "#2840B8"];
const SKILLS: [string, number][] = [
  ["TypeScript", 92],
  ["Flutter", 88],
  ["System design", 81],
  ["Rust", 64],
];

/** Живой лист резюме Mr. Kit на первом экране. Размеры -- в долях ширины (cqw). */
export function HeroCv({ lang, alt }: { lang: CvLang; alt: string }) {
  const t = (k: Parameters<typeof cvText>[1]) => cvText(lang, k);
  const cells = Array.from({ length: 16 * 7 }, (_, i) => [0, 1, 2, 3, 4, 2, 1, 3, 0, 2, 4, 1][(i * 7 + (i % 5)) % 12]);
  const H = (s: string) => (
    <div style={{ fontSize: "2.4cqw", fontWeight: 700, color: "#335EF7", textTransform: "uppercase", marginBottom: "1.6cqw" }}>{s}</div>
  );
  return (
    <div role="img" aria-label={alt} className="cvl-sheet relative w-full overflow-hidden rounded-2xl bg-white text-[#141A33] shadow-[0_30px_60px_-20px_rgba(20,16,80,0.45)] ring-1 ring-black/5" style={{ containerType: "inline-size", aspectRatio: "794 / 1123", fontFamily: "inherit" }}>
      {/* шапка */}
      <div className="flex items-center" style={{ background: "linear-gradient(120deg,#335EF7 0%,#6A4BF5 55%,#A63DF2 100%)", padding: "5cqw 5.5cqw 4.5cqw", gap: "3.4cqw", color: "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spivbesida/mr-kit-avatar.webp" alt="" className="cvl-photo shrink-0 rounded-full object-cover" style={{ width: "17cqw", height: "17cqw", border: "0.7cqw solid rgba(255,255,255,.9)", animationDelay: ".1s" }} />
        <div className="min-w-0 flex-1">
          <div className="cvl-a" style={{ fontSize: "1.7cqw", fontWeight: 600, opacity: 0.85, textTransform: "uppercase", animationDelay: ".3s" }}>{t("resumeFrom")}</div>
          <div style={{ fontSize: "5.4cqw", fontWeight: 800, lineHeight: 1.05, marginTop: ".6cqw" }}>
            <span className="cvl-name">Mr. Kit</span>
          </div>
          <div className="cvl-a" style={{ fontSize: "2.4cqw", fontWeight: 600, marginTop: ".6cqw", animationDelay: "1.2s" }}>Chief Mascot Officer · A1</div>
          <div className="cvl-a flex flex-wrap" style={{ gap: "1cqw", marginTop: "1.4cqw", animationDelay: "1.4s" }}>
            {["Neptune", "▶ " + t("listen")].map((c) => (
              <span key={c} style={{ fontSize: "1.65cqw", fontWeight: 500, padding: ".6cqw 1.4cqw", borderRadius: 999, background: "rgba(255,255,255,.18)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-center">
          <div style={{ background: "#fff", borderRadius: "2cqw", padding: "1.1cqw" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cv-builder/qr-mrkit.png" alt="" className="cvl-qr block" style={{ width: "12.5cqw", height: "12.5cqw" }} />
          </div>
          <div className="cvl-a" style={{ fontSize: "1.35cqw", fontWeight: 600, marginTop: ".8cqw", lineHeight: 1.25, animationDelay: "3.4s" }}>
            {t("interactive1")}
            <br />
            {t("interactive2")}
          </div>
        </div>
      </div>

      {/* плитки */}
      <div className="grid grid-cols-3" style={{ gap: "1.3cqw", padding: "2.8cqw 5.5cqw 0" }}>
        <div className="cvl-a" style={{ border: "1px solid #E2E6F5", borderRadius: "2cqw", padding: "1.7cqw", animationDelay: "1.6s" }}>
          <div style={{ fontSize: "1.5cqw", color: "#5A6180" }}>
            <b style={{ fontSize: "2.8cqw", color: "#141A33", marginRight: ".8cqw" }}>261</b>GitHub
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(16,1fr)", gridAutoRows: "1fr", gap: ".25cqw", marginTop: "1.2cqw" }}>
            {cells.map((lv, i) => (
              <span key={i} className="cvl-cell block" style={{ aspectRatio: "1", borderRadius: ".2cqw", background: HEAT[lv ?? 0], animationDelay: `${1.7 + (i % 16) * 0.05}s` }} />
            ))}
          </div>
        </div>
        <div className="cvl-a" style={{ border: "1px solid #E2E6F5", borderRadius: "2cqw", padding: "1.7cqw", animationDelay: "1.8s" }}>
          <div style={{ fontSize: "1.5cqw", color: "#5A6180" }}>
            <b style={{ fontSize: "2.8cqw", color: "#141A33", marginRight: ".8cqw" }}>12</b>Dribbble
          </div>
          <div className="flex" style={{ gap: ".8cqw", marginTop: "1.2cqw" }}>
            {["a1-run", "a1-map", "a1-app"].map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s} src={`/spivbesida/shots/${s}.webp`} alt="" className="min-w-0 flex-1 object-cover" style={{ height: "7.6cqw", borderRadius: "1cqw" }} />
            ))}
          </div>
        </div>
        <div className="cvl-a" style={{ border: "1px solid #E2E6F5", borderRadius: "2cqw", padding: "1.7cqw", animationDelay: "2s" }}>
          <div style={{ fontSize: "1.5cqw", color: "#5A6180" }}>
            <b style={{ fontSize: "2.8cqw", color: "#141A33", marginRight: ".8cqw" }}>1 240</b>Stack Overflow
          </div>
          <div className="flex" style={{ gap: "1.4cqw", marginTop: "1.4cqw", fontSize: "1.6cqw", fontWeight: 700 }}>
            {[
              ["#ffcc01", 3],
              ["#b4b8bc", 12],
              ["#d1a684", 40],
            ].map(([c, n]) => (
              <span key={String(c)} className="flex items-center" style={{ gap: ".5cqw" }}>
                <i className="block rounded-full" style={{ width: "1.2cqw", height: "1.2cqw", background: String(c) }} />
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* колонки */}
      <div className="grid" style={{ gridTemplateColumns: "1.45fr 1fr", gap: "4.2cqw", padding: "3cqw 5.5cqw 0" }}>
        <div>
          <div className="cvl-a" style={{ animationDelay: "2.1s" }}>
            {H(t("about"))}
            <div style={{ height: "1.3cqw", background: "#E8EBF6", borderRadius: 4, width: "100%" }} />
            <div style={{ height: "1.3cqw", background: "#E8EBF6", borderRadius: 4, width: "92%", marginTop: "1cqw" }} />
            <div style={{ height: "1.3cqw", background: "#E8EBF6", borderRadius: 4, width: "70%", marginTop: "1cqw" }} />
          </div>
          <div className="cvl-a" style={{ marginTop: "3.4cqw", animationDelay: "2.3s" }}>
            {H(t("experience"))}
            {["A1", "A1 Run"].map((c, i) => (
              <div key={c} className="flex" style={{ gap: "1.6cqw", marginBottom: "2cqw" }}>
                <span className="flex shrink-0 items-center justify-center" style={{ width: "3.6cqw", height: "3.6cqw", borderRadius: "1cqw", background: "#F2F4FD", border: "1px solid #E2E6F5", fontSize: "1.6cqw", fontWeight: 800, color: "#335EF7" }}>
                  A
                </span>
                <div className="flex-1">
                  <div style={{ fontSize: "1.9cqw", fontWeight: 700 }}>{c}</div>
                  <div style={{ fontSize: "1.5cqw", color: "#5A6180" }}>{i ? "2024" : "2023"} – {t("present")}</div>
                  <div style={{ height: "1.1cqw", background: "#E8EBF6", borderRadius: 4, width: "85%", marginTop: ".9cqw" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="cvl-a" style={{ marginTop: "2.4cqw", animationDelay: "2.9s" }}>
            {H(t("education"))}
            <div style={{ fontSize: "1.8cqw", fontWeight: 600 }}>Nap Academy · PhD</div>
          </div>
          <div className="cvl-a" style={{ marginTop: "3.2cqw", animationDelay: "3.1s" }}>
            {H(t("favorites"))}
            {[
              [t("books"), "Clean Code"],
              [t("movies"), "The Matrix"],
              [t("games"), "Stray, A1 Run"],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: "1.6cqw", lineHeight: 1.6 }}>
                <span style={{ color: "#5A6180" }}>{k}: </span>
                {v}
              </div>
            ))}
          </div>
        </div>
        <div>
        <div className="cvl-a" style={{ animationDelay: "2.2s" }}>
          {H(t("skills"))}
          {SKILLS.map(([n, v], i) => (
            <div key={n} style={{ marginBottom: "1.5cqw" }}>
              <div className="flex justify-between" style={{ fontSize: "1.6cqw", fontWeight: 600 }}>
                <span>{n}</span>
                <span style={{ color: "#5A6180", fontWeight: 500 }}>{v}%</span>
              </div>
              <div style={{ height: ".9cqw", borderRadius: 4, background: "#EDF0FA", marginTop: ".6cqw" }}>
                <div className="cvl-bar" style={{ height: "100%", borderRadius: 4, width: `${v}%`, background: v >= 85 ? "#6A4BF5" : "#335EF7", animationDelay: `${2.3 + i * 0.12}s` }} />
              </div>
            </div>
          ))}
        </div>
          <div className="cvl-a" style={{ marginTop: "2.6cqw", animationDelay: "3s" }}>
            {H(t("languages"))}
            {[5, 4, 2].map((lv, i) => (
              <div key={i} className="flex items-center justify-between" style={{ marginBottom: "1cqw" }}>
                <span style={{ height: "1.2cqw", width: ["42%", "34%", "38%"][i], background: "#E8EBF6", borderRadius: 4 }} />
                <span className="flex" style={{ gap: ".5cqw" }}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <i key={d} className="block rounded-full" style={{ width: "1.1cqw", height: "1.1cqw", background: d <= lv ? "#335EF7" : "#DDE2F2" }} />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="cvl-a" style={{ marginTop: "2.6cqw", animationDelay: "3.2s" }}>
            {H(t("hobbies"))}
            <div className="flex flex-wrap" style={{ gap: ".8cqw" }}>
              {[9, 13, 7, 11].map((w, i) => (
                <span key={i} style={{ height: "3cqw", width: `${w}cqw`, borderRadius: 999, background: "#EEF1FE" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* низ листа */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between" style={{ padding: "2cqw 5.5cqw", borderTop: "1px solid #E8EBF6", fontSize: "1.55cqw", color: "#5A6180" }}>
        <span>{t("createdIn")}</span>
        <span style={{ color: "#335EF7", fontWeight: 600 }}>jobs.a1appp.com/u/mrkit</span>
      </div>
    </div>
  );
}

/** Телефон сканирует QR резюме и открывает живой профиль с голосовым. */
export function QrScanDemo({ label }: { label: string }) {
  return (
    <div className="relative h-[260px] overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#EEF1FE,#F6EEFF)] dark:bg-[linear-gradient(135deg,#141a3a,#22123a)]" aria-hidden="true">
      {/* кусок резюме с QR */}
      <div className="absolute left-6 top-6 w-[150px] rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
        <div className="h-2 w-16 rounded-full bg-[#335EF7]/70" />
        <div className="mt-2 h-1.5 w-24 rounded-full bg-neutral-200" />
        <div className="relative mt-3 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cv-builder/qr-mrkit.png" alt="" className="block w-full" />
        </div>
      </div>
      {/* телефон */}
      <div className="cvl-phone absolute left-[34%] top-6 h-[220px] w-[118px] rounded-[22px] bg-[#141A33] p-[5px] shadow-2xl">
        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-[#0b1030]">
          <div className="cvl-scan absolute inset-x-3 h-0.5 rounded-full bg-[#4ade80] shadow-[0_0_12px_#4ade80]" />
          <div className="cvl-flash absolute inset-0 bg-white" />
          <div className="cvl-screen absolute inset-0 flex flex-col items-center bg-white px-2 pt-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spivbesida/mr-kit-avatar.webp" alt="" className="h-11 w-11 rounded-full object-cover" />
            <div className="mt-1.5 text-[10px] font-bold text-[#141A33]">Mr. Kit</div>
            <div className="text-[7.5px] text-neutral-500">Chief Mascot Officer</div>
            <div className="mt-2 flex w-full items-center gap-1 rounded-full bg-[#EEF1FE] px-1.5 py-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#335EF7]">
                <svg width="6" height="6" viewBox="0 0 12 12"><path d="M3 2l7 4-7 4z" fill="#fff" /></svg>
              </span>
              <span className="flex h-3 flex-1 items-end gap-[2px]">
                {[0.2, 0.5, 0.1, 0.35, 0.6, 0.25, 0.45, 0.15, 0.55, 0.3].map((d, i) => (
                  <i key={i} className="cvl-w block w-[2px] flex-1 rounded-full bg-[#335EF7]" style={{ height: "100%", animationDelay: `${d}s` }} />
                ))}
              </span>
            </div>
            <div className="mt-2 grid w-full grid-cols-2 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-5 rounded-md bg-neutral-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-6 right-6 text-[13px] font-semibold text-[#2840B8] dark:text-[#b9c6ff]">{label}</div>
    </div>
  );
}
