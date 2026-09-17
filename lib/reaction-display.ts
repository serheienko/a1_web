// lib/reaction-display.ts
//
// Правила показа реакций. 2026-09-17, текстовое ТЗ (Ниджат), которое
// Александр прислал словами:
//
//   -- считается ОБЩЕЕ число реакций на сообщении, а не по каждому
//      эмодзи отдельно;
//   -- всего 1-3 -- у каждого эмодзи показываются лица поставивших;
//   -- 4 и больше -- весь ряд переключается в числа, и число пишется
//      даже когда оно единица;
//   -- упало обратно с 4 до 3 -- лица возвращаются;
//   -- порядок: своя реакция первой, дальше по убыванию количества,
//      при равенстве -- в порядке первого появления;
//   -- лишний раз ряд не пересортировывать.
//
// Вынесено из компонента в отдельный файл по одной причине: правило
// «лица до трёх, дальше числа» нельзя проверить живьём, не собрав
// четырёх РАЗНЫХ людей -- бэкенд держит по одной реакции на человека.
// Здесь это чистая функция, и на неё есть прогон всех случаев из ТЗ
// (scripts/reaction-display.test.ts), который запускается без браузера
// и без аккаунтов.

/** Сколько угодно реакций одного эмодзи; кто именно -- в reactors. */
export type ReactionGroupLike = { emoticon: string; reactorIds: string[] };

export type ReactionDisplay = {
  /** true -- ряд показывает числа, false -- лица. */
  numericMode: boolean;
  /** Тот же список групп, в порядке показа. */
  ordered: ReactionGroupLike[];
};

/** Порог из ТЗ: с четвёртой реакции ряд переключается в числа. */
export const NUMERIC_MODE_FROM = 4;

export function reactionDisplay(groups: ReactionGroupLike[], myUserId: string | null): ReactionDisplay {
  const total = groups.reduce((sum, g) => sum + g.reactorIds.length, 0);
  const isMine = (g: ReactionGroupLike) => myUserId !== null && g.reactorIds.includes(myUserId);
  const ordered = groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => {
      const aMine = isMine(a.group) ? 1 : 0;
      const bMine = isMine(b.group) ? 1 : 0;
      if (aMine !== bMine) return bMine - aMine;
      if (a.group.reactorIds.length !== b.group.reactorIds.length) {
        return b.group.reactorIds.length - a.group.reactorIds.length;
      }
      // Порядок первого появления -- он же гарантия, что ряд не
      // перескакивает сам по себе: сортировка детерминированная.
      return a.index - b.index;
    })
    .map((entry) => entry.group);
  return { numericMode: total >= NUMERIC_MODE_FROM, ordered };
}
