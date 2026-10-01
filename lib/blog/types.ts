// lib/blog/types.ts
//
// 01.10.2026. Статьи блога (/blog). Каждая статья -- один язык и один адрес
// (не девять языков в одном HTML, как у посадочных): статья про «зарплаты в
// IT» на украинском и её английский аналог для США -- РАЗНЫЕ тексты со своей
// спецификой (Александр: «разные статьи, отдельной спецификой»).
//
// Текст пишется обычными строками; внутри допустимы [ссылка](/путь) и
// **жирный**. Живые цифры подставляются блоками "data" из
// lib/a1/stats-index.ts -- статья не устаревает по числам.

export type DataBlockId =
  | "summary" // сводка: сколько всего вакансий, в Украине, в мире, Worldwide
  | "uk-levels" // Украина: junior/middle/senior/lead
  | "uk-format" // Украина: офис/гибрид/удалённо
  | "uk-cities" // Украина: топ городов
  | "uk-tech" // Украина: топ технологий
  | "world-tech" // мир: топ технологий
  | "world-countries" // мир: топ стран
  | "salary-by-tech" // зарплаты USD/год по технологиям
  | "country-summary" // страна: всего / удалённо / гибрид + медиана USD
  | "country-salary"
  | "country-levels"
  | "country-tech"
  | "country-cities"
  | "country-employers";

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "note"; text: string }
  | { t: "links"; title: string; links: { href: string; label: string }[] }
  | { t: "data"; id: DataBlockId; title?: string; caption?: string; cc?: string };

export type Article = {
  slug: string;
  lang: "uk" | "en";
  /** <title> без суффикса сайта. */
  title: string;
  description: string;
  h1: string;
  /** ISO-дата первой публикации и последней правки. */
  published: string;
  updated: string;
  /** Короткая подпись над заголовком (рубрика). */
  kicker: string;
  blocks: Block[];
  faq?: { q: string; a: string }[];
  /** slug'и связанных статей (того же языка). */
  related: string[];
};
