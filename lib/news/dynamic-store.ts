// lib/news/dynamic-store.ts
//
// 09.10.2026. Новости, которые пишет агент «Редакція A1», лежат не в коде, а в
// Vercel Blob (a1/news/<slug>.json, по файлу на страницу), поэтому новость
// появляется на сайте без деплоя. Статические новости (lib/news/*.ts) остаются.
//
// В файле -- конверт { v, publishAt, article }. publishAt позволяет агенту
// сразу сдать две новости на день, а показать вторую позже: до своего часа она
// на сайте (и в sitemap) не видна.
//
// Секретов здесь нет (репозиторий публичный): токен -- BLOB_READ_WRITE_TOKEN.

if (typeof window !== "undefined") {
  throw new Error("[lib/news/dynamic-store] imported from the browser — server-only");
}

import { unstable_cache } from "next/cache";
import type { NewsArticle } from "./types";

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PREFIX = "a1/news/";

export type NewsEnvelope = { v: 1; publishAt: string; article: NewsArticle };

function token(): string {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

function storeIdFrom(tok: string): string {
  const parts = tok.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  return raw.startsWith("store_") ? raw.slice("store_".length) : raw;
}

function headers(tok: string): Record<string, string> {
  return {
    authorization: `Bearer ${tok}`,
    "x-api-version": BLOB_API_VERSION,
    "x-vercel-blob-store-id": storeIdFrom(tok),
  };
}

type BlobRow = { pathname?: string; url?: string; downloadUrl?: string };

async function listAll(tok: string): Promise<BlobRow[] | null> {
  const out: BlobRow[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const qs = new URLSearchParams({ prefix: PREFIX, limit: "200" });
    if (cursor) qs.set("cursor", cursor);
    try {
      const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { blobs?: BlobRow[]; cursor?: string; hasMore?: boolean };
      out.push(...(data.blobs ?? []));
      if (!data.hasMore || !data.cursor) break;
      cursor = data.cursor;
    } catch {
      return null;
    }
  }
  return out;
}

async function readEnvelope(tok: string, url: string): Promise<NewsEnvelope | null> {
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as NewsEnvelope;
    return json && json.v === 1 && json.article && typeof json.article.slug === "string" ? json : null;
  } catch {
    return null;
  }
}

async function loadEnvelopesUncached(): Promise<NewsEnvelope[]> {
  const tok = token();
  if (!tok) return [];
  const rows = await listAll(tok);
  if (!rows) return [];
  const got = await Promise.all(
    rows
      .filter((r) => r.pathname?.endsWith(".json"))
      .map((r) => {
        const url = r.downloadUrl ?? r.url;
        return url ? readEnvelope(tok, url) : Promise.resolve(null);
      }),
  );
  return got.filter((e): e is NewsEnvelope => !!e);
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
  const tok = token();
  if (!tok) return false;
  const pathname = `${PREFIX}${env.article.slug}.json`;
  try {
    const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(pathname)}`, {
      method: "PUT",
      body: JSON.stringify(env),
      headers: {
        ...headers(tok),
        "x-vercel-blob-access": "private",
        "x-allow-overwrite": "1",
        "x-add-random-suffix": "0",
        "x-content-type": "application/json",
        "content-type": "application/json",
      },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
