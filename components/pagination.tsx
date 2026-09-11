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
//
// 2026-09-11, phone screenshot (Aleksandr: "в мобильной версии это выдача
// десяти страниц чуть поломалась... не десять, а пять, и подсвечивать чуть
// более лёгким вариантом, не такой синей заливкой, прям яркой, потому что
// она конфликтует с кнопкой создать пост"):
//   - the phone row shows MOBILE_BLOCK numbers, and unlike the desktop
//     block it SLIDES with the current page (page 7 of 9 -> 5..9) instead
//     of jumping in fixed tens, so the current page is never off-screen
//     and the row never needs sideways scrolling;
//   - the current page is a light tinted chip like the "Вакансії" tab
//     rather than a saturated blue fill, which was competing with the
//     floating "+" button for attention;
//   - the whole nav gets bottom room on phones so the "Далі" arrow does
//     not come to rest underneath the floating chat / "+" buttons.
import Link from "next/link";
import { T } from "./t";

const PAGE_BLOCK = 10;
const MOBILE_BLOCK = 5;

/** The phone window: MOBILE_BLOCK pages centred on `page`, clamped to 1..totalPages. */
function mobilePages(page: number, totalPages: number): number[] {
  const size = Math.min(MOBILE_BLOCK, Math.max(1, totalPages));
  const half = Math.floor(size / 2);
  const start = Math.min(Math.max(1, page - half), Math.max(1, totalPages - size + 1));
  const out: number[] = [];
  for (let p = start; p < start + size && p <= totalPages; p++) out.push(p);
  return out;
}

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
    "min-w-9 rounded-lg bg-accent/10 px-2.5 py-1.5 text-center text-sm font-semibold text-accent dark:bg-white/10";

  const phonePages = mobilePages(page, Math.max(totalPages, page));

  return (
    <nav className="mt-8 flex flex-col items-center gap-4 pb-24 sm:pb-0" aria-label="Pagination">
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

      <div className="flex max-w-full flex-nowrap items-center justify-center gap-1 sm:hidden">
        {phonePages.map((p) =>
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
