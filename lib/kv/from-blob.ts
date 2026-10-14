// lib/kv/from-blob.ts
//
// 14.10.2026: перенос данных из Vercel Blob в общее хранилище на Railway (lib/kv/store.ts).
// Идёт сам: при старте сервера (до того, как Railway пустит на него людей -- app/api/ready) и потом
// раз в полчаса, пока на сервере есть BLOB_READ_WRITE_TOKEN. Копирует только то, чего в базе нет
// или что в Blob новее (например, если старая версия сайта успела что-то записать во время
// переключения). Когда всё перенесено и проверено -- токен с сервера убирается, перенос
// выключается сам, Vercel можно закрывать.

import { kvConfigured, kvGetJson, kvPut, kvPutJson, kvUpdatedAt } from "./store";

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";

type BlobRow = { pathname?: string; url?: string; downloadUrl?: string; uploadedAt?: string };

export type SyncResult = { at: string; listed: number; copied: number; skipped: number; failed: number; error?: string };

let last: SyncResult | null = null;
let running: Promise<SyncResult> | null = null;

export async function lastBlobSync(): Promise<SyncResult | null> {
  return last ?? (await kvGetJson<SyncResult>("_meta/blob-sync.json").catch(() => null));
}

function token(): string {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

export function blobSyncEnabled(): boolean {
  return Boolean(token() && kvConfigured() && (process.env.KV_DATABASE_URL ?? "").trim());
}

function headers(tok: string): Record<string, string> {
  const parts = tok.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  const storeId = raw.startsWith("store_") ? raw.slice("store_".length) : raw;
  return { authorization: `Bearer ${tok}`, "x-api-version": BLOB_API_VERSION, "x-vercel-blob-store-id": storeId };
}

async function listAll(tok: string): Promise<BlobRow[]> {
  const out: BlobRow[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 200; page++) {
    const qs = new URLSearchParams({ limit: "1000" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) throw new Error(`blob list ${res.status}`);
    const data = (await res.json()) as { blobs?: BlobRow[]; cursor?: string; hasMore?: boolean };
    out.push(...(data.blobs ?? []));
    if (!data.hasMore || !data.cursor) break;
    cursor = data.cursor;
  }
  return out;
}

async function runSync(): Promise<SyncResult> {
  const tok = token();
  const res: SyncResult = { at: new Date().toISOString(), listed: 0, copied: 0, skipped: 0, failed: 0 };
  try {
    const blobs = (await listAll(tok)).filter((b) => b.pathname && (b.downloadUrl || b.url));
    res.listed = blobs.length;
    const have = await kvUpdatedAt(blobs.map((b) => b.pathname!));
    const todo = blobs.filter((b) => {
      const mine = have.get(b.pathname!);
      return !mine || (b.uploadedAt && Date.parse(b.uploadedAt) > Date.parse(mine) + 1000);
    });
    res.skipped = blobs.length - todo.length;
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const b = todo[i++]!;
        try {
          const r = await fetch((b.downloadUrl || b.url)!, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
          if (!r.ok) throw new Error(String(r.status));
          const body = Buffer.from(await r.arrayBuffer());
          const at = b.uploadedAt || new Date().toISOString();
          await kvPut(b.pathname!, body, { createdAt: at, updatedAt: at });
          res.copied++;
        } catch {
          res.failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
  } catch (e) {
    res.error = String((e as Error)?.message ?? e).slice(0, 200);
  }
  console.log(`[kv] перенос из Vercel Blob: в Blob ${res.listed}, скопировано ${res.copied}, уже есть ${res.skipped}, сбоев ${res.failed}${res.error ? `, ошибка ${res.error}` : ""}`);
  last = res;
  // Итог -- в саму базу: у каждой страницы Next свой экземпляр модуля, а /api/kv/status хочет его видеть.
  await kvPutJson("_meta/blob-sync.json", res).catch(() => {});
  return res;
}

/** Один перенос за раз; повторный вызов во время переноса ждёт тот же. */
export function syncFromBlob(): Promise<SyncResult | null> {
  if (!blobSyncEnabled()) return Promise.resolve(null);
  if (!running) {
    running = runSync().finally(() => {
      running = null;
    });
  }
  return running;
}
