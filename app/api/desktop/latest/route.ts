// app/api/desktop/latest/route.ts
//
// 25.10.2026: приложение A1 для Mac спрашивает тут, есть ли версия новее своей. Ответ --
// номер сборки, контрольная сумма и ссылка на архив (с подписью, живёт час).
import { NextResponse } from "next/server";
import { presign, readManifest } from "@/lib/desktop/s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const m = await readManifest();
  if (!m) return NextResponse.json({ ok: false }, { status: 404, headers: { "cache-control": "no-store" } });
  const url = presign("GET", m.key, 3600);
  return NextResponse.json(
    { ok: true, build: m.build, version: m.version, sha256: m.sha256, size: m.size, notes: m.notes ?? "", publishedAt: m.publishedAt, url },
    { headers: { "cache-control": "no-store" } },
  );
}
