// app/loading.tsx — mirrors app/jobs/loading.tsx (now that the Jobs feed
// lives at "/", see app/page.tsx), since the root segment has no loading
// boundary of its own otherwise.
export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <ul className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </ul>
    </main>
  );
}
