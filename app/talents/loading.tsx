export default function TalentsLoading() {
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
