// app/news/loading.tsx -- мгновенный каркас при переходе на /news и /news/<slug>.
export default function NewsLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-4 h-10 w-4/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-8 h-28 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-8 space-y-3">
        {[100, 95, 98, 70].map((w, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" style={{ width: `${w}%` }} />
        ))}
      </div>
    </main>
  );
}
