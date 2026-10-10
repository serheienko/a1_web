// components/events/paged-list.tsx -- список событий по 20 на страницу (страницы-подборки: серия, тема, место).
// Первая страница рисуется на сервере обычными ссылками; остальные события доступны через sitemap и подборки.
"use client";

import { useRef, useState } from "react";
import type { EvLang } from "@/lib/events/types";
import { EventRow, type ListEvent } from "./event-row";
import { Pager } from "./pager";

export const PER_PAGE = 20;

export function PagedList({ events, lang, past = false, showTags = true }: { events: ListEvent[]; lang: EvLang; past?: boolean; showTags?: boolean }) {
  const [page, setPage] = useState(1);
  const top = useRef<HTMLUListElement>(null);
  const pages = Math.max(1, Math.ceil(events.length / PER_PAGE));
  const slice = events.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <>
      <ul ref={top} className="mt-2 scroll-mt-24">
        {slice.map((e) => (
          <EventRow key={e.slug} e={e} lang={lang} past={past} showTags={showTags} />
        ))}
      </ul>
      <Pager page={page} pages={pages} onPage={(p) => { setPage(p); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
    </>
  );
}
