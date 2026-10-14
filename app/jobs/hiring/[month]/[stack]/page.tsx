export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/hiring/[month]/[stack]/page.tsx -- 14.10.2026: «Хто наймає Python-фахівців: жовтень 2026».
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/t";
import { fill, HiringBody, num, TXT } from "@/components/hiring-page";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { currentMonthKey, hiringMonth, hiringMonthPosts, hiringMonths, isMonthKey, monthLabel } from "@/lib/seo/hiring-month";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ month: string; stack: string }> };

async function load(month: string, stack: string) {
  if (!isMonthKey(month)) return null;
  const landing = findTechLanding(stack);
  if (!landing) return null;
  const data = await hiringMonth(month);
  const summary = data?.byStack[landing.slug];
  if (!data || !summary) return null;
  return { data, summary, landing };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month, stack } = await params;
  const got = await load(month, stack);
  if (!got) return {};
  const label = monthLabel(month);
  const title = `${fill(TXT.h1Stack, { month: label, label: got.landing.label }).uk} — A1 Jobs`;
  const top = got.summary.top.slice(0, 3).map((c) => c.name).join(", ");
  const description = `Нових вакансій ${got.landing.label} за ${label.uk}: ${num(got.summary.total)}. Найбільше наймали: ${top}. Хто наймає, де і чи віддалено.`;
  const url = `${SITE_URL}/jobs/hiring/${month}/${got.landing.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: Props) {
  const { month, stack } = await params;
  const got = await load(month, stack);
  if (!got) notFound();
  const { data, summary, landing } = got;
  const [posts, keys] = await Promise.all([hiringMonthPosts(month, landing.slug), hiringMonths()]);
  const label = monthLabel(month);
  const h1 = fill(TXT.h1Stack, { month: label, label: landing.label });
  // Прошлые месяцы показываем, только если у них есть срез по этому стеку.
  const months: { key: string; label: ReturnType<typeof monthLabel> }[] = [];
  for (const k of keys) {
    if (k === month) {
      months.push({ key: k, label: monthLabel(k) });
      continue;
    }
    const other = await hiringMonth(k);
    if (other?.byStack[landing.slug]) months.push({ key: k, label: monthLabel(k) });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingBreadcrumbJsonLd(h1.uk, `${SITE_URL}/jobs/hiring/${month}/${landing.slug}`)),
        }}
      />
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href={`/jobs/hiring/${month}`} className="transition hover:text-accent">
          <T {...fill(TXT.h1Month, { month: label })} />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...h1} />
        </h1>
      </header>
      <HiringBody
        data={data}
        summary={summary}
        month={label}
        live={month === currentMonthKey()}
        stackSlug={landing.slug}
        stackLabel={landing.label}
        posts={posts}
        months={months}
      />
    </main>
  );
}
