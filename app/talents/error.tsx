"use client";

import { T } from "@/components/t";

export default function TalentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50"><T uk="Не вдалося завантажити анкети" ru="Не получилось загрузить анкеты" /></h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400"><T uk="Спробуйте оновити сторінку через хвилину." ru="Попробуйте обновить страницу через минуту." /></p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
      >
        <T uk="Спробувати знову" ru="Попробовать снова" />
      </button>
    </main>
  );
}
