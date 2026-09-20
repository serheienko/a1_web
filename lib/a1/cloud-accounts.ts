// lib/a1/cloud-accounts.ts
//
// 2026-09-20 (Александр: «все спарсенные акки должны быть в админке,
// чтобы я мог передать их компаниям потом»).
//
// Компании, заведённые уже самим парсером в облаке, в переменную
// TECHNICAL_ACCOUNTS_JSON не попадают -- она статична и обновляется
// руками. Их аккаунты лежали только на диске Railway, поэтому в админке
// таких компаний не было вовсе. Теперь парсер выкладывает их в общий
// шкафчик (хранилище Vercel Blob), а этот файл его читает.
//
// Формат файла задаёт парсер, accounts_store.py:
//
//     "A1ENC1" | nonce (12 байт) | шифротекст AES-256-GCM с меткой
//
// Ключ -- SHA-256 от строки A1_ACCOUNTS_SECRET (одинаковой здесь и на
// Railway). Шифруем потому, что внутри настоящие пароли: даже если
// адрес файла в хранилище когда-нибудь утечёт, без ключа он бесполезен.
//
// КЕШ В ПАМЯТИ, А НЕ unstable_cache. Обычный кеш данных Next пишет
// значение на диск/в общее хранилище, а здесь пароли -- им место только
// в памяти живого процесса, ровно как переменной окружения. Пять минут
// достаточно: список меняется парой строк в сутки.
//
// Любая беда -- пустой список, а не исключение: админка должна показать
// «только старые компании», а не упасть целиком. Ровно то же правило,
// что у lib/a1/admin-accounts.ts.

import { createDecipheriv, createHash } from "node:crypto";
import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/cloud-accounts] imported from the browser — this must stay server-only");
}

const BLOB_PATHNAME = "a1/cloud-accounts.enc";
const MAGIC = "A1ENC1";
const TTL_MS = 5 * 60 * 1000;

const CloudAccountSchema = z.object({
  name: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type CloudAccount = z.infer<typeof CloudAccountSchema>;

let cached: { at: number; rows: CloudAccount[] } | null = null;
let loading: Promise<CloudAccount[]> | null = null;

// 20.09.2026, ВТОРОЙ ЗАХОД. Первая версия ходила на
// blob.vercel-storage.com -- этот адрес больше не отвечает на такие
// запросы («Cannot get store id from token or header»). Настоящий
// адрес API, версия и заголовок с номером хранилища взяты из
// исходников официальной библиотеки @vercel/blob
// (packages/blob/src/{helpers,api,list}.ts). Парсер пишет в тот же
// адрес -- accounts_store.py, держим их в согласии.
const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";

/** Номер хранилища зашит в сам токен: vercel_blob_rw_<номер>_<случайное>. */
function storeIdFrom(token: string): string {
  const parts = token.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  return raw.startsWith("store_") ? raw.slice("store_".length) : raw;
}

function apiHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "x-api-version": BLOB_API_VERSION,
    "x-vercel-blob-store-id": storeIdFrom(token),
  };
}

async function findBlobUrl(token: string): Promise<string | null> {
  const qs = new URLSearchParams({ prefix: BLOB_PATHNAME, limit: "10" });
  try {
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, {
      headers: apiHeaders(token),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      blobs?: Array<{ pathname?: string; url?: string; downloadUrl?: string }>;
    };
    const list = data.blobs ?? [];
    const hit = list.find((b) => b.pathname === BLOB_PATHNAME) ?? list[0];
    // downloadUrl отдаёт файл как вложение -- нам всё равно, читаем байты.
    return hit?.downloadUrl ?? hit?.url ?? null;
  } catch {
    return null;
  }
}

function decrypt(payload: Buffer, secret: string): string | null {
  if (payload.length < MAGIC.length + 12 + 16) return null;
  if (payload.subarray(0, MAGIC.length).toString("utf8") !== MAGIC) return null;
  const key = createHash("sha256").update(secret, "utf8").digest();
  const nonce = payload.subarray(MAGIC.length, MAGIC.length + 12);
  const rest = payload.subarray(MAGIC.length + 12);
  // cryptography (Python) отдаёт шифротекст с меткой подлинности в
  // конце -- node хочет их отдельно.
  const tag = rest.subarray(rest.length - 16);
  const body = rest.subarray(0, rest.length - 16);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // не тот ключ или файл побился
    return null;
  }
}

async function load(): Promise<CloudAccount[]> {
  const token = (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
  const secret = (process.env.A1_ACCOUNTS_SECRET ?? "").trim();
  if (!token || !secret) return [];

  const url = await findBlobUrl(token);
  if (!url) return [];

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const json = decrypt(Buffer.from(await res.arrayBuffer()), secret);
  if (!json) return [];

  const parsed = z.array(CloudAccountSchema).safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : [];
}

/** Аккаунты компаний, заведённых парсером в облаке. Пустой список --
 *  это «пока не настроено» или «не достучались», а не ошибка. */
export async function fetchCloudAccounts(): Promise<CloudAccount[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rows;
  if (loading) return loading;

  loading = load()
    .catch(() => [] as CloudAccount[])
    .then((rows) => {
      cached = { at: Date.now(), rows };
      return rows;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

/** Для диагностики: сколько и когда. Паролей и почт не отдаёт. */
export async function describeCloudAccounts(): Promise<Record<string, unknown>> {
  const configured = Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.A1_ACCOUNTS_SECRET);
  const rows = configured ? await fetchCloudAccounts() : [];
  return { configured, count: rows.length, cachedAt: cached?.at ?? null };
}
