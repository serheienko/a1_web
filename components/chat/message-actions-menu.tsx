// components/chat/message-actions-menu.tsx
//
// Reply feature (Aleksandr, live UI reference: a Telegram-style message
// context menu -- reaction row + Reply/Copy/Edit/Remind/Forward/Delete/
// Select -- opened, on his own reasoning, by a plain single click/tap
// rather than a swipe or right-click: "наверное в вебе это ещё не
// получится... поэтому лучше просто один типа клик открывает модальное
// Cupertino окно"). Explicitly scoped by him: "в котором у нас сейчас
// будет всё placeholder, из того, что я скидываю, кроме кнопки Reply" --
// every row except Reply below is a visual-only no-op (just closes the
// menu), including the reaction pill row up top. Also explicitly fixed
// from his own reference screenshot's layout: "иконки должны быть
// слева и текст от них справа, а не наоборот" -- icon-then-label, not
// label-then-icon, on every row.
//
// Positioned as a fixed-viewport popup (not `absolute` in the message
// list's own scroll flow, unlike the pending-bubble retry/cancel
// popover in app/chats/[chatId]/page.tsx) so it always renders next to
// wherever the tapped bubble actually is on screen, then flips to
// whichever side (above/below the bubble) has more room -- same
// "there's no guaranteed space on one fixed side" problem PLAN.md
// 6.153 already hit for that other popover, solved the same way.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { T, type Locale } from "@/components/t";

const MENU_WIDTH = 240;
const VIEWPORT_MARGIN = 10;
const REACTION_EMOJIS = ["👍", "👎", "❤️", "🔥", "🥰", "👏", "😄"];

type IconProps = { className?: string };

function ReplyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h10a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function EditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function RemindIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ForwardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H10a5 5 0 0 0-5 5v1" />
    </svg>
  );
}

function DeleteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SelectIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

type ActionKey = "reply" | "copy" | "edit" | "remind" | "forward" | "delete" | "select";

type ActionRow = {
  key: ActionKey;
  icon: (p: IconProps) => ReactNode;
  label: Record<Locale, string>;
  destructive?: boolean;
  group: "main" | "select";
};

const ACTION_ROWS: ActionRow[] = [
  {
    key: "reply",
    icon: ReplyIcon,
    group: "main",
    label: { uk: "Відповісти", en: "Reply", ru: "Ответить", de: "Antworten", es: "Responder", fr: "Répondre", pl: "Odpowiedz", ptBR: "Responder", zh: "回复" },
  },
  {
    key: "copy",
    icon: CopyIcon,
    group: "main",
    label: { uk: "Скопіювати", en: "Copy", ru: "Скопировать", de: "Kopieren", es: "Copiar", fr: "Copier", pl: "Kopiuj", ptBR: "Copiar", zh: "复制" },
  },
  {
    key: "edit",
    icon: EditIcon,
    group: "main",
    label: { uk: "Редагувати", en: "Edit", ru: "Редактировать", de: "Bearbeiten", es: "Editar", fr: "Modifier", pl: "Edytuj", ptBR: "Editar", zh: "编辑" },
  },
  {
    key: "remind",
    icon: RemindIcon,
    group: "main",
    label: { uk: "Нагадати", en: "Remind", ru: "Напомнить", de: "Erinnern", es: "Recordar", fr: "Rappeler", pl: "Przypomnij", ptBR: "Lembrar", zh: "提醒" },
  },
  {
    key: "forward",
    icon: ForwardIcon,
    group: "main",
    label: { uk: "Переслати", en: "Forward", ru: "Переслать", de: "Weiterleiten", es: "Reenviar", fr: "Transférer", pl: "Prześlij dalej", ptBR: "Encaminhar", zh: "转发" },
  },
  {
    key: "delete",
    icon: DeleteIcon,
    group: "main",
    destructive: true,
    label: { uk: "Видалити", en: "Delete", ru: "Удалить", de: "Löschen", es: "Eliminar", fr: "Supprimer", pl: "Usuń", ptBR: "Excluir", zh: "删除" },
  },
  {
    key: "select",
    icon: SelectIcon,
    group: "select",
    label: { uk: "Вибрати", en: "Select", ru: "Выбрать", de: "Auswählen", es: "Seleccionar", fr: "Sélectionner", pl: "Wybierz", ptBR: "Selecionar", zh: "选择" },
  },
];

