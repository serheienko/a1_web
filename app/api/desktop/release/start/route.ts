// app/api/desktop/release/start/route.ts
//
// 25.10.2026: шаг 1 выкладки сборки Mac из Codemagic. Тело {"build": N}, подпись x-a1-signature.
// Ответ -- ссылка для PUT архива прямо в бакет (живёт 30 минут).
import { NextResponse } from "next/server";
import { presign } from "@/lib/desktop/s3";
import { releaseSecret, signatureOk } from "@/lib/desktop/release-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!releaseSecret()) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  const body = Buffer.from(await req.arrayBuffer());
  if (!signatureOk(body, req.headers.get("x-a1-signature"))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }
  let build = 0;
  try {
    build = Number(JSON.parse(body.toString("utf8")).build);
  } catch {}
  if (!Number.isInteger(build) || build <= 0) {
    return NextResponse.json({ ok: false, error: "bad build" }, { status: 400 });
  }
  const key = `mac/A1-mac-${build}.zip`;
  const putUrl = presign("PUT", key, 1800);
  if (!putUrl) return NextResponse.json({ ok: false, error: "storage not configured" }, { status: 503 });
  return NextResponse.json({ ok: true, key, putUrl });
}
