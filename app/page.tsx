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
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { PostCard } from "@/components/post-card";
import { LoadMore } from "@/components/load-more";
import { EmptyState } from "@/components/empty-state";
import { Filters } from "@/components/filters";
import { T } from "@/components/t";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseFeedFilters(toURLSearchParams(await searchParams));
  const filtered = hasActiveFilters(filters);

  // 2026-08-28, per Aleksandr's review of the SEO copy ("Текст норм" —
  // approved as final): Ukrainian, matching the site's real default
  // (<html lang="uk">, see app/layout.tsx), not the Russian placeholder
  // this carried before. Also drops an earlier draft's mention of a
  // salary filter — there is no such filter (see components/filters.tsx),
  // and fixes "компаній і людей" -> "компаній і приватних осіб", which
  // reads oddly next to a company name.
  const title = "Вакансії | A1 Jobs";
  const description = "Актуальні вакансії від компаній та приватних осіб в A1 🐈‍⬛";

  return {
    title,
    description,
    // Filtered/search views are noindex with a canonical back to the clean
    // feed URL (PLAN.md §3.1) — search-result-shaped pages shouldn't carry
    // JobPosting-adjacent signals into the index.
    alternates: { canonical: SITE_URL },
    robots: filtered ? { index: false, follow: true } : undefined,
    // og:image comes from the sibling app/opengraph-image.tsx file
    // convention — Next merges it in automatically, no `images` needed
    // here (added 2026-08-28 alongside metadataBase in app/layout.tsx).
    openGraph: { title, description, url: SITE_URL, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage({ searchParams }: Props) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const { posts, next, hasMore } = await fetchFeedPage("hiring", undefined, filters);
  const currentCategory = filters.categories?.[0];
  // Real per-avatar blur (lib/avatar-blur.ts) instead of the generic
  // shared shimmer — see that file's comment for why this lives here
  // rather than inside PostCard itself.
  const avatarBlurs = await Promise.all(posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 sm:py-16">
      {/* Aleksandr, 2026-08-27: hide this heading block on mobile and
          pull the feed up — the tab bar in the nav already says which
          feed you're on, so on a small screen this was just dead space
          above the filters/cards. Desktop keeps it. */}
      <header className="mb-8 hidden sm:block">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellenangebote" es="Vacantes" fr="Offres d'emploi" pl="Oferty pracy" ptBR="Vagas" zh="职位" />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <T uk="Актуальні вакансії від компаній та приватних осіб в A1." en="Current job listings from companies and individuals on A1." ru="Актуальные вакансии от компаний и частных лиц в A1." de="Aktuelle Stellenangebote von Unternehmen und Privatpersonen auf A1." es="Vacantes actuales de empresas y particulares en A1." fr="Offres d'emploi actuelles d'entreprises et de particuliers sur A1." pl="Aktualne oferty pracy od firm i osób prywatnych na A1." ptBR="Vagas atuais de empresas e pessoas físicas na A1." zh="A1 上企业与个人发布的最新职位。" />
        </p>
      </header>

      <Filters
        kind="hiring"
        basePath="/"
        currentQuery={filters.q}
        currentCategory={currentCategory}
        currentTags={filters.tags ?? []}
        currentLocation={filters.location}
        currentLocationLabel={filters.locationLabel}
      />

      {posts.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters(filters) ? (
              <T uk="Нічого не знайшлося. Спробуйте змінити фільтри." en="Nothing found. Try changing the filters." ru="Ничего не нашлось. Попробуйте изменить фильтры." de="Nichts gefunden. Versuchen Sie, die Filter zu ändern." es="No se encontró nada. Prueba a cambiar los filtros." fr="Aucun résultat. Essayez de modifier les filtres." pl="Nic nie znaleziono. Spróbuj zmienić filtry." ptBR="Nada encontrado. Tente alterar os filtros." zh="未找到结果，请尝试更改筛选条件。" />
            ) : (
              <T uk="Поки немає відкритих вакансій." en="There are no open jobs yet." ru="Пока нет открытых вакансий." de="Es gibt noch keine offenen Stellenangebote." es="Todavía no hay vacantes abiertas." fr="Il n'y a pas encore d'offres d'emploi ouvertes." pl="Nie ma jeszcze żadnych otwartych ofert pracy." ptBR="Ainda não há vagas abertas." zh="目前还没有开放的职位。" />
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <li key={post.id}>
                <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} />
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
