// lib/a1/cloud-accounts.ts
//
// 2026-09-20 (Александр: «все спарсенные акки должны быть в админке,
// чтобы я мог передать их компаниям потом»).
//
// Компании, заведённые уже самим парсером в облаке, в переменную
// TECHNICAL_ACCOUNTS_JSON не попадают -- она статична и обновляется
// руками. Их аккаунты лежали только на диске Railway, поэтому в админке
// таких компаний не было вовсе. Теперь парсер выкладывает их в общий
// шкафчик, а этот файл его читает. 14.10.2026: шкафчик -- база на Railway
// (lib/kv/store.ts), парсер присылает файл через app/api/admin/cloud-accounts;
// раньше это был Vercel Blob.
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
import { kvConfigured, kvGet, kvPut } from "@/lib/kv/store";

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/cloud-accounts] imported from the browser — this must stay server-only");
}

const BLOB_PATHNAME = "a1/cloud-accounts.enc";
// 2026-10-07: компании из gambling_companies.json (162+3 работодателя),
// заведённые разово скриптом gamble_onboard.py, а не парсером. Отдельный
// файл в том же хранилище и с тем же ключом: парсер при каждом проходе
// перезаписывает свой cloud-accounts.enc целиком, и дописанные туда
// чужие аккаунты пропали бы на следующий же день.
const EXTRA_PATHNAMES = ["a1/gamble-accounts.enc"];
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

async function loadOne(secret: string, pathname: string): Promise<CloudAccount[]> {
  const payload = await kvGet(pathname);
  if (!payload) return [];
  const json = decrypt(payload, secret);
  if (!json) return [];
  const parsed = z.array(CloudAccountSchema).safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : [];
}

async function load(): Promise<CloudAccount[]> {
  const secret = (process.env.A1_ACCOUNTS_SECRET ?? "").trim();
  if (!kvConfigured() || !secret) return [];

  // Каждый файл отдельно: битый или отсутствующий дополнительный файл
  // не должен прятать основной список парсера.
  const lists = await Promise.all(
    [BLOB_PATHNAME, ...EXTRA_PATHNAMES].map((p) => loadOne(secret, p).catch(() => [] as CloudAccount[])),
  );
  const byEmail = new Map<string, CloudAccount>();
  for (const rows of lists) for (const row of rows) if (!byEmail.has(row.email)) byEmail.set(row.email, row);
  return Array.from(byEmail.values());
}

/** Парсер (accounts_store.py) присылает зашифрованный файл сюда: app/api/admin/cloud-accounts. */
export const CLOUD_ACCOUNT_PATHS = [BLOB_PATHNAME, ...EXTRA_PATHNAMES];

export async function saveCloudAccountsFile(pathname: string, payload: Buffer): Promise<boolean> {
  if (!CLOUD_ACCOUNT_PATHS.includes(pathname) || !kvConfigured()) return false;
  if (payload.subarray(0, MAGIC.length).toString("utf8") !== MAGIC) return false;
  await kvPut(pathname, payload);
  cached = null;
  return true;
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
  const configured = Boolean(kvConfigured() && process.env.A1_ACCOUNTS_SECRET);
  const rows = configured ? await fetchCloudAccounts() : [];
  return { configured, count: rows.length, cachedAt: cached?.at ?? null };
}
