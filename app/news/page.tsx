export const runtime = "nodejs";
export const revalidate = 300;

// app/news/page.tsx -- «IT новини»: украинский список. Английский -- /news/en
// (hreflang связывает два списка; у каждой новости есть метка EN на свою версию).

import type { Metadata } from "next";
import Link from "next/link";
import { NewsList } from "@/components/news/news-list";
import { newsByLang } from "@/lib/news/articles";
import { allNews } from "@/lib/news/registry";
import { T } from "@/components/t";
import { ntt } from "@/lib/news/ui";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "IT новини: головне зі світу технологій і що це означає для IT-ринку | A1 Jobs",
  description:
    "Найцікавіші IT-новини дня з нашим розбором: що сталося, які цифри і що це означає для IT-ринку. Українською, з англійськими версіями.",
  alternates: {
    canonical: `${SITE_URL}/news`,
    languages: { "uk-UA": `${SITE_URL}/news`, en: `${SITE_URL}/news/en`, "x-default": `${SITE_URL}/news` },
  },
  openGraph: { title: "IT новини | A1 Jobs", url: `${SITE_URL}/news`, type: "website", locale: "uk_UA", alternateLocale: "en_US" },
};

export default async function NewsIndex() {
  const pool = await allNews();
  const items = newsByLang("uk", pool);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "IT новини | A1 Jobs",
    url: `${SITE_URL}/news`,
    inLanguage: "uk-UA",
    hasPart: items.map((a) => ({ "@type": "NewsArticle", headline: a.h1, url: `${SITE_URL}/news/${a.slug}`, datePublished: a.published })),
  };
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50"><T {...ntt("h1")} /></h1>
        <Link href="/news/en" hrefLang="en" lang="en" className="mt-2 hidden shrink-0 rounded-full lang-uk:inline-block lang-ru:inline-block lang-en:inline-block bg-neutral-100 px-3 py-1 text-[12px] font-semibold text-neutral-600 transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300">EN</Link>
      </div>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400"><T {...ntt("lead")} /></p>
      <NewsList items={items} pool={pool} />
    </main>
  );
}
