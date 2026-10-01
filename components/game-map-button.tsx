// components/game-map-button.tsx
//
// Александр, 02.10.2026: «Поставь кнопку на сайте возле кнопки где
// скачивание на телефон. Круглая иконка в виде нашей карты».
//
// Размер и обводка -- ровно как у GetAppButton и аватара справа: круг
// 44px, ring-1 (кольцо СНАРУЖИ), shadow-sm. Вся шапка собрана из кругов
// такой высоты, любой другой размер выбивается (история выравнивания --
// в components/get-app-button.tsx).
//
// Внутри -- не значок, а настоящий кусок нашей игровой карты (Украина,
// public/game-map/map-icon.webp, 256px, ~30 КБ). При наведении картинка
// чуть приближается -- как «приблизить карту».
//
// Ведёт на /game-map. Адрес /map занят картой IT (app/map).
// Как и кнопка скачивания, на телефоне скрыта: там мало места в шапке.
import Link from "next/link";
import { T } from "@/components/t";

export function GameMapButton() {
  return (
    <Link
      href="/game-map"
      className="group relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-neutral-200 transition hover:ring-accent/40 sm:block dark:bg-neutral-900 dark:ring-neutral-700 dark:hover:ring-accent/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/game-map/map-icon.webp"
        alt=""
        width={44}
        height={44}
        className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-125"
      />
      <span className="sr-only">
        <T
          uk="Карта A1"
          en="A1 map"
          ru="Карта A1"
          de="A1-Karte"
          es="Mapa de A1"
          fr="Carte A1"
          pl="Mapa A1"
          ptBR="Mapa do A1"
          zh="A1 地图"
        />
      </span>
    </Link>
  );
}
