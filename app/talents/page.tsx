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

import { fetchFeedPage, toURLSearchParams, parseFeedFilters, hasActiveFilters, pageToCursor, parsePageParam } from "@/lib/a1/feed";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { Filters } from "@/components/filters";
import { T } from "@/components/t";

// 2026-08-28: same pass as app/page.tsx — Ukrainian copy matching the
// site's real default, approved as final ("Текст норм"). Kept noindex
// (see the file header comment above) but still worth a good
// openGraph/twitter image: PLAN.md's OPEN QUESTIONS recommendation (b)
// is "publish, but noindex, so it works as a shareable link" — a
// shared link is exactly where the og:image below matters most.
const TALENTS_TITLE = "Фахівці | A1 Jobs";
const TALENTS_DESCRIPTION = "Люди, які шукають роботу або проєкти через A1 🪽";

export const metadata = {
  title: TALENTS_TITLE,
  description: TALENTS_DESCRIPTION,
  robots: { index: false, follow: true },
  // og:image comes from the sibling app/talents/opengraph-image.tsx file
  // convention — Next merges it in automatically.
  openGraph: { title: TALENTS_TITLE, description: TALENTS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TALENTS_TITLE, description: TALENTS_DESCRIPTION },
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TalentsPage({ searchParams }: Props) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const page = parsePageParam(params);
  const { posts, hasMore } = await fetchFeedPage("seeking", pageToCursor(page), filters);
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
          <T uk="Фахівці" en="Talents" ru="Специалисты" de="Fachkräfte" es="Especialistas" fr="Spécialistes" pl="Specjaliści" ptBR="Especialistas" zh="人才" />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <T uk="Знаходьте спеціалістів, та підсилюйте Вашу команду" en="Find specialists and strengthen your team" ru="Находите специалистов и усиливайте свою команду" de="Finden Sie Fachkräfte und stärken Sie Ihr Team" es="Encuentra especialistas y fortalece tu equipo" fr="Trouvez des spécialistes et renforcez votre équipe" pl="Znajdź specjalistów i wzmocnij swój zespół" ptBR="Encontre especialistas e fortaleça sua equipe" zh="寻找专业人才，壮大你的团队" />
        </p>
      </header>

      <Filters
        kind="seeking"
        basePath="/talents"
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
              <T uk="Поки немає відкритих анкет." en="There are no open talent profiles yet." ru="Пока нет открытых анкет." de="Es gibt noch keine offenen Talentprofile." es="Todavía no hay perfiles de talento abiertos." fr="Il n'y a pas encore de profils de talents ouverts." pl="Nie ma jeszcze żadnych otwartych profili talentów." ptBR="Ainda não há perfis de talentos abertos." zh="目前还没有可查看的人才资料。" />
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <li key={post.id}>
                <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} highlightQuery={filters.q} />
              </li>
            ))}
          </ul>
          <Pagination basePath="/talents" params={params} page={page} hasMore={hasMore} />
        </>
      )}
    </main>
  );
}
