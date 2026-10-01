export const runtime = "nodejs";
export const revalidate = 3600;

// app/blog/[slug]/page.tsx -- статья блога (один язык, один адрес).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/blog/article-view";
import { findArticle } from "@/lib/blog/articles";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug);
  if (!article) return {};
  const url = `${SITE_URL}/blog/${article.slug}`;
  return {
    title: `${article.title} | A1 Jobs`,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      type: "article",
      publishedTime: article.published,
      modifiedTime: article.updated,
      locale: article.lang === "uk" ? "uk_UA" : "en_US",
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.description },
  };
}

export default async function Page({ params }: Props) {
  const article = findArticle((await params).slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
