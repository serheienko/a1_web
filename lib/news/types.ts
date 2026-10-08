// lib/news/types.ts
//
// 08.10.2026. Раздел «IT новини» (/news). Александр: «приносить реально
// интересные новости, переписывать нашим языком, максимально заряженная
// страница под SEO, графики и анимации там, где есть цифры».
//
// Как устроено. Одна новость = ДВЕ страницы (украинская и английская), у
// каждой свой адрес и поле `alt` -- slug версии на другом языке. По `alt`
// строится hreflang (uk <-> en) и переключатель «Read in English».
//
// Правило честности (то, что отличает новость от «масового переписування»):
// в `facts` попадают только цифры из первоисточника (`source`), каждый блок
// со своими числами подписан источником; наше мнение вынесено в отдельный
// раздел и помечено как мнение редакции; живые цифры -- из нашей базы
// вакансий (блок "live"), а не придуманные.

export type NewsLang = "uk" | "en";

export type StatItem = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

export type NewsBlock =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "note"; text: string }
  | { t: "stats"; items: StatItem[] }
  | {
      t: "experts"; // «1 трлн, но работают 52 млрд»: сетка точек, 52 из 1000 загораются
      title: string;
      caption: string;
      total: number;
      active: number;
      totalLabel: string;
      activeLabel: string;
    }
  | {
      t: "scores"; // столбики оценок (шкала min..max), подсвеченный -- герой новости
      title: string;
      caption: string;
      min: number;
      max: number;
      rows: { label: string; value: number; hl?: boolean }[];
      source: string;
    }
  | {
      t: "price"; // калькулятор: сколько стоит N млн токенов
      title: string;
      caption: string;
      input: number;
      output: number;
      labels: { input: string; output: string; total: string; unit: string; perMillion: string };
    }
  | {
      t: "sizes"; // калькулятор «скільки важитиме після»: вага до, діапазон економії з джерела
      title: string;
      caption: string;
      start: number; // стартове значення слайдера
      max: number;
      unit: string; // "МБ" / "MB"
      lowPct: number; // мінімальна економія, % (з джерела)
      highPct: number; // максимальна економія, % (з джерела)
      labels: { before: string; after: string; slider: string; range: string; disclaimer: string };
    }
  | { t: "live"; title: string; caption: string }
  | { t: "links"; title: string; links: { href: string; label: string }[] };

export type NewsArticle = {
  slug: string;
  lang: NewsLang;
  /** slug версии на другом языке (для hreflang). */
  alt: string;
  title: string;
  description: string;
  h1: string;
  kicker: string;
  published: string;
  updated: string;
  /** «Коротко» -- 3 пункта над текстом. */
  summary: string[];
  /** Теги = технологии (для связки с вакансиями и поиска похожих новостей). */
  tags: string[];
  source: { name: string; url: string; title: string; accessed: string };
  /** Миниатюра для списка: главная цифра новости + узор. Агент заполняет сам. */
  thumb: { motif: "dots" | "bars"; big: string; small: string };
  blocks: NewsBlock[];
  faq: { q: string; a: string }[];
  /** slug'и связанных новостей (того же языка). */
  related: string[];
};
