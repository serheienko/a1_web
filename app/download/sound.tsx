// app/download/sound.tsx
//
// Aleksandr, 15.09.2026: «можем добавить трек на установочную страницу?
// Дефолтно она на иконке мьют, а при нажатии unmute — играет. Иконка с
// анимацией при нажатии и ховере».
//
// Трек — его собственный, «A1 is the One» (он прислал файл). Лежит в
// public/download двумя форматами: opus в .ogg для Chrome и Firefox
// (728 КБ) и aac в .m4a для Safari и iOS (1 МБ). Браузер берёт первый,
// который умеет играть.
//
// Правила, которые здесь соблюдены намеренно:
//
// 1. Никакого автозапуска. Страница молчит, пока по кнопке не нажали, —
//    и не только из-за политик браузеров: звук, начавшийся сам, на
//    чужой странице раздражает сильнее, чем радует.
// 2. preload="none": пока человек не попросил звук, файл вообще не
//    качается. Для тех, кто просто зашёл посмотреть, страница не стала
//    тяжелее ни на байт.
// 3. Громкость не прыгает, а плавно нарастает и гаснет за 700 мс.
//    Резкое включение на 55% воспринимается как «бахнуло».
// 4. Уходя со вкладки, музыку ставим на паузу и возвращаем, когда
//    вернулись, — но только если её не выключили руками.
// 5. При уходе в магазин (./interactions.tsx гасит экран за 380 мс)
//    звук гаснет вместе с картинкой, а не обрывается на полуслове.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { DOWNLOAD_COPY } from "./copy";
import styles from "./download.module.css";

// Комфортная громкость фоновой музыки на лендинге: слышно, но можно
// спокойно говорить поверх.
const VOLUME = 0.55;
// Длительность нарастания и затухания.
const FADE_MS = 700;
// Столько держится класс «нажали»: 620 мс кольцо плюс запас.
const PULSE_MS = 760;

export function Sound() {
  const [playing, setPlaying] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [lang, setLang] = useState<Locale | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  // играла ли музыка до того, как ушли со вкладки
  const resumeRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    setLang(LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l])) ?? "uk");
  }, []);

  // Плавное изменение громкости. Работаем через requestAnimationFrame, а
  // не через setInterval: так шаг совпадает с кадром экрана и на слух
  // нарастание ровное.
  function fadeTo(target: number, ms: number, done?: () => void) {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      audio.volume = from + (target - from) * k;
      if (k < 1) {
        fadeRef.current = requestAnimationFrame(step);
      } else {
        fadeRef.current = null;
        done?.();
      }
    };
    fadeRef.current = requestAnimationFrame(step);
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    // кольцо от нажатия — в обе стороны, и на мыши, и на тапе
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setPulsing(true);
    pulseTimer.current = window.setTimeout(() => setPulsing(false), PULSE_MS);

    if (playing) {
      resumeRef.current = false;
      setPlaying(false);
      fadeTo(0, FADE_MS, () => audio.pause());
      return;
    }

    audio.volume = 0;
    try {
      // play() обязан быть внутри самого нажатия — иначе браузер
      // посчитает запуск «не по просьбе человека» и откажет
      await audio.play();
    } catch {
      // не получилось (нет файла, отказ браузера) — кнопка просто
      // остаётся выключенной, ломать страницу из-за этого нечем
      return;
    }
    resumeRef.current = true;
    setPlaying(true);
    fadeTo(VOLUME, FADE_MS);
  }

  // Ушли со вкладки — музыка ждёт. Вернулись — играет дальше.
  useEffect(() => {
    function onVisibility() {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        if (!audio.paused) audio.pause();
        return;
      }
      if (resumeRef.current && audio.paused) void audio.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Уход в магазин: экран гаснет — и звук вместе с ним.
  useEffect(() => {
    function onLeave() {
      if (!audioRef.current || audioRef.current.paused) return;
      resumeRef.current = false;
      fadeTo(0, 340);
    }
    window.addEventListener("a1:leave", onLeave);
    return () => window.removeEventListener("a1:leave", onLeave);
  }, []);

  useEffect(
    () => () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    },
    [],
  );

  const copy = DOWNLOAD_COPY[lang ?? "uk"];
  const label = playing ? copy.soundOff : copy.soundOn;

  return (
    <div className={styles.soundWrap}>
      <button
        type="button"
        className={[styles.soundButton, playing ? styles.soundPlaying : "", pulsing ? styles.soundPulse : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={label}
        title={label}
        data-track="sound"
      >
        {/* четыре полоски эквалайзера: молчат — стоят разной высоты,
            играют — танцуют каждая в своём темпе */}
        <span className={styles.eq} aria-hidden="true">
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
        </span>
      </button>

      {/* loop: трек на 1:27, а посетитель может остаться дольше */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop preload="none" playsInline>
        <source src="/download/a1-theme.ogg" type="audio/ogg; codecs=opus" />
        <source src="/download/a1-theme.m4a" type="audio/mp4; codecs=mp4a.40.2" />
      </audio>
    </div>
  );
}
