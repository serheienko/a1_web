// lib/seo/countries.ts
//
// 30.09.2026 (Конкистадор): справочник стран для селектора у поиска.
// `id` -- это WorldLocation._id самой страны на бэкенде: у локации в младших
// 9 битах лежит номер страны, и posts.search с `location: <id страны>`
// фильтрует по стране (`location_id & 511 = id`). Значения сняты живьём
// с locations.search 30.09.2026 -- не выдуманы. Флаг НЕ храним: он
// однозначно считается из ISO-кода (см. flagEmoji).
//
// Названия: uk / en / ru -- здесь; de / es / fr / pl / pt-BR / zh -- в
// country-names.ts (01.10.2026); без записи берётся английское.

import type { Locale } from "@/components/t";
import { COUNTRY_NAMES } from "@/lib/seo/country-names";

export type Country = { code: string; id: number; en: string; uk: string; ru: string };

export const COUNTRIES: Country[] = [
  { code: "AR", id: 10, en: "Argentina", uk: "Аргентина", ru: "Аргентина" },
  { code: "AM", id: 11, en: "Armenia", uk: "Вірменія", ru: "Армения" },
  { code: "AU", id: 13, en: "Australia", uk: "Австралія", ru: "Австралия" },
  { code: "AT", id: 14, en: "Austria", uk: "Австрія", ru: "Австрия" },
  { code: "AZ", id: 15, en: "Azerbaijan", uk: "Азербайджан", ru: "Азербайджан" },
  { code: "BD", id: 18, en: "Bangladesh", uk: "Бангладеш", ru: "Бангладеш" },
  { code: "BY", id: 20, en: "Belarus", uk: "Білорусь", ru: "Беларусь" },
  { code: "BE", id: 21, en: "Belgium", uk: "Бельгія", ru: "Бельгия" },
  { code: "BR", id: 31, en: "Brazil", uk: "Бразилія", ru: "Бразилия" },
  { code: "BG", id: 34, en: "Bulgaria", uk: "Болгарія", ru: "Болгария" },
  { code: "CA", id: 40, en: "Canada", uk: "Канада", ru: "Канада" },
  { code: "CL", id: 44, en: "Chile", uk: "Чилі", ru: "Чили" },
  { code: "CN", id: 45, en: "China", uk: "Китай", ru: "Китай" },
  { code: "CO", id: 48, en: "Colombia", uk: "Колумбія", ru: "Колумбия" },
  { code: "CR", id: 53, en: "Costa Rica", uk: "Коста-Рика", ru: "Коста-Рика" },
  { code: "HR", id: 55, en: "Croatia", uk: "Хорватія", ru: "Хорватия" },
  { code: "CY", id: 58, en: "Cyprus", uk: "Кіпр", ru: "Кипр" },
  { code: "CZ", id: 59, en: "Czechia", uk: "Чехія", ru: "Чехия" },
  { code: "DK", id: 60, en: "Denmark", uk: "Данія", ru: "Дания" },
  { code: "EG", id: 65, en: "Egypt", uk: "Єгипет", ru: "Египет" },
  { code: "EE", id: 69, en: "Estonia", uk: "Естонія", ru: "Эстония" },
  { code: "FI", id: 75, en: "Finland", uk: "Фінляндія", ru: "Финляндия" },
  { code: "FR", id: 76, en: "France", uk: "Франція", ru: "Франция" },
  { code: "GE", id: 82, en: "Georgia", uk: "Грузія", ru: "Грузия" },
  { code: "DE", id: 83, en: "Germany", uk: "Німеччина", ru: "Германия" },
  { code: "GR", id: 86, en: "Greece", uk: "Греція", ru: "Греция" },
  { code: "HU", id: 101, en: "Hungary", uk: "Угорщина", ru: "Венгрия" },
  { code: "IS", id: 102, en: "Iceland", uk: "Ісландія", ru: "Исландия" },
  { code: "IN", id: 103, en: "India", uk: "Індія", ru: "Индия" },
  { code: "ID", id: 104, en: "Indonesia", uk: "Індонезія", ru: "Индонезия" },
  { code: "IE", id: 107, en: "Ireland", uk: "Ірландія", ru: "Ирландия" },
  { code: "IL", id: 109, en: "Israel", uk: "Ізраїль", ru: "Израиль" },
  { code: "IT", id: 110, en: "Italy", uk: "Італія", ru: "Италия" },
  { code: "JP", id: 112, en: "Japan", uk: "Японія", ru: "Япония" },
  { code: "KZ", id: 115, en: "Kazakhstan", uk: "Казахстан", ru: "Казахстан" },
  { code: "KE", id: 116, en: "Kenya", uk: "Кенія", ru: "Кения" },
  { code: "MX", id: 144, en: "Mexico", uk: "Мексика", ru: "Мексика" },
  { code: "SG", id: 200, en: "Singapore", uk: "Сінгапур", ru: "Сингапур" },
  { code: "KR", id: 119, en: "South Korea", uk: "Південна Корея", ru: "Южная Корея" },
  { code: "LV", id: 123, en: "Latvia", uk: "Латвія", ru: "Латвия" },
  { code: "LT", id: 129, en: "Lithuania", uk: "Литва", ru: "Литва" },
  { code: "MY", id: 135, en: "Malaysia", uk: "Малайзія", ru: "Малайзия" },
  { code: "MD", id: 146, en: "Moldova", uk: "Молдова", ru: "Молдова" },
  { code: "NP", id: 156, en: "Nepal", uk: "Непал", ru: "Непал" },
  { code: "NL", id: 157, en: "Netherlands", uk: "Нідерланди", ru: "Нидерланды" },
  { code: "NZ", id: 159, en: "New Zealand", uk: "Нова Зеландія", ru: "Новая Зеландия" },
  { code: "NG", id: 162, en: "Nigeria", uk: "Нігерія", ru: "Нигерия" },
  { code: "NO", id: 166, en: "Norway", uk: "Норвегія", ru: "Норвегия" },
  { code: "PK", id: 168, en: "Pakistan", uk: "Пакистан", ru: "Пакистан" },
  { code: "PE", id: 174, en: "Peru", uk: "Перу", ru: "Перу" },
  { code: "PH", id: 175, en: "Philippines", uk: "Філіппіни", ru: "Филиппины" },
  { code: "PL", id: 177, en: "Poland", uk: "Польща", ru: "Польша" },
  { code: "PT", id: 178, en: "Portugal", uk: "Португалія", ru: "Португалия" },
  { code: "QA", id: 180, en: "Qatar", uk: "Катар", ru: "Катар" },
  { code: "RO", id: 182, en: "Romania", uk: "Румунія", ru: "Румыния" },
  { code: "SA", id: 195, en: "Saudi Arabia", uk: "Саудівська Аравія", ru: "Саудовская Аравия" },
  { code: "RS", id: 197, en: "Serbia", uk: "Сербія", ru: "Сербия" },
  { code: "SK", id: 202, en: "Slovakia", uk: "Словаччина", ru: "Словакия" },
  { code: "SI", id: 203, en: "Slovenia", uk: "Словенія", ru: "Словения" },
  { code: "ZA", id: 206, en: "South Africa", uk: "ПАР", ru: "ЮАР" },
  { code: "ES", id: 209, en: "Spain", uk: "Іспанія", ru: "Испания" },
  { code: "LK", id: 210, en: "Sri Lanka", uk: "Шрі-Ланка", ru: "Шри-Ланка" },
  { code: "SE", id: 214, en: "Sweden", uk: "Швеція", ru: "Швеция" },
  { code: "CH", id: 215, en: "Switzerland", uk: "Швейцарія", ru: "Швейцария" },
  { code: "TW", id: 217, en: "Taiwan", uk: "Тайвань", ru: "Тайвань" },
  { code: "TH", id: 220, en: "Thailand", uk: "Таїланд", ru: "Таиланд" },
  { code: "TR", id: 226, en: "Turkey", uk: "Туреччина", ru: "Турция" },
  { code: "UA", id: 231, en: "Ukraine", uk: "Україна", ru: "Украина" },
  { code: "AE", id: 232, en: "United Arab Emirates", uk: "ОАЕ", ru: "ОАЭ" },
  { code: "GB", id: 233, en: "United Kingdom", uk: "Велика Британія", ru: "Великобритания" },
  { code: "US", id: 234, en: "United States", uk: "США", ru: "США" },
  { code: "UY", id: 236, en: "Uruguay", uk: "Уругвай", ru: "Уругвай" },
  { code: "UZ", id: 237, en: "Uzbekistan", uk: "Узбекистан", ru: "Узбекистан" },
  { code: "VN", id: 240, en: "Vietnam", uk: "В'єтнам", ru: "Вьетнам" },
];

