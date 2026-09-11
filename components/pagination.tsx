// components/pagination.tsx
//
// 2026-09-10 (Aleksandr: "страницы по двадцать... для лучшей навигации и
// удобства, ещё для SEO") -- replaces the old infinite-scroll "Load more"
// (components/load-more.tsx) on the main feed pages. Plain
// server-rendered <Link>s to `?page=N` instead of a client-side fetch:
// Google can actually crawl and index each page's own URL this way,
// which it can't do for content that only ever appears after a
// JS-driven scroll fetch.
//
// 2026-09-11 (Aleksandr, screenshot of the bare "Назад · 1 · Далі" row:
// "покажи тут цифрами 20 страниц 1 2 3 ... и тд, после 20-й меняй весь
// ряд на 20-40, выделенную показывай синим") -- real numbered pagination
// in blocks of PAGE_BLOCK: the row shows one block at a time, always
// clipped to the number of pages that actually exist (FeedPage.total,
// added to lib/a1/feed.ts for exactly this). The current page is a filled
// blue chip, never a link to itself.
//
// Same day, after seeing 20 numbers live ("хуйня вышла, давай лучше 10
// показывать снизу"): 20 chips wrapped onto a second line between the
// arrows and looked broken, so a block is 10 -- 1..10, then 11..20, and
// so on. The row is explicitly nowrap now: a block must never wrap, and
// on a narrow phone it scrolls sideways instead.
import Link from "next/link";
import { T } from "./t";

const PAGE_BLOCK = 10;

function pageHref(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.delete("page");
  if (page > 1) next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  hasMore,
  totalPages,
}: {
  basePath: string;
  // The current page's own searchParams (filters + page) -- reused
  // as-is so every link keeps whatever q/category/tag/location is active.
  params: URLSearchParams;
  page: number;
  hasMore: boolean;
  // Computed by the caller (it already has FeedPage.total and
  // FEED_PAGE_SIZE) so this file never imports lib/a1/feed.ts -- see the
  // note above the imports.
  totalPages: number;
}) {
  if (totalPages <= 1 && !hasMore) return null;

  const blockStart = Math.floor((Math.max(1, page) - 1) / PAGE_BLOCK) * PAGE_BLOCK + 1;
  const blockEnd = Math.min(blockStart + PAGE_BLOCK - 1, totalPages);
  const pages: number[] = [];
  for (let p = blockStart; p <= blockEnd; p++) pages.push(p);

  const arrowClass =
    "shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500";
  const arrowDisabledClass =
    "shrink-0 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-300 dark:border-neutral-800 dark:text-neutral-700";
  const numberClass =
    "min-w-9 rounded-lg px-2.5 py-1.5 text-center text-sm font-medium text-neutral-600 transition hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/[0.06]";
  const numberCurrentClass =
    "min-w-9 rounded-lg bg-[#335ef7] px-2.5 py-1.5 text-center text-sm font-semibold text-white dark:bg-[#0c8ce9]";

  return (
    <nav className="mt-8 flex flex-col items-center gap-4" aria-label="Pagination">
      <div className="flex w-full items-center justify-between gap-4">
        {page > 1 ? (
          <Link href={pageHref(basePath, params, page - 1)} className={arrowClass} rel="prev">
            <T uk="Назад" en="Back" ru="Назад" de="Zurück" es="Atrás" fr="Précédent" pl="Wstecz" ptBR="Voltar" zh="上一页" />
          </Link>
        ) : (
          <span className={arrowDisabledClass} aria-hidden="true">
            <T uk="Назад" en="Back" ru="Назад" de="Zurück" es="Atrás" fr="Précédent" pl="Wstecz" ptBR="Voltar" zh="上一页" />
          </span>
        )}

        {/* Numbers sit between the arrows on desktop and move to their own
            centred row on narrow screens -- a full block never fits on a
            phone next to both arrows. */}
        <div className="hidden flex-nowrap items-center justify-center gap-1 sm:flex">
          {pages.map((p) =>
            p === page ? (
              <span key={p} className={numberCurrentClass} aria-current="page">
                {p}
              </span>
            ) : (
              <Link key={p} href={pageHref(basePath, params, p)} className={numberClass}>
                {p}
              </Link>
            ),
          )}
        </div>

        {hasMore ? (
          <Link href={pageHref(basePath, params, page + 1)} className={arrowClass} rel="next">
            <T uk="Далі" en="Next" ru="Далее" de="Weiter" es="Siguiente" fr="Suivant" pl="Dalej" ptBR="Próximo" zh="下一页" />
          </Link>
        ) : (
          <span className={arrowDisabledClass} aria-hidden="true">
            <T uk="Далі" en="Next" ru="Далее" de="Weiter" es="Siguiente" fr="Suivant" pl="Dalej" ptBR="Próximo" zh="下一页" />
          </span>
        )}
      </div>

      <div className="flex max-w-full flex-nowrap items-center justify-center gap-1 overflow-x-auto sm:hidden">
        {pages.map((p) =>
          p === page ? (
            <span key={p} className={numberCurrentClass} aria-current="page">
              {p}
            </span>
          ) : (
            <Link key={p} href={pageHref(basePath, params, p)} className={numberClass}>
              {p}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
