// lib/github/fetch.ts
//
// Сервер собирает GithubSummary (lib/github/core.ts) для одного логина и кеширует его на сутки,
// чтобы GitHub дёргался примерно раз в день на человека. Кеш -- общее хранилище сайта
// (lib/kv/store.ts, Postgres на Railway, путь a1/github/<login>.json) плюс память процесса.
// «Нет такого пользователя» тоже кешируется на сутки.
//
// Источник: есть GITHUB_TOKEN -> один GraphQL-запрос. Нет -- REST (профиль + репозитории) и
// публичная HTML-страница календаря. Токену не нужны никакие права, он только поднимает лимит.

import { kvConfigured, kvGetJson, kvPutJson } from "@/lib/kv/store";
import {
  bucketLanguages,
  githubYearRange,
  githubYears,
  groupDaysIntoWeeks,
  isValidGithubLogin,
  languageColor,
  levelFromGraphql,
  parseContributionsHtml,
  resolveGithubYear,
  type GithubDay,
  type GithubRepo,
  type GithubSummary,
  type GithubWeek,
} from "./core";

if (typeof window !== "undefined") {
  throw new Error("[lib/github/fetch] server-only");
}

export const GITHUB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Прошлые годы не меняются -- календарь кешируем на неделю. */
export const GITHUB_PAST_YEAR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const MEMORY_MAX = 2000;
const UA = "A1-jobs-web/1.0 (+https://jobs.a1appp.com)";

/** Не зависит от года: профиль, языки, топ-репозитории (кешируется отдельно). */
type Base = Omit<GithubSummary, "totalContributions" | "weeks" | "year" | "years"> & { createdAt: string };
type Calendar = { totalContributions: number; weeks: GithubWeek[] };

type CacheEntry<T> = { at: number; notFound?: true; data?: T };

export type GithubResult =
  | { status: "ok"; data: GithubSummary }
  | { status: "not_found" }
  | { status: "bad_year" };

class NotFound extends Error {}

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function memGet(key: string): CacheEntry<unknown> | undefined {
  const e = memory.get(key);
  if (e) {
    memory.delete(key);
    memory.set(key, e); // LRU: свежий -- в конец
  }
  return e;
}

