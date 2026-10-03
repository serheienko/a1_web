// app/game/game-player.tsx -- запуск A1 RUN за кліком (03.10.2026).
// Гра важка (Unity WebGL), тому iframe з'являється лише після «Грати»:
// сторінка відкривається миттєво й не їсть трафік тим, хто не грає.
"use client";

import { useRef, useState } from "react";
import { T } from "@/components/t";

export function GamePlayer() {
  const [started, setStarted] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  function fullscreen() {
    const el = frameRef.current;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800">
      <div className="relative w-full" style={{ aspectRatio: "960 / 600" }}>
        {started ? (
          <iframe
            ref={frameRef}
            src="/game/play/index.html"
            title="A1 RUN"
            allow="fullscreen; autoplay"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-indigo-950 to-neutral-950 px-4 text-center">
            <div className="text-4xl font-extrabold tracking-wide text-white sm:text-5xl">A1 RUN</div>
            <div className="text-sm text-indigo-200">Rooftop Sprint</div>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="rounded-xl bg-violet-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-violet-500 active:scale-95"
            >
              <T uk="Грати" en="Play" ru="Играть" de="Spielen" es="Jugar" fr="Jouer" pl="Graj" ptBR="Jogar" zh="开始游戏" />
            </button>
            <div className="text-xs text-neutral-400">
              <T
                uk="Гра завантажиться після натискання (~25 МБ)"
                en="The game loads after you press Play (~25 MB)"
                ru="Игра загрузится после нажатия (~25 МБ)"
                de="Das Spiel lädt nach dem Klick (~25 MB)"
                es="El juego se carga al pulsar Jugar (~25 MB)"
                fr="Le jeu se charge après le clic (~25 Mo)"
                pl="Gra załaduje się po kliknięciu (~25 MB)"
                ptBR="O jogo carrega após o clique (~25 MB)"
                zh="点击后才会加载游戏（约 25 MB）"
              />
            </div>
          </div>
        )}
      </div>
      {started && (
        <div className="flex justify-end bg-neutral-900 px-3 py-2">
          <button type="button" onClick={fullscreen} className="rounded-lg bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-700">
            <T uk="На весь екран" en="Fullscreen" ru="На весь экран" de="Vollbild" es="Pantalla completa" fr="Plein écran" pl="Pełny ekran" ptBR="Tela cheia" zh="全屏" />
          </button>
        </div>
      )}
    </div>
  );
}
