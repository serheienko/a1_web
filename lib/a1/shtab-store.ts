// lib/a1/shtab-store.ts
//
// 09.10.2026 (Александр: «чтобы я понимал, отработал он сегодня или не
// отработал… что они не отвалились, по графику сработают»). Штаб агентов:
// каждый агент в конце запуска присылает короткий «пульс» (работаю /
// отработал / ошибка + итог), страница /admin/shtab его показывает.
//
// Хранилище -- общее хранилище сайта (lib/kv/store.ts, база на Railway), по
// одной записи на агента: a1/shtab/<агент>.json -- чтобы два агента, которые
// пишут одновременно, не затирали друг друга.
//
// 14.10.2026: до этого было Vercel Blob, и Vercel отдавал серверу на Railway
// старые копии -- штаб показывал «работает»/«завис» у давно отработавших агентов.

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/shtab-store] imported from the browser — this must stay server-only");
}

import { kvConfigured, kvGet, kvGetMany, kvPutJson } from "@/lib/kv/store";

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

function pathOf(agent: string): string {
  return `${PREFIX}${agent}.json`;
}

function parseRecord(body: Buffer | null): PulseRecord | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body.toString("utf8")) as PulseRecord;
    return json && typeof json.agent === "string" ? json : null;
  } catch {
    return null;
  }
}

/** Все записи агентов: агент -> запись. Хранилище молчит -- пустой список. */
export async function loadPulses(): Promise<Record<string, PulseRecord>> {
  if (!kvConfigured()) return {};
  const out: Record<string, PulseRecord> = {};
  try {
    for (const row of await kvGetMany(PREFIX)) {
      if (!row.path.endsWith(".json")) continue;
      const rec = parseRecord(row.body);
      if (rec) out[rec.agent] = rec;
    }
  } catch {
    return {};
  }
  return out;
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
  if (!kvConfigured()) return false;

  const nowIso = new Date().toISOString();
  const path = pathOf(input.agent);
  let existing: PulseRecord | null = null;
  try {
    existing = parseRecord(await kvGet(path));
  } catch {
    return false;
  }

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
  try {
    await kvPutJson(path, rec);
    return true;
  } catch {
    return false;
  }
}
