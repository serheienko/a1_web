// lib/first250/store.ts
//
// 14.10.2026 (Александр). Акция «Перші 250»: первые 250 человек, которые скачали A1 и заполнили
// профиль, получают Premium на год, когда он появится. Здесь -- список тех, кто забрал место.
//
// Хранение -- то же облачное хранилище файлов, что у счётчиков кликов (lib/stats/store.ts):
// ОДИН ФАЙЛ НА ЧЕЛОВЕКА, a1/first250/<userId>.json. Так два одновременных нажатия разных людей
// не затирают друг друга (общий файл пришлось бы читать-менять-писать без блокировки), а
// повторное нажатие того же человека просто находит его файл. Номер места -- порядок по
// времени записи файла.
//
// Секретов здесь нет (репозиторий публичный): токен -- BLOB_READ_WRITE_TOKEN на сервере.

if (typeof window !== "undefined") {
  throw new Error("[lib/first250/store] imported from the browser — server-only");
}

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PREFIX = "a1/first250/";

/** Сколько мест. Можно поменять переменной FIRST250_TOTAL без выкладки кода. */
export function totalSeats(): number {
  const n = Number(process.env.FIRST250_TOTAL ?? "");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 250;
}

export type First250Entry = {
  v: 1;
  userId: string;
  email: string;
  username: string | null;
  name: string;
  claimedAt: string;
};

export type First250Row = First250Entry & { place: number };

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

// Проверка на своей машине: вместо облака -- папка. В проде переменная не читается.
function localDir(): string | null {
  return process.env.NODE_ENV !== "production" ? (process.env.FIRST250_LOCAL_DIR ?? null) : null;
}

/** userId из бэкенда -- строка вида usr_...; в имя файла пускаем только безопасные символы. */
function fileOf(userId: string): string {
  return `${PREFIX}${userId.replace(/[^a-zA-Z0-9_-]/g, "")}.json`;
}

type BlobRow = { pathname: string; url: string; uploadedAt: string };

async function listAll(): Promise<BlobRow[]> {
  const dir = localDir();
  if (dir) {
    const fs = await import("node:fs/promises");
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const out: BlobRow[] = [];
    for (const n of names.filter((x) => x.endsWith(".json"))) {
      const st = await fs.stat(`${dir}/${n}`);
      out.push({ pathname: `${PREFIX}${n}`, url: `file://${dir}/${n}`, uploadedAt: st.mtime.toISOString() });
    }
    return out;
  }
  const tok = token();
  if (!tok) return [];
  const out: BlobRow[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ prefix: PREFIX, limit: "1000" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) throw new Error(`blob list ${res.status}`);
    const data = (await res.json()) as {
      blobs?: { pathname?: string; url?: string; downloadUrl?: string; uploadedAt?: string }[];
      cursor?: string;
      hasMore?: boolean;
    };
    for (const b of data.blobs ?? []) {
      if (b.pathname && (b.downloadUrl || b.url)) {
        out.push({ pathname: b.pathname, url: (b.downloadUrl || b.url)!, uploadedAt: b.uploadedAt ?? "" });
      }
    }
    if (!data.hasMore || !data.cursor) break;
    cursor = data.cursor;
  }
  return out;
}

/** Порядок мест: кто раньше записался, тот выше. */
function ordered(rows: BlobRow[]): BlobRow[] {
  return [...rows].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt) || a.pathname.localeCompare(b.pathname));
}

// Счётчик «осталось X» показываем всем посетителям -- не дёргаем хранилище на каждый заход.
let countCache: { n: number; at: number } | null = null;
const COUNT_TTL_MS = 20_000;

export async function takenCount(): Promise<number> {
  if (countCache && Date.now() - countCache.at < COUNT_TTL_MS) return countCache.n;
  const n = (await listAll()).length;
  countCache = { n, at: Date.now() };
  return n;
}

/** Место человека (1..N) или null, если он ещё не записывался. */
export async function placeOf(userId: string): Promise<number | null> {
  const want = fileOf(userId);
  const rows = ordered(await listAll());
  const i = rows.findIndex((r) => r.pathname === want);
  return i === -1 ? null : i + 1;
}

/** Записывает человека. Если он уже есть -- ничего не меняет (время записи = его место). */
export async function addEntry(entry: First250Entry): Promise<void> {
  const body = JSON.stringify(entry);
  const pathname = fileOf(entry.userId);
  countCache = null;
  const dir = localDir();
  if (dir) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(dir, { recursive: true });
    const file = `${dir}/${pathname.slice(PREFIX.length)}`;
    try {
      await fs.writeFile(file, body, { flag: "wx" });
    } catch {
      /* уже есть */
    }
    return;
  }
  const tok = token();
  if (!tok) throw new Error("no BLOB_READ_WRITE_TOKEN");
  const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(pathname)}`, {
    method: "PUT",
    body,
    headers: {
      ...headers(tok),
      "x-vercel-blob-access": "private",
      // Не перезаписываем: повторное нажатие не должно сдвигать человека в конец очереди.
      "x-allow-overwrite": "0",
      "x-add-random-suffix": "0",
      "x-content-type": "application/json",
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 409 && res.status !== 400) {
    throw new Error(`blob put ${res.status}`);
  }
}

async function readEntry(url: string): Promise<First250Entry | null> {
  try {
    if (url.startsWith("file://")) {
      const fs = await import("node:fs/promises");
      return JSON.parse(await fs.readFile(url.slice("file://".length), "utf8")) as First250Entry;
    }
    const res = await fetch(url, { headers: { authorization: `Bearer ${token()}` }, cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as First250Entry;
    return j && j.v === 1 && j.userId ? j : null;
  } catch {
    return null;
  }
}

/** Весь список с местами -- для админки. Файлов не больше нескольких сотен: читаем пачками. */
export async function allEntries(): Promise<First250Row[]> {
  const rows = ordered(await listAll());
  const out: First250Row[] = [];
  for (let i = 0; i < rows.length; i += 16) {
    const chunk = rows.slice(i, i + 16);
    const got = await Promise.all(chunk.map((r) => readEntry(r.url)));
    got.forEach((e, j) => {
      if (e) out.push({ ...e, place: i + j + 1 });
    });
  }
  return out;
}
