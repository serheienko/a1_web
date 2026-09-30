// app/api/worldwide/route.ts
//
// 30.09.2026 (Александр: «Worldwide -- и в приложении тоже»). У бэкенда нет
// фильтра «локация = весь мир», поэтому приложение не может попросить такие
// вакансии у него напрямую. Сайт уже держит готовый список (общий обход
// lib/a1/facts-index.ts, кэш на час) -- здесь он отдаётся приложению как
// список id в порядке ленты; сами вакансии приложение затем берёт у бэкенда
// пачками по id (posts.get), как и остальные.

import { NextResponse } from "next/server";
import { worldwidePosts } from "@/lib/a1/facts-index";

export const runtime = "nodejs";

export async function GET() {
  try {
    const posts = await worldwidePosts();
    const ids = posts.map((post) => post.id);
    // Пустой список (обход ещё не собрался) в кэш краевого сервера не кладём.
    const cacheControl = ids.length > 0 ? "public, s-maxage=300, stale-while-revalidate=1800" : "no-store";
    return NextResponse.json({ ok: true, ids }, { headers: { "Cache-Control": cacheControl } });
  } catch {
    return NextResponse.json({ ok: false, ids: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
