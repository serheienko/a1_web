// components/pagination.tsx
//
// 2026-09-10 (Aleksandr: "страницы по двадцать... для лучшей навигации и
// удобства, ещё для SEO") -- replaces the old infinite-scroll "Load more"
// (components/load-more.tsx) on the main feed pages. Plain
// server-rendered <Link>s to `?page=N` instead of a client-side fetch:
// Google can actually crawl and index each page's own URL this way,
// which it can't do for content that only ever appears after a
// JS-driven scroll fetch.
import Link from "next/link";
import { T } from "./t";

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
}: {
  basePath: string;
  // The current page's own searchParams (filters + page) -- reused
  // as-is so Prev/Next keep whatever q/category/tag/location is active.
  params: URLSearchParams;
  page: number;
  hasMore: boolean;
}) {
  if (page <= 1 && !hasMore) return null;

  const linkClass =
    "rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500";
  const disabledClass =
    "rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-300 dark:border-neutral-800 dark:text-neutral-700";

  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={pageHref(basePath, params, page - 1)} className={linkClass}>
          <T uk="Назад" en="Back" ru="Назад" de="Zurück" es="Atrás" fr="Précédent" pl="Wstecz" ptBR="Voltar" zh="上一页" />
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          <T uk="Назад" en="Back" ru="Назад" de="Zurück" es="Atrás" fr="Précédent" pl="Wstecz" ptBR="Voltar" zh="上一页" />
        </span>
      )}

      <span className="text-sm text-neutral-500 dark:text-neutral-400">{page}</span>

      {hasMore ? (
        <Link href={pageHref(basePath, params, page + 1)} className={linkClass}>
          <T uk="Далі" en="Next" ru="Далее" de="Weiter" es="Siguiente" fr="Suivant" pl="Dalej" ptBR="Próximo" zh="下一页" />
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          <T uk="Далі" en="Next" ru="Далее" de="Weiter" es="Siguiente" fr="Suivant" pl="Dalej" ptBR="Próximo" zh="下一页" />
        </span>
      )}
    </nav>
  );
}
