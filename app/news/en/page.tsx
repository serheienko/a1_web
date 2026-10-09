export const runtime = "nodejs";
export const revalidate = 300;

// app/news/en/page.tsx -- «IT News»: английский список (украинский -- /news).
// Статический маршрут /news/en приоритетнее [slug], поэтому slug "en" занят.

import type { Metadata } from "next";
import Link from "next/link";
import { NewsList } from "@/components/news/news-list";
import { newsByLang } from "@/lib/news/articles";
import { allNews } from "@/lib/news/registry";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "IT News: the biggest tech stories and what they mean for the IT market | A1 Jobs",
  description:
    "The most interesting IT news of the day with our analysis: what happened, the numbers, and what it means for the IT market. English edition of A1 IT news.",
  alternates: {
    canonical: `${SITE_URL}/news/en`,
    languages: { "uk-UA": `${SITE_URL}/news`, en: `${SITE_URL}/news/en`, "x-default": `${SITE_URL}/news` },
  },
  openGraph: { title: "IT News | A1 Jobs", url: `${SITE_URL}/news/en`, type: "website", locale: "en_US", alternateLocale: "uk_UA" },
};

export default async function NewsIndexEn() {
  const pool = await allNews();
  const items = newsByLang("en", pool);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "IT News | A1 Jobs",
    url: `${SITE_URL}/news/en`,
    inLanguage: "en",
    hasPart: items.map((a) => ({ "@type": "NewsArticle", headline: a.h1, url: `${SITE_URL}/news/${a.slug}`, datePublished: a.published })),
  };
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe" lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">IT News</h1>
        <Link href="/news" hrefLang="uk" lang="uk" className="mt-2 shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-semibold text-neutral-600 transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300">UA</Link>
      </div>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">The best of the tech world: numbers, charts and our take on what it means for the IT market.</p>
      <NewsList items={items} pool={pool} />
    </main>
  );
}
