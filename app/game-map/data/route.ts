// app/game-map/data/route.ts -- JSON со всеми компаниями для карты всесвіту A1.
//
// Кэш в памяти сервера: час свежий, потом отдаём старое и тихо обновляем.
// Первая сборка ~2.5 с (подробности сотен профилей), дальше -- мгновенно.
// Ответ сжимаем сами (gzip): сайт отдаётся без сжатия, а JSON на сотни
// компаний весит ~400 КБ -- сжатый ~в 5 раз меньше.
import { gzipSync } from "node:zlib";
import { loadCompanies, type MapRegion } from "../load-companies";

export const dynamic = "force-dynamic";

type Entry = { at: number; json: string; gz: Buffer };
const TTL = 60 * 60 * 1000;
// Окремий кеш на кожен регіон (02.10.2026: карта для інших країн).
const caches = new Map<MapRegion, Entry>();
const pendings = new Map<MapRegion, Promise<Entry>>();

function refresh(region: MapRegion): Promise<Entry> {
  let p = pendings.get(region);
  if (!p) {
    p = loadCompanies(region)
      .then((data) => {
        const old = caches.get(region);
        if (!data.length && old) return old;
        const json = JSON.stringify(data);
        const entry: Entry = { at: Date.now(), json, gz: gzipSync(json) };
        caches.set(region, entry);
        return entry;
      })
      .finally(() => {
        pendings.delete(region);
      });
    pendings.set(region, p);
  }
  return p;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("region");
  const region: MapRegion = q === "eu" || q === "us" ? q : "ua";
  let entry: Entry;
  const cache = caches.get(region);
  if (cache) {
    entry = cache;
    if (Date.now() - cache.at > TTL) void refresh(region);
  } else {
    entry = await refresh(region);
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
