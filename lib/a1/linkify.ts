// lib/a1/linkify.ts
//
// 2026-09-19 (Александр, скриншот вакансии DigitalArt): в блоке
// «Посилання» стояло «www.instagram.com», человек нажал и попал не на
// страницу компании, а на инстаграм вообще — «сначала немного
// конфьюзило». Причина простая: подпись бралась из поля title, которое
// у импортированных вакансий содержит только ХОСТ, без пути. Заодно
// вторая половина той же жалобы: ссылки внутри текста вакансии не
// нажимались вовсе.
//
// Здесь обе части: prettyUrl() делает из адреса читаемую подпись с
// путём, splitLinks() разбирает строку текста на куски «текст» и
// «ссылка», чтобы страница отрисовала настоящие <a>.
//
// Почему разбор строкой, а не dangerouslySetInnerHTML: текст вакансии
// приходит из внешнего источника (DOU) и его нельзя отдавать браузеру
// как разметку. React сам экранирует каждый кусок, и никакой чужой
// <script> в страницу не попадёт.

/** Хвостовая пунктуация, которая почти никогда не часть адреса. */
const TRAILING = /[.,;:!?»”"'’]+$/;

// Домены верхнего уровня, которые реально встречаются в вакансиях.
// Список, а не «любые буквы после точки», ровно по одной причине: в
// тексте полно слов с точкой, которые ссылками не являются — «Vue.js»,
// «Node.js», «версія 3.5», «readme.md». Список ошибается в безопасную
// сторону: незнакомый домен останется просто текстом, как было.
// Молдавский .md намеренно выкинут: «readme.md» в тексте вакансии
// встречается на порядок чаще, чем молдавский сайт.
const TLD =
  "ua|com|net|org|io|co|me|dev|app|ai|be|gg|tv|xyz|site|online|agency|studio|tech|pro|info|biz|" +
  "eu|pl|de|uk|us|ca|fr|es|it|nl|cz|sk|lv|lt|ee|kz|ge|tr|ch|at|se|no|fi|dk|pt|ro|bg|hu|gr|il|" +
  "in|sg|au|nz|jp|kr|cn|hk|ae|edu|gov|club|shop|store|space|team|group|solutions|digital|media|" +
  "design|cloud|systems|software|works|world|life|live|link|page|top|one|art";

// Три вида написания, как их пишут в вакансиях на DOU:
// https://…, голый www.…, и просто домен — «digitalart.ua»,
// «youtu.be/ATuzLj25bj4» (Александр, скриншот вакансии DigitalArt:
// именно так там записаны все три ссылки).
const URL_RE = new RegExp(
  "(https?://[^\\s<>\"']+" +
    "|www\\.[a-z0-9-]+(?:\\.[a-z0-9-]+)+[^\\s<>\"']*" +
    "|[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:" + TLD + ")(?:/[^\\s<>\"']*)?)",
  "gi",
);

// Символ перед адресом, после которого это НЕ начало ссылки: почта
// (hr@digitalart.ua) и середина более длинного слова.
const NOT_A_START = /[@\w.\-\/]/;

export type LinkPart =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string };

/**
 * Читаемая подпись адреса: без протокола, без www., без хвостового
 * слэша и обрезанная, чтобы не разорвать вёрстку на телефоне.
 * `https://www.instagram.com/digitalart.agency/` -> `instagram.com/digitalart.agency`
 */
export function prettyUrl(url: string, maxLen = 48): string {
  let s = url.trim().replace(/^https?:\/\//i, "");
  s = s.replace(/^www\./i, "");
  s = s.replace(/\/+$/, "");
  try {
    // Кириллический путь в адресной строке приходит процентами —
    // человеку это читать невозможно.
    s = decodeURI(s);
  } catch {
    // Битая последовательность процентов — оставляем как есть.
  }
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

/** Адрес для href: у голого www. протокола нет, браузеру он нужен. */
export function hrefOf(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/**
 * Подпись ссылки в блоке «Посилання». Если у ссылки есть осмысленный
 * заголовок — берём его; если заголовок это просто хост того же
 * адреса (так приходит с импорта), он бесполезен и даже вреден:
 * показываем адрес целиком.
 */
export function linkLabel(title: string | null | undefined, url: string): string {
  const t = (title ?? "").trim();
  if (!t) return prettyUrl(url);
  const pretty = prettyUrl(url, 1000);
  const host = pretty.split("/")[0] ?? "";
  const bare = t.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  if (bare.toLowerCase() === host.toLowerCase()) return prettyUrl(url);
  return t;
}

/**
 * Разбирает строку на куски текста и ссылок. Строка без ссылок
 * возвращается одним куском — вызывающему коду не нужно проверять
 * отдельно.
 */
export function splitLinks(line: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(line)) !== null) {
    const raw = m[0];
    // Точка в конце предложения не часть адреса; закрывающую скобку
    // отрезаем только если открывающей внутри адреса не было.
    let cut = raw.replace(TRAILING, "");
    if (cut.endsWith(")") && !cut.includes("(")) cut = cut.slice(0, -1);
    if (cut.length < 5) continue;
    const start = m.index;
    const before = start > 0 ? line[start - 1] ?? "" : "";
    if (before && NOT_A_START.test(before)) continue;
    if (start > last) parts.push({ kind: "text", value: line.slice(last, start) });
    parts.push({ kind: "link", href: hrefOf(cut), label: prettyUrl(cut) });
    last = start + cut.length;
  }
  if (last < line.length) parts.push({ kind: "text", value: line.slice(last) });
  return parts.length > 0 ? parts : [{ kind: "text", value: line }];
}
