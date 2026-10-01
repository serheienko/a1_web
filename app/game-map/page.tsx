// app/game-map/page.tsx -- игровая карта A1 (прототип на демо-данных).
//
// Александр, 02.10.2026: «Давай попробуем сделать реальную карту,
// опубликовать на сайт и там уже решим, оставляем или нет». Страница
// закрыта от индексации (robots noindex), пока карта не принята: Google
// не должен видеть демо-компании с вымышленными названиями.
// Адрес /map занят картой IT (app/map), поэтому /game-map.
import type { Metadata } from "next";
import { GameMap } from "./game-map";

export const metadata: Metadata = {
  title: "Карта A1 | A1 Jobs",
  description: "Игровая карта компаний и людей A1.",
  robots: { index: false, follow: false },
};

export default function GameMapPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <GameMap />
      <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        Прототип: названия компаний вымышленные. Размер здания зависит от числа сотрудников, цвет флага от отрасли.
      </p>
    </main>
  );
}
