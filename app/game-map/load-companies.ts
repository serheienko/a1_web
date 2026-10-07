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


// 07.10.2026 (Александр: «чтобы все новые вакансии и компании были и на карте, ничего не пропускаем»).
// У ~30% мировых вакансий место -- только страна, без города (координаты 0,0): раньше они на карту
// не попадали вовсе. Теперь такая вакансия стоит в столице своей страны, подпись -- название страны.
const CAPITAL: Record<string, [number, number]> = {
  US: [-77.04, 38.9], CA: [-75.7, 45.42], GB: [-0.128, 51.507], MX: [-99.13, 19.43], SG: [103.82, 1.352], BR: [-47.88, -15.79],
  PL: [21.01, 52.23], DE: [13.405, 52.52], ES: [-3.7, 40.42], FR: [2.352, 48.857], PT: [-9.14, 38.72], RO: [26.1, 44.43],
  AU: [149.13, -35.28], IN: [77.21, 28.61], HK: [114.17, 22.32], NL: [4.9, 52.37], IE: [-6.26, 53.35], CO: [-74.07, 4.71],
  IT: [12.5, 41.9], SE: [18.07, 59.33], CZ: [14.44, 50.08], MT: [14.51, 35.9], IL: [34.78, 32.09], SA: [46.68, 24.71],
  TW: [121.57, 25.03], MY: [101.69, 3.14], CH: [7.45, 46.95], GR: [23.73, 37.98], JP: [139.69, 35.68], CY: [33.38, 35.19],
  BG: [23.32, 42.7], AR: [-58.38, -34.6], UA: [30.52, 50.45], LT: [25.28, 54.69], VN: [105.85, 21.03], HU: [19.04, 47.5],
  KR: [126.98, 37.57], FI: [24.94, 60.17], NO: [10.75, 59.91], BE: [4.35, 50.85], CL: [-70.67, -33.45], PH: [120.98, 14.6],
  AT: [16.37, 48.21], RS: [20.45, 44.79], AE: [54.38, 24.45], CR: [-84.08, 9.93], TR: [32.86, 39.93], EE: [24.75, 59.44],
  LU: [6.13, 49.61], CN: [116.41, 39.9], MD: [28.86, 47.01], LV: [24.11, 56.95], SN: [-17.47, 14.72], TH: [100.5, 13.76],
  SV: [-89.22, 13.69], DK: [12.57, 55.68], ZA: [28.19, -25.75], NG: [7.4, 9.08], QA: [51.53, 25.29], NZ: [174.78, -41.29],
  GT: [-90.51, 14.63], UY: [-56.16, -34.9], PA: [-79.52, 8.98], KZ: [71.45, 51.17], SI: [14.51, 46.06], SK: [17.11, 48.15],
  HR: [15.98, 45.81], IS: [-21.94, 64.15], LI: [9.52, 47.14], AL: [19.82, 41.33], BA: [18.41, 43.86], ME: [19.26, 42.44],
  MK: [21.43, 42.0], XK: [21.17, 42.66], GE: [44.79, 41.72], AM: [44.51, 40.18], AZ: [49.87, 40.41], EG: [31.24, 30.04],
  JO: [35.93, 31.95], PE: [-77.04, -12.05], EC: [-78.47, -0.18], ID: [106.85, -6.21], PK: [73.05, 33.68], BD: [90.41, 23.81],
  KE: [36.82, -1.29], MA: [-6.84, 34.02], DO: [-69.93, 18.49], PR: [-66.11, 18.47], LK: [79.86, 6.93], BH: [50.59, 26.23],
  KW: [47.98, 29.38], OM: [58.41, 23.59], LB: [35.5, 33.89], PY: [-57.58, -25.26], BO: [-68.15, -16.5], VE: [-66.9, 10.48],
  HN: [-87.21, 14.07], NI: [-86.25, 12.13], JM: [-76.79, 18.0], MN: [106.92, 47.89], UZ: [69.24, 41.3], NP: [85.32, 27.72],
};

