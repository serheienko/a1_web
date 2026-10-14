// lib/comments/site-store.ts
//
// 11.10.2026 (Александр: «комменты под новостями и событиями, UI как под
// постами»). Комментарии к новостям и событиям живут у нас, а не в бэкенде
// приложения: у новости нет «поста» в бэкенде, а заводить служебные посты --
// значит лезть в ядро и рисковать лентой. По записи на страницу:
// a1/comments/<news|event>/<slug>.json. 14.10.2026: хранилище -- база на Railway
// (lib/kv/store.ts), раньше было Vercel Blob.

if (typeof window !== "undefined") {
  throw new Error("[lib/comments/site-store] imported from the browser — server-only");
}

import { kvConfigured, kvGetJson, kvPutJson } from "@/lib/kv/store";

const PREFIX = "a1/comments/";

export type SiteKind = "news" | "event";

export type StoredReaction = { emoticon: string; userId: string; date: string; name: string; avatarUrl: string | null };

export type StoredComment = {
  id: number;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  text: string;
  /** Наліпка или гифка: документ в том виде, в каком его отдаёт панель. */
  media: unknown[];
  createdAt: string;
  editedAt: string | null;
  replyToId: number | null;
  reactions: StoredReaction[];
};

export type SiteThread = { v: 1; nextId: number; items: StoredComment[] };

export const MAX_COMMENTS_PER_THREAD = 1000;

const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,120}$/;

export function parseKey(raw: string): { kind: SiteKind; slug: string } | null {
  const i = raw.indexOf(":");
  if (i < 0) return null;
  const kind = raw.slice(0, i);
  const slug = raw.slice(i + 1);
  if ((kind !== "news" && kind !== "event") || !SLUG_RE.test(slug) || slug.includes("..")) return null;
  return { kind, slug };
}

function pathOf(kind: SiteKind, slug: string): string {
  return `${PREFIX}${kind}/${slug}.json`;
}

const EMPTY = (): SiteThread => ({ v: 1, nextId: 1, items: [] });

/** null -- хранилище не ответило (не путать с «комментариев нет»). */
export async function readThread(kind: SiteKind, slug: string): Promise<SiteThread | null> {
  if (!kvConfigured()) return null;
  try {
    const json = await kvGetJson<SiteThread>(pathOf(kind, slug));
    if (!json) return EMPTY();
    if (json.v !== 1 || !Array.isArray(json.items)) return null;
    return json;
  } catch {
    return null;
  }
}

async function writeThread(kind: SiteKind, slug: string, thread: SiteThread): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    await kvPutJson(pathOf(kind, slug), thread);
    return true;
  } catch {
    return false;
  }
}

// Один процесс -- одна очередь на страницу: два комментария, пришедшие
// одновременно, не затрут друг друга. Комментариев мало, этого хватает.
const queues = new Map<string, Promise<unknown>>();

/**
 * Прочитать страницу, изменить, записать. `fn` возвращает результат либо
 * бросает { code } -- тогда ничего не пишется.
 */
export async function mutateThread<T>(
  kind: SiteKind,
  slug: string,
  fn: (thread: SiteThread) => T,
): Promise<{ ok: true; value: T } | { ok: false; code: string }> {
  const key = `${kind}:${slug}`;
  const prev = queues.get(key) ?? Promise.resolve();
  const run = prev.then(async () => {
    const thread = await readThread(kind, slug);
    if (!thread) return { ok: false as const, code: "storage" };
    let value: T;
    try {
      value = fn(thread);
    } catch (e) {
      return { ok: false as const, code: (e as { code?: string })?.code ?? "failed" };
    }
    const saved = await writeThread(kind, slug, thread);
    return saved ? { ok: true as const, value } : { ok: false as const, code: "storage" };
  });
  queues.set(
    key,
    run.catch(() => undefined),
  );
  return run;
}

export class CodeError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
