// lib/first250/store.ts
//
// 14.10.2026 (Александр). Акция «Перші 250»: первые 250 человек, которые скачали A1 и заполнили
// профиль, получают Premium на год, когда он появится. Здесь -- список тех, кто забрал место.
//
// Хранение -- общее хранилище сайта (lib/kv/store.ts, база на Railway; до 14.10.2026 -- Vercel Blob):
// ОДНА ЗАПИСЬ НА ЧЕЛОВЕКА, a1/first250/<userId>.json. Так два одновременных нажатия разных людей
// не затирают друг друга (общий файл пришлось бы читать-менять-писать без блокировки), а
// повторное нажатие того же человека просто находит его запись. Номер места -- порядок по
// времени создания записи.

if (typeof window !== "undefined") {
  throw new Error("[lib/first250/store] imported from the browser — server-only");
}

import { kvConfigured, kvGetMany, kvList, kvPut } from "@/lib/kv/store";

const PREFIX = "a1/first250/";

/** Сколько мест. Можно поменять переменной FIRST250_TOTAL без выкладки кода. */
export function totalSeats(): number {
  const n = Number(process.env.FIRST250_TOTAL ?? "");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 250;
}

/**
 * 14.10.2026 (Александр): 15 мест зарезервированы -- для своих (команда, друзья, розыгрыши). Их можно
 * раздавать вручную, поэтому «залишилось» показывает места, реально доступные по ссылке: 250 - 15 - записавшиеся.
 * Номер места человека тоже идёт после резерва (первый записавшийся по ссылке -- №16).
 * Меняется переменной FIRST250_RESERVED без выкладки кода.
 */
export function reservedSeats(): number {
  const raw = (process.env.FIRST250_RESERVED ?? "").trim();
  const n = raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 15;
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

/** userId из бэкенда -- строка вида usr_...; в имя файла пускаем только безопасные символы. */
function fileOf(userId: string): string {
  return `${PREFIX}${userId.replace(/[^a-zA-Z0-9_-]/g, "")}.json`;
}

type Row = { pathname: string; createdAt: string };

async function listAll(): Promise<Row[]> {
  if (!kvConfigured()) return [];
  return (await kvList(PREFIX)).map((r) => ({ pathname: r.path, createdAt: r.createdAt }));
}

/** Порядок мест: кто раньше записался, тот выше. */
function ordered(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.pathname.localeCompare(b.pathname));
}

// Счётчик «осталось X» показываем всем посетителям -- не дёргаем хранилище на каждый заход.
let countCache: { n: number; at: number } | null = null;
const COUNT_TTL_MS = 20_000;

export async function takenCount(): Promise<number> {
  if (countCache && Date.now() - countCache.at < COUNT_TTL_MS) return countCache.n + reservedSeats();
  const n = (await listAll()).length;
  countCache = { n, at: Date.now() };
  return n + reservedSeats();
}

/** Место человека (1..N) или null, если он ещё не записывался. */
export async function placeOf(userId: string): Promise<number | null> {
  const want = fileOf(userId);
  const rows = ordered(await listAll());
  const i = rows.findIndex((r) => r.pathname === want);
  return i === -1 ? null : i + 1 + reservedSeats();
}

/** Записывает человека. Если он уже есть -- ничего не меняет (время записи = его место). */
export async function addEntry(entry: First250Entry): Promise<void> {
  countCache = null;
  if (!kvConfigured()) throw new Error("no KV_DATABASE_URL");
  // Не перезаписываем: повторное нажатие не должно сдвигать человека в конец очереди.
  await kvPut(fileOf(entry.userId), JSON.stringify(entry), { overwrite: false });
}

/** Весь список с местами -- для админки. Один запрос к базе. */
export async function allEntries(): Promise<First250Row[]> {
  if (!kvConfigured()) return [];
  const items = await kvGetMany(PREFIX);
  const rows = ordered(items.map((r) => ({ pathname: r.path, createdAt: r.createdAt })));
  const byPath = new Map(items.map((r) => [r.path, r.body]));
  const out: First250Row[] = [];
  rows.forEach((r, i) => {
    try {
      const e = JSON.parse(byPath.get(r.pathname)!.toString("utf8")) as First250Entry;
      if (e && e.v === 1 && e.userId) out.push({ ...e, place: i + 1 + reservedSeats() });
    } catch {
      /* битая запись -- пропускаем */
    }
  });
  return out;
}
