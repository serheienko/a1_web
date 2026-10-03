// app/game/page.tsx -- A1 RUN: браузерна гра про кота Mr Kit (03.10.2026).
// Гра (Unity WebGL, ~25 МБ) НЕ вантажиться разом зі сторінкою: лише після
// натискання «Грати» (див. game-player.tsx). Файли гри лежать у
// public/game/play. Відкрита для індексації (03.10.2026).
import type { Metadata } from "next";
import { T } from "@/components/t";
import { GamePlayer } from "./game-player";

export const metadata: Metadata = {
  title: "A1 RUN | A1 Jobs",
  description: "A1 RUN — міні-гра про кота Mr Kit: біжи дахами, збирай зв’язки й тікай від потопу.",
};

export default function GamePage() {
  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">A1 RUN</h1>
      <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
        <T
          uk="Міні-гра про кота Mr Kit: біжи дахами, збирай зв’язки, обходь багів і тікай від потопу. Пробіл або дотик — стрибок."
          en="A mini-game about Mr Kit the cat: run across rooftops, collect connections, dodge bugs and escape the flood. Space or tap to jump."
          ru="Мини-игра про кота Mr Kit: беги по крышам, собирай связи, обходи багов и убегай от потопа. Пробел или касание — прыжок."
          de="Ein Mini-Spiel über den Kater Mr Kit: Renne über Dächer, sammle Kontakte, weiche Bugs aus und entkomme der Flut. Leertaste oder Tippen zum Springen."
          es="Un minijuego sobre el gato Mr Kit: corre por los tejados, reúne conexiones, esquiva bugs y escapa de la inundación. Espacio o toque para saltar."
          fr="Un mini-jeu sur le chat Mr Kit : cours sur les toits, collecte des connexions, évite les bugs et fuis l’inondation. Espace ou toucher pour sauter."
          pl="Mini-gra o kocie Mr Kit: biegnij po dachach, zbieraj kontakty, unikaj bugów i uciekaj przed powodzią. Spacja lub dotyk — skok."
          ptBR="Um minijogo sobre o gato Mr Kit: corra pelos telhados, colete conexões, desvie dos bugs e fuja da enchente. Espaço ou toque para pular."
          zh="关于猫咪 Mr Kit 的小游戏：在屋顶上奔跑，收集人脉，躲避 Bug，逃离洪水。按空格或点击屏幕即可跳跃。"
        />
      </p>
      <GamePlayer />
    </main>
  );
}
