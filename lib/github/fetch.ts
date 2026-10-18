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
  groupDaysIntoWeeks,
  isValidGithubLogin,
  languageColor,
  levelFromGraphql,
  parseContributionsHtml,
  type GithubDay,
  type GithubRepo,
  type GithubSummary,
} from "./core";

if (typeof window !== "undefined") {
  throw new Error("[lib/github/fetch] server-only");
}

export const GITHUB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const MEMORY_MAX = 2000;
const UA = "A1-jobs-web/1.0 (+https://jobs.a1appp.com)";

type CacheEntry = { at: number; notFound?: true; data?: GithubSummary };

export type GithubResult = { status: "ok"; data: GithubSummary } | { status: "not_found" };

class NotFound extends Error {}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<GithubResult>>();

function memGet(key: string): CacheEntry | undefined {
  const e = memory.get(key);
  if (e) {
    memory.delete(key);
    memory.set(key, e); // LRU: свежий -- в конец
  }
  return e;
}

function memSet(key: string, e: CacheEntry) {
  memory.delete(key);
  memory.set(key, e);
  while (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

const kvPath = (key: string) => `a1/github/${key}.json`;

async function readCache(key: string): Promise<CacheEntry | null> {
  const m = memGet(key);
  if (m) return m;
  if (!kvConfigured()) return null;
  try {
    const e = await kvGetJson<CacheEntry>(kvPath(key));
    if (e && typeof e.at === "number") {
      memSet(key, e);
      return e;
    }
  } catch (err) {
    console.warn("[github] cache read failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

async function writeCache(key: string, e: CacheEntry) {
  memSet(key, e);
  if (!kvConfigured()) return;
  try {
    await kvPutJson(kvPath(key), e);
  } catch (err) {
    console.warn("[github] cache write failed:", err instanceof Error ? err.message : err);
  }
}

function toResult(e: CacheEntry): GithubResult {
  return e.notFound || !e.data ? { status: "not_found" } : { status: "ok", data: e.data };
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
    login name avatarUrl url
    followers { totalCount }
    repositories(privacy: PUBLIC) { totalCount }
    contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } }
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
  followers: { totalCount: number };
  repositories: { totalCount: number };
  contributionsCollection: {
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
    };
  };
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

async function fetchViaGraphql(login: string, token: string): Promise<GithubSummary> {
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
  const cal = u.contributionsCollection.contributionCalendar;
  const days: GithubDay[] = cal.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: levelFromGraphql(d.contributionLevel) })),
  );
  const repos = u.repos.nodes;
  const weights = repos.flatMap((r) => r.languages.edges.map((e) => ({ name: e.node.name, size: e.size, color: e.node.color })));
  return {
    login: u.login,
    name: u.name || null,
    avatarUrl: u.avatarUrl,
    htmlUrl: u.url,
    publicRepos: u.repositories.totalCount,
    followers: u.followers.totalCount,
    totalContributions: cal.totalContributions,
    weeks: groupDaysIntoWeeks(days),
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

type RestUser = { login: string; name: string | null; avatar_url: string; html_url: string; public_repos: number; followers: number };
type RestRepo = { name: string; description: string | null; stargazers_count: number; html_url: string; language: string | null; fork: boolean; size: number; private?: boolean };

async function fetchViaRest(login: string): Promise<GithubSummary> {
  const ures = await gh(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: { accept: "application/vnd.github+json" } });
  if (ures.status === 404) throw new NotFound();
  if (!ures.ok) throw new Error(`rest user ${ures.status}`);
  const u = (await ures.json()) as RestUser;

  const [reposRes, calRes] = await Promise.allSettled([
    gh(`https://api.github.com/users/${encodeURIComponent(u.login)}/repos?per_page=100&sort=pushed`, { headers: { accept: "application/vnd.github+json" } }),
    gh(`https://github.com/users/${encodeURIComponent(u.login)}/contributions`, { headers: { accept: "text/html" } }),
  ]);

  let repos: RestRepo[] = [];
  if (reposRes.status === "fulfilled" && reposRes.value.ok) {
    const all = (await reposRes.value.json()) as RestRepo[];
    repos = Array.isArray(all) ? all.filter((r) => !r.fork && !r.private) : [];
  } else if (u.public_repos > 0) {
    // Без списка репозиториев плитка была бы неполной -- лучше отдать старый кеш.
    throw new Error("rest repos failed");
  }

  let total = 0;
  let weeks: GithubSummary["weeks"] = [];
  if (calRes.status === "fulfilled" && calRes.value.ok) {
    try {
      const parsed = parseContributionsHtml(await calRes.value.text());
      weeks = parsed.weeks;
      total = parsed.totalContributions ?? 0;
    } catch {
      weeks = [];
    }
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
    totalContributions: total,
    weeks,
    languages: bucketLanguages(weights),
    topRepos,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFresh(login: string): Promise<GithubSummary> {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (token) {
    try {
      return await fetchViaGraphql(login, token);
    } catch (err) {
      if (err instanceof NotFound) throw err;
      console.warn("[github] graphql failed, trying REST:", err instanceof Error ? err.message : err);
    }
  }
  return fetchViaRest(login);
}

/**
 * Свежий кеш -> из кеша. Иначе идём на GitHub; ошибка GitHub -> старый кеш, если есть,
 * иначе исключение (маршрут отдаёт 502).
 */
export async function getGithubSummary(login: string): Promise<GithubResult> {
  if (!isValidGithubLogin(login)) return { status: "not_found" };
  const key = login.toLowerCase();

  const cached = await readCache(key);
  if (cached && Date.now() - cached.at < GITHUB_CACHE_TTL_MS) return toResult(cached);

  const running = inflight.get(key);
  if (running) return running;

  const job = (async (): Promise<GithubResult> => {
    try {
      const data = await fetchFresh(login);
      await writeCache(key, { at: Date.now(), data });
      return { status: "ok", data };
    } catch (err) {
      if (err instanceof NotFound) {
        await writeCache(key, { at: Date.now(), notFound: true });
        return { status: "not_found" };
      }
      console.warn(`[github] fetch failed for ${key}:`, err instanceof Error ? err.message : err);
      if (cached) return toResult(cached);
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}
