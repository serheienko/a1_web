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
import { T } from "@/components/t";
import { GameMap } from "./game-map";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Карта A1 | A1 Jobs",
  description: "Ігрова карта IT-компаній України.",
  robots: { index: false, follow: false },
};

// 02.10.2026 (Александр: «додавай усі компанії з України»): без вибірки,
// але з запасом зверху, щоб сторінка не роздувалась.
const LIMIT = 1500;

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

export default async function GameMapPage() {
  const companies = await loadCompanies();
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <GameMap companies={companies} />
      <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <T
          uk="Розмір будинку — за кількістю співробітників і відкритих вакансій. Наведіть або натисніть на будинок, щоб побачити компанію."
          en="House size reflects the number of employees and open jobs. Hover or tap a house to see the company."
          ru="Размер домика — по количеству сотрудников и открытых вакансий. Наведите или нажмите на домик, чтобы увидеть компанию."
          de="Die Hausgröße richtet sich nach Mitarbeitern und offenen Stellen. Fahre über ein Haus oder tippe darauf, um die Firma zu sehen."
          es="El tamaño de la casa depende de los empleados y las vacantes abiertas. Pasa el cursor o toca una casa para ver la empresa."
          fr="La taille de la maison dépend du nombre d’employés et d’offres ouvertes. Survolez ou touchez une maison pour voir l’entreprise."
          pl="Wielkość domu zależy od liczby pracowników i otwartych ofert. Najedź lub dotknij domku, aby zobaczyć firmę."
          ptBR="O tamanho da casa reflete o número de funcionários e vagas abertas. Passe o mouse ou toque numa casa para ver a empresa."
          zh="房子的大小取决于员工人数和开放职位数量。将鼠标悬停或点击房子即可查看公司。"
        />
      </p>
    </main>
  );
}
