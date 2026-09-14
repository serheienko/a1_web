// lib/use-close-on-scroll.ts
//
// 2026-09-14 (Александр, скриншот страницы вакансии: «Убери "скасувати"
// и сделай чтобы модалка пряталась при скролле на мобиле»). У попапа
// «Увійдіть, щоб продовжити» убрана кнопка «Скасувати», и на телефоне
// закрыть его оставалось только тыком мимо окна -- жест, который на
// мобильном почти никто не делает. Прокрутка как способ закрыть -- это
// то, что палец делает сам собой.
//
// Только для тач-экранов (`pointer: coarse`). На десктопе колесо мыши
// крутят не глядя, и попап, исчезающий от случайного прокрута, читался
// бы как баг, а не как жест.
//
// Порог в 24px, а не любое движение: iOS Safari сам дёргает scrollY на
// пару пикселей, когда прячет/показывает свою панель адреса, и без
// порога попап закрывался бы сразу после открытия.
//
// ВАЖНО про `enabled`: вызывающий обязан выключать это, когда внутри
// попапа открыта форма входа. Мобильная клавиатура, поднимаясь,
// меняет высоту вьюпорта и порождает событие прокрутки -- окно с
// наполовину введённым email закрывалось бы само.
"use client";

import { useEffect, useRef } from "react";

const THRESHOLD_PX = 24;

export function useCloseOnScroll(enabled: boolean, onClose: () => void) {
  // Колбэк живёт в ref, чтобы новая его версия на каждом рендере не
  // перезапускала эффект -- иначе точка отсчёта startY сбрасывалась бы
  // постоянно и порог никогда бы не набирался.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;

    const startY = window.scrollY;
    const handle = () => {
      if (Math.abs(window.scrollY - startY) > THRESHOLD_PX) onCloseRef.current();
    };

    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [enabled]);
}
