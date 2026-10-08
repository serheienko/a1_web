export const runtime = "nodejs";
export const revalidate = 3600;

// app/news/[slug]/page.tsx -- страница новости (один язык, один адрес).
// hreflang: uk <-> en через поле alt; x-default -- украинская версия.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsView } from "@/components/news/news-view";
import { altNews, findNews, NEWS } from "@/lib/news/articles";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return NEWS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findNews((await params).slug);
  if (!article) return {};
  const url = `${SITE_URL}/news/${article.slug}`;
  const alt = altNews(article);
  const languages: Record<string, string> = { [article.lang === "uk" ? "uk-UA" : "en"]: url };
  if (alt) {
    languages[alt.lang === "uk" ? "uk-UA" : "en"] = `${SITE_URL}/news/${alt.slug}`;
    const uk = article.lang === "uk" ? article : alt;
    languages["x-default"] = `${SITE_URL}/news/${uk.slug}`;
  }
  return {
    title: `${article.title} | A1 Jobs`,
    description: article.description,
    keywords: article.tags,
    alternates: { canonical: url, languages },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      type: "article",
      publishedTime: article.published,
      modifiedTime: article.updated,
      locale: article.lang === "uk" ? "uk_UA" : "en_US",
      alternateLocale: alt ? (alt.lang === "uk" ? "uk_UA" : "en_US") : undefined,
      tags: article.tags,
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.description },
  };
}

export default async function Page({ params }: Props) {
  const article = findNews((await params).slug);
  if (!article) notFound();
  return <NewsView article={article} />;
}
