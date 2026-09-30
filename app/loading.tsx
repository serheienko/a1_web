// app/loading.tsx — mirrors app/jobs/loading.tsx (now that the Jobs feed
// lives at "/", see app/page.tsx), since the root segment has no loading
// boundary of its own otherwise.
import { FeedSkeleton } from "@/components/feed-skeleton";

export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <FeedSkeleton />
    </main>
  );
}
