"use client";

// 01.10.2026 (Александр, скриншот: тег «Без досвіду» выбран, но ряд чипов
// листается вбок и выбранный тег может оказаться за краем экрана --
// «показывай выбранный тег на экране, не прячь»).
// Невидимый маркер внутри <nav>: после отрисовки находит чип с
// aria-current и прокручивает ряд так, чтобы выбранный чип встал по
// центру. Прокручиваем только сам ряд (scrollLeft), страницу не трогаем.

import { useEffect, useRef } from "react";

export function ScrollActiveChip() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const nav = ref.current?.closest("nav");
    const chip = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !chip) return;
    const center = () => {
      const navBox = nav.getBoundingClientRect();
      const chipBox = chip.getBoundingClientRect();
      const target = nav.scrollLeft + (chipBox.left - navBox.left) - (navBox.width - chipBox.width) / 2;
      nav.scrollLeft = Math.max(0, target);
    };
    center();
    // шрифты и картинки могут сдвинуть раскладку -- повторяем один раз после загрузки
    const t = window.setTimeout(center, 300);
    return () => window.clearTimeout(t);
  }, []);
  return <span ref={ref} aria-hidden="true" className="hidden" />;
}
