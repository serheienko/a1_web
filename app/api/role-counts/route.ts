// app/api/role-counts/route.ts
//
// 25.10.2026. Сколько вакансий за каждой профессией -- для блока «Роль» в
// панели фильтров (components/role-picker.tsx). Устроено как
// app/api/stack-counts: числа берутся из общего указателя
// (lib/a1/stack-index.ts), лишних запросов к базе нет.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parseFeedFilters, fetchRoleCounts } from "@/lib/a1/feed";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") === "seeking" ? "seeking" : "hiring";
  const filters = parseFeedFilters(params);
  try {
    const counts = await fetchRoleCounts(kind, { ...filters, roles: undefined });
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    console.error("[api/role-counts] failed:", err);
    return NextResponse.json({ ok: true, counts: {} }, { status: 200 });
  }
}
