// app/game-map/page.tsx -- игровая карта A1 (версия 2, 02.10.2026).
//
// Александр: новые упрощённые ассеты, основа рисуется кодом, ~50 живых
// компаний «специально разных по размеру — крупные, средние, маленькие».
// Компании берутся из того же часового индекса вакансий, что и посадочные
// (lib/a1/facts-index.ts): отдельных запросов к бэкенду страница не делает.
// Размер здания -- по числу сотрудников и вакансий (engine.ts sizeLevel).
// Закрыта от индексации, пока карта не принята.
import type { Metadata } from "next";
import { call } from "@/lib/a1/client";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { parseUserProfile } from "@/lib/a1/schemas";
import { mapUserProfile } from "@/lib/a1/user-mappers";
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
          userId: p.author.userId,
        };
        byCompany.set(key, c);
      }
      c.n += 1;
      if (c.jobs.length < 3) c.jobs.push({ title: p.title, slug: p.slug });
    }
    const all = [...byCompany.values()].sort((a, b) => b.n - a.n);
    if (all.length <= LIMIT) return enrich(all);
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
    return enrich(picked);
  } catch {
    return [];
  }
}

// 02.10.2026 (Александр: «в карточку при наведении — больше информации,
// которую компании сами указали: количество сотрудников…»). Один запрос
// users.getUsers на все компании карты; если он не прошёл, карта просто
// показывает карточки без этих строк.
async function enrich(list: MapCompany[]): Promise<MapCompany[]> {
  const ids = list.map((c) => c.userId).filter((id): id is string => !!id);
  if (!ids.length) return list;
  try {
    const raw = await call<unknown>("users.getUsers", { ids });
    const byId = new Map<string, MapCompany>();
    for (const c of list) if (c.userId) byId.set(c.userId, c);
    for (const item of Array.isArray(raw) ? raw : []) {
      const parsed = parseUserProfile(item);
      if (!parsed || parsed.object !== "user") continue;
      const id = (item as { _id?: string })._id;
      const c = id ? byId.get(id) : undefined;
      const prof = mapUserProfile(parsed);
      if (!c || !prof) continue;
      const company = prof.companies[0];
      c.bio = (prof.bio || company?.description || "").trim().slice(0, 240) || null;
      c.website = prof.links[0]?.url || company?.link?.url || null;
      c.employees = company?.employeesCount ?? null;
      c.est = company?.establishedYear ?? null;
      c.occupation = prof.expertise || null;
    }
  } catch {
    // без подробностей -- не страшно
  }
  return list;
}

export default async function GameMapPage() {
  const companies = await loadCompanies();
  return (
    <main className="relative w-full">
      <GameMap companies={companies} />
      <p className="pointer-events-none absolute bottom-3 left-3 right-24 hidden text-[11px] leading-snug text-[#4a3518]/80 sm:block dark:text-[#e9dfc4]/70">
        Розмір будинку — за кількістю співробітників і відкритих вакансій. Наведіть або натисніть на будинок, щоб побачити компанію.
      </p>
    </main>
  );
}