/**
 * 30.09.2026 (Александр: «Worldwide -- важная категория, как с ней жить»):
 * «весь мир» -- не страна, а отдельный пункт списка у поиска: удалённые
 * вакансии, открытые для любой страны. В COUNTRIES его НЕТ намеренно: по
 * этому списку считаются счётчики и фильтр бэкенда (у WW нет id страны),
 * отбор таких вакансий живёт отдельно (lib/a1/facts-index.ts, worldwidePosts).
 */
export const WORLDWIDE_CODE = "WW";
export const WORLDWIDE: Country = { code: WORLDWIDE_CODE, id: 0, en: "Worldwide", uk: "Весь світ", ru: "Весь мир" };

const BY_CODE = new Map<string, Country>([...COUNTRIES.map((c): [string, Country] => [c.code, c]), [WORLDWIDE_CODE, WORLDWIDE]]);
const BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));

export function countryByCode(code: string | null | undefined): Country | null {
  return code ? (BY_CODE.get(code.toUpperCase()) ?? null) : null;
}

export function countryById(id: number | null | undefined): Country | null {
  return id == null ? null : (BY_ID.get(id) ?? null);
}

/** 🇺🇦 из "UA": две региональные буквы-индикаторы Unicode. */
export function flagEmoji(code: string): string {
  const cc = code.toUpperCase();
  if (cc === WORLDWIDE_CODE) return "🌏";
  if (!/^[A-Z]{2}$/.test(cc)) return "🌍";
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function countryName(country: Country, locale: Locale): string {
  if (locale === "uk") return country.uk;
  if (locale === "ru") return country.ru;
  // 01.10.2026: de / es / fr / pl / pt-BR / zh -- свои названия (country-names.ts).
  return COUNTRY_NAMES[country.code]?.[locale] ?? country.en;
}

/** Страна по умолчанию -- Україна (решение 29.09.2026: не по IP, а по аудитории). */
export const DEFAULT_COUNTRY_CODE = "UA";
