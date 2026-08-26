import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Страница не найдена</h1>
      <p className="mt-2 text-neutral-500">Возможно, пост был удалён или ссылка устарела.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-[#4F71EB] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        На главную
      </Link>
    </main>
  );
}
