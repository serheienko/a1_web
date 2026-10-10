// components/events/date-tile.tsx -- плитка даты в стиле Apple Music «Upcoming Concerts»:
// сверху красный месяц, снизу крупное число. Для ленты и страниц события.
import type { EvLang } from "@/lib/events/types";
import { dayNum, monthShort } from "@/lib/events/util";

export function DateTile({ start, lang, size = "md", past = false }: { start: string; lang: EvLang; size?: "md" | "lg"; past?: boolean }) {
  const lg = size === "lg";
  return (
    <span
      className={
        "flex shrink-0 flex-col items-center justify-center rounded-[14px] bg-white shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700 " +
        (lg ? "h-[84px] w-[76px]" : "h-[56px] w-[52px]") +
        (past ? " opacity-60" : "")
      }
    >
      <span className={"font-semibold uppercase leading-none text-rose-500 " + (lg ? "text-[13px]" : "text-[11px]")}>{monthShort(start, lang)}</span>
      <span className={"mt-0.5 font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-50 " + (lg ? "text-[38px]" : "text-[24px]")}>{dayNum(start)}</span>
    </span>
  );
}
