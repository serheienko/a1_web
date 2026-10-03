// app/game-map/load-companies.ts -- данные карты всесвіту A1.
// Компании берутся из того же часового индекса вакансий, что и посадочные
// (lib/a1/facts-index.ts) + один пакетный users.getUsers на подробности.
// Отдаются отдельным JSON (./data/route.ts), а не внутри HTML страницы:
// так страница открывается сразу, а карта догружается в своей рамке.
import { call } from "@/lib/a1/client";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { parseUserProfile } from "@/lib/a1/schemas";
import { mapUserProfile } from "@/lib/a1/user-mappers";
import type { MapCompany, MapCountry } from "./engine";

// 02.10.2026 (Александр: «додавай усі компанії з України»): без вибірки,
// але з запасом зверху, щоб сторінка не роздувалась.
const LIMIT = 1500;
/** За кордоном: «офіс» = компанія + місто; мировых офісів може бути тисячі. */
const LIMIT_ABROAD = 2500;

export type MapRegion = "ua" | "eu" | "us" | "latam" | "asia" | "oceania" | "mideast";

/** Межі регіонів (довгота/широта), ті самі, що в public/game-map/v2/geo-*.json. */
const REGION_BOX: Record<Exclude<MapRegion, "ua">, [number, number, number, number]> = {
  eu: [-12.5, 34.0, 45.0, 66.5],
  us: [-128.0, 22.5, -63.0, 52.5],
  latam: [-118.0, -56.0, -33.0, 33.0],
  asia: [60.0, -11.5, 150.0, 55.0],
  oceania: [110.0, -48.0, 180.0, -1.0],
  mideast: [25.0, 12.0, 63.0, 40.0],
};

// 03.10.2026: Латинська Америка -- за країною, а не лише за рамкою (у рамку
// інакше потрапили б Маямі й Х'юстон).
const LATAM = new Set(["MX","GT","BZ","SV","HN","NI","CR","PA","CU","DO","HT","JM","PR","BS","TT","CO","VE","EC","PE","BO","BR","PY","UY","AR","CL","GY","SR","GF"]);

// 03.10.2026: Азія, Океанія, Близький Схід -- теж за країною (рамки Азії
// й Близького Сходу перекриваються, а Кіпр і Туреччина лишаються в Європі).
const ASIA = new Set(["IN","PK","BD","LK","NP","BT","MV","MM","TH","LA","KH","VN","MY","SG","ID","PH","BN","TL","CN","HK","MO","TW","JP","KR","KP","MN","KZ","UZ","KG","TJ","TM","AF"]);
const OCEANIA = new Set(["AU","NZ","PG","FJ","SB","VU","NC","WS","TO","PF"]);
const MIDEAST = new Set(["IL","PS","JO","LB","SY","IQ","IR","SA","AE","QA","KW","BH","OM","YE","EG"]);
const BY_COUNTRY: [MapRegion, Set<string>][] = [["latam", LATAM], ["asia", ASIA], ["oceania", OCEANIA], ["mideast", MIDEAST]];

/** Острів «Віддалено» більше не малюємо: компанії без локації лише в пошуку. */
const REMOTE = { lng: 31.0, lat: 43.9 };

export async function loadCompanies(region: MapRegion = "ua"): Promise<MapCompany[]> {
  try {
    const posts = await allIndexedPosts();
    return region === "ua" ? enrich(collectUkraine(posts)) : enrich(collectAbroad(posts, region));
  } catch {
    return [];
  }
}

// 02.10.2026 (Александр: «розбий ще по країнах, які в нас є»). Список
// країн для дропдауну регіонів: лише ті, що видно на одній з підкладок,
// з кількістю вакансій. Рахується з того самого індексу, без запитів.
export async function loadCountries(): Promise<MapCountry[]> {
  try {
    const posts = await allIndexedPosts();
    const by = new Map<string, MapCountry>();
    for (const p of posts) {
      if (p.kind !== "hiring" || p.author.isAnonymous) continue;
      const loc = p.location;
      const cc = loc?.country?.trim().toUpperCase() ?? "";
      if (!loc?.coordinates || !/^[A-Z]{2}$/.test(cc) || cc === "WW") continue;
      const [lng, lat] = loc.coordinates;
      let r: MapRegion | null = cc === "UA" ? "ua" : null;
      if (!r) for (const [k, set] of BY_COUNTRY) if (set.has(cc)) { r = k; break; }
      if (!r) for (const k of ["eu", "us"] as const) {
        const [x0, y0, x1, y1] = REGION_BOX[k];
        if (lng > x0 && lng < x1 && lat > y0 && lat < y1) { r = k; break; }
      }
      if (!r) continue;
      const c = by.get(cc) ?? by.set(cc, { cc, r, n: 0 }).get(cc)!;
      c.n += 1;
    }
    return [...by.values()].sort((a, b) => b.n - a.n);
  } catch {
    return [];
  }
}

type Post = Awaited<ReturnType<typeof allIndexedPosts>>[number];

