// lib/events/util.ts -- общие функции раздела «Події»: даты, слаги, регионы, поиск.
import type { EvLang, EventItem } from "./types";

export const SITE_URL = "https://jobs.a1appp.com";

/** Сегодня по Киеву, YYYY-MM-DD. */
export function todayKyiv(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isUpcoming(e: EventItem, today: string): boolean {
  return e.end >= today;
}

export function utc(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}

const LOC: Record<EvLang, string> = { uk: "uk-UA", en: "en-GB" };

export function fmtDay(iso: string, lang: EvLang, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return utc(iso).toLocaleDateString(LOC[lang], { ...opts, timeZone: "UTC" });
}

/** «24–26 жовтня 2026» / «30 жовтня – 1 листопада 2026». */
export function fmtRange(start: string, end: string, lang: EvLang): string {
  if (!end || end === start) return fmtDay(start, lang);
  const a = utc(start);
  const b = utc(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    const month = utc(end).toLocaleDateString(LOC[lang], { month: "long", year: "numeric", timeZone: "UTC" });
    return `${a.getUTCDate()}–${b.getUTCDate()} ${month}`;
  }
  const left = utc(start).toLocaleDateString(LOC[lang], { day: "numeric", month: "long", timeZone: "UTC" });
  return `${left} – ${fmtDay(end, lang)}`;
}

export function monthShort(iso: string, lang: EvLang): string {
  return utc(iso).toLocaleDateString(LOC[lang], { month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase();
}

export function dayNum(iso: string): number {
  return utc(iso).getUTCDate();
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthTitle(key: string, lang: EvLang): string {
  const s = new Date(`${key}-15T12:00:00Z`).toLocaleDateString(LOC[lang], { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugify(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", ы: "y", э: "e", ъ: "",
  };
  return s
    .toLowerCase()
    .replace(/[а-яґєіїыэъ]/g, (c) => map[c] ?? "")
    .replace(/c\+\+/g, "cpp")
    .replace(/c#/g, "csharp")
    .replace(/\.net/g, "dotnet")
    .replace(/\.js\b/g, "js")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- регионы ----
const EUROPE = new Set([
  "Albania", "Andorra", "Austria", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
  "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Serbia",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "U.K.", "United Kingdom", "Georgia", "Armenia", "Turkey", "Türkiye",
]);

export type Region = "ua" | "eu" | "online" | "world";

export function regionOf(e: Pick<EventItem, "online" | "country">): Region {
  if (e.country === "Ukraine") return "ua";
  if (e.online && !e.country) return "online";
  if (EUROPE.has(e.country)) return "eu";
  if (e.online) return "online";
  return "world";
}

const COUNTRY_UK: Record<string, string> = {
  Ukraine: "Україна", Germany: "Німеччина", "U.S.A.": "США", "U.K.": "Велика Британія", Spain: "Іспанія", Australia: "Австралія", India: "Індія",
  Netherlands: "Нідерланди", "United Arab Emirates": "ОАЕ", Switzerland: "Швейцарія", Poland: "Польща", Singapore: "Сінгапур", France: "Франція",
  Italy: "Італія", Sweden: "Швеція", Canada: "Канада", Portugal: "Португалія", Austria: "Австрія", Belgium: "Бельгія", Czechia: "Чехія",
  "Czech Republic": "Чехія", Denmark: "Данія", Norway: "Норвегія", Finland: "Фінляндія", Ireland: "Ірландія", Romania: "Румунія", Lithuania: "Литва",
  Latvia: "Латвія", Estonia: "Естонія", Greece: "Греція", Turkey: "Туреччина", Japan: "Японія", Brazil: "Бразилія", Israel: "Ізраїль",
  Hungary: "Угорщина", Bulgaria: "Болгарія", Croatia: "Хорватія", Serbia: "Сербія", Slovenia: "Словенія", Slovakia: "Словаччина", Mexico: "Мексика",
  "South Africa": "ПАР", "South Korea": "Південна Корея", Georgia: "Грузія", Armenia: "Вірменія", Moldova: "Молдова", Cyprus: "Кіпр", Malta: "Мальта",
  Luxembourg: "Люксембург", Iceland: "Ісландія", Nigeria: "Нігерія", Kenya: "Кенія", Argentina: "Аргентина", Chile: "Чилі", Colombia: "Колумбія",
  Indonesia: "Індонезія", Vietnam: "В’єтнам", Thailand: "Таїланд", Philippines: "Філіппіни", Malaysia: "Малайзія", Egypt: "Єгипет", Morocco: "Марокко",
};

const CITY_EN: Record<string, string> = {
  "Київ": "Kyiv", "Львів": "Lviv", "Харків": "Kharkiv", "Дніпро": "Dnipro", "Одеса": "Odesa", "Івано-Франківськ": "Ivano-Frankivsk",
  "Вінниця": "Vinnytsia", "Запоріжжя": "Zaporizhzhia", "Чернівці": "Chernivtsi", "Ужгород": "Uzhhorod", "Рівне": "Rivne", "Тернопіль": "Ternopil",
  "Луцьк": "Lutsk", "Полтава": "Poltava", "Житомир": "Zhytomyr", "Черкаси": "Cherkasy", "Суми": "Sumy", "Хмельницький": "Khmelnytskyi",
  "Миколаїв": "Mykolaiv", "Кропивницький": "Kropyvnytskyi", "Чернігів": "Chernihiv", "Буковель": "Bukovel", "Варшава": "Warsaw",
};

/** Город для показа: на английских страницах украинские названия пишем латиницей. */
const CITY_UK: Record<string, string> = {
  Berlin: "Берлін", London: "Лондон", Barcelona: "Барселона", Amsterdam: "Амстердам", Paris: "Париж", Munich: "Мюнхен", Prague: "Прага",
  Vienna: "Відень", Warsaw: "Варшава", Krakow: "Краків", Lisbon: "Лісабон", Madrid: "Мадрид", Dublin: "Дублін", Copenhagen: "Копенгаген",
  Stockholm: "Стокгольм", Helsinki: "Гельсінкі", Oslo: "Осло", Zurich: "Цюріх", Hamburg: "Гамбург", Cologne: "Кельн", Rome: "Рим", Milan: "Мілан",
  Budapest: "Будапешт", Brussels: "Брюссель", Singapore: "Сінгапур", Tokyo: "Токіо", "New York": "Нью-Йорк", "San Francisco": "Сан-Франциско",
  Kyiv: "Київ", Lviv: "Львів", Kharkiv: "Харків", Dnipro: "Дніпро", Odesa: "Одеса", Vilnius: "Вільнюс", Riga: "Рига", Tallinn: "Таллінн",
  Bucharest: "Бухарест", Sofia: "Софія", Belgrade: "Белград", Tbilisi: "Тбілісі", Gdansk: "Гданськ", Wroclaw: "Вроцлав", Edinburgh: "Единбург",
  Manchester: "Манчестер", Mannheim: "Мангайм", Utrecht: "Утрехт", Rotterdam: "Роттердам", Nuremberg: "Нюрнберг", Stuttgart: "Штутгарт",
};
const CITY_EN_EXTRA: Record<string, string> = {
  "Берлін": "Berlin", "Гданськ": "Gdansk", "Кельн": "Cologne", "Мюнхен": "Munich", "Прага": "Prague", "Краків": "Krakow", "Вроцлав": "Wroclaw",
};

export function cityLabel(city: string, lang: EvLang): string {
  return lang === "en" ? CITY_EN[city] ?? CITY_EN_EXTRA[city] ?? city : CITY_UK[city] ?? city;
}

/** Подпись города или страны в чипах и заголовках подборок. */
export function placeChipLabel(label: string, lang: EvLang): string {
  return cityLabel(countryLabel(label, lang), lang);
}

export function countryLabel(country: string, lang: EvLang): string {
  if (!country) return "";
  const c = country === "U.K." ? "United Kingdom" : country === "U.S.A." ? "United States" : country;
  return lang === "uk" ? COUNTRY_UK[country] ?? c : c;
}

export function placeLabel(e: Pick<EventItem, "city" | "country" | "online">, lang: EvLang): string {
  if (e.online && !e.city) return lang === "uk" ? "Онлайн" : "Online";
  const parts = [cityLabel(e.city, lang), countryLabel(e.country, lang)].filter(Boolean);
  const base = parts.join(", ");
  return e.online ? `${base ? base + " · " : ""}${lang === "uk" ? "онлайн" : "online"}` : base;
}

// ---- коллекции (теги, места) ----
export type Coll = { slug: string; label: string; n: number; upcoming: number };

export function tagSlug(label: string): string {
  return slugify(label);
}

export function collectTags(events: EventItem[], today: string): Coll[] {
  const m = new Map<string, Coll>();
  for (const e of events) {
    for (const t of e.tags) {
      const slug = tagSlug(t);
      if (!slug) continue;
      const c = m.get(slug) ?? { slug, label: t, n: 0, upcoming: 0 };
      c.n++;
      if (e.end >= today) c.upcoming++;
      m.set(slug, c);
    }
  }
  return [...m.values()].sort((a, b) => b.upcoming - a.upcoming || b.n - a.n || a.label.localeCompare(b.label));
}

export function placeSlugOf(e: Pick<EventItem, "city" | "country" | "online">): string[] {
  const out: string[] = [];
  if (e.city && !e.online) out.push(slugify(e.city));
  if (e.country) out.push(slugify(e.country === "U.S.A." ? "usa" : e.country === "U.K." ? "uk" : e.country));
  return out.filter(Boolean);
}

export function collectPlaces(events: EventItem[], today: string): Coll[] {
  const m = new Map<string, Coll>();
  for (const e of events) {
    const slugs = placeSlugOf(e);
    const labels = [e.city && !e.online ? e.city : "", e.country].filter(Boolean);
    const list = e.city && !e.online ? [e.city, e.country].filter(Boolean) : [e.country].filter(Boolean);
    void labels;
    slugs.forEach((slug, i) => {
      const label = list[i] ?? slug;
      const c = m.get(slug) ?? { slug, label, n: 0, upcoming: 0 };
      c.n++;
      if (e.end >= today) c.upcoming++;
      m.set(slug, c);
    });
  }
  return [...m.values()].sort((a, b) => b.upcoming - a.upcoming || b.n - a.n);
}

/** Порог «живой» подборки: меньше -- страница закрыта noindex и в карту не идёт. */
export const MIN_COLLECTION = 3;

export function sortByStart(a: EventItem, b: EventItem): number {
  return a.start.localeCompare(b.start) || a.name.localeCompare(b.name);
}

export function eventPath(slug: string, lang: EvLang): string {
  return lang === "uk" ? `/events/${slug}` : `/events/en/${slug}`;
}
export function seriesPath(slug: string, lang: EvLang): string {
  return lang === "uk" ? `/events/series/${slug}` : `/events/en/series/${slug}`;
}
export function topicPath(slug: string, lang: EvLang): string {
  return lang === "uk" ? `/events/topic/${slug}` : `/events/en/topic/${slug}`;
}
export function placePath(slug: string, lang: EvLang): string {
  return lang === "uk" ? `/events/in/${slug}` : `/events/en/in/${slug}`;
}
export function indexPath(lang: EvLang): string {
  return lang === "uk" ? "/events" : "/events/en";
}

export const FORMAT_LABEL: Record<EventItem["format"], Record<EvLang, string>> = {
  conference: { uk: "Конференція", en: "Conference" },
  meetup: { uk: "Мітап", en: "Meetup" },
  workshop: { uk: "Воркшоп", en: "Workshop" },
  course: { uk: "Курс", en: "Course" },
  other: { uk: "Подія", en: "Event" },
};

/** Палітра обкладинки-заглушки (та сама мова, що у превʼю новин). */
export const COVER_HUES = [
  ["#1b3a95", "#03051f", "#7aa2ff"],
  ["#1d7a3a", "#031a0c", "#7bf0a0"],
  ["#5b2aa8", "#0e0524", "#c19bff"],
  ["#b8420f", "#210a02", "#ff9a62"],
  ["#0f6b6e", "#021c24", "#5fe0d0"],
  ["#a3205a", "#1c0511", "#ff8fc0"],
  ["#9a5a10", "#1c0e02", "#ffc15e"],
] as const;

export function hashOf(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}
