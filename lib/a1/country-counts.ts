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

import { callWithRetry } from "./client";
import { PostsSearchOutputSchema } from "./schemas";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE, countryByCode } from "@/lib/seo/countries";
import type { CountryOption } from "@/components/country-picker";
import { peekFreshByCountry, peekWorldwide } from "@/lib/a1/facts-index";

const TTL_MS = 60 * 60 * 1000;
const CONCURRENCY = 4; // 02.10.2026: 8 разом з іншими обходами забивало бекенд
const FIRST_WAIT_MS = 4000;
const OBJECT = "post-job-employing";

// 30.09.2026 (Александр): страны, где вакансий совсем мало (до 10), в списке
// выглядят пустыми -- пока не набралось, не показываем. Набралось -- страна
// появится сама (счёт пересчитывается раз в час). RU/BY не показываем вовсе.
const MIN_SHOWN = 10;
const HIDDEN_CODES = new Set(["RU", "BY"]);

// 30.09.2026 (Александр: «останутся вакансии с локацией в Украине и
// удалённые, польские будут только в списке Польши»). Лента «Україна» у
// бэкенда шире: Казак кладёт туда и украинские компании с офисом в
// Варшаве/Лиссабоне. Сайт их в этой ленте не показывает (feed.ts,
// keepInUkraineFeed), значит и число в списке должно быть без них. Точно
// посчитать можно только пройдя саму ленту (4--5 тысяч постов, ~45
// запросов по 100), раз в час вместе с остальными числами.

export function keepInUkraineFeedCountry(country: string | null | undefined): boolean {
  const cc = country?.trim().toUpperCase();
  return !cc || cc === "UA" || cc === "WW";
}

let uaTotal: number | null = null;

/** Сколько вакансий в ленте «Україна» после отсечения чужих офисов (если уже посчитано). */
export function peekUkraineFeedTotal(): number | null {
  return uaTotal;
}

/**
 * Сколько вакансий в ленте «Україна».
 *
 * 09.10.2026 (Александр, счёт Railway вырос в 2,5 раза). Раньше здесь был обход
 * всей ленты постранично -- до 150 запросов по 100 вакансий КАЖДЫЙ ЧАС, только
 * ради одного числа возле флага. На 31 тысяче вакансий это десятки мегабайт из
 * базы за проход и заметная доля счёта за трафик.
 *
 * Лента «Україна» -- это вся лента «для тебе» МИНУС вакансии с чужой локацией
 * (украинские компании с офисом в Варшаве и т.п., см. keepInUkraineFeedCountry).
 * Значит число = «всего в ленте» минус сумма по чужим странам. Все слагаемые --
 * обычные счётчики бэкенда (limit 1, expand=count), вакансии не тянем вовсе.
 * Вакансии без места ни в одну страну не попадают и остаются в числе -- так и надо.
 *
 * ПЕРВАЯ ПОПЫТКА БЫЛА ПРОЩЕ И НЕВЕРНОЙ: «локация = Украина» плюс «тег Worldwide»
 * (им помечают вакансии без города). Получилось 3 237 вместо 6 605 -- у вакансий
 * сервиса DOU этого тега нет, он есть только у того, что публикует Конкистадор.
 */
async function countUkraineFeed(openByCountry: Map<string, number>, total: number): Promise<{ count: number; fresh: number } | null> {
  if (!total) return null;
  let foreign = 0;
  for (const [code, n] of openByCountry) {
    if (code !== DEFAULT_COUNTRY_CODE) foreign += n;
  }
  const count = Math.max(0, total - foreign);
  // «Новые за сутки» считает общий обход вакансий (facts-index): он идёт всё
  // равно, и отдельный запрос ради этой цифры не нужен.
  const fresh = (peekFreshByCountry().get(DEFAULT_COUNTRY_CODE) ?? 0) + (peekWorldwide()?.fresh ?? 0);
  return { count, fresh };
}

let cached: { builtAt: number; options: CountryOption[] } | null = null;
let building: Promise<CountryOption[]> | null = null;

let countFailures = 0;