export function MessageActionsMenu({
  anchorRect,
  mine,
  lang,
  onClose,
  onReply,
}: {
  anchorRect: DOMRect;
  mine: boolean;
  lang: Locale;
  onClose: () => void;
  onReply: () => void;
}) {
  // 2026-09-05: computed once on mount (anchorRect is a frozen snapshot
  // from the click that opened this, not a live-tracked element -- if
  // the message list scrolls while this is open the menu just stays
  // put, same behavior every other portaled popover on this page
  // already has, e.g. the photo-viewer overlay).
  const [placement, setPlacement] = useState<{ left: number; openAbove: boolean } | null>(null);

  useEffect(() => {
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const openAbove = spaceAbove > spaceBelow;
    const idealLeft = mine ? anchorRect.right - MENU_WIDTH : anchorRect.left;
    const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);
    setPlacement({ left, openAbove });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  function select(key: ActionKey) {
    // Every row except Reply is a visual-only placeholder for now (see
    // this file's own header comment) -- close the menu, nothing else.
    if (key === "reply") onReply();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="animate-backdrop-in absolute inset-0 bg-black/20 backdrop-blur-[1px] dark:bg-black/40" onClick={onClose} />
      {placement && (
        <div
          className={`absolute flex w-[240px] flex-col gap-2 ${placement.openAbove ? "animate-popover-up" : "animate-popover-down"}`}
          style={{
            left: placement.left,
            ...(placement.openAbove
              ? { bottom: window.innerHeight - anchorRect.top + 8 }
              : { top: anchorRect.bottom + 8 }),
          }}
        >
          {/* Reaction quick-bar -- placeholder, see header comment. */}
          <div className="flex items-center gap-1 self-start rounded-full bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
            {REACTION_EMOJIS.map((emoji) => (
              <button key={emoji} type="button" onClick={onClose} className="rounded-full p-1 text-[19px] leading-none transition hover:scale-110">
                {emoji}
              </button>
            ))}
            <button type="button" onClick={onClose} aria-label="More" className="rounded-full p-1 text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
            {ACTION_ROWS.filter((r) => r.group === "main").map((row, i, arr) => (
              <button
                key={row.key}
                type="button"
                onClick={() => select(row.key)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition hover:bg-black/5 dark:hover:bg-white/10 ${
                  row.destructive ? "text-[#ff3b30]" : "text-[#262a34] dark:text-white"
                } ${i < arr.length - 1 ? "border-b border-black/5 dark:border-white/10" : ""}`}
              >
                {/* Icon LEFT, label RIGHT -- see this file's own header
                    comment on why (Aleksandr's reference had them
                    reversed). */}
                <row.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                  <T
                    uk={row.label.uk} en={row.label.en} ru={row.label.ru} de={row.label.de} es={row.label.es}
                    fr={row.label.fr} pl={row.label.pl} ptBR={row.label.ptBR} zh={row.label.zh}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
            {ACTION_ROWS.filter((r) => r.group === "select").map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => select(row.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              >
                <row.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                  <T
                    uk={row.label.uk} en={row.label.en} ru={row.label.ru} de={row.label.de} es={row.label.es}
                    fr={row.label.fr} pl={row.label.pl} ptBR={row.label.ptBR} zh={row.label.zh}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Reply chrome -- the compose-bar accessory row ("Reply to X") and the
// compact quoted block a sent/received bubble shows above its own text
// once it carries a replyTo. Both mirror the mobile app's own
// SelectedReplyMessageItem / ReplyItem (read directly off its source,
// not guessed): left accent bar, author name in the accent color,
// preview text/kind label below it in the normal text color.
// ---------------------------------------------------------------------------

export function ReplyComposeBar({
  authorLabel,
  previewText,
  onRemove,
}: {
  authorLabel: string;
  previewText: ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[470px] items-center gap-2 rounded-[16px] border border-neutral-200 bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
      <div className="h-8 w-[3px] shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
          <T uk={`Відповідь ${authorLabel}`} en={`Reply to ${authorLabel}`} ru={`Ответ ${authorLabel}`} de={`Antwort an ${authorLabel}`}
             es={`Responder a ${authorLabel}`} fr={`Répondre à ${authorLabel}`} pl={`Odpowiedź ${authorLabel}`}
             ptBR={`Responder a ${authorLabel}`} zh={`回复 ${authorLabel}`} />
        </div>
        <div className="truncate text-[13px] text-[#262a34] dark:text-white">{previewText}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Cancel reply"
        className="shrink-0 rounded-full p-1 text-[#989aa6] transition hover:bg-black/5 dark:text-[#8d8d93] dark:hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function MessageReplyQuote({
  authorLabel,
  previewText,
  mine,
  onClick,
}: {
  authorLabel: string;
  previewText: ReactNode;
  mine: boolean;
  onClick?: () => void;
}) {
  // ReplyItem's own accent: the bubble's OWN text color on a "mine"
  // (tinted-blue) bubble reads as white -- using it directly there
  // would make the quote invisible against its own 15%-opacity tint,
  // so `mine` always uses the same blue accent the compose bar and
  // every other reply chrome already uses; the OTHER side's (white/
  // dark-card) bubble can use that same blue directly, it already
  // reads fine there too.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`mb-1 flex w-full flex-col items-start rounded-[6px] border-l-[3px] border-[#335ef7] px-2 py-1 text-left dark:border-[#0c8ce9] ${
        mine ? "bg-white/15" : "bg-[#335ef7]/10 dark:bg-[#0c8ce9]/15"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`truncate text-[13px] font-semibold ${mine ? "text-white" : "text-[#335ef7] dark:text-[#0c8ce9]"}`}>{authorLabel}</span>
      <div className={`w-full truncate text-[13px] ${mine ? "text-white/85" : "text-[#262a34] dark:text-white"}`}>{previewText}</div>
    </button>
  );
}
