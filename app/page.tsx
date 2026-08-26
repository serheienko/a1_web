export const runtime = "nodejs";
export const revalidate = 15; // lowered from 60 — 2026-08-26, founder wants post
// updates to show up fast, not "up to a minute" later. ISR only re-fetches the
// origin once per window in the background regardless of visitor count, so this
// is cheap even at 15s. /api/revalidate exists for instant, event-driven
// invalidation once the backend's webhook (OPEN QUESTIONS #8) is wired up —
// this is the interim fix that does not depend on Andrew's timeline for that.

// app/page.tsx — the Jobs feed (post-job-employing), living at the site
// root as of 2026-08-26 per Aleksandr: no intermediate landing/chooser
// page, and no "jobs.jobs" duplication in the URL (the domain is already
// jobs.a1appp.com). This is what used to be app/jobs/page.tsx verbatim —
// app/jobs/page.tsx is now a permanent redirect to "/" (forwarding any
// filter query params) for old links/bookmarks. Talents is unaffected,
// still at /talents.

import type { Metadata } from "next";
import { fetchFeedPage, toURLSearchParams, parseFeedFilters, hasActiveFilters } from "@/lib/a1/feed";
import { PostCard } from "@/components/post-card";
import { LoadMore } from "@/components/load-more";
import { EmptyState } from "@/components/empty-state";
import { Filters } from "@/components/filters";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseFeedFilters(toURLSearchParams(await searchParams));
  const filtered = hasActiveFilters(filters);

  return {
    title: "Вакансии | A1 Jobs",
    description: "Актуальные вакансии от компаний и людей в приложении A1.",
    // Filtered/search views are noindex with a canonical back to the clean
    // feed URL (PLAN.md §3.1) — search-result-shaped pages shouldn't carry
    // JobPosting-adjacent signals into the index.
    alternates: { canonical: SITE_URL },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function HomePage({ searchParams }: Props) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const { posts, next, hasMore } = await fetchFeedPage("hiring", undefined, filters);
  const currentCategory = filters.categories?.[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-neutral-900 sm:text-4xl dark:text-neutral-50">Вакансии</h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">Актуальные вакансии от компаний и частных лиц в A1.</p>
      </header>

      <Filters
        kind="hiring"
        basePath="/"
        currentQuery={filters.q}
        currentCategory={currentCategory}
        currentTags={filters.tags ?? []}
      />

      {posts.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters(filters)
              ? "Ничего не нашлось. Попробуйте изменить фильтры."
              : "Пока нет открытых вакансий."
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
            kind="hiring"
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