async function countFor(params: Record<string, unknown>): Promise<number> {
  try {
    const raw = await callWithRetry<unknown>("posts.search", { object: OBJECT, limit: 1, expand: "count", ...params });
    const parsed = PostsSearchOutputSchema.parse(raw);
    return parsed.count?.object[OBJECT] ?? parsed.count?.total ?? 0;
  } catch (err) {
    console.warn("[country-counts] count failed:", err instanceof Error ? err.message : err);
    countFailures += 1;
    return 0;
  }
}

async function build(): Promise<CountryOption[]> {
  countFailures = 0;
  const out: CountryOption[] = [];
  const others = COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY_CODE);

  // Два счётчика на страну: «include» -- сколько всего вакансий страны (число в
  // списке), «open» -- сколько из них попадает в ленту «для тебе» (их вычитаем,
  // чтобы получить число у Украины). Оба -- limit 1, expand=count: лёгкие.
  const openByCountry = new Map<string, number>();
  for (let i = 0; i < others.length; i += CONCURRENCY) {
    const batch = others.slice(i, i + CONCURRENCY);
    const pairs = await Promise.all(
      batch.map(async (c) => [
        await countFor({ location: c.id, external: "include" }),
        await countFor({ location: c.id, external: "open" }),
      ] as const),
    );
    batch.forEach((c, idx) => {
      const [all, open] = pairs[idx] ?? [0, 0];
      openByCountry.set(c.code, open);
      if (all >= MIN_SHOWN && !HIDDEN_CODES.has(c.code)) out.push({ code: c.code, count: all });
    });
  }

  const total = await countFor({ external: "open" });
  const ua = await countUkraineFeed(openByCountry, total);
  if (!ua) countFailures += 1;
  if (ua) uaTotal = ua.count;
  out.unshift({ code: DEFAULT_COUNTRY_CODE, count: ua?.count ?? total, ...(ua && ua.fresh > 0 ? { fresh: ua.fresh } : {}) });

  const [first, ...rest] = out;
  rest.sort((a, b) => b.count - a.count);
  return first ? [first, ...rest] : rest;
}

/** Добавляет к списку стран «+N новых за сутки» (см. peekFreshByCountry). */
function withFresh(options: CountryOption[]): CountryOption[] {
  // «🌏 Worldwide» -- вторым пунктом, сразу после Украины (Александр: важная
  // категория). Число даёт общий обход вакансий (facts-index): пока он не
  // собран, пункта нет, со следующего показа страницы он появится.
  // Базовый список ещё считается (пустой) -- ничего не добавляем, иначе в
  // кэш уйдёт список из одного Worldwide.
  if (options.length === 0) return options;
  const ww = peekWorldwide();
  const withWorld =
    ww && ww.count > 0
      ? [
          ...options.slice(0, 1),
          { code: WORLDWIDE_CODE, count: ww.count, ...(ww.fresh > 0 ? { fresh: ww.fresh } : {}) },
          ...options.slice(1),
        ]
      : options;
  const fresh = peekFreshByCountry();
  if (fresh.size === 0) return withWorld;
  return withWorld.map((o) => {
    // У Украины «новые» уже посчитаны вместе с обходом ленты (build()).
    if (o.code === DEFAULT_COUNTRY_CODE || o.code === WORLDWIDE_CODE) return o;
    const n = fresh.get(o.code);
    return n && n > 0 ? { ...o, fresh: n } : o;
  });
}

export async function fetchCountryOptions(): Promise<CountryOption[]> {
  return withFresh(await fetchCountryOptionsBase());
}

async function fetchCountryOptionsBase(): Promise<CountryOption[]> {
  const now = Date.now();
  if (cached && now - cached.builtAt < TTL_MS) return cached.options;
  if (building) return building;

  building = build()
    .then((options) => {
      // Часть чисел не посчиталась (бэкенд отвечал 503) -- список неполный,
      // держим его минуту, а не час, и пересчитываем.
      const RETRY_MS = 60_000;
      cached = { builtAt: countFailures > 0 ? Date.now() - TTL_MS + RETRY_MS : Date.now(), options };
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
