// lib/dribbble/core.ts
//
// 18.10.2026 (Александр): подтверждённая плитка Dribbble в профиле -- по образцу GitHub
// (lib/github/core.ts). Плитка есть, только если человек доказал через Dribbble OAuth, что аккаунт
// из ссылки его. Публичного API у Dribbble нет, поэтому данные -- «снимок», который бэкенд
// сохраняет в момент подтверждения (и обновляет по кнопке «Оновити»): dribbbleVerified.snapshot.
//
// Здесь только чистые части без сети и импортов: разбор ссылки, сверка с подтверждённым логином,
// очистка снимка. Проверка: node --test lib/dribbble/core.test.mjs

export type DribbbleShot = {
  id: string;
  title: string;
  imageUrl: string;
  htmlUrl: string;
  /** Крошечное размытое превью (data:URL), пока грузится картинка. Только для статичных примеров (Mr Kit). */
  blurDataUrl?: string;
};

export type DribbbleSnapshot = {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  htmlUrl: string;
  followers: number;
  shotsCount: number;
  shots: DribbbleShot[];
  fetchedAt: string | null;
};

export const MAX_SHOTS = 12;

const LOGIN_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

// Первые сегменты пути, которые не являются людьми.
const RESERVED = new Set([
  "shots", "designers", "jobs", "tags", "search", "stories", "pro", "hiring", "courses", "learn",
  "session", "signup", "account", "following", "notifications",
]);

export function isValidDribbbleLogin(login: string): boolean {
  return LOGIN_RE.test(login) && !RESERVED.has(login.toLowerCase());
}

/** Логин из ссылки dribbble.com/<login>. Иначе null. */
export function extractDribbbleLogin(rawUrl: string | null | undefined): string | null {
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
  if (host !== "dribbble.com" && host !== "www.dribbble.com") return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  let login: string;
  try {
    login = decodeURIComponent(first).replace(/^@/, "");
  } catch {
    return null;
  }
  return isValidDribbbleLogin(login) ? login : null;
}

export function findDribbbleLogin(links: { url: string }[]): string | null {
  for (const l of links) {
    const login = extractDribbbleLogin(l.url);
    if (login) return login;
  }
  return null;
}

/** Логин из ссылки, но только если он совпадает (без учёта регистра) с подтверждённым. */
export function verifiedDribbbleLogin(links: { url: string }[], verifiedLogin: string | null | undefined): string | null {
  if (!verifiedLogin) return null;
  const fromLink = findDribbbleLogin(links);
  if (!fromLink) return null;
  return fromLink.toLowerCase() === verifiedLogin.trim().toLowerCase() ? fromLink : null;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Только https и только хосты Dribbble (dribbble.com, cdn.dribbble.com и т.п.). */
export function dribbbleUrlOrNull(v: unknown): string | null {
  const s = str(v, 600);
  if (!s) return null;
  try {
    const u = new URL(s);
    const h = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return null;
    if (h !== "dribbble.com" && !h.endsWith(".dribbble.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Снимок от бэкенда -> безопасный снимок для показа. Бэкенд тоже чистит, но сайт не верит
 * на слово: чужие хосты картинок отбрасываются, кроме 12 работ ничего не остаётся.
 * Нет логина или ссылки -> null.
 */
export function sanitizeDribbbleSnapshot(raw: unknown): DribbbleSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const login = str(r.login, 40);
  const htmlUrl = dribbbleUrlOrNull(r.htmlUrl);
  if (!login || !htmlUrl) return null;
  const shots: DribbbleShot[] = [];
  if (Array.isArray(r.shots)) {
    for (const item of r.shots) {
      if (shots.length >= MAX_SHOTS) break;
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const imageUrl = dribbbleUrlOrNull(s.imageUrl);
      const shotUrl = dribbbleUrlOrNull(s.htmlUrl);
      const id = typeof s.id === "number" || typeof s.id === "string" ? String(s.id).slice(0, 40) : null;
      if (!imageUrl || !shotUrl || !id) continue;
      shots.push({ id, title: str(s.title, 120) ?? "", imageUrl, htmlUrl: shotUrl });
    }
  }
  return {
    login,
    name: str(r.name, 80),
    avatarUrl: dribbbleUrlOrNull(r.avatarUrl),
    htmlUrl,
    followers: count(r.followers),
    shotsCount: Math.max(count(r.shotsCount), shots.length),
    shots,
    fetchedAt: str(r.fetchedAt, 40),
  };
}

/** Показать ли плитку: есть хотя бы одна работа. Пустой профиль -- плитки нет. */
export function isDribbbleSnapshotShowable(s: DribbbleSnapshot | null): s is DribbbleSnapshot {
  return !!s && s.shots.length > 0;
}
