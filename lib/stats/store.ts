// lib/stats/store.ts
//
// 11.10.2026 (Александр: «надо отслеживать количество кликов точно на
// перейти по ссылке и на забрать компанию, для статистики»). Счётчики
// кликов по сайту.
//
// Почему своё хранилище, а не чтение из бэкенда: соседняя админская
// страница «Відгуки» (lib/a1/admin-applications.ts) заходит в каждый из
// ~500 аккаунтов компаний по очереди, и поэтому открывается минуту. Для
// статистики так нельзя: её смотрят часто и ждать там нечего. Поэтому
// клики считаются у нас и складываются в один файл на день.
//
// Файл на ДЕНЬ и на ИНСТАНС: a1/stats/<YYYY-MM-DD>/<instance>.json.
// Инстансов у сервера может быть несколько, и общий файл они бы
// затирали друг другу (прочитал-изменил-записал без блокировки). Свой
// файл не конфликтует ни с кем, а админка складывает их при чтении --
// файлов за день столько, сколько инстансов, то есть единицы.
//
// В память пишем сразу, в хранилище -- пачкой раз в FLUSH_MS. Клик не
// ждёт сети, а при перезапуске теряется самое большее эта пачка.
//
// 14.10.2026: хранилище -- база на Railway (lib/kv/store.ts), раньше Vercel Blob.

if (typeof window !== "undefined") {
  throw new Error("[lib/stats/store] imported from the browser — server-only");
}

import { randomUUID } from "node:crypto";
import { kvConfigured, kvGet, kvGetMany, kvPut } from "@/lib/kv/store";

const PREFIX = "a1/stats/";

/** Что считаем. Добавлять новые можно свободно -- старые файлы не ломаются. */
export const STAT_EVENTS = [
  "view",
  "external",
  "apply",
  "claim_open",
  "claim_sent",
  "claim_done",
  // 16.10.2026: раньше эти четыре уходили в Umami, теперь считаем у себя (см. lib/track.ts).
  "signup",
  "signin",
  "download_click",
  "first250_claim",
] as const;
export type StatEvent = (typeof STAT_EVENTS)[number];

export type StatKey = { event: StatEvent; company: string; post: string };

/**
 * 22.10.2026 (Александр: «нет агента по атрибуции... самый важный момент»).
 * Откуда человек пришёл. Хранится ОТДЕЛЬНОЙ строкой, а не четвёртым полем
 * ключа: поле удесятерило бы число строк (у нас их столько же, сколько
 * вакансий), и день упёрся бы в MAX_ROWS. Здесь вместо ника компании стоит
 * «@src», а в месте адреса вакансии -- ярлык канала: «google», «telegram»,
 * «direct». Настоящим ником «@src» быть не может -- собачку не пропускает
 * проверка в app/api/track/route.ts.
 *
 * Это ярлык ДВЕРИ, а не человека: кто нажал, мы по-прежнему не знаем и не
 * храним. Именно поэтому строка и допустима -- см. шапку route.ts.
 */
export const SOURCE_MARK = "@src";

export type StatFile = {
  v: 1;
  day: string;
  instance: string;
  updatedAt: string;
  /** "<event>|<company>|<post>" -> сколько раз. */
  rows: Record<string, number>;
};

/** Сколько разных строк держим за день на инстанс: дальше только доращиваем уже известные. */
const MAX_ROWS = 20000;
const FLUSH_MS = 15_000;

export function dayOf(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Последние n дней, новый первым. */
export function recentDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getTime() - i * 86_400_000);
    out.push(dayOf(d));
  }
  return out;
}

export function keyOf(k: StatKey): string {
  // Разделитель не встречается ни в нике компании, ни в адресе вакансии.
  return `${k.event}|${k.company}|${k.post}`;
}

export function parseKey(raw: string): StatKey | null {
  const parts = raw.split("|");
  if (parts.length !== 3) return null;
  const [event, company, post] = parts as [string, string, string];
  if (!(STAT_EVENTS as readonly string[]).includes(event)) return null;
  return { event: event as StatEvent, company, post };
}

// ------------------------------------------------------------------ запись

const INSTANCE = randomUUID().slice(0, 8);
/** День -> ещё не записанные приращения. */
const pending = new Map<string, Map<string, number>>();
/** День -> что уже лежит в нашем файле (чтобы не перечитывать на каждый сброс). */
const written = new Map<string, Record<string, number>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

export function bump(k: StatKey, by = 1): void {
  const day = dayOf();
  const bucket = pending.get(day) ?? new Map<string, number>();
  const key = keyOf(k);
  if (!bucket.has(key) && bucket.size + (written.get(day) ? Object.keys(written.get(day)!).length : 0) >= MAX_ROWS) {
    return;
  }
  bucket.set(key, (bucket.get(key) ?? 0) + by);
  pending.set(day, bucket);
  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, FLUSH_MS);
    // Таймер не должен держать процесс живым.
    (timer as unknown as { unref?: () => void }).unref?.();
  }
}

