// lib/a1/country-counts.ts
//
// 30.09.2026 (Конкистадор). Сколько вакансий в каждой стране -- для
// селектора у поиска (components/country-picker.tsx): страны без вакансий
// в список не попадают, у остальных стоит число.
//
// Считается не обходом всех вакансий (их с мировыми будет ~20 тысяч), а
// одним запросом на страну: posts.search с location = id страны и
// expand=count, limit 1 -- бэкенд отвечает числом, вакансии не тянем.
// Семьдесят стран -- семьдесят лёгких запросов раз в час; результат лежит в
// памяти процесса, параллельные вызовы схлопываются в один пересчёт (та же
// схема, что lib/a1/facts-index.ts).
//
// Україна считается отдельно и иначе: это не «страна = UA», а лента
// «для тебе» (external: open), ровно то, что человек увидит, нажав её.

import { call } from "./client";
import { PostsSearchOutputSchema } from "./schemas";
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from "@/lib/seo/countries";
import type { CountryOption } from "@/components/country-picker";

const TTL_MS = 60 * 60 * 1000;
const CONCURRENCY = 8;
const FIRST_WAIT_MS = 4000;
const OBJECT = "post-job-employing";

// 30.09.2026 (Александр): страны, где вакансий совсем мало (до 10), в списке
// выглядят пустыми -- пока не набралось, не показываем. Набралось -- страна
// появится сама (счёт пересчитывается раз в час). RU/BY не показываем вовсе.
const MIN_SHOWN = 10;
const HIDDEN_CODES = new Set(["RU", "BY"]);

let cached: { builtAt: number; options: CountryOption[] } | null = null;
let building: Promise<CountryOption[]> | null = null;

async function countFor(params: Record<string, unknown>): Promise<number> {
  try {
    const raw = await call<unknown>("posts.search", { object: OBJECT, limit: 1, expand: "count", ...params });
    const parsed = PostsSearchOutputSchema.parse(raw);
    return parsed.count?.object[OBJECT] ?? parsed.count?.total ?? 0;
  } catch (err) {
    console.warn("[country-counts] count failed:", err instanceof Error ? err.message : err);
    return 0;
  }
}

async function build(): Promise<CountryOption[]> {
  const out: CountryOption[] = [];
  const others = COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY_CODE);

  const [forYou] = await Promise.all([countFor({ external: "open" })]);
  out.push({ code: DEFAULT_COUNTRY_CODE, count: forYou });

  for (let i = 0; i < others.length; i += CONCURRENCY) {
    const batch = others.slice(i, i + CONCURRENCY);
    const counts = await Promise.all(batch.map((c) => countFor({ location: c.id, external: "include" })));
    batch.forEach((c, idx) => {
      const count = counts[idx] ?? 0;
      if (count >= MIN_SHOWN && !HIDDEN_CODES.has(c.code)) out.push({ code: c.code, count });
    });
  }

  const [first, ...rest] = out;
  rest.sort((a, b) => b.count - a.count);
  return first ? [first, ...rest] : rest;
}

export async function fetchCountryOptions(): Promise<CountryOption[]> {
  const now = Date.now();
  if (cached && now - cached.builtAt < TTL_MS) return cached.options;
  if (building) return building;

  building = build()
    .then((options) => {
      cached = { builtAt: Date.now(), options };
      return options;
    })
    .finally(() => {
      building = null;
    });

  // Пока считается заново, старый список лучше пустого селектора. А самый
  // первый пересчёт после деплоя страницу не держит: ждём его не дольше
  // FIRST_WAIT_MS, иначе отдаём пустой список -- следующий запрос (главная
  // перестраивается каждые 15 с) уже получит готовые числа.
  if (cached) return cached.options;
  return Promise.race([
    building,
    new Promise<CountryOption[]>((resolve) => setTimeout(() => resolve([]), FIRST_WAIT_MS)),
  ]);
}
