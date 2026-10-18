// lib/github/core.ts
//
// 18.10.2026 (Александр): плитка GitHub в профиле. Если среди ссылок профиля есть
// github.com/<login>, на странице профиля появляется карточка с календарём вкладов,
// языками и топ-репозиториями. Данные отдаёт наш сервер (app/api/github/[login]) --
// браузер на GitHub не ходит. Тот же адрес зовёт и приложение:
// https://jobs.a1appp.com/api/github/<login>.
//
// Здесь только «чистые» части без сети и без импортов: разбор ссылки, разбор HTML
// календаря, проценты языков. Их проверяет lib/github/core.test.mjs
// (node --test lib/github/core.test.mjs).

export type GithubDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type GithubWeek = { days: GithubDay[] };
export type GithubLanguage = { name: string; percent: number; color: string };
export type GithubRepo = { name: string; description: string | null; stars: number; url: string; language: string | null };

/** Ровно тот JSON, который отдаёт GET /api/github/<login> (контракт общий с приложением). */
export type GithubSummary = {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  totalContributions: number;
  weeks: GithubWeek[];
  languages: GithubLanguage[];
  topRepos: GithubRepo[];
  fetchedAt: string;
};

export const OTHER_LANGUAGE = "other";
export const OTHER_LANGUAGE_COLOR = "#8e8e93";
export const MAX_WEEKS = 53;

// Правила GitHub для имени: латиница/цифры и одиночные дефисы, не с дефиса, до 39 символов.
const LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidGithubLogin(login: string): boolean {
  return LOGIN_RE.test(login);
}

// Первые сегменты пути, которые не являются людьми.
const RESERVED = new Set([
  "orgs", "organizations", "sponsors", "features", "topics", "marketplace", "settings", "apps",
  "collections", "about", "pricing", "enterprise", "explore", "trending", "login", "logout", "join",
  "signup", "search", "notifications", "issues", "pulls", "new", "site", "security", "readme",
  "events", "codespaces", "customer-stories", "team", "teams", "contact", "home", "dashboard",
  "users", "account", "blog", "copilot", "solutions", "resources", "nonprofit", "education",
  "premium-support", "git-guides", "stars", "watching", "discussions", "github-copilot",
]);

/** Логин из ссылки на GitHub: github.com/<login> или github.com/<login>/<repo>. Иначе null. */
export function extractGithubLogin(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let s = rawUrl.trim();
  if (!s) return null;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  let login: string;
  try {
    login = decodeURIComponent(first).replace(/^@/, "");
  } catch {
    return null;
  }
  if (RESERVED.has(login.toLowerCase())) return null;
  return isValidGithubLogin(login) ? login : null;
}

/** Первая подходящая ссылка на GitHub среди ссылок профиля. */
export function findGithubLogin(links: { url: string }[]): string | null {
  for (const l of links) {
    const login = extractGithubLogin(l.url);
    if (login) return login;
  }
  return null;
}

/**
 * Логин из GitHub-ссылки профиля, но только если он подтверждён: совпадает (без учёта
 * регистра) с githubVerifiedLogin профиля. Иначе null -> плитки нет, только обычная ссылка.
 */
export function verifiedGithubLogin(
  links: { url: string }[],
  verifiedLogin: string | null | undefined,
): string | null {
  if (!verifiedLogin) return null;
  const fromLink = findGithubLogin(links);
  if (!fromLink) return null;
  return fromLink.toLowerCase() === verifiedLogin.trim().toLowerCase() ? fromLink : null;
}

function clampLevel(n: number): GithubDay["level"] {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return (n >= 4 ? 4 : Math.round(n)) as GithubDay["level"];
}

/** Дни -> недели, неделя с воскресенья (как у GitHub), старые первыми, не больше MAX_WEEKS. */
export function groupDaysIntoWeeks(days: GithubDay[]): GithubWeek[] {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const weeks: GithubWeek[] = [];
  let current: GithubDay[] = [];
  for (const d of sorted) {
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (current.length && dow === 0) {
      weeks.push({ days: current });
      current = [];
    }
    current.push(d);
  }
  if (current.length) weeks.push({ days: current });
  return weeks.slice(-MAX_WEEKS);
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1]! : null;
}

