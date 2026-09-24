// lib/chat-markdown.ts
//
// 2026-09-24. Маленький markdown чатов — тот же, что понимает сервер
// (chat-server parseMessageInputText) и приложение (ChatMarkdown):
//
//   **жирный**   `код`   ||спойлер||   [слова](https://ссылка)
//   ```dart                > строка цитаты
//   блок кода              > ещё строка
//   ```
//
// Сервер разбирает его сам, когда сайт шлёт текст полем `message`.
// Здесь разбор нужен только для своего ещё не отправленного сообщения
// (пузырь «в пути»), чтобы оно сразу выглядело так же, как после
// ответа сервера, а не мигало звёздочками.
export type ChatEntity = {
  object: string;
  text?: string;
  url?: string;
  language?: string;
  entities?: ChatEntity[];
};

const FENCE = /```([A-Za-z0-9_+#.-]*)[ \t]*\n([\s\S]*?)\n?```/g;
const HAS_INLINE = /\*\*[^*]|`[^`\n]+`|\|\|[^|]|\[[^\]\n]+\]\([^)\s]+\)/;
const LINK = /^\[([^\]\n]+)\]\(([^)\s]+)\)/;

export function hasChatMarkup(text: string): boolean {
  return text.includes("```") || HAS_INLINE.test(text) || /^> /m.test(text);
}

/** Разметка -> сущности; null, если разметки нет (рисуем как текст). */
export function parseChatMarkdown(text: string): ChatEntity[] | null {
  if (!hasChatMarkup(text)) return null;
  const out: ChatEntity[] = [];
  let pos = 0;
  for (const m of text.matchAll(FENCE)) {
    quotesAndInline(text.slice(pos, m.index), out);
    out.push({ object: "entity-pre", language: m[1] ?? "", text: m[2] ?? "" });
    pos = (m.index ?? 0) + m[0].length;
  }
  quotesAndInline(text.slice(pos), out);
  return out.length ? out : null;
}

function isQuoteLine(l: string) {
  return l.startsWith("> ") || l === ">";
}

function quotesAndInline(chunk: string, out: ChatEntity[]) {
  if (!chunk) return;
  const lines = chunk.split("\n");
  let plain: string[] = [];
  const flush = () => {
    const t = plain.join("\n").replace(/^\n+|\n+$/g, "");
    plain = [];
    if (t) out.push(...parseInline(t));
  };
  let i = 0;
  while (i < lines.length) {
    if (isQuoteLine(lines[i]!)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && isQuoteLine(lines[i]!)) {
        const l = lines[i]!;
        q.push(l.length > 2 ? l.slice(2) : "");
        i++;
      }
      out.push({ object: "entity-blockquote", entities: parseInline(q.join("\n")) });
      continue;
    }
    plain.push(lines[i]!);
    i++;
  }
  flush();
}

function parseInline(s: string): ChatEntity[] {
  const out: ChatEntity[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ object: "entity-text", text: buf });
    buf = "";
  };
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("`", i)) {
      const end = s.indexOf("`", i + 1);
      if (end > i + 1 && !s.slice(i + 1, end).includes("\n")) {
        flush();
        out.push({ object: "entity-pre", language: "", text: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    } else if (s.startsWith("**", i)) {
      const end = s.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ object: "entity-bold", entities: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (s.startsWith("||", i)) {
      const end = s.indexOf("||", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ object: "entity-spoiler", entities: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (s[i] === "[") {
      const m = LINK.exec(s.slice(i));
      if (m) {
        flush();
        const url = /^https?:\/\//i.test(m[2]!) ? m[2]! : `https://${m[2]}`;
        out.push({ object: "entity-text-url", text: m[1], url });
        i += m[0].length;
        continue;
      }
    }
    buf += s[i];
    i++;
  }
  flush();
  return out;
}

function plainOf(nodes: ChatEntity[]): string {
  return nodes
    .map((e) => (e.entities ? plainOf(e.entities) : (e.text ?? "")))
    .join("");
}

/**
 * Тот ли это текст, что вернул сервер для нашего отправленного сообщения.
 * Сервер хранит разметку сущностями, и его плоский текст — «Хай», а мы
 * отправляли «> Хай» (или ```dart …```). Сравнение «как есть» не совпадало
 * никогда, и пузырь навсегда оставался с часиками. Сравниваем плоский
 * текст без разметки и без пробелов/переводов строк.
 */
export function sameChatText(serverPlain: string, sentRaw: string): boolean {
  if (serverPlain === sentRaw) return true;
  const squash = (s: string) => s.replace(/\s+/g, "");
  const parsed = parseChatMarkdown(sentRaw);
  const sentPlain = parsed ? plainOf(parsed) : sentRaw;
  return squash(serverPlain) === squash(sentPlain) || squash(serverPlain) === squash(sentRaw);
}
