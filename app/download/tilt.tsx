// app/download-new/tilt.tsx
//
// Aleksandr, 23.10.2026: параллакс на установочной странице. На компьютере
// фон уже едет за мышью (../download/ambience.tsx), а на телефоне мыши нет —
// поэтому здесь то же самое от наклона телефона (Android) и от движения пальца
// (все сенсорные устройства). Двигает те же переменные --a1-px / --a1-py,
// которые читает CSS фона, так что новых стилей не нужно.
//
// iOS спрашивает разрешение на датчики наклона отдельным окном — его мы
// не вызываем, чтобы не пугать посетителя. На iPhone работает только палец.
"use client";

import { useEffect } from "react";

const RANGE_PX = 12;

export function Tilt() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touch = window.matchMedia("(hover: none), (pointer: coarse)");
    if (reduced.matches || !touch.matches) return;

    const root = document.documentElement;
    let frame = 0;
    let px = 0;
    let py = 0;
    let finger = false;

    function apply() {
      frame = 0;
      root.style.setProperty("--a1-px", (px * RANGE_PX).toFixed(2));
      root.style.setProperty("--a1-py", (py * RANGE_PX).toFixed(2));
    }
    function push(x: number, y: number) {
      px = Math.max(-1, Math.min(1, x));
      py = Math.max(-1, Math.min(1, y));
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function onOrient(e: DeviceOrientationEvent) {
      if (finger || e.gamma == null || e.beta == null) return;
      // gamma — крен влево-вправо, beta — наклон «от себя»; 45° — привычное положение в руке
      push(e.gamma / 22, (e.beta - 45) / 22);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      finger = true;
      push((t.clientX / window.innerWidth - 0.5) * 2, (t.clientY / window.innerHeight - 0.5) * 2);
    }
    function onTouchEnd() {
      finger = false;
      push(0, 0);
    }

    window.addEventListener("deviceorientation", onOrient, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--a1-px");
      root.style.removeProperty("--a1-py");
    };
  }, []);

  return null;
}
