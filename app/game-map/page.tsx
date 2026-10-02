// app/game-map/page.tsx -- игровая карта A1 (версия 2, 02.10.2026).
//
// Александр: новые упрощённые ассеты, основа рисуется кодом, ~50 живых
// компаний «специально разных по размеру — крупные, средние, маленькие».
// Компании берутся из того же часового индекса вакансий, что и посадочные
// (lib/a1/facts-index.ts): отдельных запросов к бэкенду страница не делает.
// Размер здания -- по числу живых вакансий (числа сотрудников пока нет).
// Закрыта от индексации, пока карта не принята.
import type { Metadata } from "next";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import type { MapCompany } from "./engine";
import { GameMap } from "./game-map";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Карта A1 | A1 Jobs",
  description: "Ігрова карта IT-компаній України.",
  robots: { index: false, follow: false },
};

const LIMIT = 50;

async function loadCompanies(): Promise<MapCompany[]> {
  try {
    const posts = await allIndexedPosts();
    const byCompany = new Map<string, MapCompany>();
    for (const p of posts) {
      if (p.kind !== "hiring" || p.author.isAnonymous) continue;
      const loc = p.location;
      if (!loc?.coordinates || loc.country.trim().toUpperCase() !== "UA") continue;
      const [lng, lat] = loc.coordinates;
      if (!(lng > 22 && lng < 40.3 && lat > 44.3 && lat < 52.4)) continue;
      const key = p.author.userId ?? p.author.name;
      let c = byCompany.get(key);
      if (!c) {
        c = {
          id: key,
          name: p.author.name,
          username: p.author.username,
          avatar: p.author.avatarUrl,
          n: 0,
          city: loc.city || loc.display,
          lng,
          lat,
          jobs: [],
        };
        byCompany.set(key, c);
      }
      c.n += 1;
      if (c.jobs.length < 3) c.jobs.push({ title: p.title, slug: p.slug });
    }
    const all = [...byCompany.values()].sort((a, b) => b.n - a.n);
    if (all.length <= LIMIT) return all;
    // Специально разные: поровну из крупных, средних и маленьких.
    const third = Math.ceil(all.length / 3);
    const groups = [all.slice(0, third), all.slice(third, third * 2), all.slice(third * 2)];
    const picked: MapCompany[] = [];
    groups.forEach((g, i) => {
      const want = i === 2 ? LIMIT - picked.length : Math.round(LIMIT / 3);
      const step = g.length / want;
      for (let k = 0; k < want && k * step < g.length; k++) {
        const c = g[Math.floor(k * step)];
        if (c) picked.push(c);
      }
    });
    return picked;
  } catch {
    return [];
  }
}

export default async function GameMapPage() {
  const companies = await loadCompanies();
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <GameMap companies={companies} />
      <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        Розмір будинку — за кількістю відкритих вакансій. Наведіть або натисніть на будинок, щоб побачити компанію.
      </p>
    </main>
  );
}
