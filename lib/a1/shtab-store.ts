// lib/a1/shtab-store.ts
//
// 09.10.2026 (Александр: «чтобы я понимал, отработал он сегодня или не
// отработал… что они не отвалились, по графику сработают»). Штаб агентов:
// каждый агент в конце запуска присылает короткий «пульс» (работаю /
// отработал / ошибка + итог), страница /admin/shtab его показывает.
//
// Хранилище -- то же Vercel Blob, что и у облачных аккаунтов
// (lib/a1/cloud-accounts.ts), по одному файлу на агента:
// a1/shtab/<агент>.json. Один файл на агента -- чтобы два агента, которые
// пишут одновременно, не затирали друг друга. Токен и адрес API -- те же,
// что у парсера (a1-dou-runner/accounts_store.py), см. там про версию 12.
//
// Секретов в этом файле нет (репозиторий публичный): токен берётся из
// BLOB_READ_WRITE_TOKEN на сервере.

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/shtab-store] imported from the browser — this must stay server-only");
}

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PREFIX = "a1/shtab/";

export type PulseStatus = "working" | "ok" | "error";

export type PulseSnapshot = {
  status: Exclude<PulseStatus, "working">;
  finishedAt: string;
  published: number | null;
  errors: number | null;
  note: string;
};

export type PulseRecord = {
  agent: string;
  status: PulseStatus;
  /** Когда начался текущий (или последний) запуск, ISO. */
  startedAt: string;
  /** Когда закончился последний запуск, ISO; у работающего -- пусто. */
  finishedAt: string | null;
  published: number | null;
  errors: number | null;
  /** Дневной лимит публикаций, который агент назвал сам (из своих настроек). */
  limit?: number | null;
  note: string;
  /** Итог предыдущего законченного запуска -- пока идёт новый. */
  prev: PulseSnapshot | null;
};

function storeIdFrom(token: string): string {
  const parts = token.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  return raw.startsWith("store_") ? raw.slice("store_".length) : raw;
}

function token(): string {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

function headers(tok: string): Record<string, string> {
  return {
    authorization: `Bearer ${tok}`,
    "x-api-version": BLOB_API_VERSION,
    "x-vercel-blob-store-id": storeIdFrom(tok),
  };
}

function pathOf(agent: string): string {
  return `${PREFIX}${agent}.json`;
}

type BlobRow = { pathname?: string; url?: string; downloadUrl?: string };

async function listBlobs(tok: string, prefix: string, limit: number): Promise<BlobRow[] | null> {
  const qs = new URLSearchParams({ prefix, limit: String(limit) });
  try {
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { blobs?: BlobRow[] };
    return data.blobs ?? [];
  } catch {
    return null;
  }
}

async function readRecord(tok: string, url: string): Promise<PulseRecord | null> {
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as PulseRecord;
    return json && typeof json.agent === "string" ? json : null;
  } catch {
    return null;
  }
}

/** Все записи агентов: агент -> запись. Нет токена или хранилище молчит -- пустой список. */
export async function loadPulses(): Promise<Record<string, PulseRecord>> {
  const tok = token();
  if (!tok) return {};
  const blobs = await listBlobs(tok, PREFIX, 200);
  if (!blobs) return {};
  const out: Record<string, PulseRecord> = {};
  await Promise.all(
    blobs.map(async (b) => {
      const url = b.downloadUrl ?? b.url;
      if (!url || !b.pathname?.endsWith(".json")) return;
      const rec = await readRecord(tok, url);
      if (rec) out[rec.agent] = rec;
    }),
  );
  return out;
}

async function put(tok: string, pathname: string, body: string): Promise<boolean> {
  const url = `${BLOB_API}/?pathname=${encodeURIComponent(pathname)}`;
  try {
    const res = await fetch(url, {
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

export type PulseInput = {
  agent: string;
  status: PulseStatus;
  note?: string;
  published?: number | null;
  errors?: number | null;
  limit?: number | null;
};

/** Принимает пульс от агента. Время ставит сервер, а не агент. true -- записано. */
export async function savePulse(input: PulseInput): Promise<boolean> {
  const tok = token();
  if (!tok) return false;

  const nowIso = new Date().toISOString();
  const path = pathOf(input.agent);
  const found = await listBlobs(tok, path, 5);
  const hit = found?.find((b) => b.pathname === path);
  const existingUrl = hit?.downloadUrl ?? hit?.url ?? null;
  const existing = existingUrl ? await readRecord(tok, existingUrl) : null;

  let rec: PulseRecord;
  if (input.status === "working") {
    const prev: PulseSnapshot | null =
      existing && existing.status !== "working" && existing.finishedAt
        ? {
            status: existing.status,
            finishedAt: existing.finishedAt,
            published: existing.published,
            errors: existing.errors,
            note: existing.note,
          }
        : existing?.prev ?? null;
    rec = {
      agent: input.agent,
      status: "working",
      startedAt: nowIso,
      finishedAt: null,
      published: null,
      errors: null,
      note: input.note ?? "",
      limit: input.limit ?? existing?.limit ?? null,
      prev,
    };
  } else {
    rec = {
      agent: input.agent,
      status: input.status,
      startedAt: existing?.status === "working" ? existing.startedAt : nowIso,
      finishedAt: nowIso,
      published: input.published ?? null,
      errors: input.errors ?? null,
      note: input.note ?? "",
      limit: input.limit ?? existing?.limit ?? null,
      prev: existing?.prev ?? null,
    };
  }
  return put(tok, path, JSON.stringify(rec));
}
