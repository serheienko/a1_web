// app/game-map/data/route.ts -- JSON со всеми компаниями для карты всесвіту A1.
//
// Кэш в памяти сервера: час свежий, потом отдаём старое и тихо обновляем.
// Первая сборка ~2.5 с (подробности сотен профилей), дальше -- мгновенно.
// Ответ сжимаем сами (gzip): сайт отдаётся без сжатия, а JSON на сотни
// компаний весит ~400 КБ -- сжатый ~в 5 раз меньше.
import { gzipSync } from "node:zlib";
import { loadCompanies } from "../load-companies";

export const dynamic = "force-dynamic";

type Entry = { at: number; json: string; gz: Buffer };
const TTL = 60 * 60 * 1000;
let cache: Entry | null = null;
let pending: Promise<Entry> | null = null;

function refresh(): Promise<Entry> {
  pending ??= loadCompanies()
    .then((data) => {
      if (!data.length && cache) return cache;
      const json = JSON.stringify(data);
      const entry: Entry = { at: Date.now(), json, gz: gzipSync(json) };
      cache = entry;
      return entry;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export async function GET(req: Request) {
  let entry: Entry;
  if (cache) {
    entry = cache;
    if (Date.now() - cache.at > TTL) void refresh();
  } else {
    entry = await refresh();
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    Vary: "Accept-Encoding",
  };
  if (/\bgzip\b/.test(req.headers.get("accept-encoding") || "")) {
    headers["Content-Encoding"] = "gzip";
    return new Response(new Uint8Array(entry.gz), { headers });
  }
  return new Response(entry.json, { headers });
}
