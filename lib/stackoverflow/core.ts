// lib/stackoverflow/core.ts
//
// 18.10.2026 (Александр): подтверждённая плитка Stack Overflow в профиле -- по образцу GitHub.
// Плитка есть, только если человек доказал через Stack Exchange OAuth, что профиль из ссылки его
// (бэкенд хранит числовой id: stackoverflowVerifiedId). Публичные данные отдаёт наш сервер
// (app/api/stackoverflow/[id]), тот же адрес зовёт приложение.
//
// Здесь только чистые части без сети: разбор ссылки, сверка, разбор ответов api.stackexchange.com.
// Проверка: node --test lib/stackoverflow/core.test.mjs

export type StackoverflowBadges = { gold: number; silver: number; bronze: number };
export type StackoverflowTag = { name: string; score: number; answerCount: number };
export type StackoverflowBestAnswer = { title: string; url: string; score: number };

/** Ровно тот JSON, который отдаёт GET /api/stackoverflow/<id> (контракт общий с приложением). */
export type StackoverflowSummary = {
  id: number;
  displayName: string;
  htmlUrl: string;
  avatarUrl: string | null;
  reputation: number;
  badges: StackoverflowBadges;
  answerCount: number;
  /** Процент принятых ответов 0..100 или null, если сайт его не отдал. */
  acceptRate: number | null;
  topTags: StackoverflowTag[];
  bestAnswer: StackoverflowBestAnswer | null;
  fetchedAt: string;
};

const HOSTS = new Set(["stackoverflow.com", "www.stackoverflow.com", "stackexchange.com", "www.stackexchange.com"]);

export function isValidStackoverflowId(id: string): boolean {
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647;
}

/** Числовой id из ссылки .../users/<id>[/<slug>]. Иначе null. */
export function extractStackoverflowId(rawUrl: string | null | undefined): number | null {
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
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "users" || !parts[1]) return null;
  return isValidStackoverflowId(parts[1]) ? Number(parts[1]) : null;
}

export function findStackoverflowId(links: { url: string }[]): number | null {
  for (const l of links) {
    const id = extractStackoverflowId(l.url);
    if (id !== null) return id;
  }
  return null;
}

/** Id из ссылки, но только если он равен подтверждённому. */
export function verifiedStackoverflowId(links: { url: string }[], verifiedId: number | null | undefined): number | null {
  if (typeof verifiedId !== "number" || !Number.isInteger(verifiedId)) return null;
  const fromLink = findStackoverflowId(links);
  return fromLink !== null && fromLink === verifiedId ? fromLink : null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** api.stackexchange.com отдаёт заголовки и имена с HTML-сущностями. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d{1,6});/g, (_, n: string) => {
      const c = Number(n);
      return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : "";
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h: string) => {
      const c = parseInt(h, 16);
      return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : "";
    })
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

function n(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function httpsUrlOrNull(v: unknown, hostSuffix: string[]): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    return hostSuffix.some((x) => h === x || h.endsWith(`.${x}`)) ? u.toString() : null;
  } catch {
    return null;
  }
}

const SE_HOSTS = ["stackoverflow.com", "stackexchange.com", "gravatar.com", "sstatic.net"];

type RawUser = {
  user_id?: number;
  display_name?: string;
  link?: string;
  profile_image?: string;
  reputation?: number;
  badge_counts?: { gold?: number; silver?: number; bronze?: number };
  answer_count?: number;
  accept_rate?: number;
};

/** items[0] из /users/{id} -> шапка плитки. Нет репутации/id -> null. */
export function mapStackoverflowUser(
  item: unknown,
): Omit<StackoverflowSummary, "topTags" | "bestAnswer" | "fetchedAt"> | null {
  if (!item || typeof item !== "object") return null;
  const u = item as RawUser;
  if (typeof u.user_id !== "number" || !Number.isInteger(u.user_id) || u.user_id <= 0) return null;
  const rate = typeof u.accept_rate === "number" && u.accept_rate >= 0 && u.accept_rate <= 100 ? Math.round(u.accept_rate) : null;
  return {
    id: u.user_id,
    displayName: decodeEntities(String(u.display_name ?? "")).slice(0, 80) || `user${u.user_id}`,
    htmlUrl: httpsUrlOrNull(u.link, ["stackoverflow.com"]) ?? `https://stackoverflow.com/users/${u.user_id}`,
    avatarUrl: httpsUrlOrNull(u.profile_image, SE_HOSTS),
    reputation: n(u.reputation),
    badges: { gold: n(u.badge_counts?.gold), silver: n(u.badge_counts?.silver), bronze: n(u.badge_counts?.bronze) },
    answerCount: n(u.answer_count),
    acceptRate: rate,
  };
}

/** items из /users/{id}/top-tags -> до 4 тем, по убыванию очков ответов. */
export function mapStackoverflowTags(items: unknown): StackoverflowTag[] {
  if (!Array.isArray(items)) return [];
  const out: StackoverflowTag[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const t = it as { tag_name?: unknown; answer_score?: unknown; answer_count?: unknown };
    if (typeof t.tag_name !== "string" || !/^[\w.#+-]{1,35}$/.test(t.tag_name)) continue;
    out.push({ name: t.tag_name, score: n(t.answer_score), answerCount: n(t.answer_count) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

/** Ширина полоски темы, 0..100: доля от лучшей темы (не меньше 6, чтобы полоска была видна). */
export function tagBarPercent(score: number, maxScore: number): number {
  if (!(maxScore > 0) || !(score > 0)) return 0;
  return Math.max(6, Math.min(100, Math.round((score / maxScore) * 100)));
}

/** Лучший ответ: вопрос (заголовок, ссылка на вопрос) + очки ответа. Нет заголовка -> null. */
export function mapStackoverflowBestAnswer(answer: unknown, question: unknown): StackoverflowBestAnswer | null {
  if (!answer || typeof answer !== "object" || !question || typeof question !== "object") return null;
  const a = answer as { answer_id?: unknown; question_id?: unknown; score?: unknown };
  const q = question as { title?: unknown; question_id?: unknown };
  if (typeof q.title !== "string" || !q.title.trim()) return null;
  const qid = typeof a.question_id === "number" ? a.question_id : typeof q.question_id === "number" ? q.question_id : null;
  if (qid === null || !Number.isInteger(qid) || qid <= 0) return null;
  const aid = typeof a.answer_id === "number" && Number.isInteger(a.answer_id) && a.answer_id > 0 ? a.answer_id : null;
  return {
    title: decodeEntities(q.title).trim().slice(0, 200),
    url: aid ? `https://stackoverflow.com/a/${aid}` : `https://stackoverflow.com/q/${qid}`,
    score: typeof a.score === "number" && Number.isFinite(a.score) ? Math.trunc(a.score) : 0,
  };
}

/** Плитка скрыта, если репутации нет совсем (процентилей мы не выдумываем). */
export function isStackoverflowSummaryHidden(s: Pick<StackoverflowSummary, "reputation">): boolean {
  return s.reputation < 1;
}
