// app/game/game-player.tsx -- запуск A1 RUN за кліком (03.10.2026).
// Гра важка (Unity WebGL), тому iframe з'являється лише після «Грати».
//
// 03.10.2026 (Александр): «кнопка "повний екран" у верхньому правому куті
// гри, так само вихід у звичайний екран, і поруч кнопка вкл/викл звук».
// Кнопки лежать поверх гри (в правому верхньому куті), повний екран --
// у ОБГОРТКИ, а не в iframe, щоб кнопки лишалися видимі й у повному
// екрані. Звук: iframe (public/game/play/index.html) слухає повідомлення
// {a1: "mute", muted} і глушить Web Audio -- вибір запамʼятовується.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { T } from "@/components/t";

const MUTE_KEY = "a1-game-muted";

type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

export function GamePlayer() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fs, setFs] = useState(false);
  const [canFs, setCanFs] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Запамʼятований вибір звуку + чи вміє браузер повний екран (iPhone не вміє).
  useEffect(() => {
    try {
      if (localStorage.getItem(MUTE_KEY) === "1") setMuted(true);
    } catch {
      /* приватний режим */
    }
    const el = document.documentElement as FsEl;
    setCanFs(!!(el.requestFullscreen || el.webkitRequestFullscreen));
  }, []);

  useEffect(() => {
    const onChange = () => {
      const d = document as FsDoc;
      setFs(!!(d.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const sendMute = useCallback((m: boolean) => {
    frameRef.current?.contentWindow?.postMessage({ a1: "mute", muted: m }, window.location.origin);
  }, []);

  useEffect(() => {
    sendMute(muted);
  }, [muted, started, sendMute]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* приватний режим */
    }
  }

  function toggleFullscreen() {
    const d = document as FsDoc;
    const el = wrapRef.current as FsEl | null;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
    } else if (el) {
      void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    }
  }

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow ring-1 ring-white/20 backdrop-blur transition hover:bg-black/75 active:scale-95";

  return (
    <div
      ref={wrapRef}
      className={
        fs
          ? "relative h-full w-full bg-black"
          : "relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800"
      }
    >
      <div className="relative w-full" style={fs ? { height: "100%" } : { aspectRatio: "960 / 600" }}>
        {started ? (
          <>
            <iframe
              ref={frameRef}
              src="/game/play/index.html"
              title="A1 RUN"
              allow="fullscreen; autoplay"
              onLoad={() => sendMute(muted)}
              className="absolute inset-0 h-full w-full border-0"
            />
            <div className="absolute right-2 top-2 z-10 flex gap-2">
              <button type="button" onClick={toggleMute} className={btn} aria-pressed={muted}>
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5z" />
                    <path d="m22 9-6 6M16 9l6 6" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                )}
                <span className="sr-only">
                  {muted ? (
                    <T uk="Увімкнути звук" en="Turn sound on" ru="Включить звук" de="Ton an" es="Activar sonido" fr="Activer le son" pl="Włącz dźwięk" ptBR="Ligar o som" zh="开启声音" />
                  ) : (
                    <T uk="Вимкнути звук" en="Turn sound off" ru="Выключить звук" de="Ton aus" es="Silenciar" fr="Couper le son" pl="Wyłącz dźwięk" ptBR="Desligar o som" zh="关闭声音" />
                  )}
                </span>
              </button>
              {canFs && (
                <button type="button" onClick={toggleFullscreen} className={btn}>
                  {fs ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
                    </svg>
                  )}
                  <span className="sr-only">
                    {fs ? (
                      <T uk="Вийти з повного екрана" en="Exit fullscreen" ru="Выйти из полного экрана" de="Vollbild beenden" es="Salir de pantalla completa" fr="Quitter le plein écran" pl="Wyjdź z pełnego ekranu" ptBR="Sair da tela cheia" zh="退出全屏" />
                    ) : (
                      <T uk="На весь екран" en="Fullscreen" ru="На весь экран" de="Vollbild" es="Pantalla completa" fr="Plein écran" pl="Pełny ekran" ptBR="Tela cheia" zh="全屏" />
                    )}
                  </span>
                </button>
              )}
            </div>
          </>
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
                uk="Гра завантажиться після натискання (~35 МБ)"
                en="The game loads after you press Play (~35 MB)"
                ru="Игра загрузится после нажатия (~35 МБ)"
                de="Das Spiel lädt nach dem Klick (~35 MB)"
                es="El juego se carga al pulsar Jugar (~35 MB)"
                fr="Le jeu se charge après le clic (~35 Mo)"
                pl="Gra załaduje się po kliknięciu (~35 MB)"
                ptBR="O jogo carrega após o clique (~35 MB)"
                zh="点击后才会加载游戏（约 35 MB）"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
