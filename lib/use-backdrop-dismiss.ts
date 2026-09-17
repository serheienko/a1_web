// lib/use-backdrop-dismiss.ts
//
// Александр, 17.09.2026 (видео с телефона): «Увійти не нажимается» --
// в попапе «Увійдіть, щоб відгукнутися» тап по синей кнопке не
// срабатывал, попап просто закрывался.
//
// Причина -- обычная для оверлеев с `onClick` на подложке: браузер
// считает кликом ту цель, на которой ЗАКОНЧИЛСЯ жест. На телефоне палец
// почти всегда чуть сдвигается, и связка «нажал на кнопке -- отпустил на
// подложке» (или наоборот) отдаёт клик подложке. Подложка закрывается,
// обработчик кнопки не вызывается никогда.
//
// Лечится тем, что закрытие требует ОБА события на самой подложке:
// и нажатие, и отпускание. Тогда честный тык мимо окна закрывает, а
// смазанный тап по кнопке -- нет.
"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";

export function useBackdropDismiss(onClose: () => void) {
  const startedOnBackdrop = useRef(false);

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      startedOnBackdrop.current = event.target === event.currentTarget;
    },
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (!startedOnBackdrop.current) return;
      if (event.target !== event.currentTarget) return;
      onClose();
    },
  };
}
