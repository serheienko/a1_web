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

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { T, type Locale } from "@/components/t";

const MENU_WIDTH = 240;
// 2026-09-05, second follow-up (Aleksandr, live screenshot: even with
// the two-pass measure-then-clamp above, the menu still sat flush
// against the very bottom edge on his real screen -- "подними еще
// выше, она не влезла полностью") -- was 10, bumped to 18 for real
// breathing room, paired with the row-height/font trims below so the
// menu is also genuinely a bit shorter overall, not just repositioned.
const VIEWPORT_MARGIN = 18;
const REACTION_EMOJIS = ["👍", "👎", "❤️", "🔥", "🥰", "👏", "😄"];

type IconProps = { className?: string };

// 2026-09-05 (swipe-to-reply follow-up) -- exported so app/chats/
// [chatId]/page.tsx's swipe gesture can reuse the exact same glyph
// the "Відповісти" row already uses, instead of a second copy of the
// same SVG path.
export function ReplyIcon({ className }: IconProps) {
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

// 2026-09-05 (Aleksandr, 3 reference screenshots of the reference
// app's own message menu: Reply/Copy/[Edit]/Remind/Forward/PIN/Delete/
// Select -- ours was missing Pin entirely) -- lucide's own "pin" glyph
// (same round-joins/round-caps style as every icon in this file),
// slotted the same place Telegram puts it: right after Forward, right
// before Delete.
function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9a2 2 0 0 1-1.11-1.79V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
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

type ActionKey = "reply" | "copy" | "edit" | "remind" | "forward" | "pin" | "delete" | "select";

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
    key: "pin",
    icon: PinIcon,
    group: "main",
    label: { uk: "Закріпити", en: "Pin", ru: "Закрепить", de: "Anheften", es: "Fijar", fr: "Épingler", pl: "Przypnij", ptBR: "Fixar", zh: "置顶" },
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
    group: "main",
    label: { uk: "Вибрати", en: "Select", ru: "Выбрать", de: "Auswählen", es: "Seleccionar", fr: "Sélectionner", pl: "Wybierz", ptBR: "Selecionar", zh: "选择" },
  },
];

