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

// ──────────────────────────── откуда пришёл ────────────────────────────
//
// 22.10.2026 (Александр: «acquisition и attribution нету никакого»). К
// каждому событию добавляется ярлык канала: «google», «telegram»,
// «direct». Без него счётчик отвечает «сколько», но не отвечает «откуда»,
// а значит ни один канал нельзя признать работающим или мёртвым.
//
// Канал определяется ОДИН раз за вкладку и дальше живёт в sessionStorage:
// иначе переход внутри сайта переписал бы метку на «пришёл с a1appp.com»,
// и всё превратилось бы в «direct».
//
// Хранится только ярлык -- одно слово, одинаковое у всех, кто вошёл в ту
// же дверь. Ни адреса страницы, с которой пришли, ни чего-либо про
// человека здесь нет и не будет.

const SOURCE_KEY = "a1_src";

/** Хост источника -> ярлык. Первое совпадение выигрывает. */
const CHANNELS: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\./, "bing"],
  [/(^|\.)duckduckgo\./, "duckduckgo"],
  [/(^|\.)(t\.me|telegram\.(org|me))$/, "telegram"],
  [/(^|\.)(facebook\.com|fb\.me)$/, "facebook"],
  [/(^|\.)instagram\./, "instagram"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "x"],
  [/(^|\.)reddit\./, "reddit"],
  [/(^|\.)youtube\./, "youtube"],
  [/(^|\.)github\./, "github"],
  [/(^|\.)dou\.ua$/, "dou"],
  [/(^|\.)djinni\./, "djinni"],
  [/(^|\.)work\.ua$/, "work-ua"],
  [/(^|\.)robota\.ua$/, "robota-ua"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, "chatgpt"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/(^|\.)perplexity\./, "perplexity"],
];

function tidy(raw: string): string {
  const v = raw.trim().toLowerCase().slice(0, 24);
  return /^[a-z0-9][a-z0-9-]*$/.test(v) ? v : "";
}

function detectSource(): string {
  // Метка в ссылке сильнее реферера: её ставим мы сами, когда публикуем
  // ссылку в канале, и ради неё вся затея.
  try {
    const q = new URLSearchParams(window.location.search);
    const tagged = tidy(q.get("utm_source") ?? q.get("s") ?? "");
    if (tagged) return tagged;
  } catch {
    // адрес без параметров -- не беда
  }
  const ref = document.referrer;
  if (!ref) return "direct";
  let host = "";
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    return "other";
  }
  // Переход внутри сайта, а метки в памяти нет: значит вкладка не помнит
  // начала пути. Честнее не записать ничего, чем записать «direct» --
  // «direct» означает «пришёл напрямую», а мы просто не знаем.
  if (host === "a1appp.com" || host.endsWith(".a1appp.com")) return "";
  for (const [rx, label] of CHANNELS) if (rx.test(host)) return label;
  return "other";
}

/** Ярлык канала этой вкладки. Пустая строка -- не знаем, строку не пишем. */
export function currentSource(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.sessionStorage.getItem(SOURCE_KEY);
    if (saved) return saved;
  } catch {
    // приватный режим: определим заново на каждом событии, не беда
  }
  const found = detectSource();
  if (found) {
    try {
      window.sessionStorage.setItem(SOURCE_KEY, found);
    } catch {
      // см. выше
    }
  }
  return found;
}

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
  send(JSON.stringify({ e: name, c: "", p: "", s: currentSource() }));
}

export function track(event: TrackEvent, what?: { company?: string | null; post?: string | null }): void {
  if (typeof window === "undefined") return;
  send(JSON.stringify({ e: event, c: what?.company ?? "", p: what?.post ?? "", s: currentSource() }));
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
