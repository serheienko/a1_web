// lib/use-backdrop-dismiss.ts
//
// Александр, 17.09.2026 (видео с телефона, потом ещё скриншот с профиля:
// «Тут тоже. Много где»): в попапе «Увійдіть, щоб продовжити» тап по
// синей кнопке не срабатывал -- окно просто закрывалось.
//
// Причина -- общая для всех оверлеев, у которых закрытие висит на
// onClick подложки: браузер отдаёт клик той цели, на которой жест
// ЗАКОНЧИЛСЯ. На телефоне палец почти всегда чуть сдвигается, и связка
// «нажал на кнопке -- отпустил на подложке» достаётся подложке. Она
// закрывается, обработчик кнопки не вызывается вообще.
//
// Лечение: закрывать, только если жест и НАЧАЛСЯ, и закончился на самой
// подложке. Где начался -- знает один общий слушатель на окне (фаза
// перехвата, поэтому его не отменить остановкой всплытия внутри окна).
//
// Это НЕ хук: его зовут прямо в разметке, в том числе внутри условных
// блоков `{open && (...)}`, а хук в таком месте нарушил бы порядок
// хуков. Состояние поэтому одно на модуль -- жест в любой момент
// времени ровно один.
"use client";

import type { MouseEvent as ReactMouseEvent } from "react";

let gestureStartTarget: EventTarget | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (event) => {
      gestureStartTarget = event.target;
    },
    true,
  );
}

/**
 * Клик пришёлся в «пустоту» вокруг окна, а не в само окно.
 *
 * Обычно пустота -- это сам слой-обёртка (`event.currentTarget`). Но у
 * части модалок поверх обёртки лежит ОТДЕЛЬНЫЙ затемняющий слой
 * (`absolute inset-0 bg-black/50`), и тогда клик по затемнению достаётся
 * ему, а не обёртке. Раньше такие окна по клику мимо не закрывались
 * вовсе -- Александр, 18.09.2026: «Сделай чтобы любым кликом вне окна
 * окно закрывалось». Поэтому затемняющий слой помечается атрибутом
 * `data-backdrop` и считается такой же пустотой.
 */
function isOutsideWindow(node: EventTarget | null, overlay: Element): boolean {
  if (node === overlay) return true;
  if (!(node instanceof Node)) return false;
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return false;
  const backdrop = element.closest("[data-backdrop]");
  return backdrop !== null && overlay.contains(backdrop);
}

/**
 * Пропсы для div-подложки оверлея.
 *
 * `onClose === undefined` -- закрытие временно запрещено (например идёт
 * отправка); тогда не делаем ничего.
 */
export function backdropDismiss(onClose: (() => void) | undefined) {
  return {
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (!onClose) return;
      const overlay = event.currentTarget;
      if (!isOutsideWindow(event.target, overlay)) return;
      if (!isOutsideWindow(gestureStartTarget, overlay)) return;
      onClose();
    },
  };
}
