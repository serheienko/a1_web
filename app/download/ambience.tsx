// app/download/ambience.tsx
//
// Aleksandr, 2026-09-14: «что мы можем из анимаций придумать прикольного?
// Например какой-то пар на бекграунде, или какой-то моушн» — выбрал все
// четыре варианта: туман с искрами, живое небо, параллакс за курсором и
// появление при входе. Тем же вечером добавились ещё три: свет за
// курсором, магнитные кнопки и реакция кота на клик.
//
// Падающие звёзды были и убраны по его просьбе («убери звезду»): даже
// поправленные, они дёргали внимание на статичной странице, где смотреть
// нужно на кнопки.
//
// Здесь живёт вся «живая» логика страницы (появление при входе — чистый
// CSS, оно в download.module.css и компонента не требует).
//
// Всё нарисовано градиентами и двигается только через transform/opacity —
// то есть силами видеокарты, без перерисовки страницы. Никаких картинок,
// никаких библиотек: вес — ноль.
//
// Два правила, которые здесь соблюдены намеренно:
//
// 1. prefers-reduced-motion: посетителю с этой системной настройкой
//    анимации не показываются вовсе (CSS) и слушатели не вешаются.
// 2. Всё, что завязано на мышь, работает только там, где мышь есть.
//    Реакция кота на нажатие — исключение: она нужна и на телефоне.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./download.module.css";

// Насколько далеко фон уезжает за курсором, px. Держим маленьким: это
// должно читаться как объём, а не как «поехавшая картинка».
const PARALLAX_PX = 14;
// С какого расстояния кнопка начинает тянуться к курсору и насколько
// сильно. 0.16 — заметно рукой, но кнопка не «убегает» от нажатия.
const MAGNET_RADIUS = 150;
const MAGNET_STRENGTH = 0.16;

// Сезон по месяцу посетителя: зима — декабрь-февраль, весна — март-май,
// осень — сентябрь-ноябрь. Лето своего слоя не имеет: летние светлячки —
// это искры, которые на странице и так живут круглый год.
function seasonOf(month: number): "winter" | "spring" | "autumn" | null {
  if (month === 11 || month <= 1) return "winter";
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 8 && month <= 10) return "autumn";
  return null;
}

export function Ambience() {
  // всплески искр от нажатий на кота: каждый живёт ~0,8 с и исчезает
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const burstId = useRef(0);
  // считается только в браузере: на сервере «сейчас» — это время
  // Vercel, а не посетителя, и разметка разошлась бы при гидратации
  const [season, setSeason] = useState<"winter" | "spring" | "autumn" | null>(null);

  useEffect(() => {
    setSeason(seasonOf(new Date().getMonth()));
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const root = document.documentElement;
    let frame = 0;

    // --- мышь: параллакс, световое пятно и магнит кнопок ---
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
        // позиция светового пятна — в пикселях окна
        root.style.setProperty("--a1-mx", `${event.clientX}px`);
        root.style.setProperty("--a1-my", `${event.clientY}px`);

        // магнит: кнопка тянется к курсору, пока он рядом
        const buttons = document.querySelectorAll<HTMLElement>("[data-magnet]");
        buttons.forEach((btn) => {
          const r = btn.getBoundingClientRect();
          const dx = event.clientX - (r.left + r.width / 2);
          const dy = event.clientY - (r.top + r.height / 2);
          const distance = Math.hypot(dx, dy);
          if (distance < MAGNET_RADIUS) {
            const pull = (1 - distance / MAGNET_RADIUS) * MAGNET_STRENGTH;
            btn.style.setProperty("--btn-x", `${(dx * pull).toFixed(1)}px`);
            btn.style.setProperty("--btn-y", `${(dy * pull).toFixed(1)}px`);
          } else {
            btn.style.removeProperty("--btn-x");
            btn.style.removeProperty("--btn-y");
          }
        });
      });
    }

    // --- нажатие по коту: он «подпрыгивает», из точки летят искры ---
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      // клики по кнопкам, ссылкам и меню — это не игра с котом
      if (target?.closest("a, button, [role='listbox']")) return;

      const wide = window.innerWidth > 900;
      const inCatArea = wide
        ? event.clientX > window.innerWidth * 0.5
        : event.clientY > window.innerHeight * 0.38;
      if (!inCatArea) return;

      // короткий «подскок» самой иллюстрации
      root.style.setProperty("--a1-pop", "1.014");
      window.setTimeout(() => root.style.setProperty("--a1-pop", "1"), 190);

      if (reduced.matches) return;
      const id = ++burstId.current;
      setBursts((list) => [...list, { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 850);
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    if (fine.matches && !reduced.matches) {
      window.addEventListener("mousemove", onMove, { passive: true });
    }

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--a1-px");
      root.style.removeProperty("--a1-py");
      root.style.removeProperty("--a1-mx");
      root.style.removeProperty("--a1-my");
      root.style.removeProperty("--a1-pop");
    };
  }, []);

  return (
    <>
      {/* световое пятно под курсором — отдельным фиксированным слоем,
          чтобы не зависеть от прокрутки и не мешать остальным слоям */}
      <div className={styles.spotlight} aria-hidden="true" />

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

        {/* сезонный слой: снег, пыльца или золотая пыль */}
        {season && (
          <div
            className={`${styles.season} ${
              season === "winter"
                ? styles.seasonWinter
                : season === "spring"
                  ? styles.seasonSpring
                  : styles.seasonAutumn
            }`}
          >
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} className={styles.seasonParticle} />
            ))}
          </div>
        )}

        {/* искры-светлячки, поднимающиеся снизу вверх */}
        <div className={styles.sparks}>
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i} className={styles.spark} />
          ))}
        </div>
      </div>

      {/* всплески от нажатий на кота */}
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={styles.burst}
          style={{ left: burst.x, top: burst.y }}
          aria-hidden="true"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={styles.burstSpark} />
          ))}
        </div>
      ))}
    </>
  );
}
