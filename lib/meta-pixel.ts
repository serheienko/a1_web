// lib/meta-pixel.ts
//
// 03.10.2026: пиксель Meta (Facebook/Instagram) для рекламы A1.
// Набор данных «A1 Jobs Web» в портфеле A One Soft Dev. Номер пикселя
// не секрет — он всё равно виден в коде любой страницы, поэтому лежит
// прямо здесь, а не в переменных Railway.
//
// Что отправляем:
//   PageView             — каждый заход и каждый переход по сайту
//   CompleteRegistration — регистрация по почте прошла успешно
//   Lead                 — нажатие «Скачать» в App Store / Google Play
// По ним Facebook учится показывать рекламу тем, кто дойдёт до дела.

export const META_PIXEL_ID = "1138698498664927";

type Fbq = (...args: unknown[]) => void;

/** Отправить событие в пиксель. Если пиксель не загрузился
 *  (блокировщик рекламы и т.п.) — молча ничего не делает. */
export function fbqTrack(event: string, params?: Record<string, unknown>): void {
  try {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (typeof fbq !== "function") return;
    if (params) fbq("track", event, params);
    else fbq("track", event);
  } catch {
    // реклама — вещь необязательная, сайт важнее
  }
}
