// lib/comments/site-store.ts
//
// 11.10.2026 (Александр: «комменты под новостями и событиями, UI как под
// постами»). Комментарии к новостям и событиям живут у нас, а не в бэкенде
// приложения: у новости нет «поста» в бэкенде, а заводить служебные посты --
// значит лезть в ядро и рисковать лентой. Хранилище -- Vercel Blob, по
// файлу на страницу: a1/comments/<news|event>/<slug>.json. Тот же приём, что
// у новостей (lib/news/dynamic-store.ts). Секретов здесь нет, токен берётся из
// BLOB_READ_WRITE_TOKEN на сервере.

if (typeof window !== "undefined") {
  throw new Error("[lib/comments/site-store] imported from the browser — server-only");
}

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
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

function pathOf(kind: SiteKind, slug: string): string {
  return `${PREFIX}${kind}/${slug}.json`;
}

// Только для проверки на своей машине (never в проде): файлы вместо Blob.
function localDir(): string | null {
  return process.env.NODE_ENV !== "production" ? (process.env.SITE_COMMENTS_LOCAL_DIR ?? null) : null;
}

const EMPTY = (): SiteThread => ({ v: 1, nextId: 1, items: [] });

/** null -- хранилище не ответило (не путать с «комментариев нет»). */
export async function readThread(kind: SiteKind, slug: string): Promise<SiteThread | null> {
  const dir = localDir();
  if (dir) {
    const fs = await import("node:fs/promises");
    try {
      return JSON.parse(await fs.readFile(`${dir}/${kind}-${slug}.json`, "utf8")) as SiteThread;
    } catch {
      return EMPTY();
    }
  }
  const tok = token();
  if (!tok) return null;
  const pathname = pathOf(kind, slug);
  try {
    const qs = new URLSearchParams({ prefix: pathname, limit: "5" });
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { blobs?: { pathname?: string; url?: string; downloadUrl?: string }[] };
    const row = (data.blobs ?? []).find((b) => b.pathname === pathname);
    if (!row) return EMPTY();
    const url = row.downloadUrl ?? row.url;
    if (!url) return null;
    const file = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
    if (!file.ok) return null;
    const json = (await file.json()) as SiteThread;
    if (!json || json.v !== 1 || !Array.isArray(json.items)) return null;
    return json;
  } catch {
    return null;
  }
}

async function writeThread(kind: SiteKind, slug: string, thread: SiteThread): Promise<boolean> {
  const dir = localDir();
  if (dir) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(`${dir}/${kind}-${slug}.json`, JSON.stringify(thread));
    return true;
  }
  const tok = token();
  if (!tok) return false;
  try {
    const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(pathOf(kind, slug))}`, {
      method: "PUT",
      body: JSON.stringify(thread),
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
