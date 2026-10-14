export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/hiring/page.tsx -- 14.10.2026: «Хто наймає в IT» -- все месяцы (lib/seo/hiring-month.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/t";
import { fill, TXT } from "@/components/hiring-page";
import { hiringMonths, monthLabel } from "@/lib/seo/hiring-month";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Хто наймає в IT: щомісячні звіти — A1 Jobs",
  description: "Які компанії найбільше наймали в IT щомісяця, які технології та країни. Дані A1 Jobs за всіма відкритими вакансіями.",
  alternates: { canonical: `${SITE_URL}/jobs/hiring` },
};

const H1 = {
  uk: "Хто наймає в IT: щомісячні звіти",
  en: "Who's hiring in tech: monthly reports",
  ru: "Кто нанимает в IT: ежемесячные отчёты",
  de: "Wer stellt in der IT ein: Monatsberichte",
  es: "Quién contrata en IT: informes mensuales",
  fr: "Qui recrute dans la tech : rapports mensuels",
  pl: "Kto zatrudnia w IT: raporty miesięczne",
  ptBR: "Quem está contratando em TI: relatórios mensais",
  zh: "谁在招聘 IT 人才：月度报告",
};

export default async function Page() {
  const months = await hiringMonths();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
        <T {...H1} />
      </h1>
      <ul className="mt-8 flex flex-col gap-2">
        {months.map((m) => (
          <li key={m}>
            <Link href={`/jobs/hiring/${m}`} className="text-lg text-accent no-underline hover:underline">
              <T {...fill(TXT.h1Month, { month: monthLabel(m) })} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
        <T {...TXT.how} />
      </p>
    </main>
  );
}
