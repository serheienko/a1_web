// app/api/events/search/route.ts -- подсказки событий для строки поиска в шапке (и для Alpha-поиска).
// GET ?q=... -> до 4 ближайших событий, в названии/городе/стране/тегах/серии которых есть запрос.
// Публичный: отдаём только то, что и так видно на странице события.
import { NextResponse, type NextRequest } from "next/server";
import { loadEvents } from "@/lib/events/store";
import { countryLabel, todayKyiv } from "@/lib/events/util";

export const runtime = "nodejs";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export type EventSearchHit = { slug: string; name: string; start: string; end: string; city: string; country: string; online: boolean };

export async function GET(req: NextRequest) {
  const q = norm((req.nextUrl.searchParams.get("q") ?? "").trim());
  if (q.length < 2) return NextResponse.json({ ok: true, events: [] });
  const words = q.split(/\s+/).filter(Boolean);
  const today = todayKyiv();
  const all = await loadEvents();
  const scored: { e: (typeof all)[number]; score: number }[] = [];
  for (const e of all) {
    if (e.end < today) continue;
    const name = norm(e.name);
    const rest = norm([e.seriesName, e.city, e.country, countryLabel(e.country, "uk")].join(" "));
    if (!words.every((w) => name.includes(w) || rest.includes(w))) continue;
    let score = 0;
    if (name.includes(q)) score += 5;
    if (name.startsWith(q)) score += 3;
    score += words.filter((w) => name.includes(w)).length;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || a.e.start.localeCompare(b.e.start));
  const events: EventSearchHit[] = scored.slice(0, 4).map(({ e }) => ({ slug: e.slug, name: e.name, start: e.start, end: e.end, city: e.city, country: e.country, online: e.online }));
  return NextResponse.json({ ok: true, events }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
