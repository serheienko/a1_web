// components/chat/message-rich-text.tsx
//
// Разметка внутри сообщения: жирный текст, ссылки, разделительная
// линия, цитаты.
//
// Александр, 18.09.2026 (скриншот отклика в веб-чате): «Application
// прилетает в неправильном виде... Видишь, сверху эмодзи, заголовок и
// тд». Сообщение об отклике бэкенд собирает деревом: шапка
// «📩 Application (вакансия)» и строки «1. Вопрос?» лежат внутри
// entity-bold, ссылка на вакансию -- entity-text-url, под шапкой
// entity-hr. Веб рисовал только плоский текст, поэтому от отклика
// оставались голые ответы «👉 ...».
//
// Здесь -- ровно отрисовка. Разбор в плоскую строку (для списка чатов,
// пересылки, копирования, цитаты ответа) живёт в lib/a1/chat-schemas.ts
// (entityPlainText) и должен давать тот же текст, что виден глазами.
import { Fragment, type ReactNode } from "react";
import { CodeBlock, HiddenLink, InlineCode, Quote, Spoiler, richToneClass, type RichTone } from "@/components/chat/rich-blocks";

type RawEntity = {
  object?: unknown;
  text?: unknown;
  url?: unknown;
  language?: unknown;
  entities?: unknown;
};

/** Код-блок: с языком или с переносом строки; иначе это код в строке. */
function isCodeBlock(e: RawEntity): boolean {
  if (kindOf(e) !== "entity-pre") return false;
  const lang = typeof e.language === "string" ? e.language : "";
  const text = typeof e.text === "string" ? e.text : "";
  return lang.length > 0 || text.includes("\n");
}

function isBlock(e: RawEntity | null): boolean {
  return !!e && (isCodeBlock(e) || kindOf(e) === "entity-blockquote");
}

function asEntity(node: unknown): RawEntity | null {
  return node && typeof node === "object" ? (node as RawEntity) : null;
}

function kindOf(e: RawEntity): string {
  return typeof e.object === "string" ? e.object : "";
}

function renderList(nodes: unknown[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => (
    <Fragment key={`${keyPrefix}.${i}`}>{renderNode(node, `${keyPrefix}.${i}`)}</Fragment>
  ));
}

function renderNode(node: unknown, key: string): ReactNode {
  const e = asEntity(node);
  if (!e) return null;
  const kind = kindOf(e);
  const text = typeof e.text === "string" ? e.text : "";
  const children = Array.isArray(e.entities) ? e.entities : null;

  switch (kind) {
    case "entity-text":
      return text;

    case "entity-bold":
      return <strong className="font-semibold">{children ? renderList(children, key) : text}</strong>;

    // 2026-09-24: цитата, спойлер и код — как в Telegram (см.
    // components/chat/rich-blocks.tsx).
    case "entity-blockquote":
      return <Quote>{children ? renderList(children, key) : text}</Quote>;

    case "entity-spoiler":
      return <Spoiler>{children ? renderList(children, key) : text}</Spoiler>;

    case "entity-muted":
      return <span className="opacity-70">{children ? renderList(children, key) : text}</span>;

    // Цвет из entity-text-color намеренно игнорируем: он задан под
    // светлый фон приложения и на нашей синей плашке может стать
    // нечитаемым. Текст важнее цвета.
    case "entity-text-color":
      return children ? renderList(children, key) : text;

    case "entity-text-url": {
      const href = typeof e.url === "string" && e.url ? e.url : text;
      if (!href) return text;
      return (
        <HiddenLink href={href} label={text}>
          {text || href}
        </HiddenLink>
      );
    }

    case "entity-url": {
      const href = typeof e.url === "string" && e.url ? e.url : text;
      if (!href) return text;
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2"
          onClick={(event) => event.stopPropagation()}
        >
          {text || href}
        </a>
      );
    }

    case "entity-phone":
      return (
        <a
          href={`tel:${text.replace(/[^\d+]/g, "")}`}
          className="underline underline-offset-2"
          onClick={(event) => event.stopPropagation()}
        >
          {text}
        </a>
      );

    case "entity-mention":
      return <span className="font-medium">{text}</span>;

    case "entity-pre":
      return isCodeBlock(e) ? (
        <CodeBlock code={text} language={typeof e.language === "string" ? e.language : null} />
      ) : (
        <InlineCode text={text} />
      );

    case "entity-hr":
      return <span className="my-1.5 block h-px bg-current opacity-25" />;

    default:
      // Нетекстовые сущности (entity-calculation и всё, что появится
      // позже) рисуются своими карточками выше по дереву -- здесь они
      // молча пропускаются, а не ломают сообщение.
      return null;
  }
}

/**
 * Текст сообщения с разметкой.
 *
 * `entities` -- как их прислал бэкенд. Если их нет (своё ещё не
 * отправленное сообщение) или в них не оказалось ничего текстового --
 * показываем `fallback`, то есть ровно ту же плоскую строку, что и
 * раньше.
 */
export function MessageRichText({
  entities,
  fallback,
  tone = "theirs",
}: {
  entities: unknown[] | null | undefined;
  fallback: string;
  /** Свой (синий) пузырь или чужой — для цветов кода, цитат, спойлеров. */
  tone?: RichTone;
}) {
  if (!entities || entities.length === 0) return <>{fallback}</>;

  const rendered = renderList(trimAroundBlocks(entities), "e");
  const hasAnything = entities.some((node) => {
    const e = asEntity(node);
    if (!e) return false;
    const kind = kindOf(e);
    return kind === "entity-hr" || typeof e.text === "string" || Array.isArray(e.entities);
  });

  if (!hasAnything) return <>{fallback}</>;
  return <span className={`block ${richToneClass(tone)}`}>{rendered}</span>;
}

/**
 * Код и цитаты — отдельные блоки, поэтому пустые строки вокруг них
 * (сервер кладёт между абзацами «\n\n») только раздувают пузырь.
 * Также убираем копии ссылок, которые старые сообщения из приложения
 * добавляли отдельными entity-url рядом с полным текстом.
 */
function trimAroundBlocks(entities: unknown[]): unknown[] {
  const texts = entities
    .map(asEntity)
    .filter((e): e is RawEntity => !!e && kindOf(e) === "entity-text")
    .map((e) => (typeof e.text === "string" ? e.text : ""))
    .join("\n");
  const items = entities.filter((n) => {
    const e = asEntity(n);
    if (!e || kindOf(e) !== "entity-url") return true;
    const t = typeof e.text === "string" ? e.text : "";
    return !(t && texts.includes(t));
  });
  const out: unknown[] = [];
  items.forEach((node, i) => {
    const e = asEntity(node);
    if (!e || kindOf(e) !== "entity-text" || typeof e.text !== "string") {
      out.push(node);
      return;
    }
    let t = e.text;
    if (isBlock(asEntity(items[i - 1])) || i === 0) t = t.replace(/^\n+/, "");
    if (isBlock(asEntity(items[i + 1])) || i === items.length - 1) t = t.replace(/\n+$/, "");
    if (t) out.push({ ...e, text: t });
  });
  return out;
}
