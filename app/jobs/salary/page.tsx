export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/salary/page.tsx -- указатель зарплатных страниц: какие
// направления у нас вообще набрали достаточно вакансий с названной
// суммой, и сколько там медиана. Отсюда человек уходит на страницу
// направления, а робот -- обходит их все с одного адреса.
//
// Таблицей, а не блоком ссылок: медиана рядом с названием -- это и есть
// то, ради чего страницу открывают. Список ссылок без чисел заставил бы
// открыть сорок страниц, чтобы сравнить две.

import type { Metadata } from "next";
import { altLanguages } from "@/lib/seo/hreflang";
import Link from "next/link";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T } from "@/components/t";
import { EmptyState } from "@/components/empty-state";
import { formatSalary } from "@/lib/format";
import { salaryRoles } from "@/lib/a1/salary-index";
import { roleInfo } from "@/lib/seo/job-role";
import { SALARY_HUB_H1, SALARY_HUB_LEAD } from "@/lib/seo/salary-texts";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Зарплати в IT — вилки та медіани за напрямами | A1 Jobs",
  description:
    "Скільки платять в IT за напрямами: медіана і вилка за вакансіями, де компанія сама назвала суму. Оновлюється щодня.",
  alternates: { canonical: `${SITE_URL}/jobs/salary`, languages: altLanguages("/jobs/salary") },
  openGraph: {
    title: "Зарплати в IT — вилки та медіани за напрямами | A1 Jobs",
    description: "Медіана і вилка за вакансіями, де компанія сама назвала суму. Оновлюється щодня.",
    url: `${SITE_URL}/jobs/salary`,
    type: "website",
  },
};

export default async function Page() {
  const roles = await salaryRoles();

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingBreadcrumbJsonLd(SALARY_HUB_H1.uk, `${SITE_URL}/jobs/salary`)),
        }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/" className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...SALARY_HUB_H1} />
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <T {...SALARY_HUB_LEAD} />
        </p>
      </header>

      {roles.length === 0 ? (
        <EmptyState
          message={
            <T
              uk="Поки замало вакансій із названою сумою, щоб рахувати медіану."
              en="There are not yet enough jobs with a stated salary to compute a median."
              ru="Пока слишком мало вакансий с названной суммой, чтобы считать медиану."
              de="Noch zu wenige Stellen mit genannter Summe für einen Median."
              es="Todavía hay pocas vacantes con importe indicado para calcular una mediana."
              fr="Pas encore assez d'offres avec un montant indiqué pour calculer une médiane."
              pl="Wciąż za mało ofert z podaną kwotą, aby policzyć medianę."
              ptBR="Ainda há poucas vagas com valor informado para calcular uma mediana."
              zh="标明薪资的职位还太少，无法计算中位数。"
            />
          }
        />
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {roles.map(({ role, stats }) => (
            <li key={role}>
              <Link
                href={`/jobs/salary/${role}`}
                className="flex items-baseline justify-between gap-4 px-4 py-3 transition hover:bg-accent/5"
              >
                <span className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
                  {roleInfo(role)?.uk ?? role}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-semibold text-neutral-900 tabular-nums dark:text-neutral-50">
                    {LOCALES.map((locale) => (
                      <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
                        {formatSalary({ min: stats.median, max: stats.median, currency: stats.currency, period: "MONTH" }, locale)}
                      </span>
                    ))}
                  </span>
                  <span className="block text-[12px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {stats.count}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
