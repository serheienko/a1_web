// components/feed-skeleton.tsx
//
// 30.09.2026 (Александр: «когда с вакансий на фахівці переходишь --
// скелетон, везде скелетон, а при смене страны какая-то полоска сверху»).
// Один скелетон на все случаи: карточки ленты. Его же рисует и
// app/loading.tsx, и <Suspense> вокруг списка на главной, пока сервер
// собирает выдачу для новой страны/фильтра -- шапка и фильтры при этом
// остаются на месте.
export function FeedSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      ))}
    </ul>
  );
}
