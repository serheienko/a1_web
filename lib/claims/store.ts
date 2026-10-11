// lib/claims/store.ts
//
// 11.10.2026 (Александр: «обязательно сделать кнопку забрать компанию для
// всех»). Заявки на передачу профиля от компаний, которых нельзя проверить
// автоматически.
//
// Автоматический путь живёт в бэкенде (auth.claimRequest): адрес должен быть
// на домене, который компания сама показала -- сайт в профиле или своя
// careers-ссылка в вакансии. Замер 11.10.2026: сайт в профиле есть примерно у
// шести компаний из десяти, значит у остальных правилу не на что опереться, и
// без человека они свой профиль не получат никогда.
//
// Такие заявки складываются сюда, в Vercel Blob (один файл a1/claims/
// requests.json -- их единицы, не тысячи), и разбираются на /admin/claims.
//
// Секретов здесь нет (репозиторий публичный): токен -- BLOB_READ_WRITE_TOKEN.

if (typeof window !== "undefined") {
  throw new Error("[lib/claims/store] imported from the browser — server-only");
}

import { randomUUID } from "node:crypto";

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PATH = "a1/claims/requests.json";

export type ClaimTarget = { kind: "post"; postId: string } | { kind: "username"; username: string };

export type ClaimRequestRow = {
  id: string;
  createdAt: string;
  target: ClaimTarget;
  /** Ник компании для показа в списке; может быть пустым, если пришли с вакансии. */
  company: string;
  /** Адрес, на который компания хочет перевести аккаунт. */
  email: string;
  /** Сайт компании, как она его назвала. */
  site: string;
  note: string;
  status: "new" | "granted" | "rejected";
  handledAt?: string;
  /** Выданная ссылка -- чтобы админ мог скопировать её ещё раз. */
  link?: string;
};

type File = { v: 1; rows: ClaimRequestRow[] };

/** Больше не храним: старые разобранные заявки обрезаются при записи. */
const MAX_ROWS = 500;

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

function localFile(): string | null {
  return process.env.NODE_ENV !== "production" ? (process.env.CLAIMS_LOCAL_FILE ?? null) : null;
}

/** null -- хранилище не ответило (не то же самое, что «заявок нет»). */
export async function loadClaims(): Promise<ClaimRequestRow[] | null> {
  const local = localFile();
  if (local) {
    const fs = await import("node:fs/promises");
    try {
      return (JSON.parse(await fs.readFile(local, "utf8")) as File).rows;
    } catch {
      return [];
    }
  }
  const tok = token();
  if (!tok) return null;
  try {
    const qs = new URLSearchParams({ prefix: PATH, limit: "5" });
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { blobs?: { pathname?: string; url?: string; downloadUrl?: string }[] };
    const row = (data.blobs ?? []).find((b) => b.pathname === PATH);
    if (!row) return [];
    const url = row.downloadUrl ?? row.url;
    if (!url) return null;
    const file = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
    if (!file.ok) return null;
    const json = (await file.json()) as File;
    return json && json.v === 1 && Array.isArray(json.rows) ? json.rows : null;
  } catch {
    return null;
  }
}

async function save(rows: ClaimRequestRow[]): Promise<boolean> {
  const body = JSON.stringify({ v: 1, rows: rows.slice(-MAX_ROWS) } satisfies File);
  const local = localFile();
  if (local) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(local, body);
    return true;
  }
  const tok = token();
  if (!tok) return false;
  try {
    const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(PATH)}`, {
      method: "PUT",
      body,
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

// Заявки приходят редко, но «прочитал-изменил-записал» без очереди всё равно
// теряет записи, когда две приходят в одну секунду.
let queue: Promise<unknown> = Promise.resolve();

async function change<T>(fn: (rows: ClaimRequestRow[]) => T): Promise<{ ok: true; value: T } | { ok: false }> {
  const run = queue.then(async () => {
    const rows = await loadClaims();
    if (!rows) return { ok: false as const };
    const value = fn(rows);
    return (await save(rows)) ? { ok: true as const, value } : { ok: false as const };
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function addClaimRequest(input: Omit<ClaimRequestRow, "id" | "createdAt" | "status">): Promise<boolean> {
  const row: ClaimRequestRow = {
    ...input,
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  const res = await change((rows) => {
    rows.push(row);
  });
  return res.ok;
}

export async function setClaimStatus(
  id: string,
  status: ClaimRequestRow["status"],
  link?: string,
): Promise<ClaimRequestRow | null> {
  let found: ClaimRequestRow | null = null;
  const res = await change((rows) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    row.status = status;
    row.handledAt = new Date().toISOString();
    if (link) row.link = link;
    found = row;
  });
  return res.ok ? found : null;
}
