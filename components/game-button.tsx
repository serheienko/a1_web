// components/game-button.tsx
//
// Александр, 03.10.2026: «возле карты добавить круглую иконку с эмодзи 🎮
// и сделать превью при ховере как для карты и "скачать на моб"».
// Круг 44px, ring-1, shadow-sm -- как GameMapButton и GetAppButton; та же
// механика наведения (useHoverPanel) и та же геометрия панели 440px.
// На телефоне скрыта (мало места в шапке), как соседние кнопки.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { T } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";

export function GameButton() {
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
        href="/game"
        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[22px] leading-none shadow-sm ring-1 ring-neutral-200 transition hover:ring-accent/40 dark:bg-neutral-900 dark:ring-neutral-700 dark:hover:ring-accent/40"
      >
        <span aria-hidden="true" className="transition duration-200 ease-out group-hover:scale-110">
          🎮
        </span>
        <span className="sr-only">
          <T uk="Гра A1 RUN" en="A1 RUN game" ru="Игра A1 RUN" de="Spiel A1 RUN" es="Juego A1 RUN" fr="Jeu A1 RUN" pl="Gra A1 RUN" ptBR="Jogo A1 RUN" zh="A1 RUN 游戏" />
        </span>
      </Link>

      {rendered && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 w-[440px] pt-2">
          <Link
            href="/game"
            className={
              "block overflow-hidden rounded-2xl bg-[#03051f] shadow-xl ring-1 ring-black/10 transition duration-200 ease-out dark:ring-white/10 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <span className="relative block aspect-[16/10] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/game/preview.webp"
                alt=""
                width={880}
                height={546}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
            </span>
            <span className="block px-5 pb-5 pt-1">
              <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 RUN</span>
              <span className="mt-2 block text-[13px] leading-snug text-white/65">
                <T
                  uk="Міні-гра про кота Mr Kit — біжи дахами й збирай зв’язки"
                  en="A mini-game about Mr Kit the cat — run the rooftops and collect connections"
                  ru="Мини-игра про кота Mr Kit — беги по крышам и собирай связи"
                  de="Ein Mini-Spiel über den Kater Mr Kit — über Dächer rennen, Kontakte sammeln"
                  es="Un minijuego sobre el gato Mr Kit: corre por los tejados y reúne conexiones"
                  fr="Un mini-jeu sur le chat Mr Kit — cours sur les toits et collecte des connexions"
                  pl="Mini-gra o kocie Mr Kit — biegnij po dachach i zbieraj kontakty"
                  ptBR="Um minijogo sobre o gato Mr Kit — corra pelos telhados e colete conexões"
                  zh="关于猫咪 Mr Kit 的小游戏——在屋顶奔跑，收集人脉"
                />
              </span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
