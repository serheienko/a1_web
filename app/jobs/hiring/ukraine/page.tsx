export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/hiring/ukraine/page.tsx -- 15.10.2026: все месяцы «Хто наймає в IT в Україні».
import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/t";
import { fill } from "@/components/hiring-page";
import { UA_TXT } from "@/components/hiring-ukraine-page";
import { monthLabel } from "@/lib/seo/hiring-month";
import { hiringUkraineMonths } from "@/lib/seo/hiring-ukraine";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Хто наймає в IT в Україні: щомісячні звіти | A1 Jobs",
  description:
    "Хто наймає IT-фахівців в Україні щомісяця: армія та оборонка, бронювання, міста, рівні, англійська, досвід, зарплати і технології.",
  alternates: { canonical: `${SITE_URL}/jobs/hiring/ukraine` },
};

const H1 = {
  uk: "Хто наймає в IT в Україні: щомісячні звіти",
  en: "Who's hiring in tech in Ukraine: monthly reports",
  ru: "Кто нанимает в IT в Украине: ежемесячные отчёты",
  de: "Who's hiring in tech in Ukraine: monthly reports",
  es: "Who's hiring in tech in Ukraine: monthly reports",
  fr: "Who's hiring in tech in Ukraine: monthly reports",
  pl: "Who's hiring in tech in Ukraine: monthly reports",
  ptBR: "Who's hiring in tech in Ukraine: monthly reports",
  zh: "Who's hiring in tech in Ukraine: monthly reports",
};

export default async function Page() {
  const months = await hiringUkraineMonths();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/jobs/hiring" className="transition hover:text-accent">
          <T {...UA_TXT.crumb} />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
        <T {...H1} />
      </h1>
      <ul className="mt-8 flex flex-col gap-2">
        {months.map((m) => (
          <li key={m}>
            <Link href={`/jobs/hiring/ukraine/${m}`} className="text-lg text-accent no-underline hover:underline">
              <T {...fill(UA_TXT.h1, { month: monthLabel(m) })} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
        <T {...UA_TXT.how} />
      </p>
    </main>
  );
}
