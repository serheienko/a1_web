// app/download/sound.tsx
//
// Aleksandr, 15.09.2026: «можем добавить трек на установочную страницу?
// Дефолтно она на иконке мьют, а при нажатии unmute — играет. Иконка с
// анимацией при нажатии и ховере».
//
// 16.09.2026, он же: гимн есть в двух версиях, и украинскую надо давать
// тем, у кого выбран украинский: «нажимаешь переключатель на UA — язык,
// окей, значит мы тебе включим украинский трек. Все остальные восемь
// языков играют английский». Так и сделано: язык читается из класса на
// <html> (его ставят LANG_INIT_SCRIPT в app/layout.tsx и меню ./menu.tsx),
// а за сменой следит MutationObserver — поэтому переключение языка на
// лету слышно сразу, без перезагрузки страницы. Если музыка в этот
// момент играет, треки не обрываются встык: текущий гаснет, новый
// начинается с начала и поднимается до той же громкости.
//
// Оба трека лежат в public/download двумя форматами: opus в .ogg для
// Chrome и Firefox, aac в .m4a для Safari и iOS. Что умеет браузер —
// спрашиваем у него самого (canPlayType), потому что <source> подходит
// только для разметки, заданной один раз, а нам нужно менять дорожку из
// кода.
//
// Правила, которые здесь соблюдены намеренно:
//
// 1. Никакого автозапуска. Страница молчит, пока по кнопке не нажали, —
//    и не только из-за политик браузеров: звук, начавшийся сам, на
//    чужой странице раздражает сильнее, чем радует.
// 2. Файл не качается, пока его не попросили: src подставляется в
//    момент первого нажатия, до этого у <audio> его просто нет.
// 3. Громкость не прыгает, а плавно нарастает и гаснет.
// 4. Уходя со вкладки, музыку ставим на паузу и возвращаем, когда
//    вернулись, — но только если её не выключили руками.
// 5. При уходе в магазин (./interactions.tsx гасит экран за 380 мс)
//    звук гаснет вместе с картинкой, а не обрывается на полуслове.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { DOWNLOAD_COPY } from "./copy";
import styles from "./download.module.css";

// Комфортная громкость фоновой музыки на лендинге: слышно, но можно
// спокойно говорить поверх.
const VOLUME = 0.55;
// Длительность нарастания и затухания.
const FADE_MS = 700;
// Смена языка на ходу: гасим быстрее, поднимаем чуть мягче.
const SWAP_OUT_MS = 260;
const SWAP_IN_MS = 520;
// Столько держится класс «нажали»: 620 мс кольцо плюс запас.
const PULSE_MS = 760;

// Украинский — свой гимн, остальные восемь языков — английский.
const TRACK_UK = "/download/a1-anthem-uk";
const TRACK_INTL = "/download/a1-theme";

function trackFor(lang: Locale | null) {
  return lang === "uk" ? TRACK_UK : TRACK_INTL;
}

function currentLocale(): Locale {
  const root = document.documentElement;
  return LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l])) ?? "uk";
}

// Что браузер вообще умеет. canPlayType отвечает "probably" | "maybe" |
// "" — пустая строка означает «точно нет», остальное годится.
function sourceFor(audio: HTMLAudioElement, base: string) {
  return audio.canPlayType("audio/ogg; codecs=opus") ? `${base}.ogg` : `${base}.m4a`;
}

export function Sound() {
  const [playing, setPlaying] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [lang, setLang] = useState<Locale | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  // играла ли музыка до того, как ушли со вкладки
  const resumeRef = useRef(false);
  // какой трек сейчас заряжен — чтобы не перезаряжать его зря
  const trackRef = useRef<string | null>(null);

  // Плавное изменение громкости. Работаем через requestAnimationFrame, а
  // не через setInterval: так шаг совпадает с кадром экрана и на слух
  // нарастание ровное.
  const fadeTo = useCallback((target: number, ms: number, done?: () => void) => {
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
  }, []);

  // Ставит нужную дорожку. Возвращает true, если она сменилась.
  const loadTrack = useCallback((nextLang: Locale | null) => {
    const audio = audioRef.current;
    const base = trackFor(nextLang);
    if (!audio || trackRef.current === base) return false;
    trackRef.current = base;
    audio.src = sourceFor(audio, base);
    return true;
  }, []);

  // Текущий язык и слежение за его сменой. Класс на <html> — общий для
  // всего сайта источник правды, поэтому слушаем именно его, а не меню:
  // так же сработает и выбор, сделанный где-то ещё.
  useEffect(() => {
    setLang(currentLocale());
    const observer = new MutationObserver(() => setLang(currentLocale()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Язык сменился. Молчим — просто запомним; играем — подменим дорожку
  // с затуханием, чтобы стык не резал ухо.
  useEffect(() => {
    if (lang === null) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (!playing) {
      // ничего не грузим заранее: дорожка подставится при нажатии
      if (audio.paused && trackRef.current !== null) loadTrack(lang);
      return;
    }
    if (trackFor(lang) === trackRef.current) return;
    fadeTo(0, SWAP_OUT_MS, () => {
      loadTrack(lang);
      void audio
        .play()
        .then(() => fadeTo(VOLUME, SWAP_IN_MS))
        .catch(() => setPlaying(false));
    });
  }, [lang, playing, fadeTo, loadTrack]);

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

    loadTrack(lang);
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
  }, [fadeTo]);

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

      {/* loop: треки на 1:27 и 2:19, а посетитель может остаться дольше.
          src появляется только при первом нажатии — см. loadTrack */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop preload="none" playsInline />
    </div>
  );
}