/** Точка и подпись вакансии на карте: город, а если в вакансии только страна -- столица и название страны. */
function placeOf(loc: Post["location"], country: string): { lng: number; lat: number; city: string } | null {
  const c = loc?.coordinates;
  if (c && !(c[0] === 0 && c[1] === 0) && loc?.city) return { lng: c[0], lat: c[1], city: loc.city || loc.display };
  const cap = CAPITAL[country];
  if (!cap) return null;
  const name = (loc?.display || country).replace(/^[^\p{L}]+/u, "").trim() || country;
  return { lng: cap[0], lat: cap[1], city: name };
}

export async function loadCompanies(region: MapRegion = "ua"): Promise<MapCompany[]> {
  try {
    const posts = await allIndexedPosts();
    return region === "ua" ? enrich(collectUkraine(posts)) : enrich(collectAbroad(posts, region));
  } catch {
    return [];
  }
}

// 07.10.2026 (Александр: «давай делать кластеризацию»). Коли офісів більше за
// ліміт, ми їх більше НЕ відкидаємо: перші keep лишаються окремими будинками,
// решта збирається в один пін на місто («+340 компаній»), де враховані всі їхні
// вакансії й назви (пошук карти знаходить і їх). Так на карті є кожна вакансія,
// а JSON не роздувається до десятків мегабайт.
function foldByCity(list: MapCompany[], limit: number): MapCompany[] {
  if (list.length <= limit) return list;
  const keep = Math.max(0, limit - 400);
  const out = list.slice(0, keep);
  const groups = new Map<string, MapCompany & { names: string[]; cos: number; cluster: true }>();
  for (const c of list.slice(keep)) {
    const key = `${c.cc}|${c.city}`;
    let g = groups.get(key);
    if (!g) {
      g = { id: `cl|${key}`, name: c.city, username: null, avatar: null, n: 0, city: c.city, lng: c.lng, lat: c.lat,
            jobs: [], userId: null, ext: true, cc: c.cc, cluster: true, cos: 0, names: [] } as MapCompany & { names: string[]; cos: number; cluster: true };
      groups.set(key, g);
    }
    g.n += c.n;
    g.cos += 1;
    g.names.push(c.name);
    if (g.jobs.length < 3 && c.jobs[0]) g.jobs.push(c.jobs[0]);
  }
  return [...out, ...groups.values()];
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
      if (!/^[A-Z]{2}$/.test(cc) || cc === "WW") continue;
      const pl = placeOf(loc, cc);
      if (!pl) continue;
      const { lng, lat } = pl;
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
  return foldByCity([...byCompany.values()].sort((a, b) => b.n - a.n), LIMIT);
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
    if (!country || country === "WW") continue;
    const pl = placeOf(loc, country);
    if (!pl) continue;
    const { lng, lat } = pl;
    if (!(lng > x0 && lng < x1 && lat > y0 && lat < y1)) continue;
    const only = BY_COUNTRY.find(([k]) => k === region);
    if (only && !only[1].has(country)) continue;
    const who = p.author.userId ?? p.author.name;
    const key = `${who}|${Math.round(lng * 10)}|${Math.round(lat * 10)}`;
    let c = byOffice.get(key);
    if (!c) {
      c = {
        id: key, name: p.author.name, username: p.author.username, avatar: p.author.avatarUrl, n: 0,
        city: pl.city, lng, lat, jobs: [], userId: p.author.userId, ext: !!p.author.external, cc: country,
      };
      byOffice.set(key, c);
    }
    c.n += 1;
    if (c.jobs.length < 3) c.jobs.push({ title: p.title, slug: p.slug });
  }
  return foldByCity(
    [...byOffice.values()].sort((a, b) => Number(!!a.ext) - Number(!!b.ext) || b.n - a.n),
    LIMIT_ABROAD,
  );
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

