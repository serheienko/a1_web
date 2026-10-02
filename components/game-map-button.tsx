// components/game-map-button.tsx
//
// Александр, 02.10.2026: «Поставь кнопку на сайте возле кнопки где
// скачивание на телефон. Круглая иконка в виде нашей карты».
// 02.10.2026 (вечер): иконка -- кусок НОВОЙ карты (Киев с замками
// компаний), и при наведении, как у кнопки «скачать приложение»
// (components/get-app-button.tsx), выпадает превью карты. Тот же
// useHoverPanel и та же геометрия панели, чтобы обе кнопки вели себя
// одинаково. Картинка в превью медленно «плывёт» -- карта живая.
//
// Размер и обводка круга -- ровно как у GetAppButton: 44px, ring-1,
// shadow-sm. На телефоне скрыта: там мало места в шапке.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { T } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";

export function GameMapButton() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative hidden shrink-0 sm:block"
    >
      <Link
        href="/game-map"
        className="group relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-neutral-200 transition hover:ring-accent/40 dark:bg-neutral-900 dark:ring-neutral-700 dark:hover:ring-accent/40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/game-map/map-icon-v2.webp"
          alt=""
          width={44}
          height={44}
          className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-125"
        />
        <span className="sr-only">
          <T uk="Карта A1" en="A1 map" ru="Карта A1" de="A1-Karte" es="Mapa de A1" fr="Carte A1" pl="Mapa A1" ptBR="Mapa do A1" zh="A1 地图" />
        </span>
      </Link>

      {rendered && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 w-[440px] pt-2">
          <Link
            href="/game-map"
            className={
              "block overflow-hidden rounded-2xl bg-[#fbf5e6] shadow-xl ring-1 ring-[#c99a52]/50 transition duration-200 ease-out dark:bg-[#16233a] dark:ring-[#7d8fc9]/40 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <span className="relative block aspect-[16/9] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/game-map/map-preview.webp"
                alt=""
                width={880}
                height={484}
                loading="lazy"
                className="gm-preview-drift absolute inset-0 h-full w-full object-cover dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/game-map/map-preview-dark.webp"
                alt=""
                width={880}
                height={484}
                loading="lazy"
                className="gm-preview-drift absolute inset-0 hidden h-full w-full object-cover dark:block"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#fbf5e6] dark:to-[#16233a]" />
            </span>
            <span className="block px-5 pb-5 pt-1">
              <span className="block font-serif text-[20px] font-bold leading-[1.2] text-[#4a3518] dark:text-[#efe6cf]">
                <T
                  uk="Карта IT-компаній"
                  en="Map of IT companies"
                  ru="Карта IT-компаний"
                  de="Karte der IT-Firmen"
                  es="Mapa de empresas IT"
                  fr="Carte des entreprises IT"
                  pl="Mapa firm IT"
                  ptBR="Mapa de empresas de TI"
                  zh="IT 公司地图"
                />
              </span>
              <span className="mt-2 block text-[13px] leading-snug text-[#6b5434] dark:text-white/65">
                <T
                  uk="Будиночки компаній з їхніми прапорами й вакансіями — наведіть на будь-який"
                  en="Company houses with their flags and jobs — hover any of them"
                  ru="Домики компаний с их флагами и вакансиями — наведите на любой"
                  de="Firmenhäuser mit Flaggen und Jobs — fahren Sie über eines"
                  es="Casas de empresas con sus banderas y vacantes: pasa el cursor por cualquiera"
                  fr="Les maisons des entreprises, leurs drapeaux et leurs offres — survolez-en une"
                  pl="Domki firm z flagami i ofertami — najedź na dowolny"
                  ptBR="Casas das empresas com bandeiras e vagas — passe o mouse em qualquer uma"
                  zh="公司小屋、旗帜与职位——把鼠标移到任意一个上"
                />
              </span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
