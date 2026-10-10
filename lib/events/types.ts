// lib/events/types.ts -- события раздела «Події» (jobs.a1appp.com/events).
//
// 11.10.2026 (Александр: «календарь IT-событий, как Upcoming Concerts в Apple Music»).
// События собирает Конкистадор (konk_events.py: confs.tech + календарь DOU) и сдаёт на
// сайт целиком (POST /api/events/ingest). Лежат в Vercel Blob одним файлом
// a1/events/all.json -- как новости, поэтому появляются без деплоя.
//
// Факты (название, даты, место, ссылка) -- общедоступные сведения; описание на каждое
// событие мы пишем сами (summary uk/en), чужие тексты не копируем.

export type EventFormat = "conference" | "meetup" | "workshop" | "course" | "other";

export type EventItem = {
  /** Часть адреса: /events/<slug>. Серия + год (+ месяц, если в году два издания). */
  slug: string;
  /** Вечная страница серии: /events/series/<series>. Не меняется от издания к изданию. */
  series: string;
  seriesName: string;
  name: string;
  /** Официальный сайт события (куда ведёт кнопка «зареєструватись»). */
  url: string;
  source: "confs.tech" | "dou.ua";
  sourceUrl: string;
  /** YYYY-MM-DD */
  start: string;
  end: string;
  /** Город как есть ("Berlin", "Київ"); пусто для онлайна. */
  city: string;
  /** Страна по-английски ("Germany", "Ukraine"); пусто, если неизвестна/онлайн. */
  country: string;
  online: boolean;
  format: EventFormat;
  /** Ярлыки: тема + технологии ("DevOps", "Kubernetes", "AI"). Слаг считается на сайте. */
  tags: string[];
  /** Цена как текст ("від 700 грн", "Free"); пусто -- неизвестна. */
  price?: string;
  free?: boolean;
  /** Обложка: og:image страницы события (подгружается с сайта организатора). */
  image?: string;
  /** Приём докладов (CFP). */
  cfpUrl?: string;
  cfpEnd?: string;
  /** Языки программы ("EN", "UK"). */
  locales?: string;
  summary: { uk: string; en: string };
  updated: string;
};

export type EventsFile = { v: 1; updated: string; events: EventItem[] };

export type EvLang = "uk" | "en";
