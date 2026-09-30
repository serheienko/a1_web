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
import { COUNTRIES, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE } from "@/lib/seo/countries";
import type { CountryOption } from "@/components/country-picker";
import { peekFreshByCountry, peekWorldwide } from "@/lib/a1/facts-index";
import { mapPosts } from "./mappers";

const TTL_MS = 60 * 60 * 1000;
const CONCURRENCY = 8;
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
const UA_SWEEP_PAGE = 100;
const UA_SWEEP_PARALLEL = 6;
const UA_SWEEP_MAX_PAGES = 150;
const FRESH_MS = 24 * 60 * 60 * 1000;

export function keepInUkraineFeedCountry(country: string | null | undefined): boolean {
  const cc = country?.trim().toUpperCase();
  return !cc || cc === "UA" || cc === "WW";
}

let uaTotal: number | null = null;

/** Сколько вакансий в ленте «Україна» после отсечения чужих офисов (если уже посчитано). */
export function peekUkraineFeedTotal(): number | null {
  return uaTotal;
}

async function countUkraineFeed(): Promise<{ count: number; fresh: number } | null> {
  try {
    const page = async (offset: number) => {
      const raw = await callWithRetry<unknown>("posts.search", {
        object: OBJECT,
        external: "open",
        limit: UA_SWEEP_PAGE,
        ...(offset > 0 ? { offset } : {}),
      });
      return PostsSearchOutputSchema.parse(raw);
    };
    const first = await page(0);
    const all = [...first.items];
    let hasMore = first.pagination.hasMore;
    let offset = UA_SWEEP_PAGE;
    while (hasMore && offset < UA_SWEEP_PAGE * UA_SWEEP_MAX_PAGES) {
      const offsets = Array.from({ length: UA_SWEEP_PARALLEL }, (_, i) => offset + i * UA_SWEEP_PAGE);
      const pages = await Promise.all(offsets.map(page));
      for (const p of pages) all.push(...p.items);
      hasMore = pages[pages.length - 1]?.pagination.hasMore ?? false;
      offset += UA_SWEEP_PARALLEL * UA_SWEEP_PAGE;
    }
    const since = Date.now() - FRESH_MS;
    let count = 0;
    let fresh = 0;
    for (const post of mapPosts(all)) {
      if (!keepInUkraineFeedCountry(post.location?.country)) continue;
      count += 1;
      if ((post.sourcePublishedAt ?? post.publishedAt).getTime() >= since) fresh += 1;
    }
    return { count, fresh };
  } catch (err) {
    console.warn("[country-counts] ukraine sweep failed:", err instanceof Error ? err.message : err);
    return null;
  }
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

  // Точное число -- обходом ленты; если обход упал, берём счёт бэкенда (чуть
  // завышен на чужие офисы, но лучше, чем пусто).
  const swept = await countUkraineFeed();
  if (!swept) countFailures += 1;
  const forYou = swept?.count ?? (await countFor({ external: "open" }));
  if (swept) uaTotal = swept.count;
  out.push({ code: DEFAULT_COUNTRY_CODE, count: forYou, ...(swept && swept.fresh > 0 ? { fresh: swept.fresh } : {}) });

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
