// components/news/news-thumb.tsx -- миниатюра новости для списка: тёмная карточка
// с главной цифрой и узором (точки или столбики). Чистая разметка, без картинок:
// грузится мгновенно, одинаково выглядит у любой новости, агент задаёт только thumb.
import type { NewsArticle } from "@/lib/news/types";

const DOT_COLS = 24;
const DOT_ROWS = 9;
// Детерминированно «разбросанные» подсвеченные точки (≈5 % от 216).
const LIT = new Set([7, 22, 41, 58, 77, 90, 109, 131, 148, 165, 187, 203]);
const BAR_H = [18, 26, 22, 38, 34, 52, 46, 64, 58, 78, 72, 92];

export function NewsThumb({ thumb, className = "" }: { thumb: NewsArticle["thumb"]; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        "relative block aspect-[16/10] overflow-hidden bg-[radial-gradient(120%_100%_at_15%_0%,#1b3a95_0%,#0a1240_50%,#03051f_100%)] " +
        className
      }
    >
      {thumb.motif === "dots" ? (
        <span className="absolute inset-x-[7%] top-[10%] grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${DOT_COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: DOT_COLS * DOT_ROWS }, (_, i) => {
            const on = LIT.has(i);
            return (
              <span
                key={i}
                className={"block aspect-square rounded-full " + (on ? "animate-pulse motion-reduce:animate-none" : "")}
                style={{
                  background: on ? "#7aa2ff" : "rgba(255,255,255,.14)",
                  boxShadow: on ? "0 0 7px 1px rgba(122,162,255,.85)" : "none",
                  animationDelay: on ? `${(i % 6) * 150}ms` : undefined,
                }}
              />
            );
          })}
        </span>
      ) : (
        <span className="absolute inset-x-[7%] top-[10%] flex h-[42%] items-end gap-[5px]">
          {BAR_H.map((h, i) => (
            <span key={i} className="block flex-1 rounded-t-[3px] bg-gradient-to-t from-[#2a78d6] to-[#7aa2ff]" style={{ height: `${h}%` }} />
          ))}
        </span>
      )}
      <span className="absolute inset-x-[7%] bottom-[9%] block">
        <span className="block text-[clamp(26px,5.2vw,40px)] font-bold leading-none tabular-nums text-white">{thumb.big}</span>
        <span className="mt-1 block text-[12px] leading-tight text-white/65">{thumb.small}</span>
      </span>
    </span>
  );
}
