// lib/weekly-cat-animation.ts
//
// Aleksandr, 2026-08-31: "Возле аватара нашего профиля... хочу показывать
// маленького анимированного кота, который будет рандомно раз в неделю
// меняться с другими анимациями... Анимаций 8 шт" — 8 Telegram animated
// stickers (.tgs, gzip-compressed Lottie JSON) he supplied, decompressed
// into plain Lottie JSON under public/animations/ (cat-*.json) so
// components/lottie-player.tsx (the app's existing lottie-web loader,
// already used for posting-cat.json etc.) can render them unchanged.
//
// "Раз в неделю меняться" means the picked animation must be the SAME
// for the whole week, not re-randomized on every page load — so this
// hashes the ISO week number rather than calling Math.random(). Deliberately
// global (not per-viewer/per-user seeded) so every visitor sees the same
// one during a given week, same spirit as lib/avatars.ts's stableHash
// pattern for the default cat avatars.

const WEEKLY_CAT_ANIMATIONS = [
  "/animations/cat-pizza.json",
  "/animations/cat-devil.json",
  "/animations/cat-love-u.json",
  "/animations/cat-maneki.json",
  "/animations/cat-angel.json",
  "/animations/cat-playing.json",
  "/animations/cat-made-money.json",
  "/animations/cat-kiss-u.json",
] as const;

// ISO 8601 week number (1-53), so the pick flips on Monday, not on a
// rolling 7-day window from some arbitrary epoch.
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickWeeklyCatAnimation(now: Date = new Date()): string {
  const seed = `${now.getUTCFullYear()}-W${isoWeekNumber(now)}`;
  const index = stableHash(seed) % WEEKLY_CAT_ANIMATIONS.length;
  return WEEKLY_CAT_ANIMATIONS[index]!;
}
