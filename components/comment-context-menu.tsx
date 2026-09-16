"use client";

// components/comment-context-menu.tsx
//
// Меню комментария: реакции сверху, действия снизу. 2026-09-16, по
// скриншотам Александра из приложения.
//
// Набор пунктов взят не на глаз, а из кода приложения
// (lib/features/comments/presentation/view/comment_list_bubble.dart):
//   свой              -- Відповісти, Копіювати, Редагувати, Видалити
//   чужой             -- Відповісти, Копіювати, Поскаржитись, Заблокувати
//   чужой + моя вакансия -- добавляются Редагувати и Видалити
//
// Что из этого здесь есть и чего нет, и почему:
//   Відповісти, Копіювати, Редагувати, Видалити, реакции -- есть.
//   Цитата и полоска над полем ввода взяты один в один из чата
//   (ReplyComposeBar и MessageReplyQuote в
//   components/chat/message-actions-menu.tsx) -- своих не рисуем.
//   Відповісти -- нет: ответ хранится ссылкой на сообщение, и его надо
//     ещё уметь ПОКАЗАТЬ цитатой над текстом, иначе кнопка есть, а
//     результата не видно.
//   Поскаржитись -- нет, и не будет в этом виде: в приложении этот
//     пункт ничего не делает, его обработчик пустой
//     (styled_comments_modal_item.dart: `void _reportComment(...) {}`).
//     Рисовать кнопку-пустышку на сайте смысла нет.
//   Заблокувати -- нет: users.block существует, но блокировка человека
//     с публичной страницы вакансии -- отдельное решение, не правка
//     меню.
//
// Удаление в два шага, как в приложении: первое нажатие подменяет
// список одним красным подтверждением.

import { useEffect, useRef, useState } from "react";
import { REACTION_EMOJIS } from "@/components/chat/message-actions-menu";

// Ряд реакций -- ОДИН на весь сайт, из меню сообщения в чате. Свой
// список здесь уже успел разъехаться с чатовым (😄 вместо 😁), чего и
// следовало ожидать от двух копий.
export { REACTION_EMOJIS } from "@/components/chat/message-actions-menu";

type Action = {
  key: string;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onPick: () => void;
};

function Icon({ d }: { d: string[] }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function CommentContextMenu({
  anchorRect,
  canEdit,
  canDelete,
  myReaction,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onClose,
}: {
  anchorRect: DOMRect;
  canEdit: boolean;
  canDelete: boolean;
  myReaction: string | null;
  onReact: (emoticon: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Прокрутка закрывает меню: оно привязано к тому месту, где пузырь
    // был в момент открытия, и при прокрутке уехало бы от него.
    window.addEventListener("scroll", onClose, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose);
    };
  }, [onClose]);

  const actions: Action[] = confirmingDelete
    ? [
        {
          key: "delete-confirm",
          label: "Видалити",
          destructive: true,
          icon: <Icon d={["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"]} />,
          onPick: onDelete,
        },
      ]
    : [
        {
          key: "reply",
          label: "Відповісти",
          icon: <Icon d={["M9 14 4 9l5-5", "M4 9h10a6 6 0 0 1 6 6v5"]} />,
          onPick: onReply,
        },
        {
          key: "copy",
          label: "Копіювати",
          icon: <Icon d={["M9 9h10v10H9z", "M5 15V5h10"]} />,
          onPick: onCopy,
        },
        ...(canEdit
          ? [
              {
                key: "edit",
                label: "Редагувати",
                icon: <Icon d={["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"]} />,
                onPick: onEdit,
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                key: "delete",
                label: "Видалити",
                destructive: true,
                icon: <Icon d={["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"]} />,
                onPick: () => setConfirmingDelete(true),
              },
            ]
          : []),
      ];

  // Меню держится того места, где стоял пузырь. Реакции над ним,
  // действия под ним; если снизу не помещается -- поднимаем.
  const MENU_WIDTH = 220;
  const ROW_HEIGHT = 52;
  const estimatedHeight = actions.length * 46 + 12;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUp = spaceBelow < estimatedHeight + 24;

  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - MENU_WIDTH - 8);
  const rowTop = Math.max(8, anchorRect.top - ROW_HEIGHT - 8);
  const cardTop = openUp ? Math.max(8, rowTop - estimatedHeight - 8) : anchorRect.bottom + 8;

  return (
    <div
      className="fixed inset-0 z-50"
      // Клик по затемнению закрывает -- как в приложении.
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Строка реакций */}
      <div
        style={{ position: "fixed", top: rowTop, left, maxWidth: "calc(100vw - 16px)" }}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
      >
        {REACTION_EMOJIS.map((emoticon) => (
          <button
            key={emoticon}
            type="button"
            onClick={() => onReact(emoticon)}
            aria-label={emoticon}
            className={`rounded-full px-1 text-[20px] leading-none transition hover:scale-110 ${
              myReaction === emoticon ? "bg-accent/15" : ""
            }`}
          >
            {emoticon}
          </button>
        ))}
      </div>

      {/* Действия */}
      <div
        ref={cardRef}
        style={{ position: "fixed", top: cardTop, left, width: MENU_WIDTH }}
        onClick={(e) => e.stopPropagation()}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        {actions.map((action, i) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onPick}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
              i > 0 ? "border-t border-neutral-100 dark:border-neutral-800" : ""
            } ${action.destructive ? "text-red-500" : "text-neutral-900 dark:text-neutral-100"}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
