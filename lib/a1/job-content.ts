// lib/a1/job-content.ts
//
// 2026-09-14 (Александр, SEO-разбор). Текст вакансии выводился одним
// сплошным куском -- <div className="whitespace-pre-wrap">{post.contentText}</div>.
// Переносы строк там были, а СТРУКТУРЫ не было никакой: ни заголовков,
// ни списков, ни абзацев. Для читателя это стена текста, для поиска --
// страница, у которой весь текст чужой (приезжает с DOU) и ни одного
// признака, что мы с ним что-то сделали.
//
// Ссылку на первоисточник Александр ставить не хочет («если мы будем
// ссылаться на DOU, это полная сразу будет лажа»), значит единственный
// способ перестать выглядеть копией -- сделать страницу СОДЕРЖАТЕЛЬНЕЕ
// оригинала. Разметка -- самая дешёвая часть этого.
//
// ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ: попыток угадать «Обов'язки / Вимоги /
// Умови» и навесить эти ярлыки на текст. Во-первых, они на девяти
// языках, и любой словарь будет дырявым. Во-вторых, это было бы
// сочинение за автора: мы бы утверждали, что вот этот кусок -- про
// требования, не имея на то оснований. Вместо этого разбираем ТУ
// структуру, которую автор написал сам: строки-заголовки и маркеры
// списка у него уже есть, они просто не размечены.
//
// Разбор намеренно консервативный: если строка не похожа ни на
// заголовок, ни на пункт списка -- она остаётся обычным абзацем, ровно
// как раньше. Хуже, чем было, не станет ни на одной вакансии.

/** Маркеры пунктов списка, встречающиеся в реальных текстах с DOU. */
const BULLET_RE = /^[•‣▪●◦⁃∙*\-–—✔✅➤▸]+\s*/;
/** Нумерация: "1.", "2)", "3 -". */
const NUMBERED_RE = /^\d{1,2}[.)]\s+/;
/** Эмодзи/значок в начале строки-заголовка: «✅ Твої майбутні задачі:». */
const LEADING_MARK_RE = /^[^\p{L}\p{N}]+/u;

/** Строка-заголовок: короткая, заканчивается двоеточием. */
const HEADING_MAX_LEN = 120;

export type JobContentBlock =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; lines: string[] };

function isHeading(line: string): boolean {
  if (!line.endsWith(":")) return false;
  if (line.length > HEADING_MAX_LEN) return false;
  // «• :» и прочий мусор заголовком не считаем.
  return stripLeadingMark(line.slice(0, -1)).trim().length > 0;
}

function stripLeadingMark(line: string): string {
  return line.replace(LEADING_MARK_RE, "");
}

/**
 * null -- строка вообще не пункт списка.
 * "" -- пункт есть, но пустой: одинокий «•» без текста, такие в лентах
 * с DOU попадаются. Его надо выбросить целиком, а НЕ отдать дальше как
 * обычную строку, иначе в тексте останется висеть голый маркер
 * отдельным абзацем.
 */
function bulletBody(line: string): string | null {
  const m = BULLET_RE.exec(line) ?? NUMBERED_RE.exec(line);
  if (!m) return null;
  return line.slice(m[0].length).trim();
}

export function parseJobContent(text: string): JobContentBlock[] {
  const blocks: JobContentBlock[] = [];
  let list: string[] | null = null;
  let paragraph: string[] | null = null;

  const closeList = () => {
    if (list && list.length > 0) blocks.push({ type: "list", items: list });
    list = null;
  };
  const closeParagraph = () => {
    if (paragraph && paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();

    if (line === "") {
      // Пустая строка закрывает абзац, но НЕ список: в реальных текстах
      // пункты сплошь и рядом разделены пустой строкой, и разрывать
      // из-за этого <ul> на куски было бы неверно.
      closeParagraph();
      continue;
    }

    if (isHeading(line)) {
      closeList();
      closeParagraph();
      blocks.push({ type: "heading", text: stripLeadingMark(line.slice(0, -1)).trim() });
      continue;
    }

    const item = bulletBody(line);
    if (item !== null) {
      closeParagraph();
      if (item === "") continue; // пустой маркер -- см. bulletBody()
      if (!list) list = [];
      list.push(item);
      continue;
    }

    closeList();
    if (!paragraph) paragraph = [];
    paragraph.push(line);
  }

  closeList();
  closeParagraph();
  return blocks;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Тот же разбор, но строкой HTML -- для поля description в разметке
 * JobPosting (lib/seo/jsonld.ts). Google разрешает там HTML и прямо
 * пишет, что списки и заголовки помогают ему понять вакансию; раньше мы
 * отдавали туда плоскую простыню из <p>.
 */
export function jobContentToHtml(text: string): string {
  return parseJobContent(text)
    .map((block) => {
      if (block.type === "heading") return `<h3>${escapeHtml(block.text)}</h3>`;
      if (block.type === "list") {
        return `<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      }
      return `<p>${block.lines.map(escapeHtml).join("<br />")}</p>`;
    })
    .join("");
}
