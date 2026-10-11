export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/admin/stats/route.ts
//
// 11.10.2026. Сводка кликов для /admin/stats.
//
// Читает по файлу на день (lib/stats/store.ts) -- единицы запросов, а не
// обход пятисот аккаунтов, как у соседней страницы откликов. Поэтому
// страница открывается сразу.

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { loadStats } from "@/lib/stats/store";

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }
  const days = Number(request.nextUrl.searchParams.get("days") ?? "7");
  const data = await loadStats(Number.isFinite(days) ? days : 7);
  return NextResponse.json(data);
}
