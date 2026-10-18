// lib/stackoverflow/fetch.ts
//
// Сервер собирает StackoverflowSummary (lib/stackoverflow/core.ts) для одного id и кеширует на
// сутки: у api.stackexchange.com дневной лимит, поэтому на человека в день -- одна цепочка запросов
// (профиль, темы, лучший ответ, заголовок вопроса). Кеш -- общее хранилище сайта (lib/kv/store.ts,
// путь a1/stackoverflow/<id>.json) плюс память процесса. «Нет такого пользователя» тоже на сутки.
//
// Ключ приложения STACKEXCHANGE_KEY (публичный, не секрет) поднимает лимит; без него -- анонимная
// квота. Проценты («топ X%») не выдумываем: только репутация, значки, темы и лучший ответ.

import { kvConfigured, kvGetJson, kvPutJson } from "@/lib/kv/store";
import {
  isValidStackoverflowId,
  mapStackoverflowBestAnswer,
  mapStackoverflowTags,
  mapStackoverflowUser,
  type StackoverflowBestAnswer,
  type StackoverflowSummary,
} from "./core";

if (typeof window !== "undefined") {
  throw new Error("[lib/stackoverflow/fetch] server-only");
}

export const STACKOVERFLOW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const MEMORY_MAX = 2000;
const UA = "A1-jobs-web/1.0 (+https://jobs.a1appp.com)";
const API = "https://api.stackexchange.com/2.3";

type CacheEntry = { at: number; notFound?: true; data?: StackoverflowSummary };
export type StackoverflowResult = { status: "ok"; data: StackoverflowSummary } | { status: "not_found" };

class NotFound extends Error {}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StackoverflowResult>>();

function memSet(key: string, e: CacheEntry) {
  memory.delete(key);
  memory.set(key, e);
  while (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

const kvPath = (key: string) => `a1/stackoverflow/${key}.json`;

async function readCache(key: string): Promise<CacheEntry | null> {
  const m = memory.get(key);
  if (m) return m;
  if (!kvConfigured()) return null;
  try {
    const e = await kvGetJson<CacheEntry>(kvPath(key));
    if (e && typeof e.at === "number") {
      memSet(key, e);
      return e;
    }
  } catch (err) {
    console.warn("[stackoverflow] cache read failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

async function writeCache(key: string, e: CacheEntry) {
  memSet(key, e);
  if (!kvConfigured()) return;
  try {
    await kvPutJson(kvPath(key), e);
  } catch (err) {
    console.warn("[stackoverflow] cache write failed:", err instanceof Error ? err.message : err);
  }
}

function toResult(e: CacheEntry): StackoverflowResult {
  return e.notFound || !e.data ? { status: "not_found" } : { status: "ok", data: e.data };
}

async function se<T>(path: string, params: Record<string, string>): Promise<T> {
  const u = new URL(`${API}${path}`);
  u.searchParams.set("site", "stackoverflow");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const key = (process.env.STACKEXCHANGE_KEY ?? "").trim();
  if (key) u.searchParams.set("key", key);
  const res = await fetch(u, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`stackexchange ${path} ${res.status}`);
  const body = (await res.json()) as { items?: unknown[]; error_id?: number };
  if (body.error_id) throw new Error(`stackexchange ${path} error ${body.error_id}`);
  return body as T;
}

async function fetchBestAnswer(id: number): Promise<StackoverflowBestAnswer | null> {
  try {
    const a = await se<{ items?: { question_id?: number }[] }>(`/users/${id}/answers`, { order: "desc", sort: "votes", pagesize: "1" });
    const answer = a.items?.[0];
    if (!answer || typeof answer.question_id !== "number") return null;
    const q = await se<{ items?: unknown[] }>(`/questions/${answer.question_id}`, {});
    return mapStackoverflowBestAnswer(answer, q.items?.[0]);
  } catch (err) {
    // Лучший ответ -- украшение: без него плитка всё равно полезна.
    console.warn("[stackoverflow] best answer failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchFresh(id: number): Promise<StackoverflowSummary> {
  const users = await se<{ items?: unknown[] }>(`/users/${id}`, {});
  const head = mapStackoverflowUser(users.items?.[0]);
  if (!head) throw new NotFound();

  const [tags, best] = await Promise.all([
    se<{ items?: unknown[] }>(`/users/${id}/top-tags`, { pagesize: "4" })
      .then((t) => mapStackoverflowTags(t.items))
      .catch(() => []),
    fetchBestAnswer(id),
  ]);

  return { ...head, topTags: tags, bestAnswer: best, fetchedAt: new Date().toISOString() };
}

/** Свежий кеш -> из кеша. Ошибка Stack Exchange -> старый кеш, иначе исключение (маршрут отдаёт 502). */
export async function getStackoverflowSummary(id: number): Promise<StackoverflowResult> {
  if (!isValidStackoverflowId(String(id))) return { status: "not_found" };
  const key = String(id);

  const cached = await readCache(key);
  if (cached && Date.now() - cached.at < STACKOVERFLOW_CACHE_TTL_MS) return toResult(cached);

  const running = inflight.get(key);
  if (running) return running;

  const job = (async (): Promise<StackoverflowResult> => {
    try {
      const data = await fetchFresh(id);
      await writeCache(key, { at: Date.now(), data });
      return { status: "ok", data };
    } catch (err) {
      if (err instanceof NotFound) {
        await writeCache(key, { at: Date.now(), notFound: true });
        return { status: "not_found" };
      }
      console.warn(`[stackoverflow] fetch failed for ${key}:`, err instanceof Error ? err.message : err);
      if (cached) return toResult(cached);
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}