export function MessageActionsMenu({
  anchorRect,
  mine,
  lang,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onForward,
  onDelete,
}: {
  anchorRect: DOMRect;
  mine: boolean;
  lang: Locale;
  onClose: () => void;
  onReply: () => void;
  // 2026-09-05 (Aleksandr: "Сделай чтобы 'скопировать' работало") --
  // optional, same reasoning as this file's own header comment on why
  // every OTHER row stayed a placeholder: a message with no copyable
  // text (a bare photo/voice note/contact card) has nothing to copy,
  // so callers that can't build copy text for the tapped message just
  // omit this prop and the row quietly no-ops, same as before.
  onCopy?: () => void;
  // 2026-09-05 follow-up (Aleksandr: "Давай одновременно сделаем
  // кнопки редактировать... удалить... И переслать") -- three more
  // rows go live. onEdit/onForward optional for the same reason as
  // onCopy above (a caller with nothing sensible to do yet can omit
  // the prop and the row no-ops), but onDelete is NOT optional --
  // every message, mine or theirs, can always be deleted for-me (see
  // app/api/chats/delete/route.ts's own header: this is always
  // revoke:false), so every caller has this action available.
  onEdit?: () => void;
  onForward?: () => void;
  onDelete: () => void;
}) {
  // 2026-09-05 follow-up (Aleksandr, live screenshot: opened near the
  // bottom of the viewport, the menu ran off the bottom edge entirely
  // -- "не влезло, научись понимать позицию элемента на экране и делай
  // так чтобы купертино всегда полностью помещалось") -- the ORIGINAL
  // logic only compared spaceAbove vs spaceBelow and opened toward
  // whichever side had MORE room, but never checked that side actually
  // had ENOUGH room for the menu's own real height -- so a message
  // sitting anywhere without a full menu's worth of clearance on
  // either side always got clipped by whichever edge it opened toward.
  // Fixed with a real two-pass measure: this ref'd div now always
  // renders (just `visibility: hidden` at an off-screen 0,0 until
  // measured, never `display: none`, so getBoundingClientRect below
  // sees its REAL height), a layout effect measures it before paint
  // and only THEN picks a side and a `top` that's clamped to actually
  // fit within [VIEWPORT_MARGIN, viewport bottom - VIEWPORT_MARGIN] --
  // not just anchored to anchorRect.top/bottom and left to overflow.
  // useLayoutEffect (not useEffect) so this measure-then-place swap
  // happens in the same paint frame instead of visibly flashing at the
  // wrong spot first. anchorRect is a frozen snapshot from the click
  // that opened this (not a live-tracked element), so this still only
  // runs once on mount, same as before.
  const [placement, setPlacement] = useState<{ left: number; top: number; openAbove: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const menuHeight = Math.min(el.getBoundingClientRect().height, window.innerHeight - VIEWPORT_MARGIN * 2);
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    // Prefer below (Telegram's own default); only flip above when below
    // genuinely can't fit the menu AND above has more room to offer.
    const openAbove = spaceBelow < menuHeight + VIEWPORT_MARGIN && spaceAbove > spaceBelow;
    const idealTop = openAbove ? anchorRect.top - 8 - menuHeight : anchorRect.bottom + 8;
    // 2026-09-05 follow-up (Aleksandr: "Исправь математику, надо
    // поднимать на 20 пкс снизу, если купертино показывается с самого
    // нижнего сообщения и ему подобным") -- this maxTop clamp is what
    // actually kicks in for a message near the bottom of the viewport
    // (anything with room to spare below never hits it at all, so this
    // extra margin is invisible everywhere else) -- BOTTOM_EXTRA_MARGIN
    // on top of the normal VIEWPORT_MARGIN so the clamped position sits
    // a further 20px clear of the bottom edge specifically, not just
    // the same 18px every other edge already gets.
    const BOTTOM_EXTRA_MARGIN = 20;
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - BOTTOM_EXTRA_MARGIN - menuHeight);
    const top = Math.min(Math.max(idealTop, VIEWPORT_MARGIN), maxTop);
    const idealLeft = mine ? anchorRect.right - MENU_WIDTH : anchorRect.left;
    const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);
    setPlacement({ left, top, openAbove });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  function select(key: ActionKey) {
    // Reaction row + Remind/Pin/Select stay visual-only placeholders
    // (see this file's own header comment) -- everything else now does
    // something real.
    if (key === "reply") onReply();
    if (key === "copy") onCopy?.();
    if (key === "edit") onEdit?.();
    if (key === "forward") onForward?.();
    if (key === "delete") onDelete();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* 2026-09-05 follow-up (Aleksandr, Telegram Desktop reference
          screenshot: right-click context menu pops up over the chat
          with NO dimming or blur behind it at all -- "не надо блюр:
          делай вот так") -- this used to dim+blur the whole screen
          (bg-black/20 backdrop-blur-[1px]); now a fully invisible
          click-catcher, same size/position, still closing the menu on
          an outside click, just with no visual effect of its own. The
          menu itself already opens via onContextMenu (right-click /
          two-finger trackpad click) rather than a plain left-click --
          see the outer bubble's own onContextMenu comment in
          app/chats/[chatId]/page.tsx -- so a single click still opens
          the photo/plays the voice/etc. exactly as he described. */}
      <div className="absolute inset-0" onClick={onClose} />
      {/* Always mounted (never `{placement && ...}`) -- the layout
          effect above needs this in the DOM, at its real width/content,
          to measure a real height BEFORE placement is known. Hidden
          off-screen at 0,0 until that measurement lands; visibility
          (not display:none) so layout/measurement still happens while
          hidden. maxHeight+overflow-y-auto is the last-resort guard for
          a viewport too short to fit the menu at all even at the best
          available spot -- scrolls internally instead of clipping. */}
      <div
        ref={menuRef}
        className={`absolute flex w-[240px] flex-col gap-2 ${placement?.openAbove ? "animate-popover-up" : "animate-popover-down"}`}
        style={{
          left: placement ? placement.left : -9999,
          top: placement ? placement.top : 0,
          visibility: placement ? "visible" : "hidden",
          maxHeight: `${Math.max(0, window.innerHeight - VIEWPORT_MARGIN * 2)}px`,
          overflowY: "auto",
        }}
      >
          {/* Reaction quick-bar -- placeholder, see header comment.
              2026-09-05 (Aleksandr, screen recording: the whole menu
              draggable/scrollable sideways on mobile, snapping back --
              this row used to be `self-start` (shrink-to-fit its own
              7 emoji + chevron, ~268px at this padding/gap) inside the
              menu's fixed `w-[240px]` root, instead of stretching to
              match it like the action-list box below already does by
              default (flex-col's own align-items:stretch, which this
              row alone opted out of via self-start). The ~28px of
              overflow past the menu's own right edge was invisible as
              such -- for a `mine` bubble idealLeft right-aligns the
              menu near the screen's own right edge (see idealLeft
              above), leaving no room to absorb it, so it pushed past
              the viewport's right edge instead -- which is what made
              the page itself horizontally rubber-band/draggable on
              iOS Safari (an element wider than the viewport enlarges
              the document's scrollable width even though this is a
              `position: fixed` portal). `w-full justify-between`
              instead of `self-start gap-1` -- same content, evenly
              spaced across the menu's own real width, never wider
              than it regardless of exact emoji/font rendering. */}
          <div className="flex w-full items-center justify-between rounded-full bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
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
            {ACTION_ROWS.filter((r) => r.group === "main" && (r.key !== "edit" || mine)).map((row, i, arr) => (
              <button
                key={row.key}
                type="button"
                onClick={() => select(row.key)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition hover:bg-black/5 dark:hover:bg-white/10 ${
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
        </div>
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
  thumbnail,
  onRemove,
  inline,
}: {
  authorLabel: string;
  previewText: ReactNode;
  // 2026-09-05 follow-up (Aleksandr, reference screenshot: replying to
  // a CAPTIONED photo in the reference app shows the photo's own
  // thumbnail here too, not just the caption text) -- optional so
  // every existing caller (a plain-text or pure-media target, already
  // fully described by previewText's own icon+label) is unaffected.
  thumbnail?: ReactNode;
  onRemove: () => void;
  // 2026-09-05 follow-up #2 (Aleksandr, WhatsApp reference screenshots
  // + his own description: "у тебя расширяется инпут филд вверх, и
  // ответ показывает внутри него") -- this used to always render as
  // its own floating rounded card ABOVE the compose textarea's own
  // bordered pill (two separate boxes with a gap between them); the
  // reference app instead grows that SAME pill taller and shows the
  // reply quote inside it, as one continuous box. `inline: true` drops
  // this component's own border/rounding/background/max-width so the
  // caller (that pill) can nest it directly as its top section, with
  // just a bottom divider line separating it from the textarea row
  // below -- the default (false/omitted) keeps the original standalone
  // card, still used for the voice-recording-bar and mic-denied states
  // (app/chats/[chatId]/page.tsx), which aren't that pill at all.
  inline?: boolean;
}) {
  return (
    <div
      className={
        inline
          ? "flex w-full items-center gap-2 border-b border-neutral-200 px-3.5 py-2 dark:border-[#2b2b2b]"
          : "mx-auto flex w-full max-w-[470px] items-center gap-2 rounded-[16px] border border-neutral-200 bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80"
      }
    >
      <div className="h-8 w-[3px] shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />
      {thumbnail}
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

// Edit feature (2026-09-05) -- the compose-bar accessory row for "you
// are editing this message", same left-accent-bar shape as ReplyCompose
// Bar right above (and the same `inline` flavor split) but with no
// author/preview text to show: the original content is already sitting
// in the textarea itself once editingMessage is set (app/chats/
// [chatId]/page.tsx copies extractMessageText(message) into `draft`),
// so this bar's only job is naming the mode and offering a way out of
// it -- Cancel restores the plain compose bar and clears the draft.
export function EditComposeBar({ onCancel, inline }: { onCancel: () => void; inline?: boolean }) {
  return (
    <div
      className={
        inline
          ? "flex w-full items-center gap-2 border-b border-neutral-200 px-3.5 py-2 dark:border-[#2b2b2b]"
          : "mx-auto flex w-full max-w-[470px] items-center gap-2 rounded-[16px] border border-neutral-200 bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80"
      }
    >
      <div className="h-8 w-[3px] shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
          <T
            uk="Редагування повідомлення" en="Editing message" ru="Редактирование сообщения" de="Nachricht bearbeiten"
            es="Editando mensaje" fr="Modification du message" pl="Edytowanie wiadomości" ptBR="Editando mensagem" zh="正在编辑消息"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel edit"
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
  thumbnail,
  onClick,
}: {
  authorLabel: string;
  previewText: ReactNode;
  mine: boolean;
  // 2026-09-05 follow-up (Aleksandr, reference screenshot of the
  // reference app: replying to a message that mixes a photo/document
  // WITH caption text shows that attachment's own thumbnail right
  // here, next to the name+caption, not the caption alone) -- optional
  // so a plain-text or pure-media target (already fully described by
  // previewText's own icon+label from ChatPreviewLine) renders exactly
  // as before.
  thumbnail?: ReactNode;
  onClick?: () => void;
}) {
  // 2026-09-05 follow-up (Aleksandr, live screenshot: "в компоузере ты
  // полечил UI отлично, а в самом сообщении надо добавлять слева
  // черточку возле цитирования/реплая" -- the accent bar was
  // functionally there all along, just invisible) -- the PREVIOUS
  // reasoning below only checked the accent's contrast against the
  // quote box's own bg-white/15 tint, never against what that tint
  // actually sits on: a `mine` bubble's SOLID #335ef7 fill. A
  // border-[#335ef7] bar drawn on a background that's still ~85% that
  // same blue (white/15 only lightens it slightly) reads as no border
  // at all -- exactly what he saw live. `mine` now flips the bar to
  // white instead, the same accent-inversion this component already
  // applies to the name label two lines down (text-white) and every
  // other "mine"-bubble control in this codebase (voice-bubble.tsx's
  // play button, unread dot, etc.) -- the OTHER side's white/dark-card
  // bubble keeps the blue bar, which already reads fine there.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`mb-1 flex w-full items-center gap-2 rounded-[6px] border-l-[3px] py-1 pl-2 pr-2 text-left ${
        mine ? "border-white bg-white/15" : "border-[#335ef7] bg-[#335ef7]/10 dark:border-[#0c8ce9] dark:bg-[#0c8ce9]/15"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {thumbnail}
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className={`truncate text-[13px] font-semibold ${mine ? "text-white" : "text-[#335ef7] dark:text-[#0c8ce9]"}`}>{authorLabel}</span>
        <div className={`w-full truncate text-[13px] ${mine ? "text-white/85" : "text-[#262a34] dark:text-white"}`}>{previewText}</div>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Delete-for-self confirm dialog (2026-09-05, Aleksandr: "и удалить,
// чтобы можно было удалить у себя") -- shared between app/chats/
// [chatId]/page.tsx and components/mini-chat-window.tsx (both already
// duplicate a fair amount of chat-window logic from one another, see
// that file's own header) so the same confirm copy/styling doesn't
// drift between the two. Modeled directly on components/chat/photo-
// viewer.tsx's own "Delete photo?" popover -- same copy pattern
// ("...only for you"), same dark iOS-sheet card this codebase already
// uses for the voice-recording discard confirm (app/chats/[chatId]/
// page.tsx's own discardConfirmOpen block) -- just centered instead of
// anchored, since by the time this fires the actions menu that
// triggered it has already closed and there's no anchor left to hug.
// Always delete-for-me (revoke:false, see app/api/chats/delete/
// route.ts's own header) -- there is no "delete for everyone" copy
// here on purpose, this app doesn't offer that option anywhere yet.
export function DeleteMessageConfirmDialog({
  deleting,
  failed,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[280px] rounded-2xl bg-[#2c2c2e]/95 p-4 text-center shadow-2xl backdrop-blur-xl"
      >
        <p className="text-[15px] font-medium leading-snug text-white">
          <T
            uk="Видалити повідомлення?" en="Delete message?" ru="Удалить сообщение?" de="Nachricht löschen?"
            es="¿Eliminar mensaje?" fr="Supprimer le message ?" pl="Usunąć wiadomość?" ptBR="Excluir mensagem?" zh="删除消息？"
          />
        </p>
        <p className="mt-1 text-[13px] text-white/50">
          <T
            uk="Повідомлення буде видалено лише для вас." en="The message will be deleted for you only."
            ru="Сообщение будет удалено только у вас." de="Die Nachricht wird nur für dich gelöscht."
            es="El mensaje se eliminará solo para ti." fr="Le message ne sera supprimé que pour vous."
            pl="Wiadomość zostanie usunięta tylko u Ciebie." ptBR="A mensagem será excluída só para você."
            zh="消息将仅对你删除。"
          />
        </p>
        {failed && (
          <p className="mt-2 text-[13px] text-red-400">
            <T
              uk="Не вдалося видалити. Спробуйте ще раз." en="Couldn't delete. Try again."
              ru="Не удалось удалить. Попробуйте ещё раз." de="Löschen fehlgeschlagen. Versuch es erneut."
              es="No se pudo eliminar. Inténtalo de nuevo." fr="Échec de la suppression. Réessayez."
              pl="Nie udało się usunąć. Spróbuj ponownie." ptBR="Não foi possível excluir. Tente novamente."
              zh="删除失败，请重试。"
            />
          </p>
        )}
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="flex-1 rounded-full bg-white/10 py-2.5 text-[15px] font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-600 py-2.5 text-[15px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <T uk="Видалити" en="Delete" ru="Удалить" de="Löschen" es="Eliminar" fr="Supprimer" pl="Usuń" ptBR="Excluir" zh="删除" />
          </button>
        </div>
      </div>
    </div>
  );
}
