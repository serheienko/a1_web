export const runtime = "nodejs";
export const revalidate = 60;

// app/jobs/page.tsx — Jobs feed (post-job-employing). PLAN.md Phase 1.

import { fetchFeedPage } from "@/lib/a1/feed";
import { PostCard } from "@/components/post-card";
import { LoadMore } from "@/components/load-more";
import { EmptyState } from "@/components/empty-state";

export const metadata = {
  title: "Вакансии | A1 Jobs",
  description: "Актуальные вакансии от компаний и людей в приложении A1.",
};

export default async function JobsPage() {
  const { posts, next, hasMore } = await fetchFeedPage("hiring");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Вакансии</h1>
        <p className="mt-2 text-neutral-500">Открытые позиции от компаний и людей в A1.</p>
      </header>

      {posts.length === 0 ? (
        <EmptyState message="Пока нет открытых вакансий." />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          <LoadMore kind="hiring" initialCursor={next} initialHasMore={hasMore} />
        </>
      )}
    </main>
  );
}
