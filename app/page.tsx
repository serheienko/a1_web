import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">A1 Jobs & Talents</h1>
      <p className="mt-4 text-neutral-500">
        Вакансии и специалисты из приложения A1 — теперь и в браузере.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/jobs"
          className="rounded-lg bg-[#4F71EB] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Смотреть вакансии
        </Link>
        <Link
          href="/talents"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
        >
          Смотреть специалистов
        </Link>
      </div>
    </main>
  );
}
