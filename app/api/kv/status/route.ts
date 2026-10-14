// app/api/kv/status/route.ts -- 14.10.2026: проверка переезда хранилища с Vercel Blob на базу Railway.
// Сколько записей в каждом разделе и как прошёл последний перенос из Blob. Содержимого не отдаёт.
// Закрыт заголовком x-revalidate-secret (A1_REVALIDATE_SECRET), как /api/indexnow.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { kvConfigured, kvList } from "@/lib/kv/store";
import { blobSyncEnabled, lastBlobSync, syncFromBlob } from "@/lib/kv/from-blob";

export const dynamic = "force-dynamic";

function allowed(req: Request): boolean {
  const expected = (process.env.A1_REVALIDATE_SECRET ?? "").trim();
  const given = (req.headers.get("x-revalidate-secret") ?? "").trim();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("sync") === "1") await syncFromBlob();
  const sections: Record<string, { count: number; latest: string }> = {};
  let error: string | null = null;
  if (kvConfigured()) {
    try {
      for (const r of await kvList("")) {
        const parts = r.path.split("/");
        const key = parts.length > 2 ? `${parts[0]}/${parts[1]}/` : r.path;
        const s = (sections[key] ??= { count: 0, latest: "" });
        s.count++;
        if (r.updatedAt > s.latest) s.latest = r.updatedAt;
      }
    } catch (e) {
      error = String((e as Error)?.message ?? e).slice(0, 200);
    }
  }
  return NextResponse.json(
    { ok: !error, configured: kvConfigured(), blobSync: blobSyncEnabled(), lastSync: await lastBlobSync(), error, sections },
    { headers: { "Cache-Control": "no-store" } },
  );
}
