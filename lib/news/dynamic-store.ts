// lib/news/dynamic-store.ts
//
// 09.10.2026. Новости, которые пишет агент «Редакція A1», лежат не в коде, а в
// хранилище (a1/news/<slug>.json, по записи на страницу; с 14.10.2026 -- база на Railway,
// lib/kv/store.ts, раньше Vercel Blob), поэтому новость
// появляется на сайте без деплоя. Статические новости (lib/news/*.ts) остаются.
//
// В файле -- конверт { v, publishAt, article }. publishAt позволяет агенту
// сразу сдать две новости на день, а показать вторую позже: до своего часа она
// на сайте (и в sitemap) не видна.
//

if (typeof window !== "undefined") {
  throw new Error("[lib/news/dynamic-store] imported from the browser — server-only");
}

import { unstable_cache } from "next/cache";
import type { NewsArticle } from "./types";
import { kvConfigured, kvGetMany, kvPutJson } from "@/lib/kv/store";

const PREFIX = "a1/news/";

export type NewsEnvelope = { v: 1; publishAt: string; article: NewsArticle };

function parseEnvelope(body: Buffer): NewsEnvelope | null {
  try {
    const json = JSON.parse(body.toString("utf8")) as NewsEnvelope;
    return json && json.v === 1 && json.article && typeof json.article.slug === "string" ? json : null;
  } catch {
    return null;
  }
}

async function loadEnvelopesUncached(): Promise<NewsEnvelope[]> {
  if (!kvConfigured()) return [];
  try {
    const rows = await kvGetMany(PREFIX);
    return rows
      .filter((r) => r.path.endsWith(".json"))
      .map((r) => parseEnvelope(r.body))
      .filter((e): e is NewsEnvelope => !!e);
  } catch {
    return [];
  }
}

/** Все конверты (в том числе ещё не опубликованные). Кэш 2 минуты, сбрасывается тегом "news". */
export const loadEnvelopes = unstable_cache(loadEnvelopesUncached, ["a1-news-envelopes"], { revalidate: 120, tags: ["news"] });

/** Только те новости, чей час уже настал. */
export async function loadLiveDynamicNews(now: Date = new Date()): Promise<NewsArticle[]> {
  const all = await loadEnvelopes();
  return all.filter((e) => new Date(e.publishAt).getTime() <= now.getTime()).map((e) => e.article);
}

/** Без кэша: для проверки дублей при приёме новости. */
export async function loadEnvelopesFresh(): Promise<NewsEnvelope[]> {
  return loadEnvelopesUncached();
}

export async function saveEnvelope(env: NewsEnvelope): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    await kvPutJson(`${PREFIX}${env.article.slug}.json`, env);
    return true;
  } catch {
    return false;
  }
}
