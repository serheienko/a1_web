// app/api/desktop/release/finish/route.ts
//
// 25.10.2026: шаг 2 выкладки -- архив уже в бакете, записываем «последнюю версию».
// Тело {"build","version","sha256","size","key","notes"?}, подпись x-a1-signature.
import { NextResponse } from "next/server";
import { writeManifest, type DesktopRelease } from "@/lib/desktop/s3";
import { releaseSecret, signatureOk } from "@/lib/desktop/release-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!releaseSecret()) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  const body = Buffer.from(await req.arrayBuffer());
  if (!signatureOk(body, req.headers.get("x-a1-signature"))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }
  let m: DesktopRelease;
  try {
    const j = JSON.parse(body.toString("utf8"));
    m = {
      build: Number(j.build),
      version: String(j.version ?? ""),
      sha256: String(j.sha256 ?? "").toLowerCase(),
      size: Number(j.size),
      key: String(j.key ?? ""),
      notes: j.notes ? String(j.notes).slice(0, 2000) : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  if (!Number.isInteger(m.build) || m.build <= 0 || !/^[0-9a-f]{64}$/.test(m.sha256) || !m.key.startsWith("mac/") || !(m.size > 0)) {
    return NextResponse.json({ ok: false, error: "bad fields" }, { status: 400 });
  }
  const ok = await writeManifest(m);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
