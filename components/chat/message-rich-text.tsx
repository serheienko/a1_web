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

type RawEntity = {
  object?: unknown;
  text?: unknown;
  url?: unknown;
  entities?: unknown;
};

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

    case "entity-blockquote":
      return (
        <span className="my-1 block border-l-2 border-current/30 pl-2 opacity-90">
          {children ? renderList(children, key) : text}
        </span>
      );

    // Спойлер как интерактив («нажми, чтобы открыть») не делаем -- в
    // наших сообщениях он не встречается; показываем обычным текстом,
    // чтобы ничего не пропало.
    case "entity-spoiler":
      return children ? renderList(children, key) : text;

    case "entity-muted":
      return <span className="opacity-70">{children ? renderList(children, key) : text}</span>;

    // Цвет из entity-text-color намеренно игнорируем: он задан под
    // светлый фон приложения и на нашей синей плашке может стать
    // нечитаемым. Текст важнее цвета.
    case "entity-text-color":
      return children ? renderList(children, key) : text;

    case "entity-text-url":
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
      return <code className="rounded bg-black/10 px-1 py-0.5 text-[0.9em] dark:bg-white/10">{text}</code>;

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
}: {
  entities: unknown[] | null | undefined;
  fallback: string;
}) {
  if (!entities || entities.length === 0) return <>{fallback}</>;

  const rendered = renderList(entities, "e");
  const hasAnything = entities.some((node) => {
    const e = asEntity(node);
    if (!e) return false;
    const kind = kindOf(e);
    return kind === "entity-hr" || typeof e.text === "string" || Array.isArray(e.entities);
  });

  return hasAnything ? <>{rendered}</> : <>{fallback}</>;
}