function memSet(key: string, e: CacheEntry<unknown>) {
  memory.delete(key);
  memory.set(key, e);
  while (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

// Профиль: a1/github/<login>.json (как раньше); календарь года: a1/github/cal/<login>/<год>.json.
async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const m = memGet(key);
  if (m) return m as CacheEntry<T>;
  if (!kvConfigured()) return null;
  try {
    const e = await kvGetJson<CacheEntry<T>>(`a1/github/${key}.json`);
    if (e && typeof e.at === "number") {
      memSet(key, e);
      return e;
    }
  } catch (err) {
    console.warn("[github] cache read failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

async function writeCache<T>(key: string, e: CacheEntry<T>) {
  memSet(key, e);
  if (!kvConfigured()) return;
  try {
    await kvPutJson(`a1/github/${key}.json`, e);
  } catch (err) {
    console.warn("[github] cache write failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Свежий кеш -> из кеша. Иначе load(); ошибка -> старый кеш, если есть, иначе исключение.
 * «Нет пользователя» (NotFound) тоже кешируется. Одинаковые запросы склеиваются.
 */
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<{ notFound: true } | { data: T }> {
  const hit = await readCache<T>(key);
  if (hit && Date.now() - hit.at < ttl) return hit.notFound || !hit.data ? { notFound: true } : { data: hit.data };

  const running = inflight.get(key) as Promise<{ notFound: true } | { data: T }> | undefined;
  if (running) return running;

  const job = (async () => {
    try {
      const data = await load();
      await writeCache<T>(key, { at: Date.now(), data });
      return { data };
    } catch (err) {
      if (err instanceof NotFound) {
        await writeCache<T>(key, { at: Date.now(), notFound: true });
        return { notFound: true as const };
      }
      console.warn(`[github] fetch failed for ${key}:`, err instanceof Error ? err.message : err);
      if (hit) return hit.notFound || !hit.data ? { notFound: true as const } : { data: hit.data };
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

async function gh(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { "user-agent": UA, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

const GRAPHQL_QUERY = `query($login: String!) {
  user(login: $login) {
    login name avatarUrl url createdAt
    followers { totalCount }
    repositories(privacy: PUBLIC) { totalCount }
    repos: repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 30, orderBy: { field: STARGAZERS, direction: DESC }) {
      nodes { name description stargazerCount url primaryLanguage { name color } languages(first: 10) { edges { size node { name color } } } }
    }
  }
}`;

type GqlUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
  createdAt: string;
  followers: { totalCount: number };
  repositories: { totalCount: number };
  repos: {
    nodes: {
      name: string;
      description: string | null;
      stargazerCount: number;
      url: string;
      primaryLanguage: { name: string; color: string | null } | null;
      languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
    }[];
  };
};

async function fetchBaseViaGraphql(login: string, token: string): Promise<Base> {
  const res = await gh("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`graphql ${res.status}`);
  const body = (await res.json()) as { data?: { user: GqlUser | null }; errors?: { type?: string }[] };
  const u = body.data?.user;
  if (!u) {
    if (body.errors?.some((e) => e.type === "NOT_FOUND") || body.data?.user === null) throw new NotFound();
    throw new Error("graphql: empty response");
  }
  const repos = u.repos.nodes;
  const weights = repos.flatMap((r) => r.languages.edges.map((e) => ({ name: e.node.name, size: e.size, color: e.node.color })));
  return {
    login: u.login,
    name: u.name || null,
    avatarUrl: u.avatarUrl,
    htmlUrl: u.url,
    publicRepos: u.repositories.totalCount,
    followers: u.followers.totalCount,
    createdAt: u.createdAt,
    languages: bucketLanguages(weights),
    topRepos: repos.slice(0, 3).map((r) => ({
      name: r.name,
      description: r.description || null,
      stars: r.stargazerCount,
      url: r.url,
      language: r.primaryLanguage?.name ?? null,
    })),
    fetchedAt: new Date().toISOString(),
  };
}

type RestUser = { login: string; name: string | null; avatar_url: string; html_url: string; public_repos: number; followers: number; created_at: string };
type RestRepo = { name: string; description: string | null; stargazers_count: number; html_url: string; language: string | null; fork: boolean; size: number; private?: boolean };

async function fetchBaseViaRest(login: string): Promise<Base> {
  const ures = await gh(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: { accept: "application/vnd.github+json" } });
  if (ures.status === 404) throw new NotFound();
  if (!ures.ok) throw new Error(`rest user ${ures.status}`);
  const u = (await ures.json()) as RestUser;

  let repos: RestRepo[] = [];
  const reposRes = await gh(`https://api.github.com/users/${encodeURIComponent(u.login)}/repos?per_page=100&sort=pushed`, {
    headers: { accept: "application/vnd.github+json" },
  }).catch(() => null);
  if (reposRes && reposRes.ok) {
    const all = (await reposRes.json()) as RestRepo[];
    repos = Array.isArray(all) ? all.filter((r) => !r.fork && !r.private) : [];
  } else if (u.public_repos > 0) {
    // Без списка репозиториев плитка была бы неполной -- лучше отдать старый кеш.
    throw new Error("rest repos failed");
  }

  // Топ ~30 по звёздам, затем по дате пуша (список уже отсортирован по пушу).
  const byStars = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const sample = byStars.slice(0, 30);
  const weights = sample
    .filter((r) => r.language)
    .map((r) => ({ name: r.language!, size: Math.max(1, r.size), color: languageColor(r.language!) }));
  const topRepos: GithubRepo[] = byStars.slice(0, 3).map((r) => ({
    name: r.name,
    description: r.description || null,
    stars: r.stargazers_count,
    url: r.html_url,
    language: r.language,
  }));

  return {
    login: u.login,
    name: u.name || null,
    avatarUrl: u.avatar_url,
    htmlUrl: u.html_url,
    publicRepos: u.public_repos,
    followers: u.followers,
    createdAt: u.created_at,
    languages: bucketLanguages(weights),
    topRepos,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchBase(login: string): Promise<Base> {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (token) {
    try {
      return await fetchBaseViaGraphql(login, token);
    } catch (err) {
      if (err instanceof NotFound) throw err;
      console.warn("[github] graphql failed, trying REST:", err instanceof Error ? err.message : err);
    }
  }
  return fetchBaseViaRest(login);
}

const CAL_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } }
  }
}`;

async function fetchCalendarViaGraphql(login: string, year: number, token: string): Promise<Calendar> {
  const r = githubYearRange(year, new Date());
  const res = await gh("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: CAL_QUERY, variables: { login, from: r.from, to: r.to } }),
  });
  if (!res.ok) throw new Error(`graphql calendar ${res.status}`);
  const body = (await res.json()) as {
    data?: { user: { contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] } } } | null };
  };
  const cal = body.data?.user?.contributionsCollection.contributionCalendar;
  if (!cal) throw new Error("graphql calendar: empty response");
  // Недели на краях года могут захватывать соседний год -- оставляем только дни этого года.
  const days: GithubDay[] = cal.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => d.date.startsWith(`${year}-`))
    .map((d) => ({ date: d.date, count: d.contributionCount, level: levelFromGraphql(d.contributionLevel) }));
  return { totalContributions: days.reduce((a, d) => a + d.count, 0), weeks: groupDaysIntoWeeks(days) };
}

async function fetchCalendarViaHtml(login: string, year: number): Promise<Calendar> {
  const r = githubYearRange(year, new Date());
  const url = `https://github.com/users/${encodeURIComponent(login)}/contributions?from=${r.fromDate}&to=${r.toDate}`;
  const res = await gh(url, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`calendar html ${res.status}`);
  const parsed = parseContributionsHtml(await res.text());
  if (!parsed.weeks.length) throw new Error("calendar html: no days");
  const days = parsed.weeks.flatMap((w) => w.days).filter((d) => d.date.startsWith(`${year}-`));
  return { totalContributions: days.reduce((a, d) => a + d.count, 0), weeks: groupDaysIntoWeeks(days) };
}

async function fetchCalendar(login: string, year: number): Promise<Calendar> {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (token) {
    try {
      return await fetchCalendarViaGraphql(login, year, token);
    } catch (err) {
      console.warn("[github] graphql calendar failed, trying HTML:", err instanceof Error ? err.message : err);
    }
  }
  try {
    return await fetchCalendarViaHtml(login, year);
  } catch (err) {
    console.warn("[github] calendar unavailable:", err instanceof Error ? err.message : err);
    // Календаря нет -- плитка всё равно полезна (языки, репозитории): пустой год, но не кешируем надолго.
    throw err;
  }
}

/**
 * Данные плитки за календарный год (year не задан -> текущий). Профиль/языки/репозитории
 * кешируются отдельно от календаря года, поэтому переключение года дёргает только календарь.
 * Ошибка GitHub -> старый кеш, если есть, иначе исключение (маршрут отдаёт 502).
 */
export async function getGithubSummary(login: string, rawYear?: string | null): Promise<GithubResult> {
  if (!isValidGithubLogin(login)) return { status: "not_found" };
  const key = login.toLowerCase();

  const base = await cached<Base>(`${key}`, GITHUB_CACHE_TTL_MS, () => fetchBase(login));
  if ("notFound" in base) return { status: "not_found" };

  const currentYear = new Date().getUTCFullYear();
  const createdYear = Number(base.data.createdAt?.slice(0, 4)) || currentYear;
  const year = resolveGithubYear(rawYear, createdYear, currentYear);
  if (year === null) return { status: "bad_year" };

  const ttl = year === currentYear ? GITHUB_CACHE_TTL_MS : GITHUB_PAST_YEAR_TTL_MS;
  let cal: Calendar = { totalContributions: 0, weeks: [] };
  try {
    const c = await cached<Calendar>(`cal/${key}/${year}`, ttl, () => fetchCalendar(login, year));
    if ("data" in c) cal = c.data;
  } catch {
    // Календарь не загрузился и кеша нет -- отдаём без него (как раньше при сбое HTML).
  }

  const { createdAt: _createdAt, ...rest } = base.data;
  void _createdAt;
  return {
    status: "ok",
    data: {
      ...rest,
      totalContributions: cal.totalContributions,
      weeks: cal.weeks,
      year,
      years: githubYears(createdYear, currentYear),
    },
  };
}
