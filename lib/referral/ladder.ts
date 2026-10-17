// lib/referral/ladder.ts
//
// 17.10.2026 (Александр). Реферальная программа: лестница наград (см. стратегию в Claude Docs
// «A1 Рефералка»). Чистые функции без хранилища -- чтобы их можно было проверить тестом.
//
//   друзей:   3   8   10   18   30   (18.10 вечером, правка Александра; было 3/5/10/20/40)
//   вместе:   1   3   6   12   24  месяцев Alpha
// 18.10.2026 (Александр: «один месяц за три пользователя, один друг это совсем фигня: те, кто заметят
// функцию, просто не будут платить нам за премиум»). Дальше 0,6 месяца за друга: 5->3, 10->6, 20->12, 40->24.
//
// 18.10.2026 (Александр: «убери условие про заполненный профиль, чтобы не заёбывать»): друг в зачёте,
// когда зарегистрировался по ссылке и прошёл 48 часов. Поле needLive осталось на случай, если условие
// понадобится вернуть (сейчас везде false). Выше 24 месяцев -- денежная партнёрская программа.

export type Step = { friends: number; months: number; needLive: boolean };

export const LADDER: readonly Step[] = [
  { friends: 3, months: 1, needLive: false },
  { friends: 8, months: 3, needLive: false },
  { friends: 10, months: 6, needLive: false },
  { friends: 18, months: 12, needLive: false },
  { friends: 30, months: 24, needLive: false },
];

/** Сколько дней Alpha получает сам друг, пришедший по ссылке. */
export const FRIEND_DAYS = 14;
/** Сколько часов друг «вылёживается», прежде чем засчитаться (защита от накруток). */
export const HOLD_HOURS = 48;
/** Верхняя граница месяцев Alpha за рефералы. */
export const MAX_MONTHS = LADDER[LADDER.length - 1]?.months ?? 24;

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
export function qualifying(step: Step, c: Counts): number {
  return step.needLive ? c.live : c.counted;
}

export function progressOf(c: Counts): Progress {
  let reached = -1;
  for (let i = 0; i < LADDER.length; i++) {
    const st = LADDER[i];
    if (st && qualifying(st, c) >= st.friends) reached = i;
  }
  const nextStep = LADDER[reached + 1];
  return {
    counts: c,
    monthsEarned: reached >= 0 ? (LADDER[reached]?.months ?? 0) : 0,
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
