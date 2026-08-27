export const runtime = "nodejs";
export const revalidate = 15; // lowered from 60 — 2026-08-26, founder wants post
// updates to show up fast, not "up to a minute" later. ISR only re-fetches the
// origin once per window in the background regardless of visitor count, so this
// is cheap even at 15s. /api/revalidate exists for instant, event-driven
// invalidation once the backend's webhook (OPEN QUESTIONS #8) is wired up —
// this is the interim fix that does not depend on Andrew's timeline for that.

// app/talents/page.tsx — Talents feed (post-job-seeking). PLAN.md Phase 1,
// filters/search added in Phase 3.
//
// noindex per PLAN.md's OPEN QUESTIONS ("Still open — privacy of the
// Talents feed"): real people's names/photos/what-they're-looking-for
// should not be Google-indexed until the founder makes an explicit call.
// Recommendation (b) in the plan — publish, but noindex — is applied here
// as the safe default, independent of whether filters are active (this
// page is always noindex either way). Revisit once he decides.

import { fetchFeedPage, toURLSearchParams, parseFeedFilters, hasActiveFilters } from "@/lib/a1/feed";
import { PostCard } from "@/components/post-card";
import { LoadMore } from "@/components/load-more";
import { EmptyState } from "@/components/empty-state";
import { Filters } from "@/components/filters";
import { T } from "@/components/t";

export const metadata = {
  title: "Специалисты | A1 Jobs",
  description: "Специалисты, которые ищут работу — из приложения A1.",
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TalentsPage({ searchParams }: Props) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const { posts, next, hasMore } = await fetchFeedPage("seeking", undefined, filters);
  const currentCategory = filters.categories?.[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 sm:py-16">
      {/* Aleksandr, 2026-08-27: hide this heading block on mobile and
          pull the feed up — the tab bar in the nav already says which
          feed you're on, so on a small screen this was just dead space
          above the filters/cards. Desktop keeps it. */}
      <header className="mb-8 hidden sm:block">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T uk="Фахівці" ru="Специалисты" />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <T uk="Люди, які шукають роботу або проєкти через A1." ru="Люди, которые ищут работу или проекты через A1." />
        </p>
      </header>

      <Filters
        kind="seeking"
        basePath="/talents"
        currentQuery={filters.q}
        currentCategory={currentCategory}
        currentTags={filters.tags ?? []}
      />

      {posts.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters(filters) ? (
              <T uk="Нічого не знайшлося. Спробуйте змінити фільтри." ru="Ничего не нашлось. Попробуйте изменить фильтры." />
            ) : (
              <T uk="Поки немає відкритих анкет." ru="Пока нет открытых анкет." />
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          <LoadMore
            kind="seeking"
            initialCursor={next}
            initialHasMore={hasMore}
            query={filters.q}
            category={currentCategory}
            tags={filters.tags}
          />
        </>
      )}
    </main>
  );
}
