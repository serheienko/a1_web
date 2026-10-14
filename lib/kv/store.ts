// lib/kv/store.ts
//
// 14.10.2026 (Александр: «мы ж с Верселем не дружим уже» -> «переносим на Railway»). Общее хранилище
// сайта: «Перші 250», штаб, Разведчик, «Події», новости агентов, комментарии, заявки компаний,
// статистика, аккаунты компаний. Раньше всё это лежало файлами в Vercel Blob, и Vercel отдавал
// серверу на Railway старые копии (штаб показывал «работает» у давно отработавших агентов).
//
// Теперь -- одна таблица в Postgres на Railway (сервис a1-store, переменная KV_DATABASE_URL):
// «путь -> содержимое», как раньше файлы. Пути прежние (a1/first250/<id>.json и т.д.), поэтому
// хранилища поменялись только в том, КАК читают и пишут, а не ЧТО.
//
// Для проверки на своей машине без базы: KV_LOCAL_DIR=<папка> (только не в проде) -- файлы на диске.
//
// Секретов в файле нет: адрес базы с паролем -- в переменной на сервере.

import postgres from "postgres";

if (typeof window !== "undefined") {
  throw new Error("[lib/kv/store] imported from the browser — this must stay server-only");
}

export type KvRow = { path: string; createdAt: string; updatedAt: string; size: number };
export type KvItem = KvRow & { body: Buffer };

type Sql = ReturnType<typeof postgres>;

let sqlClient: Sql | null = null;
let ready: Promise<void> | null = null;

function localDir(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return (process.env.KV_LOCAL_DIR ?? "").trim() || null;
}

function dbUrl(): string {
  // Во время сборки на Railway внутренней сети нет -- базу не трогаем вовсе (страницы соберутся пустыми
  // и обновятся сами: app/api/ready сбрасывает их кеш, когда новая версия поднялась).
  if (process.env.NEXT_PHASE === "phase-production-build") return "";
  return (process.env.KV_DATABASE_URL ?? "").trim();
}

/** Есть ли куда писать: база (или локальная папка при разработке). */
export function kvConfigured(): boolean {
  return Boolean(dbUrl() || localDir());
}

