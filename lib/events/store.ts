// lib/events/store.ts -- хранилище событий: один файл a1/events/all.json в Vercel Blob
// (тот же приём, что у новостей, lib/news/dynamic-store.ts). Пишет только Конкистадор
// через /api/events/ingest; страницы читают через loadEvents() с коротким кэшем.
//
// Секретов здесь нет (репозиторий публичный): токен -- BLOB_READ_WRITE_TOKEN.

if (typeof window !== "undefined") {
  throw new Error("[lib/events/store] imported from the browser — server-only");
}

import { unstable_cache } from "next/cache";
import type { EventItem, EventsFile } from "./types";

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PATHNAME = "a1/events/all.json";

function token(): string {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

function storeIdFrom(tok: string): string {
  const parts = tok.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  return raw.startsWith("store_") ? raw.slice("store_".length) : raw;
}

function headers(tok: string): Record<string, string> {
  return { authorization: `Bearer ${tok}`, "x-api-version": BLOB_API_VERSION, "x-vercel-blob-store-id": storeIdFrom(tok) };
}

async function readUncached(): Promise<EventsFile | null> {
  const tok = token();
  if (!tok) return null;
  try {
    const qs = new URLSearchParams({ prefix: PATHNAME, limit: "5" });
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { blobs?: { pathname?: string; url?: string; downloadUrl?: string }[] };
    const row = (data.blobs ?? []).find((b) => b.pathname === PATHNAME);
    const url = row?.downloadUrl ?? row?.url;
    if (!url) return null;
    const f = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
    if (!f.ok) return null;
    const json = (await f.json()) as EventsFile;
    return json && json.v === 1 && Array.isArray(json.events) ? json : null;
  } catch {
    return null;
  }
}

/** Кэш 5 минут, сбрасывается тегом "events" (после приёма новой пачки). */
const readCached = unstable_cache(readUncached, ["a1-events-file"], { revalidate: 300, tags: ["events"] });

export async function loadEvents(): Promise<EventItem[]> {
  const f = await readCached();
  return f?.events ?? [];
}

export async function loadEventsFresh(): Promise<EventsFile | null> {
  return readUncached();
}

export async function saveEvents(file: EventsFile): Promise<boolean> {
  const tok = token();
  if (!tok) return false;
  try {
    const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(PATHNAME)}`, {
      method: "PUT",
      body: JSON.stringify(file),
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
