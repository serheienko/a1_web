// lib/a1/scout-store.ts
//
// 14.10.2026 (Александр: агент-разведчик по конкурентам). Раз в неделю Разведчик
// (konkistador/konk_scout.py) присылает отчёт: 3-5 идей «что сделали конкуренты / зачем
// это A1 / как сделать у нас». Храним в том же Vercel Blob, что и пульсы штаба
// (lib/a1/shtab-store.ts): один файл на отчёт, a1/scout/<дата>.json. Штаб показывает
// последний отчёт и несколько прошлых (components/shtab-scout.tsx).
//
// Секретов в файле нет: токен -- BLOB_READ_WRITE_TOKEN на сервере.

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/scout-store] imported from the browser — this must stay server-only");
}

const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const PREFIX = "a1/scout/";

export type ScoutIdea = {
  who: string;
  what: string;
  why: string;
  how: string;
  effort: "легко" | "средне" | "сложно";
  url: string;
  source: string;
};

export type ScoutReport = {
  date: string;
  generatedAt: string;
  ideas: ScoutIdea[];
  market: string;
  scanned: { apps: number; feeds: number; hn: number; items: number };
  errors: string[];
};

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

type BlobRow = { pathname?: string; url?: string; downloadUrl?: string; uploadedAt?: string };

export async function saveScoutReport(r: ScoutReport): Promise<boolean> {
  const tok = token();
  if (!tok) return false;
  const pathname = `${PREFIX}${r.date}.json`;
  try {
    const res = await fetch(`${BLOB_API}/?pathname=${encodeURIComponent(pathname)}`, {
      method: "PUT",
      body: JSON.stringify(r),
      headers: {
        ...headers(tok),
        "x-vercel-blob-access": "private",
        "x-allow-overwrite": "1",
        "x-add-random-suffix": "0",
        "x-content-type": "application/json",
        "content-type": "application/json",
      },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Последние отчёты, новые сверху. Нет токена или хранилище молчит -- пустой список. */
export async function loadScoutReports(limit = 4): Promise<ScoutReport[]> {
  const tok = token();
  if (!tok) return [];
  let blobs: BlobRow[] = [];
  try {
    const qs = new URLSearchParams({ prefix: PREFIX, limit: "200" });
    const res = await fetch(`${BLOB_API}?${qs.toString()}`, { headers: headers(tok), cache: "no-store" });
    if (!res.ok) return [];
    blobs = ((await res.json()) as { blobs?: BlobRow[] }).blobs ?? [];
  } catch {
    return [];
  }
  const latest = blobs
    .filter((b) => b.pathname?.endsWith(".json"))
    .sort((a, b) => (b.pathname ?? "").localeCompare(a.pathname ?? ""))
    .slice(0, limit);
  const out = await Promise.all(
    latest.map(async (b) => {
      const url = b.downloadUrl ?? b.url;
      if (!url) return null;
      try {
        const res = await fetch(url, { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" });
        if (!res.ok) return null;
        const j = (await res.json()) as ScoutReport;
        return j && typeof j.date === "string" && Array.isArray(j.ideas) ? j : null;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is ScoutReport => x !== null);
}