function decodeBasicEntities(s: string): string {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function countFromTooltip(text: string): number | null {
  const t = decodeBasicEntities(text).trim();
  if (/^no contributions/i.test(t)) return 0;
  const m = t.match(/^([\d,.\s]+)\s+contributions?/i);
  if (!m) return null;
  const n = Number(m[1]!.replace(/[,.\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Разбор публичной страницы https://github.com/users/<login>/contributions.
 * Осторожно: ничего не найдено -> weeks: [] (а не исключение).
 */
export function parseContributionsHtml(html: string): { totalContributions: number | null; weeks: GithubWeek[] } {
  if (!html || typeof html !== "string") return { totalContributions: null, weeks: [] };

  const tooltips = new Map<string, number>();
  const ttRe = /<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/gi;
  for (let m = ttRe.exec(html); m; m = ttRe.exec(html)) {
    const forId = attr(m[1]!, "for");
    const n = countFromTooltip(m[2]!);
    if (forId && n !== null) tooltips.set(forId, n);
  }

  const days: GithubDay[] = [];
  const seen = new Set<string>();
  const tdRe = /<td\b[^>]*\sdata-date\s*=\s*"[^"]*"[^>]*>/gi;
  for (let m = tdRe.exec(html); m; m = tdRe.exec(html)) {
    const tag = m[0];
    const date = attr(tag, "data-date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) continue;
    seen.add(date);
    const level = clampLevel(Number(attr(tag, "data-level") ?? "0"));
    const id = attr(tag, "id");
    const fromTip = id ? tooltips.get(id) : undefined;
    // Нет подсказки (GitHub поменял разметку) -- считаем хотя бы «есть/нет».
    const count = fromTip ?? (level > 0 ? level : 0);
    days.push({ date, count, level });
  }

  let total: number | null = null;
  const h = html.match(/([\d][\d,.\s]*)\s+contributions?\s+in\s+the\s+last\s+year/i);
  if (h) {
    const n = Number(h[1]!.replace(/[,.\s]/g, ""));
    if (Number.isFinite(n)) total = n;
  }
  if (total === null && days.length) total = days.reduce((s, d) => s + d.count, 0);

  return { totalContributions: total, weeks: days.length ? groupDaysIntoWeeks(days) : [] };
}

/** Уровень из GraphQL (NONE..FOURTH_QUARTILE) -> 0..4. */
export function levelFromGraphql(v: string | null | undefined): GithubDay["level"] {
  switch (v) {
    case "FIRST_QUARTILE": return 1;
    case "SECOND_QUARTILE": return 2;
    case "THIRD_QUARTILE": return 3;
    case "FOURTH_QUARTILE": return 4;
    default: return 0;
  }
}

/**
 * Топ-3 языка + корзина "other", проценты целые и в сумме ровно 100
 * (метод наибольших остатков). Нулевые доли не показываем.
 */
export function bucketLanguages(weights: { name: string; size: number; color?: string | null }[]): GithubLanguage[] {
  const merged = new Map<string, { size: number; color: string | null }>();
  for (const w of weights) {
    if (!w.name || !(w.size > 0)) continue;
    const cur = merged.get(w.name);
    if (cur) {
      cur.size += w.size;
      if (!cur.color && w.color) cur.color = w.color;
    } else {
      merged.set(w.name, { size: w.size, color: w.color ?? null });
    }
  }
  const all = [...merged.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.size - a.size);
  const total = all.reduce((s, x) => s + x.size, 0);
  if (!total) return [];

  const top = all.slice(0, 3);
  const restSize = all.slice(3).reduce((s, x) => s + x.size, 0);
  const buckets = top.map((x) => ({ name: x.name, size: x.size, color: x.color || languageColor(x.name) }));
  if (restSize > 0) buckets.push({ name: OTHER_LANGUAGE, size: restSize, color: OTHER_LANGUAGE_COLOR });

  const exact = buckets.map((b) => (b.size / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((s, x) => s + x, 0);
  const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (const o of order) {
    if (left <= 0) break;
    floors[o.i]! += 1;
    left--;
  }

  // Нулевые доли отбрасываем -- сумма от этого не меняется (там было 0).
  return buckets
    .map((b, i) => ({ name: b.name, percent: floors[i]!, color: normalizeColor(b.color) }))
    .filter((l) => l.percent > 0);
}

function normalizeColor(c: string | null | undefined): string {
  if (c && /^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (c && /^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  return OTHER_LANGUAGE_COLOR;
}

// Цвета языков из github/linguist -- нужны только без токена (REST цвета не отдаёт).
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Java: "#b07219", Kotlin: "#a97bff",
  Swift: "#f05138", "Objective-C": "#438eff", Go: "#00add8", Rust: "#dea584", C: "#555555",
  "C++": "#f34b7d", "C#": "#178600", PHP: "#4f5d95", Ruby: "#701516", Dart: "#00b4ab",
  HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c", Shell: "#89e051", Vue: "#41b883",
  Svelte: "#ff3e00", Scala: "#c22d40", Elixir: "#6e4a7e", Haskell: "#5e5086", Lua: "#000080",
  Perl: "#0298c3", R: "#198ce7", "Jupyter Notebook": "#da5b0b", Clojure: "#db5855", Erlang: "#b83998",
  "F#": "#b845fc", Julia: "#a270ba", Zig: "#ec915c", Nix: "#7e7eff", Dockerfile: "#384d54",
  PowerShell: "#012456", Makefile: "#427819", Groovy: "#4298b8", Solidity: "#aa6746", Assembly: "#6e4c13",
  "Vim Script": "#199f4b", "Emacs Lisp": "#c065db", OCaml: "#ef7a08", MDX: "#fcb32c", Astro: "#ff5a03",
  HCL: "#844fba", TeX: "#3d6117", Elm: "#60b5cc", Crystal: "#000100", Nim: "#ffc200", V: "#4f87c4",
  "1C Enterprise": "#814ccc", PLpgSQL: "#336790", TSQL: "#e38c00", Pascal: "#e3f171", Fortran: "#4d41b1",
};

export function languageColor(name: string): string {
  return LANGUAGE_COLORS[name] ?? OTHER_LANGUAGE_COLOR;
}

/** Плитку не показываем совсем: почти нет активности и нет своих репозиториев. */
export function isGithubSummaryTooEmpty(s: Pick<GithubSummary, "totalContributions" | "topRepos">): boolean {
  return s.totalContributions < 5 && s.topRepos.length === 0;
}
