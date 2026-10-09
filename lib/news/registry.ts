// lib/news/registry.ts -- все новости сайта: статические (lib/news/*.ts) + от агента (Blob).
// Страницы берут пул отсюда и передают его в findNews/altNews/newsByLang/relatedNews.
import { NEWS } from "./articles";
import { loadLiveDynamicNews } from "./dynamic-store";
import type { NewsArticle } from "./types";

export async function allNews(): Promise<NewsArticle[]> {
  const dyn = await loadLiveDynamicNews();
  const seen = new Set(NEWS.map((a) => a.slug));
  return [...NEWS, ...dyn.filter((a) => !seen.has(a.slug))];
}
