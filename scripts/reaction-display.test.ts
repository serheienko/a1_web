// Прогон правил показа реакций по ТЗ. Запуск:
//   node --experimental-strip-types scripts/reaction-display.test.ts
// Ни браузера, ни аккаунтов не нужно -- именно поэтому правило «с
// четвёртой реакции ряд становится числами» вообще проверяемо: живьём
// для этого нужны четыре разных человека.
import { reactionDisplay } from "../lib/reaction-display.ts";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failed += 1;
    console.error(`FAIL  ${name}\n  ожидалось: ${e}\n  получено:  ${a}`);
  } else {
    console.log(`ok    ${name}`);
  }
}

const me = "usr_me";

// 1. Одна реакция -- лица.
check(
  "одна реакция -- лица",
  reactionDisplay([{ emoticon: "🔥", reactorIds: ["usr_a"] }], me).numericMode,
  false,
);

// 2. Ровно три -- всё ещё лица.
check(
  "три реакции -- лица",
  reactionDisplay(
    [
      { emoticon: "🔥", reactorIds: ["usr_a", "usr_b"] },
      { emoticon: "❤️", reactorIds: ["usr_c"] },
    ],
    me,
  ).numericMode,
  false,
);

// 3. Четыре -- числа, считается ОБЩЕЕ число, а не по эмодзи.
check(
  "четыре реакции -- числа",
  reactionDisplay(
    [
      { emoticon: "🔥", reactorIds: ["usr_a", "usr_b"] },
      { emoticon: "❤️", reactorIds: ["usr_c"] },
      { emoticon: "👍", reactorIds: ["usr_d"] },
    ],
    me,
  ).numericMode,
  true,
);

// 4. Упало с четырёх до трёх -- лица вернулись.
check(
  "падение до трёх -- снова лица",
  reactionDisplay(
    [
      { emoticon: "🔥", reactorIds: ["usr_a", "usr_b"] },
      { emoticon: "❤️", reactorIds: ["usr_c"] },
    ],
    me,
  ).numericMode,
  false,
);

// 5. Своя реакция первой, даже если она самая малочисленная.
check(
  "своя реакция первой",
  reactionDisplay(
    [
      { emoticon: "🔥", reactorIds: ["usr_a", "usr_b", "usr_c"] },
      { emoticon: "❤️", reactorIds: [me] },
    ],
    me,
  ).ordered.map((g) => g.emoticon),
  ["❤️", "🔥"],
);

// 6. Дальше -- по убыванию количества.
check(
  "дальше по убыванию",
  reactionDisplay(
    [
      { emoticon: "👍", reactorIds: ["usr_a"] },
      { emoticon: "🔥", reactorIds: ["usr_b", "usr_c", "usr_d"] },
      { emoticon: "❤️", reactorIds: ["usr_e", "usr_f"] },
    ],
    me,
  ).ordered.map((g) => g.emoticon),
  ["🔥", "❤️", "👍"],
);

// 7. При равенстве -- порядок первого появления, не алфавит и не
//    случайность: именно это не даёт ряду прыгать при каждом обновлении.
check(
  "при равенстве -- порядок появления",
  reactionDisplay(
    [
      { emoticon: "😁", reactorIds: ["usr_a"] },
      { emoticon: "👏", reactorIds: ["usr_b"] },
      { emoticon: "🥰", reactorIds: ["usr_c"] },
    ],
    me,
  ).ordered.map((g) => g.emoticon),
  ["😁", "👏", "🥰"],
);

// 8. Гость (своей реакции нет) -- просто по убыванию и появлению.
check(
  "без своей реакции",
  reactionDisplay(
    [
      { emoticon: "👍", reactorIds: ["usr_a"] },
      { emoticon: "🔥", reactorIds: ["usr_b", "usr_c"] },
    ],
    null,
  ).ordered.map((g) => g.emoticon),
  ["🔥", "👍"],
);

// 9. Порядок не зависит от того, сколько раз пересчитали.
const twice = reactionDisplay(
  [
    { emoticon: "👍", reactorIds: ["usr_a"] },
    { emoticon: "🔥", reactorIds: ["usr_b", me] },
  ],
  me,
);
check(
  "повторный расчёт даёт тот же порядок",
  reactionDisplay(twice.ordered, me).ordered.map((g) => g.emoticon),
  twice.ordered.map((g) => g.emoticon),
);

console.log(failed === 0 ? "\nВсе проверки прошли." : `\nПровалено проверок: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
