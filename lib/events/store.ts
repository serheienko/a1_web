// lib/events/store.ts -- хранилище событий: одна запись a1/events/all.json в общем хранилище
// сайта (lib/kv/store.ts, база на Railway; до 14.10.2026 -- Vercel Blob). Пишет только Конкистадор
// через /api/events/ingest; страницы читают через loadEvents() с коротким кэшем.

if (typeof window !== "undefined") {
  throw new Error("[lib/events/store] imported from the browser — server-only");
}

import { unstable_cache } from "next/cache";
import type { EventItem, EventsFile } from "./types";
import { kvConfigured, kvGetJson, kvPutJson } from "@/lib/kv/store";

const PATHNAME = "a1/events/all.json";

async function readUncached(): Promise<EventsFile | null> {
  if (!kvConfigured()) return null;
  try {
    const json = await kvGetJson<EventsFile>(PATHNAME);
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
  if (!kvConfigured()) return false;
  try {
    await kvPutJson(PATHNAME, file);
    return true;
  } catch {
    return false;
  }
}
