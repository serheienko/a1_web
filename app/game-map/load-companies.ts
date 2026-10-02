// app/game-map/load-companies.ts -- данные карты всесвіту A1.
// Компании берутся из того же часового индекса вакансий, что и посадочные
// (lib/a1/facts-index.ts) + один пакетный users.getUsers на подробности.
// Отдаются отдельным JSON (./data/route.ts), а не внутри HTML страницы:
// так страница открывается сразу, а карта догружается в своей рамке.
import { call } from "@/lib/a1/client";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { parseUserProfile } from "@/lib/a1/schemas";
import { mapUserProfile } from "@/lib/a1/user-mappers";
import type { MapCompany } from "./engine";

// 02.10.2026 (Александр: «додавай усі компанії з України»): без вибірки,
// але з запасом зверху, щоб сторінка не роздувалась.
const LIMIT = 1500;

export async function loadCompanies(): Promise<MapCompany[]> {
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
    const all = [...byCompany.values()].sort((a, b) => b.n - a.n).slice(0, LIMIT);
    return enrich(all);
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
  // Пачками по 100: для сотен компаний один запит був би завеликим.
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  const raws = await Promise.all(
    chunks.map((part) => call<unknown>("users.getUsers", { ids: part }).catch(() => [] as unknown)),
  );
  try {
    const raw = raws.flatMap((r) => (Array.isArray(r) ? r : []));
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
      c.bio = (prof.bio || company?.description || "").trim().slice(0, 200) || null;
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

