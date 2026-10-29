// lib/a1/posts-snapshot.ts -- готовый список вакансий в базе (29.10.2026).
//
// Александр: «выкладка 5-10 минут, две подряд сорвались». Новая версия сайта стартует с пустой
// памятью и полностью обходит десятки тысяч вакансий (lib/a1/sitemap-posts.ts) -- это и есть
// прогрев (app/api/ready). Теперь каждый полный обход и каждый догон свежих кладут копию
// списка в базу a1-store (lib/kv/store.ts), а новая версия сначала берёт её оттуда за секунды и
// сразу догоняет свежее. Полный обход по-прежнему раз в сутки -- просто уже не на старте.
//
// Копия сжата (gzip): десятки тысяч вакансий -- это сотни мегабайт текста, в сжатом виде в
// разы меньше. Пишется потоком, по одной вакансии, чтобы не держать в памяти вторую огромную
// строку. Даты помечаются ({"$d": "..."}) и при чтении снова становятся Date.
//
// Если базы нет, копия битая или старше суток -- молча возвращаем null, и всё идёт как раньше
// (полный обход). Хуже, чем было, не станет.
import { createGunzip, createGzip } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import type { WebPost } from "@/types/web-post";

// 29.10.2026: первая запись показала 68 тыс. вакансий = 135 МБ в сжатом виде. Разжатый текст
// больше предела одной строки в Node (~512 МБ), поэтому формат -- «по вакансии на строку»
// (первая строка {"at":...}), и читаем его тоже построчно, не собирая одну огромную строку.
const PATH = "a1/cache/job-posts-snapshot.ndjson.gz";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Snapshot = { at: number; posts: WebPost[] };

function replacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key];
  return raw instanceof Date ? { $d: raw.toISOString() } : value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "$d" in (value as object)) {
    const d = (value as { $d: unknown }).$d;
    if (typeof d === "string" && Object.keys(value as object).length === 1) return new Date(d);
  }
  return value;
}

async function gzipPosts(at: number, posts: WebPost[]): Promise<Buffer> {
  const gz = createGzip({ level: 6 });
  const chunks: Buffer[] = [];
  gz.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    gz.on("end", resolve);
    gz.on("error", reject);
  });
  const write = (s: string) =>
    new Promise<void>((resolve) => {
      if (gz.write(s)) resolve();
      else gz.once("drain", resolve);
    });
  await write(`{"at":${at}}\n`);
  for (const p of posts) await write(JSON.stringify(p, replacer) + "\n");
  gz.end();
  await done;
  return Buffer.concat(chunks);
}

let saving: Promise<void> | null = null;
let savedAt = 0;
// Запись -- около 2,5 минуты работы процессора на 135 МБ, поэтому после догона пишем не чаще
// раза в 3 часа (после полного обхода -- всегда). Новой версии этого хватает: она догоняет свежее сама.
const TOPUP_SAVE_GAP_MS = 3 * 60 * 60 * 1000;

/** Положить список в базу (в фоне; ошибки не мешают сайту). */
export function saveJobPostsSnapshot(at: number, posts: WebPost[], opts: { force?: boolean } = {}): void {
  if (saving) return; // предыдущая запись ещё идёт -- следующий догон положит свежее
  if (!opts.force && Date.now() - savedAt < TOPUP_SAVE_GAP_MS) return;
  saving = (async () => {
    try {
      const { kvConfigured, kvPut } = await import("@/lib/kv/store");
      if (!kvConfigured()) return;
      const t0 = Date.now();
      const body = await gzipPosts(at, posts);
      await kvPut(PATH, body);
      savedAt = Date.now();
      console.log(
        `[posts-snapshot] saved ${posts.length} posts, ${(body.length / 1048576).toFixed(1)} MB gz, ${Date.now() - t0} ms`,
      );
    } catch (e) {
      console.warn("[posts-snapshot] save failed:", (e as Error)?.message ?? e);
    }
  })().finally(() => {
    saving = null;
  });
}

/** Взять список из базы, если он есть и не старше суток. */
export async function loadJobPostsSnapshot(): Promise<Snapshot | null> {
  try {
    const { kvConfigured, kvGet } = await import("@/lib/kv/store");
    if (!kvConfigured()) return null;
    const t0 = Date.now();
    const body = await kvGet(PATH);
    if (!body) return null;
    const lines = createInterface({ input: Readable.from([body]).pipe(createGunzip()), crlfDelay: Infinity });
    let at = -1;
    const posts: WebPost[] = [];
    for await (const line of lines) {
      if (!line) continue;
      if (at < 0) {
        at = Number((JSON.parse(line) as { at?: unknown }).at);
        if (!Number.isFinite(at) || Date.now() - at > MAX_AGE_MS) return null;
        continue;
      }
      posts.push(JSON.parse(line, reviver) as WebPost);
    }
    if (at < 0 || !posts.length) return null;
    const snap: Snapshot = { at, posts };
    savedAt = Date.now(); // копия в базе свежая -- первый догон не перезаписывает её сразу
    console.log(`[posts-snapshot] loaded ${snap.posts.length} posts in ${Date.now() - t0} ms`);
    return snap;
  } catch (e) {
    console.warn("[posts-snapshot] load failed:", (e as Error)?.message ?? e);
    return null;
  }
}
