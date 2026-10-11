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

export function track(event: TrackEvent, what?: { company?: string | null; post?: string | null }): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ e: event, c: what?.company ?? "", p: what?.post ?? "" });
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
