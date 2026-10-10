// components/events/event-row.tsx -- строка ленты: плитка даты, название, место и дни, обложка справа.
import Link from "next/link";
import type { EvLang, EventItem } from "@/lib/events/types";
import { FORMAT_LABEL, eventPath, fmtRange, placeLabel, tagSlug, topicPath } from "@/lib/events/util";
import { DateTile } from "./date-tile";
import { EventCover } from "./event-cover";

export type ListEvent = Pick<EventItem, "slug" | "name" | "start" | "end" | "city" | "country" | "online" | "tags" | "image" | "price" | "free" | "format">;

export function EventRow({ e, lang, past = false, showTags = true }: { e: ListEvent; lang: EvLang; past?: boolean; showTags?: boolean }) {
  const meta = [placeLabel(e, lang), fmtRange(e.start, e.end, lang)].filter(Boolean).join(" · ");
  const price = e.free ? (lang === "uk" ? "Безкоштовно" : "Free") : e.price;
  return (
    <li className="border-b border-neutral-200/70 last:border-b-0 dark:border-neutral-800">
      <div className="group relative flex items-center gap-3 py-3 sm:gap-4">
        <DateTile start={e.start} lang={lang} past={past} />
        <div className="min-w-0 flex-1">
          <Link href={eventPath(e.slug, lang)} className="block text-[16px] font-semibold leading-snug text-neutral-900 after:absolute after:inset-0 hover:text-accent dark:text-neutral-50">
            {e.name}
          </Link>
          <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{meta}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{FORMAT_LABEL[e.format][lang]}</span>
            {price ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">{price}</span> : null}
            {showTags
              ? e.tags.slice(0, 3).map((t) => (
                  <Link key={t} href={topicPath(tagSlug(t), lang)} className="relative z-10 rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent hover:bg-accent/20">
                    {t}
                  </Link>
                ))
              : null}
          </span>
        </div>
        <EventCover src={e.image} name={e.name} seed={e.slug} className="h-14 w-14 shrink-0 rounded-xl sm:h-[72px] sm:w-[72px]" />
      </div>
    </li>
  );
}
