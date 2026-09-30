import { FeedSkeleton } from "@/components/feed-skeleton";

export default function JobsLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <FeedSkeleton />
    </main>
  );
}
