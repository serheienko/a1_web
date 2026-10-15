export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/hiring/[month]/page.tsx -- 14.10.2026: «Хто наймає в IT: жовтень 2026» (lib/seo/hiring-month.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/t";
import { fill, HiringBody, num, TXT } from "@/components/hiring-page";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import {
  currentMonthKey,
  HIRING_MIN_MONTH_POSTS,
  hiringMonth,
  hiringMonthPosts,
  hiringMonths,
  isMonthKey,
  monthLabel,
} from "@/lib/seo/hiring-month";
import { hiringUkraine, UA_MIN_MONTH_POSTS } from "@/lib/seo/hiring-ukraine";
import { UA_TXT } from "@/components/hiring-ukraine-page";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  if (!isMonthKey(month)) return {};
  const data = await hiringMonth(month);
  if (!data || data.total < HIRING_MIN_MONTH_POSTS) return {};
  const label = monthLabel(month);
  const title = `${fill(TXT.h1Month, { month: label }).uk} — A1 Jobs`;
  const top = data.top.slice(0, 3).map((c) => c.name).join(", ");
  const description = `Нових IT-вакансій за ${label.uk}: ${num(data.total)}, компаній: ${num(data.companies)}. Найбільше наймали: ${top}. Технології, країни, віддалена робота.`;
  const url = `${SITE_URL}/jobs/hiring/${month}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: Props) {
  const { month } = await params;
  if (!isMonthKey(month)) notFound();
  const data = await hiringMonth(month);
  if (!data || data.total < HIRING_MIN_MONTH_POSTS) notFound();
  const [posts, keys, ua] = await Promise.all([hiringMonthPosts(month, null), hiringMonths(), hiringUkraine(month).catch(() => null)]);
  const label = monthLabel(month);
  const h1 = fill(TXT.h1Month, { month: label });

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd(h1.uk, `${SITE_URL}/jobs/hiring/${month}`)) }}
      />
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/jobs/hiring" className="transition hover:text-accent">
          <T uk="Хто наймає" en="Who's hiring" ru="Кто нанимает" de="Wer stellt ein" es="Quién contrata" fr="Qui recrute" pl="Kto zatrudnia" ptBR="Quem contrata" zh="谁在招聘" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...h1} />
        </h1>
        {ua && ua.total >= UA_MIN_MONTH_POSTS ? (
          <p className="mt-3">
            <Link href={`/jobs/hiring/ukraine/${month}`} className="text-accent no-underline hover:underline">
              <T {...fill(UA_TXT.h1, { month: label })} /> →
            </Link>
          </p>
        ) : null}
      </header>
      <HiringBody
        data={data}
        summary={data}
        month={label}
        live={month === currentMonthKey()}
        stackSlug={null}
        stackLabel={null}
        posts={posts}
        months={keys.map((k) => ({ key: k, label: monthLabel(k) }))}
      />
    </main>
  );
}