async function db(): Promise<Sql> {
  const url = dbUrl();
  if (!url) throw new Error("KV_DATABASE_URL is not set");
  if (!sqlClient) {
    sqlClient = postgres(url, {
      max: 5,
      idle_timeout: 60,
      connect_timeout: 15,
      prepare: false,
      onnotice: () => {},
    });
  }
  if (!ready) {
    const sql = sqlClient;
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS a1_kv (
          path text PRIMARY KEY,
          body bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS a1_kv_path_prefix ON a1_kv (path text_pattern_ops)`;
    })().catch((e) => {
      ready = null; // следующий вызов попробует снова
      throw e;
    });
  }
  await ready;
  return sqlClient;
}

function likePrefix(prefix: string): string {
  return prefix.replace(/[\\%_]/g, (c) => `\\${c}`) + "%";
}

function toBuf(body: string | Buffer | Uint8Array): Buffer {
  return typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body);
}

function iso(d: unknown): string {
  return d instanceof Date ? d.toISOString() : String(d ?? "");
}

// ---------- локальная папка (только разработка) ----------
async function localFile(path: string): Promise<string> {
  const dir = localDir()!;
  return `${dir}/${path.replaceAll("/", "__")}`;
}

async function localList(prefix: string): Promise<KvRow[]> {
  const fs = await import("node:fs/promises");
  const dir = localDir()!;
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const out: KvRow[] = [];
  for (const n of names) {
    const path = n.replaceAll("__", "/");
    if (!path.startsWith(prefix)) continue;
    const st = await fs.stat(`${dir}/${n}`);
    out.push({ path, createdAt: st.birthtime.toISOString(), updatedAt: st.mtime.toISOString(), size: st.size });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------- API ----------

/** Содержимое по пути; null -- такого пути нет. Ошибка базы -- исключение. */
export async function kvGet(path: string): Promise<Buffer | null> {
  if (localDir() && !dbUrl()) {
    const fs = await import("node:fs/promises");
    try {
      return await fs.readFile(await localFile(path));
    } catch {
      return null;
    }
  }
  const sql = await db();
  const rows = await sql<{ body: Buffer }[]>`SELECT body FROM a1_kv WHERE path = ${path}`;
  return rows[0]?.body ?? null;
}

export async function kvGetText(path: string): Promise<string | null> {
  const b = await kvGet(path);
  return b ? b.toString("utf8") : null;
}

/** JSON по пути; null -- пути нет. Битый JSON -- исключение. */
export async function kvGetJson<T>(path: string): Promise<T | null> {
  const t = await kvGetText(path);
  return t === null ? null : (JSON.parse(t) as T);
}

/**
 * Записать. overwrite=false -- только если пути ещё нет (иначе "exists").
 * createdAt -- для переноса из Vercel Blob (сохранить исходное время), обычно не нужен.
 */
export async function kvPut(
  path: string,
  body: string | Buffer | Uint8Array,
  opts: { overwrite?: boolean; createdAt?: string; updatedAt?: string } = {},
): Promise<"ok" | "exists"> {
  const overwrite = opts.overwrite ?? true;
  const buf = toBuf(body);
  if (localDir() && !dbUrl()) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(localDir()!, { recursive: true });
    const f = await localFile(path);
    if (!overwrite) {
      try {
        await fs.access(f);
        return "exists";
      } catch {
        // нет файла -- пишем
      }
    }
    await fs.writeFile(f, buf);
    return "ok";
  }
  const sql = await db();
  const created = opts.createdAt ? new Date(opts.createdAt) : new Date();
  const updated = opts.updatedAt ? new Date(opts.updatedAt) : new Date();
  if (overwrite) {
    await sql`
      INSERT INTO a1_kv (path, body, created_at, updated_at) VALUES (${path}, ${buf}, ${created}, ${updated})
      ON CONFLICT (path) DO UPDATE SET body = EXCLUDED.body, updated_at = EXCLUDED.updated_at`;
    return "ok";
  }
  const rows = await sql`
    INSERT INTO a1_kv (path, body, created_at, updated_at) VALUES (${path}, ${buf}, ${created}, ${updated})
    ON CONFLICT (path) DO NOTHING RETURNING path`;
  return rows.length ? "ok" : "exists";
}

export async function kvPutJson(path: string, value: unknown, opts?: { overwrite?: boolean }): Promise<"ok" | "exists"> {
  return kvPut(path, JSON.stringify(value), opts);
}

/** Пути с префиксом, по алфавиту. */
export async function kvList(prefix: string): Promise<KvRow[]> {
  if (localDir() && !dbUrl()) return localList(prefix);
  const sql = await db();
  const rows = await sql<{ path: string; created_at: Date; updated_at: Date; size: number }[]>`
    SELECT path, created_at, updated_at, octet_length(body) AS size FROM a1_kv
    WHERE path LIKE ${likePrefix(prefix)} ORDER BY path`;
  return rows.map((r) => ({ path: r.path, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), size: Number(r.size) }));
}

/** Пути с префиксом вместе с содержимым -- одним запросом. */
export async function kvGetMany(prefix: string): Promise<KvItem[]> {
  if (localDir() && !dbUrl()) {
    const rows = await localList(prefix);
    const fs = await import("node:fs/promises");
    return Promise.all(rows.map(async (r) => ({ ...r, body: await fs.readFile(await localFile(r.path)) })));
  }
  const sql = await db();
  const rows = await sql<{ path: string; body: Buffer; created_at: Date; updated_at: Date }[]>`
    SELECT path, body, created_at, updated_at FROM a1_kv WHERE path LIKE ${likePrefix(prefix)} ORDER BY path`;
  return rows.map((r) => ({
    path: r.path,
    body: r.body,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    size: r.body.length,
  }));
}

export async function kvDelete(paths: string[]): Promise<void> {
  if (!paths.length) return;
  if (localDir() && !dbUrl()) {
    const fs = await import("node:fs/promises");
    await Promise.all(paths.map(async (p) => fs.rm(await localFile(p), { force: true })));
    return;
  }
  const sql = await db();
  await sql`DELETE FROM a1_kv WHERE path = ANY(${paths})`;
}

/** Время последнего изменения пути (для переноса из Blob). */
export async function kvUpdatedAt(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length || !dbUrl()) return out;
  const sql = await db();
  const rows = await sql<{ path: string; updated_at: Date }[]>`SELECT path, updated_at FROM a1_kv WHERE path = ANY(${paths})`;
  for (const r of rows) out.set(r.path, iso(r.updated_at));
  return out;
}
