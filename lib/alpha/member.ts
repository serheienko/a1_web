// lib/alpha/member.ts -- A1 Alpha member badge (08.10.2026).
//
// The backend sends `emojiStatus` = {object:"emoji-status-until", fileId, until}
// only while a user's Alpha membership is active (until = its end), otherwise
// {object:"empty"}. fileId 1..25 = cans, 26..50 = fishes (same set as the app).

export type AlphaMember = { emojiId: number; until: number };

export function parseAlphaMember(raw: unknown): AlphaMember | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { until?: unknown; fileId?: unknown };
  const until = typeof r.until === "number" ? r.until : Number(r.until);
  const id = Number(r.fileId);
  if (!Number.isFinite(until) || !Number.isFinite(id)) return null;
  if (until * 1000 <= Date.now()) return null;
  return { emojiId: id >= 1 && id <= 50 ? Math.round(id) : 1, until };
}

/** Base path of the emoji files in public/premium/emoji (no extension). */
export function alphaEmojiPath(id: number): string {
  const safe = Math.min(50, Math.max(1, Math.round(id)));
  return safe <= 25 ? `/premium/emoji/can-${safe}` : `/premium/emoji/fish-${safe - 25}`;
}

/** Max length of the running line (as in the app: 80). */
export const ALPHA_TITLE_MAX = 80;

const LINK =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|ua|ru|me|ly|co|link|site|xyz|info|biz|dev)\b|t\.me\/|@[a-z0-9_]{4,})/i;

/** The running line may not carry links (same rule as the app). */
export function alphaTitleHasLink(text: string): boolean {
  return LINK.test(text);
}

/** 09.10.2026: a changed can is announced so every badge of that person on
 *  the page switches at once (feed, profile, chat). */
export const ALPHA_BADGE_EVENT = "a1:alpha-badge";
export type AlphaBadgeChange = { username: string; emojiId?: number; title?: string | null };
