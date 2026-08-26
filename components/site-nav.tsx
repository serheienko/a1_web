// components/site-nav.tsx
import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-sm font-semibold text-neutral-900">
          A1
        </Link>
        <Link href="/jobs" className="text-sm text-neutral-500 transition hover:text-neutral-900">
          Вакансии
        </Link>
        <Link href="/talents" className="text-sm text-neutral-500 transition hover:text-neutral-900">
          Специалисты
        </Link>
      </nav>
    </header>
  );
}
