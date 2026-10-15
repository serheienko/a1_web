export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/hiring/ukraine/[month]/page.tsx -- 15.10.2026: «Хто наймає в IT в Україні: жовтень 2026»
// (lib/seo/hiring-ukraine.ts). Статичный сегмент «ukraine» у Next.js главнее, чем [month].
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/t";
import { fill, num } from "@/components/hiring-page";
import { HiringUkraineBody, pct, UA_TXT } from "@/components/hiring-ukraine-page";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { currentMonthKey, HIRING_MIN_MONTH_POSTS, hiringMonth, isMonthKey, monthLabel } from "@/lib/seo/hiring-month";
import { hiringUkraine, hiringUkraineMonths, hiringUkrainePosts, UA_MIN_MONTH_POSTS } from "@/lib/seo/hiring-ukraine";
import { listCities } from "@/lib/a1/segment-index";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  if (!isMonthKey(month)) return {};
  const data = await hiringUkraine(month);
  if (!data || data.total < UA_MIN_MONTH_POSTS) return {};
  const label = monthLabel(month);
  const title = `${fill(UA_TXT.h1, { month: label }).uk} | A1 Jobs`;
  const top = data.top.slice(0, 3).map((c) => c.name).join(", ");
  const description = `IT-вакансій в Україні за ${label.uk}: ${num(data.total)}, роботодавців: ${num(data.companies)}. Армія та оборонка: ${pct(data.army.posts + data.defense.posts, data.total)}%, з бронюванням: ${pct(data.reservation, data.total)}%. Найбільше наймали: ${top}.`;
  const url = `${SITE_URL}/jobs/hiring/ukraine/${month}`;
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
  const data = await hiringUkraine(month);
  if (!data || data.total < UA_MIN_MONTH_POSTS) notFound();
  const [posts, keys, cities, world] = await Promise.all([
    hiringUkrainePosts(month),
    hiringUkraineMonths(),
    listCities(),
    hiringMonth(month),
  ]);
  const citySlugs = new Map(cities.filter((c) => c.cc.toUpperCase() === "UA").map((c) => [c.city, c.slug] as const));
  const label = monthLabel(month);
  const h1 = fill(UA_TXT.h1, { month: label });

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd(h1.uk, `${SITE_URL}/jobs/hiring/ukraine/${month}`)) }}
      />
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/jobs/hiring" className="transition hover:text-accent">
          <T {...UA_TXT.crumb} />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <Link href="/jobs/hiring/ukraine" className="transition hover:text-accent">
          <T {...UA_TXT.crumbUa} />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...h1} />
        </h1>
      </header>
      <HiringUkraineBody
        data={data}
        month={label}
        live={month === currentMonthKey()}
        posts={posts}
        months={keys.map((k) => ({ key: k, label: monthLabel(k) }))}
        citySlugs={citySlugs}
        worldHref={world && world.total >= HIRING_MIN_MONTH_POSTS ? `/jobs/hiring/${month}` : null}
      />
    </main>
  );
}
