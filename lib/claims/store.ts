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
// Такие заявки складываются сюда (одна запись a1/claims/requests.json -- их
// единицы, не тысячи) и разбираются на /admin/claims. Хранилище -- база на
// Railway (lib/kv/store.ts); до 14.10.2026 было Vercel Blob.

if (typeof window !== "undefined") {
  throw new Error("[lib/claims/store] imported from the browser — server-only");
}

import { randomUUID } from "node:crypto";
import { kvConfigured, kvGetJson, kvPutJson } from "@/lib/kv/store";

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

/** null -- хранилище не ответило (не то же самое, что «заявок нет»). */
export async function loadClaims(): Promise<ClaimRequestRow[] | null> {
  if (!kvConfigured()) return null;
  try {
    const json = await kvGetJson<File>(PATH);
    if (!json) return [];
    return json.v === 1 && Array.isArray(json.rows) ? json.rows : null;
  } catch {
    return null;
  }
}

async function save(rows: ClaimRequestRow[]): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    await kvPutJson(PATH, { v: 1, rows: rows.slice(-MAX_ROWS) } satisfies File);
    return true;
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
