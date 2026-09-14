// app/download/ambience.tsx
//
// Aleksandr, 2026-09-14: «что мы можем из анимаций придумать прикольного?
// Например какой-то пар на бекграунде, или какой-то моушн» — выбрал все
// четыре варианта: туман с искрами, живое небо, параллакс за курсором и
// появление при входе.
//
// Падающие звёзды были и убраны в тот же день по его просьбе («убери
// звезду»): даже поправленные, они дёргали внимание на статичной
// странице, где смотреть нужно на кнопки.
//
// Здесь живут первые три (появление при входе — чистый CSS, оно в
// download.module.css и не требует компонента).
//
// Всё нарисовано градиентами и двигается только через transform/opacity —
// то есть силами видеокарты, без перерисовки страницы. Никаких картинок,
// никаких библиотек: вес — ноль.
//
// Два правила, которые здесь соблюдены намеренно:
//
// 1. prefers-reduced-motion: посетителю с этой системной настройкой
//    анимации не показываются вовсе (CSS) и слушатель мыши не вешается.
// 2. Параллакс — только там, где есть настоящая мышь. На телефоне он
//    делался бы по гироскопу, а это на iOS требует отдельного разрешения
//    по кнопке — ради пары пикселей сдвига спрашивать не стоит.
"use client";

import { useEffect } from "react";
import styles from "./download.module.css";

// Насколько далеко фон уезжает за курсором, px. Держим маленьким: это
// должно читаться как объём, а не как «поехавшая картинка».
const PARALLAX_PX = 14;

export function Ambience() {
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media.matches || reduced.matches) return;

    const root = document.documentElement;
    let frame = 0;

    function onMove(event: MouseEvent) {
      if (frame) return;
      // Считаем в rAF, а не на каждое событие: mousemove прилетает
      // сотнями в секунду, а перерисовка нужна раз в кадр.
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty("--a1-px", (x * PARALLAX_PX).toFixed(2));
        root.style.setProperty("--a1-py", (y * PARALLAX_PX).toFixed(2));
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--a1-px");
      root.style.removeProperty("--a1-py");
    };
  }, []);

  return (
    <div className={styles.ambience} aria-hidden="true">
      {/* мерцающие звёзды: каждая — отдельная точка со своей фазой,
          иначе мерцание всего слоя разом глаз читает как ровный свет */}
      <div className={styles.starfield}>
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className={styles.star} />
        ))}
      </div>

      {/* дымка у скалы */}
      <div className={styles.haze} />
      <div className={styles.hazeAlt} />

      {/* искры-светлячки, поднимающиеся снизу вверх */}
      <div className={styles.sparks}>
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className={styles.spark} />
        ))}
      </div>
    </div>
  );
}
