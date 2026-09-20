// app/api/stack-counts/route.ts
//
// 2026-09-20. Сколько вакансий за каждой технологией -- для полного списка
// стека в панели фильтров (components/stack-picker.tsx).
//
// ПОЧЕМУ ОТДЕЛЬНАЯ РУЧКА, А НЕ ПРОПСЫ С СЕРВЕРА. Список стека появляется
// только после выбора категории IT и только если человек открыл фильтры.
// Считать числа на каждую отрисовку ленты -- платить за то, чего почти
// никто не увидит. Ручку же дёргают ровно в момент открытия списка.
//
// ЦЕНА ЗАПРОСА. Ноль лишней работы: числа собираются из того же указателя,
// который уже построен для самого фильтра (lib/a1/stack-index.ts) и живёт
// в общем кеше Next полчаса. Если указателя ещё нет -- он строится здесь, и
// следующий клик по технологии окажется мгновенным.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parseFeedFilters, fetchStackCounts } from "@/lib/a1/feed";
import { slugForTech } from "@/lib/seo/tech-catalog";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") === "seeking" ? "seeking" : "hiring";
  const filters = parseFeedFilters(params);

  try {
    const byTech = await fetchStackCounts(kind, filters);
    // Наружу отдаём slug'и: клиент знает адреса, а не словарь.
    const counts: Record<string, number> = {};
    for (const [tech, n] of Object.entries(byTech)) {
      const slug = slugForTech(tech);
      if (slug) counts[slug] = n;
    }
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    console.error("[api/stack-counts] failed:", err);
    // Пустой ответ лучше сломанного списка: тогда список просто рисуется
    // без чисел и ничего не приглушает.
    return NextResponse.json({ ok: true, counts: {} }, { status: 200 });
  }
}
