// lib/referral/ladder.ts
//
// 17.10.2026 (Александр). Реферальная программа: лестница наград (см. стратегию в Claude Docs
// «A1 Рефералка»). Чистые функции без хранилища -- чтобы их можно было проверить тестом.
//
//   друзей:   1   3   7   15   30
//   вместе:   1   3   6   12   24  месяцев Alpha
//
// Шаги 1-2 считаем по любому «настоящему» другу (вошёл по ссылке и прошёл 48 часов),
// шаги 3+ -- только по «живым» (друг заполнил профиль). Выше 24 месяцев -- денежная
// партнёрская программа, не месяцы.

export const LADDER = [
  { friends: 1, months: 1, needLive: false },
  { friends: 3, months: 3, needLive: false },
  { friends: 7, months: 6, needLive: true },
  { friends: 15, months: 12, needLive: true },
  { friends: 30, months: 24, needLive: true },
] as const;

/** Сколько дней Alpha получает сам друг, пришедший по ссылке. */
export const FRIEND_DAYS = 14;
/** Сколько часов друг «вылёживается», прежде чем засчитаться (защита от накруток). */
export const HOLD_HOURS = 48;
/** Верхняя граница месяцев Alpha за рефералы. */
export const MAX_MONTHS = LADDER[LADDER.length - 1].months;

export type FriendStatus = "joined" | "live";

export type Counts = {
  /** прошли 48 часов (любой статус) */
  counted: number;
  /** прошли 48 часов и заполнили профиль */
  live: number;
  /** ещё в 48-часовом ожидании */
  pending: number;
};

export type Progress = {
  counts: Counts;
  /** сколько месяцев Alpha заработано сейчас */
  monthsEarned: number;
  /** индекс достигнутой ступени (-1 -- ни одной) */
  stepReached: number;
  /** следующая ступень (null -- вершина) */
  next: { friends: number; months: number; needLive: boolean; left: number } | null;
};

/** Сколько друзей «в зачёте» для ступени. */
export function qualifying(step: (typeof LADDER)[number], c: Counts): number {
  return step.needLive ? c.live : c.counted;
}

export function progressOf(c: Counts): Progress {
  let reached = -1;
  for (let i = 0; i < LADDER.length; i++) {
    if (qualifying(LADDER[i], c) >= LADDER[i].friends) reached = i;
  }
  const nextStep = LADDER[reached + 1];
  return {
    counts: c,
    monthsEarned: reached >= 0 ? LADDER[reached].months : 0,
    stepReached: reached,
    next: nextStep
      ? {
          friends: nextStep.friends,
          months: nextStep.months,
          needLive: nextStep.needLive,
          left: Math.max(0, nextStep.friends - qualifying(nextStep, c)),
        }
      : null,
  };
}
