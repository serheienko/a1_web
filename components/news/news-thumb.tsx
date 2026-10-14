// components/news/news-thumb.tsx -- миниатюра новости для списка: тёмная карточка
// с главной цифрой и узором. Чистая разметка, без картинок: грузится мгновенно.
// Чтобы список не выглядел одинаково, у новости есть узор (motif) и оттенок (hue).
//
// 11.10.2026 (Александр: «превьюшка везде одинаковая, скучно»). Агент почти всегда
// выбирал «bars» + синий, и список был из одинаковых карточек. Теперь узор и цвет
// выбираются от слага новости (хэш): у каждой новости свой, но стабильный, а uk- и
// en-версии одной новости выглядят одинаково. Выбор агента остаётся запасным.
import type { NewsArticle } from "@/lib/news/types";
import { thumbSvg } from "@/lib/news/thumb-art";


const HUES = {
  blue: { from: "#0e1a52", to: "#03051f", bg: "radial-gradient(120% 100% at 15% 0%,#1b3a95 0%,#0a1240 50%,#03051f 100%)", hi: "#7aa2ff", lo: "#2a78d6", glow: "122,162,255" },
  teal: { from: "#0a4a55", to: "#021c24", bg: "radial-gradient(120% 100% at 85% 0%,#0f6b6e 0%,#073a45 50%,#021c24 100%)", hi: "#5fe0d0", lo: "#1d9aa6", glow: "95,224,208" },
  violet: { from: "#33176f", to: "#0e0524", bg: "radial-gradient(120% 100% at 15% 0%,#5b2aa8 0%,#2a1163 50%,#0e0524 100%)", hi: "#c19bff", lo: "#7a46d6", glow: "193,155,255" },
  amber: { from: "#5a310a", to: "#1c0e02", bg: "radial-gradient(120% 100% at 85% 0%,#9a5a10 0%,#4d2a08 50%,#1c0e02 100%)", hi: "#ffc15e", lo: "#d98a1c", glow: "255,193,94" },
  green: { from: "#0f4a26", to: "#031a0c", bg: "radial-gradient(120% 100% at 15% 0%,#1d7a3a 0%,#0b3d1e 50%,#031a0c 100%)", hi: "#7bf0a0", lo: "#25a653", glow: "123,240,160" },
  orange: { from: "#6a2508", to: "#210a02", bg: "radial-gradient(120% 100% at 85% 0%,#b8420f 0%,#5c1f06 50%,#210a02 100%)", hi: "#ff9a62", lo: "#e0561c", glow: "255,154,98" },
  rose: { from: "#5e1236", to: "#1c0511", bg: "radial-gradient(120% 100% at 15% 0%,#a3205a 0%,#4f0e2e 50%,#1c0511 100%)", hi: "#ff8fc0", lo: "#d6407f", glow: "255,143,192" },
  red: { from: "#66101a", to: "#210306", bg: "radial-gradient(120% 100% at 85% 0%,#b3202a 0%,#560e14 50%,#210306 100%)", hi: "#ff7a80", lo: "#e0343e", glow: "255,122,128" },
  cyan: { from: "#0a4570", to: "#021626", bg: "radial-gradient(120% 100% at 15% 0%,#0d6fa8 0%,#08395c 50%,#021626 100%)", hi: "#6fd3ff", lo: "#1f9ae0", glow: "111,211,255" },
  lime: { from: "#35520b", to: "#101a02", bg: "radial-gradient(120% 100% at 85% 0%,#5f8a12 0%,#2c4309 50%,#101a02 100%)", hi: "#c8f26b", lo: "#8cc21f", glow: "200,242,107" },
} as const;

type Hue = keyof typeof HUES;
const HUE_ORDER: Hue[] = ["blue", "green", "violet", "orange", "red", "teal", "rose", "amber", "cyan", "lime"];

function hashOf(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}

/** Цвета блоков внутри новости (summary, цифры, графики): тот же оттенок, что у миниатюры в списке. Кладётся в style обёртки статьи как CSS-переменные. */
export function newsThemeVars(seed: string, given?: string): Record<string, string> {
  const k = hashOf(seed.replace(/-en$/, ""));
  const key = (HUE_ORDER[k % HUE_ORDER.length] ?? (given as Hue) ?? "blue") as Hue;
  const h = HUES[key];
  return { "--nv-from": h.from, "--nv-to": h.to, "--nv-hi": h.hi, "--nv-lo": h.lo, "--nv-glow": h.glow };
}

// compact -- маленькая миниатюра в списке. 14.10.2026 (Александр, скрин с телефона): на мобильном она
// 112 px в ширину, и цифра с подписью налезали на узор -- выглядело как поломка. Там текст прячем,
// остаётся только узор с цветом; с ширины sm (640 px) текст снова виден.
//
// 14.10.2026 (Александр: «всего четыре узора, однотипно»). Рисунок теперь из lib/news/thumb-art.ts:
// 26 узоров в тему рубрики × 10 оттенков × случайные детали от слага. Та же обложка -- в картинке для
// соцсетей и Google (app/news/[slug]/opengraph-image.tsx).
export function NewsThumb({ thumb, className = "", seed, kicker = "", compact = false }: { thumb: NewsArticle["thumb"]; className?: string; seed?: string; kicker?: string; compact?: boolean }) {
  const svg = thumbSvg(seed ?? thumb.big ?? "a1", kicker);
  return (
    <span aria-hidden="true" className={"relative block aspect-[16/10] overflow-hidden bg-[#03051f] " + className}>
      <span className="absolute inset-0 block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="absolute inset-x-0 bottom-0 block h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <span className={"absolute inset-x-[7%] bottom-[9%] " + (compact ? "hidden sm:block" : "block")}>
        <span className="block text-[clamp(18px,3.2vw,34px)] font-bold leading-none tabular-nums text-white">{thumb.big}</span>
        <span className="mt-1 block text-[12px] leading-tight text-white/65">{thumb.small}</span>
      </span>
    </span>
  );
}
