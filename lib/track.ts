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
//
// 16.10.2026. Раньше часть событий (регистрация, «скачать», «Перші 250»)
// уходила ВТОРЫМ адресом -- в Umami, нашу аналитику на Railway. Umami
// выключили: она стоила около четырёх долларов в месяц одной только
// памятью, а посещаемость теперь бесплатно считает Cloudflare (маячок
// подключён в app/layout.tsx). Поэтому все события идут в одно место --
// в наш собственный счётчик, из которого их читает окно «Метрики» в
// штабе. Cloudflare своих событий не знает и знать не может: он видит
// запросы, а не то, что человек нажал.

export type TrackEvent =
  | "view"
  | "external"
  | "apply"
  | "claim_open"
  | "claim_sent"
  | "claim_done"
  | "signup"
  | "signin"
  | "download_click"
  | "first250_claim";

function send(body: string): void {
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

/** Событие без привязки к компании и вакансии: регистрация, вход, «скачать», «Перші 250». */
export function siteEvent(name: TrackEvent): void {
  if (typeof window === "undefined") return;
  send(JSON.stringify({ e: name, c: "", p: "" }));
}

export function track(event: TrackEvent, what?: { company?: string | null; post?: string | null }): void {
  if (typeof window === "undefined") return;
  send(JSON.stringify({ e: event, c: what?.company ?? "", p: what?.post ?? "" }));
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
