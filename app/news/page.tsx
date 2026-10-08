export const runtime = "nodejs";
export const revalidate = 3600;

// app/news/page.tsx -- «IT новини»: список. Українські новини, нижче англійські.

import type { Metadata } from "next";
import Link from "next/link";
import { newsByLang } from "@/lib/news/articles";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "IT новини: головне зі світу технологій і що це означає для вакансій | A1 Jobs",
  description:
    "Найцікавіші IT-новини дня з нашим розбором: що сталося, які цифри, і що це змінює для айтішників та ринку вакансій. Українською та англійською.",
  alternates: { canonical: `${SITE_URL}/news` },
  openGraph: { title: "IT новини | A1 Jobs", url: `${SITE_URL}/news`, type: "website", locale: "uk_UA" },
};

function dateText(d: string, lang: "uk" | "en") {
  return new Date(d + "T12:00:00Z").toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", { day: "numeric", month: "long", year: "numeric" });
}

export default function NewsIndex() {
  const uk = newsByLang("uk");
  const en = newsByLang("en");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "IT новини | A1 Jobs",
    url: `${SITE_URL}/news`,
    inLanguage: "uk-UA",
    hasPart: [...uk, ...en].map((a) => ({ "@type": "NewsArticle", headline: a.h1, url: `${SITE_URL}/news/${a.slug}`, datePublished: a.published })),
  };
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">IT новини</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">Найцікавіше зі світу технологій — з цифрами, графіками й нашим поглядом: що це означає для айтішників і вакансій.</p>
      <ul className="mt-8 flex flex-col gap-6">
        {uk.map((a) => (
          <li key={a.slug}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-accent">{a.kicker} · {dateText(a.published, "uk")}</div>
            <Link href={`/news/${a.slug}`} className="mt-0.5 block text-xl font-semibold text-neutral-900 hover:text-accent dark:text-neutral-50">{a.h1}</Link>
            <p className="mt-1 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.description}</p>
          </li>
        ))}
      </ul>
      {en.length > 0 ? (
        <section lang="en" className="mt-12 border-t border-neutral-100 pt-8 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">IT news in English</h2>
          <ul className="mt-5 flex flex-col gap-6">
            {en.map((a) => (
              <li key={a.slug}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-accent">{a.kicker} · {dateText(a.published, "en")}</div>
                <Link href={`/news/${a.slug}`} className="mt-0.5 block text-xl font-semibold text-neutral-900 hover:text-accent dark:text-neutral-50">{a.h1}</Link>
                <p className="mt-1 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