function collectUkraine(posts: Post[]): MapCompany[] {
  const byCompany = new Map<string, MapCompany>();
  for (const p of posts) {
    if (p.kind !== "hiring" || p.author.isAnonymous || p.author.external) continue;
    const loc = p.location;
    const country = loc?.country?.trim().toUpperCase() ?? "";
    // Українські компанії без міста у вакансії (DOU ставить «Worldwide») --
    // лише в пошуку карти («не відображено: у профілі не вказана локація»).
    let lng = REMOTE.lng, lat = REMOTE.lat, city = "Remote", remote = true;
    if (loc?.coordinates && country === "UA") {
      const [x, y] = loc.coordinates;
      if (x > 22 && x < 40.3 && y > 44.3 && y < 52.4) { lng = x; lat = y; city = loc.city || loc.display; remote = false; }
    }
    if (remote && country !== "WW" && country !== "") continue; // інша країна -- не ця карта
    const key = p.author.userId ?? p.author.name;
    let c = byCompany.get(key);
    if (!c) {
      c = { id: key, name: p.author.name, username: p.author.username, avatar: p.author.avatarUrl, n: 0, city, lng, lat, jobs: [], userId: p.author.userId, cc: "UA" };
      byCompany.set(key, c);
    } else if (c.city === "Remote" && !remote) {
      c.city = city; c.lng = lng; c.lat = lat;
    }
    c.n += 1;
    if (c.jobs.length < 3) c.jobs.push({ title: p.title, slug: p.slug });
  }
  return [...byCompany.values()].sort((a, b) => b.n - a.n).slice(0, LIMIT);
}

// 02.10.2026 (Александр: карта для інших країн). За кордоном компанія
// стоїть у КОЖНОМУ місті, де наймає (офіс = компанія + місто). Два шари:
// компанії A1 (ext=false) -- будинки, як в Україні; світові компанії з
// зовнішніми вакансіями (Конкістадор, ext=true) -- піни, будинком лише
// зблизька (engine.ts).
function collectAbroad(posts: Post[], region: Exclude<MapRegion, "ua">): MapCompany[] {
  const [x0, y0, x1, y1] = REGION_BOX[region];
  const byOffice = new Map<string, MapCompany>();
  for (const p of posts) {
    if (p.kind !== "hiring" || p.author.isAnonymous) continue;
    const loc = p.location;
    const country = loc?.country?.trim().toUpperCase() ?? "";
    if (!loc?.coordinates || !country || country === "WW") continue;
    const [lng, lat] = loc.coordinates;
    if (!(lng > x0 && lng < x1 && lat > y0 && lat < y1)) continue;
    const only = BY_COUNTRY.find(([k]) => k === region);
    if (only && !only[1].has(country)) continue;
    const who = p.author.userId ?? p.author.name;
    const key = `${who}|${Math.round(lng * 10)}|${Math.round(lat * 10)}`;
    let c = byOffice.get(key);
    if (!c) {
      c = {
        id: key, name: p.author.name, username: p.author.username, avatar: p.author.avatarUrl, n: 0,
        city: loc.city || loc.display, lng, lat, jobs: [], userId: p.author.userId, ext: !!p.author.external, cc: country,
      };
      byOffice.set(key, c);
    }
    c.n += 1;
    if (c.jobs.length < 3) c.jobs.push({ title: p.title, slug: p.slug });
  }
  return [...byOffice.values()]
    .sort((a, b) => Number(!!a.ext) - Number(!!b.ext) || b.n - a.n)
    .slice(0, LIMIT_ABROAD);
}

// 02.10.2026 (Александр: «в карточку при наведении — больше информации,
// которую компании сами указали: количество сотрудников…»). Один запрос
// users.getUsers на все компании карты; если он не прошёл, карта просто
// показывает карточки без этих строк.
async function enrich(list: MapCompany[]): Promise<MapCompany[]> {
  const ids = [...new Set(list.map((c) => c.userId).filter((id): id is string => !!id))];
  if (!ids.length) return list;
  // Пачками по 100: для сотен компаний один запит був би завеликим.
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  const raws = await Promise.all(
    chunks.map((part) => call<unknown>("users.getUsers", { ids: part }).catch(() => [] as unknown)),
  );
  try {
    const raw = raws.flatMap((r) => (Array.isArray(r) ? r : []));
    const byIdAll = new Map<string, MapCompany[]>();
    for (const c of list) if (c.userId) (byIdAll.get(c.userId) ?? byIdAll.set(c.userId, []).get(c.userId)!).push(c);
    for (const item of Array.isArray(raw) ? raw : []) {
      const parsed = parseUserProfile(item);
      if (!parsed || parsed.object !== "user") continue;
      const id = (item as { _id?: string })._id;
      const group = id ? byIdAll.get(id) : undefined;
      const prof = mapUserProfile(parsed);
      if (!group || !prof) continue;
      const company = prof.companies[0];
      for (const c of group) {
        c.bio = (prof.bio || company?.description || "").trim().slice(0, 200) || null;
        c.website = prof.links[0]?.url || company?.link?.url || null;
        c.employees = company?.employeesCount ?? null;
        c.est = company?.establishedYear ?? null;
        c.occupation = prof.expertise || null;
      }
    }
  } catch {
    // без подробностей -- не страшно
  }
  return list;
}

