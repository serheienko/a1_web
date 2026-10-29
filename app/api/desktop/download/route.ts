// app/api/desktop/download/route.ts
//
// 29.10.2026: кнопка «Версія для Mac» на /download. Ведёт на последнюю сборку из бакета Railway
// «a1-desktop» (её туда кладёт Codemagic, см. app/api/desktop/release/*). Файл отдаётся прямо из
// бакета по ссылке с подписью: 90+ МБ не идут через сайт, а отдача из бакета у Railway бесплатная.
import { NextResponse } from "next/server";
import { presign, readManifest } from "@/lib/desktop/s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const m = await readManifest();
  const url = m ? presign("GET", m.key, 3600) : null;
  if (!url) return new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
}
