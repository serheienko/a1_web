export const runtime = "nodejs";
export const revalidate = 3600;

// app/blog/page.tsx -- список статей блога: украинские и английские отдельно.

import type { Metadata } from "next";
import Link from "next/link";
import { articlesByLang } from "@/lib/blog/articles";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Блог про IT-роботу: зарплати, технології, ринок вакансій | A1 Jobs",
  description:
    "Статті про пошук роботи в IT: зарплати за технологіями, огляд ринку вакансій, перша робота без досвіду, бронювання, віддалена робота на іноземну компанію.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogIndex() {
  const uk = articlesByLang("uk");
  const en = articlesByLang("en");
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">Блог A1</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">Про пошук роботи в IT: цифри з живої бази вакансій і практичні поради.</p>
      <Link href="/stats" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent hover:bg-accent/15">📊 Статистика IT-вакансій: живі цифри, карта, технології →</Link>
      <ul className="mt-8 flex flex-col gap-5">
        {uk.map((a) => (
          <li key={a.slug}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-accent">{a.kicker}</div>
            <Link href={`/blog/${a.slug}`} className="mt-0.5 block text-xl font-semibold text-neutral-900 hover:text-accent dark:text-neutral-50">{a.h1}</Link>
            <p className="mt-1 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.description}</p>
          </li>
        ))}
      </ul>
      {en.length > 0 ? (
        <section lang="en" className="mt-12 border-t border-neutral-100 pt-8 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Guides in English</h2>
          <ul className="mt-5 flex flex-col gap-5">
            {en.map((a) => (
              <li key={a.slug}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-accent">{a.kicker}</div>
                <Link href={`/blog/${a.slug}`} className="mt-0.5 block text-xl font-semibold text-neutral-900 hover:text-accent dark:text-neutral-50">{a.h1}</Link>
                <p className="mt-1 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
