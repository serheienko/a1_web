// lib/news/articles.ts -- реестр новостей раздела «IT новини».
// Новая новость = новый файл со статьёй uk + en и две строки здесь.
import type { NewsArticle, NewsLang } from "./types";
import { MISTRAL_UK, MISTRAL_EN } from "./mistral-large-4";

export const NEWS: NewsArticle[] = [MISTRAL_UK, MISTRAL_EN];

export function findNews(slug: string): NewsArticle | undefined {
  return NEWS.find((a) => a.slug === slug);
}

export function altNews(article: NewsArticle): NewsArticle | undefined {
  return findNews(article.alt);
}

export function newsByLang(lang: NewsLang): NewsArticle[] {
  return NEWS.filter((a) => a.lang === lang).sort((a, b) => b.published.localeCompare(a.published));
}

export function relatedNews(article: NewsArticle): NewsArticle[] {
  const manual = article.related.map((s) => findNews(s)).filter((a): a is NewsArticle => !!a);
  if (manual.length) return manual;
  return newsByLang(article.lang).filter((a) => a.slug !== article.slug).slice(0, 3);
}
