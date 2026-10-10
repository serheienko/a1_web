// components/news/news-thumb.tsx -- миниатюра новости для списка: тёмная карточка
// с главной цифрой и узором. Чистая разметка, без картинок: грузится мгновенно.
// Чтобы список не выглядел одинаково, у новости есть узор (motif) и оттенок (hue).
//
// 11.10.2026 (Александр: «превьюшка везде одинаковая, скучно»). Агент почти всегда
// выбирал «bars» + синий, и список был из одинаковых карточек. Теперь узор и цвет
// выбираются от слага новости (хэш): у каждой новости свой, но стабильный, а uk- и
// en-версии одной новости выглядят одинаково. Выбор агента остаётся запасным.
import type { NewsArticle } from "@/lib/news/types";

const DOT_COLS = 24;
const DOT_ROWS = 9;
const LIT = new Set([7, 22, 41, 58, 77, 90, 109, 131, 148, 165, 187, 203]);
const BAR_H = [18, 26, 22, 38, 34, 52, 46, 64, 58, 78, 72, 92];
const SPARK = [62, 58, 64, 52, 56, 44, 48, 36, 40, 28, 30, 16];

const HUES = {
  blue: { bg: "radial-gradient(120% 100% at 15% 0%,#1b3a95 0%,#0a1240 50%,#03051f 100%)", hi: "#7aa2ff", lo: "#2a78d6", glow: "122,162,255" },
  teal: { bg: "radial-gradient(120% 100% at 85% 0%,#0f6b6e 0%,#073a45 50%,#021c24 100%)", hi: "#5fe0d0", lo: "#1d9aa6", glow: "95,224,208" },
  violet: { bg: "radial-gradient(120% 100% at 15% 0%,#5b2aa8 0%,#2a1163 50%,#0e0524 100%)", hi: "#c19bff", lo: "#7a46d6", glow: "193,155,255" },
  amber: { bg: "radial-gradient(120% 100% at 85% 0%,#9a5a10 0%,#4d2a08 50%,#1c0e02 100%)", hi: "#ffc15e", lo: "#d98a1c", glow: "255,193,94" },
  green: { bg: "radial-gradient(120% 100% at 15% 0%,#1d7a3a 0%,#0b3d1e 50%,#031a0c 100%)", hi: "#7bf0a0", lo: "#25a653", glow: "123,240,160" },
  orange: { bg: "radial-gradient(120% 100% at 85% 0%,#b8420f 0%,#5c1f06 50%,#210a02 100%)", hi: "#ff9a62", lo: "#e0561c", glow: "255,154,98" },
  rose: { bg: "radial-gradient(120% 100% at 15% 0%,#a3205a 0%,#4f0e2e 50%,#1c0511 100%)", hi: "#ff8fc0", lo: "#d6407f", glow: "255,143,192" },
} as const;

type Hue = keyof typeof HUES;
const HUE_ORDER: Hue[] = ["blue", "green", "violet", "orange", "teal", "rose", "amber"];
const MOTIF_ORDER = ["bars", "dots", "spark", "rings"] as const;

function hashOf(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}

export function NewsThumb({ thumb: given, className = "", seed }: { thumb: NewsArticle["thumb"]; className?: string; seed?: string }) {
  // seed -- слаг новости; «-en» отрезаем, чтобы пара uk/en выглядела одинаково
  const k = seed ? hashOf(seed.replace(/-en$/, "")) : null;
  const thumb = k === null ? given : { ...given, hue: HUE_ORDER[k % HUE_ORDER.length], motif: MOTIF_ORDER[(k >>> 8) % MOTIF_ORDER.length] };
  const h = HUES[(thumb.hue as Hue) ?? "blue"];
  return (
    <span aria-hidden="true" className={"relative block aspect-[16/10] overflow-hidden " + className} style={{ background: h.bg }}>
      {thumb.motif === "dots" ? (
        <span className="absolute inset-x-[7%] top-[10%] grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${DOT_COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: DOT_COLS * DOT_ROWS }, (_, i) => {
            const on = LIT.has(i);
            return (
              <span
                key={i}
                className={"block aspect-square rounded-full " + (on ? "animate-pulse motion-reduce:animate-none" : "")}
                style={{
                  background: on ? h.hi : "rgba(255,255,255,.14)",
                  boxShadow: on ? `0 0 7px 1px rgba(${h.glow},.85)` : "none",
                  animationDelay: on ? `${(i % 6) * 150}ms` : undefined,
                }}
              />
            );
          })}
        </span>
      ) : thumb.motif === "bars" ? (
        <span className="absolute inset-x-[7%] top-[8%] flex h-[24%] items-end gap-[5px]">
          {BAR_H.map((v, i) => (
            <span key={i} className="block flex-1 rounded-t-[3px]" style={{ height: `${v}%`, background: `linear-gradient(to top,${h.lo},${h.hi})` }} />
          ))}
        </span>
      ) : thumb.motif === "spark" ? (
        <svg className="absolute inset-x-[7%] top-[9%] h-[34%] w-[86%]" viewBox="0 0 110 70" preserveAspectRatio="none">
          <polyline fill="none" stroke={h.hi} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={SPARK.map((v, i) => `${i * 10},${v}`).join(" ")} />
          <circle cx="110" cy={SPARK[SPARK.length - 1]} r="3.2" fill={h.hi} />
        </svg>
      ) : (
        <span className="absolute right-[8%] top-[8%] block h-[44%] aspect-square">
          {[100, 72, 44].map((p, i) => (
            <span key={i} className="absolute inset-0 m-auto block rounded-full border-2" style={{ width: `${p}%`, height: `${p}%`, borderColor: h.hi, opacity: 0.35 + i * 0.3 }} />
          ))}
        </span>
      )}
      <span className="absolute inset-x-[7%] bottom-[9%] block">
        <span className="block text-[clamp(18px,3.2vw,34px)] font-bold leading-none tabular-nums text-white">{thumb.big}</span>
        <span className="mt-1 block text-[12px] leading-tight text-white/65">{thumb.small}</span>
      </span>
    </span>
  );
}
