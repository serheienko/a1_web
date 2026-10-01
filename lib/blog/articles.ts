// lib/blog/articles.ts -- реестр статей блога.
import type { Article } from "./types";
import { ARTICLES_UK } from "./articles-uk";
import { ARTICLES_EN } from "./articles-en";

export const ARTICLES: Article[] = [...ARTICLES_UK, ...ARTICLES_EN];

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function relatedArticles(article: Article): Article[] {
  return article.related.map((slug) => findArticle(slug)).filter((a): a is Article => !!a && a.lang === article.lang);
}

export function articlesByLang(lang: "uk" | "en"): Article[] {
  return ARTICLES.filter((a) => a.lang === lang);
}
