export const runtime = "nodejs";
export const revalidate = 60;

// app/talents/page.tsx — Talents feed (post-job-seeking). PLAN.md Phase 1.
//
// noindex per PLAN.md's OPEN QUESTIONS ("Still open — privacy of the
// Talents feed"): real people's names/photos/what-they're-looking-for
// should not be Google-indexed until the founder makes an explicit call.
// Recommendation (b) in the plan — publish, but noindex — is applied here
// as the safe default. Revisit once he decides.

import { fetchFeedPage } from "@/lib/a1/feed";
import { PostCard } from "@/components/post-card";
import { LoadMore } from "@/components/load-more";
import { EmptyState } from "@/components/empty-state";

export const metadata = {
  title: "Специалисты | A1 Jobs",
  description: "Специалисты, которые ищут работу — из приложения A1.",
  robots: { index: false, follow: true },
};

export default async function TalentsPage() {
  const { posts, next, hasMore } = await fetchFeedPage("seeking");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Специалисты</h1>
        <p className="mt-2 text-neutral-500">Люди, которые ищут работу или проекты через A1.</p>
      </header>

      {posts.length === 0 ? (
        <EmptyState message="Пока нет открытых анкет." />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          <LoadMore kind="seeking" initialCursor={next} initialHasMore={hasMore} />
        </>
      )}
    </main>
  );
}
