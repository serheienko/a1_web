// lib/track.ts
//
// 11.10.2026. Отправка маячка со страницы (см. app/api/track/route.ts).
//
// sendBeacon именно потому, что добрая половина событий -- это уход со
// страницы: нажал «Відкрити вакансію» и ушёл на сайт компании. Обычный
// fetch в такой момент браузер вправе оборвать, а маячок он обязан
// доставить. Где sendBeacon нет -- обычный fetch с keepalive.
//
// Ничего не ломает и ничего не ждёт: любая ошибка глотается.

export type TrackEvent = "view" | "external" | "apply" | "claim_open" | "claim_sent" | "claim_done";

type UmamiData = Record<string, string | number | boolean>;
type UmamiWindow = Window & { umami?: { track: (name: string, data?: UmamiData) => void } };

/**
 * 14.10.2026 (Александр: «кто приходит, сколько остаётся, кто отваливается»). Событие в Umami --
 * нашей аналитике на Railway (скрипт подключён в app/layout.tsx). Из этих событий и адресов страниц
 * Umami строит воронку и удержание; часть цифр показывает окно «Метрики» в штабе.
 * Скрипт ещё не загрузился или заблокирован -- молча ничего не делаем.
 */
export function umamiEvent(name: string, data?: UmamiData): void {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track(name, data);
  } catch {
    // аналитика никогда не важнее страницы
  }
}

export function track(event: TrackEvent, what?: { company?: string | null; post?: string | null }): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ e: event, c: what?.company ?? "", p: what?.post ?? "" });
  // просмотр страницы Umami считает сам; остальное -- событием (отклик, переход, клейм)
  if (event !== "view") umamiEvent(event, { company: what?.company ?? "", post: what?.post ?? "" });
  try {
    if (navigator.sendBeacon?.("/api/track", body)) return;
  } catch {
    // ниже обычным запросом
  }
  try {
    void fetch("/api/track", { method: "POST", body, keepalive: true });
  } catch {
    // статистика никогда не важнее страницы
  }
}

/**
 * Просмотр страницы -- один раз на вкладку: перезагрузка и возврат
 * «назад» не должны накручивать счётчик.
 */
export function trackViewOnce(key: string, what: { company?: string | null; post?: string | null }): void {
  if (typeof window === "undefined") return;
  const mark = `a1_v_${key}`;
  try {
    if (window.sessionStorage.getItem(mark)) return;
    window.sessionStorage.setItem(mark, "1");
  } catch {
    // приватный режим: посчитаем ещё раз, не беда
  }
  track("view", what);
}
