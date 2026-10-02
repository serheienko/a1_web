// app/game-map/page.tsx -- карта всесвіту A1 (версия 2, 02.10.2026).
//
// Режим 1 -- карта в рамке на странице; режим 2 -- кнопка «на весь
// екран» внутри карты. Данные (все компании Украины) страница не печатает
// в HTML: их тянет сама карта из /game-map/data (кэш на час), поэтому
// страница лёгкая и открывается сразу, а загрузка видна внутри рамки.
// Закрыта от индексации, пока карта не принята.
import type { Metadata } from "next";
import { T } from "@/components/t";
import { GameMap } from "./game-map";

export const metadata: Metadata = {
  title: "Карта всесвіту A1 | A1 Jobs",
  description: "Ігрова карта всесвіту A1.",
  robots: { index: false, follow: false },
};

export default function GameMapPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <GameMap />
      <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <T
          uk="Розмір будинку — за кількістю людей і відкритих вакансій. Наведіть або натисніть на будинок, щоб побачити, хто там."
          en="House size reflects the number of people and open jobs. Hover or tap a house to see who’s there."
          ru="Размер домика — по количеству людей и открытых вакансий. Наведите или нажмите на домик, чтобы увидеть, кто там."
          de="Die Hausgröße richtet sich nach Personen und offenen Stellen. Fahre über ein Haus oder tippe darauf, um zu sehen, wer dort ist."
          es="El tamaño de la casa depende de las personas y las vacantes abiertas. Pasa el cursor o toca una casa para ver quién está allí."
          fr="La taille de la maison dépend du nombre de personnes et d’offres ouvertes. Survolez ou touchez une maison pour voir qui s’y trouve."
          pl="Wielkość domu zależy od liczby osób i otwartych ofert. Najedź lub dotknij domku, aby zobaczyć, kto tam jest."
          ptBR="O tamanho da casa reflete o número de pessoas e vagas abertas. Passe o mouse ou toque numa casa para ver quem está lá."
          zh="房子的大小取决于人数和开放职位数量。将鼠标悬停或点击房子即可查看。"
        />
      </p>
    </main>
  );
}
