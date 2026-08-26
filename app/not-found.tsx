import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Страница не найдена</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">Возможно, пост был удалён или ссылка устарела.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        На главную
      </Link>
    </main>
  );
}