/** Сбрасывает накопленное в хранилище. Ошибки не бросает: статистика не важнее страницы. */
export async function flush(): Promise<void> {
  if (flushing || pending.size === 0) return;
  if (!kvConfigured()) {
    pending.clear();
    return;
  }
  flushing = true;
  try {
    for (const [day, bucket] of [...pending.entries()]) {
      pending.delete(day);
      if (bucket.size === 0) continue;

      // Первый сброс за день: подтягиваем свой же файл, если инстанс
      // пережил перезапуск процесса в рамках того же дня.
      let base = written.get(day);
      if (!base) {
        base = (await readOwnFile(day))?.rows ?? {};
      }
      for (const [key, add] of bucket) base[key] = (base[key] ?? 0) + add;

      const file: StatFile = { v: 1, day, instance: INSTANCE, updatedAt: new Date().toISOString(), rows: base };
      const ok = await put(`${PREFIX}${day}/${INSTANCE}.json`, JSON.stringify(file));
      if (ok) {
        written.set(day, base);
      } else {
        // Не записалось -- возвращаем приращения назад, попробуем в следующий раз.
        const again = pending.get(day) ?? new Map<string, number>();
        for (const [key, add] of bucket) again.set(key, (again.get(key) ?? 0) + add);
        pending.set(day, again);
      }
    }
  } catch {
    // см. выше
  } finally {
    flushing = false;
  }
}

async function put(pathname: string, body: string): Promise<boolean> {
  try {
    await kvPut(pathname, body);
    return true;
  } catch {
    return false;
  }
}

function parseFile(body: Buffer | null): StatFile | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body.toString("utf8")) as StatFile;
    return json && json.v === 1 && json.rows ? json : null;
  } catch {
    return null;
  }
}

async function readOwnFile(day: string): Promise<StatFile | null> {
  try {
    return parseFile(await kvGet(`${PREFIX}${day}/${INSTANCE}.json`));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ чтение

export type StatTotals = Record<StatEvent, number>;

export type SourceStats = { source: string; totals: StatTotals };

export type CompanyStats = {
  company: string;
  totals: StatTotals;
  posts: { post: string; totals: StatTotals }[];
};

function emptyTotals(): StatTotals {
  return Object.fromEntries(STAT_EVENTS.map((e) => [e, 0])) as StatTotals;
}

/**
 * Сводка за последние `days` дней: по компаниям, внутри -- по вакансиям.
 * Читает по файлу на инстанс на день (единицы файлов), поэтому быстро.
 */
export async function loadStats(days: number): Promise<{ ok: boolean; from: string; companies: CompanyStats[]; totals: StatTotals; sources: SourceStats[] }> {
  const wanted = recentDays(Math.max(1, Math.min(days, 90)));
  const from = wanted[wanted.length - 1]!;
  if (!kvConfigured()) return { ok: false, from, companies: [], totals: emptyTotals(), sources: [] };

  // Своё ещё не сброшенное тоже показываем -- иначе свежий клик «пропадает»
  // на пятнадцать секунд и выглядит как поломка.
  await flush();

  const files: StatFile[] = [];
  try {
    await Promise.all(
      wanted.map(async (day) => {
        for (const row of await kvGetMany(`${PREFIX}${day}/`)) {
          if (!row.path.endsWith(".json")) continue;
          const file = parseFile(row.body);
          if (file) files.push(file);
        }
      }),
    );
  } catch {
    return { ok: false, from, companies: [], totals: emptyTotals(), sources: [] };
  }

  const byCompany = new Map<string, { totals: StatTotals; posts: Map<string, StatTotals> }>();
  const bySource = new Map<string, StatTotals>();
  const totals = emptyTotals();

  for (const file of files) {
    for (const [raw, count] of Object.entries(file.rows)) {
      const k = parseKey(raw);
      if (!k || typeof count !== "number") continue;
      // Строки канала -- те же события, посчитанные второй раз в другом
      // разрезе. В общий итог и в компании они не идут, иначе всё удвоится.
      if (k.company === SOURCE_MARK) {
        const src = bySource.get(k.post) ?? emptyTotals();
        src[k.event] += count;
        bySource.set(k.post, src);
        continue;
      }
      totals[k.event] += count;
      const company = byCompany.get(k.company) ?? { totals: emptyTotals(), posts: new Map<string, StatTotals>() };
      company.totals[k.event] += count;
      if (k.post) {
        const post = company.posts.get(k.post) ?? emptyTotals();
        post[k.event] += count;
        company.posts.set(k.post, post);
      }
      byCompany.set(k.company, company);
    }
  }

  const companies: CompanyStats[] = [...byCompany.entries()]
    .map(([company, v]) => ({
      company,
      totals: v.totals,
      posts: [...v.posts.entries()]
        .map(([post, t]) => ({ post, totals: t }))
        .sort((a, b) => score(b.totals) - score(a.totals))
        .slice(0, 50),
    }))
    .sort((a, b) => score(b.totals) - score(a.totals));

  const sources: SourceStats[] = [...bySource.entries()]
    .map(([source, t]) => ({ source, totals: t }))
    .sort((a, b) => score(b.totals) - score(a.totals));

  return { ok: true, from, companies, totals, sources };
}

/** Чем строка «интереснее»: переход и клейм весомее простого просмотра. */
function score(t: StatTotals): number {
  return t.claim_done * 1000 + t.claim_sent * 300 + t.claim_open * 100 + t.apply * 50 + t.external * 10 + t.view;
}
