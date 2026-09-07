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

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { T, type Locale } from "@/components/t";
import { groupReactionsByEmoji, type MessagePeerReaction } from "@/lib/a1/chat-schemas";
import { EMOJI_CATEGORIES } from "@/lib/a1/emoji-data";

// Fix Tracker (2026-09-07, order 92: "Расширь модалку + поле сверху с
// эмодзи и вставь стрелку внутрь, а не отдельно снаружи") -- was 240,
// which is why the expanded emoji grid below had to shrink to 6
// columns (see that grid's own comment) instead of matching this
// row's 7 quick-react emoji. Widened so the grid gets a 7th column.
const MENU_WIDTH = 280;
// 2026-09-05, second follow-up (Aleksandr, live screenshot: even with
// the two-pass measure-then-clamp above, the menu still sat flush
// against the very bottom edge on his real screen -- "подними еще
// выше, она не влезла полностью") -- was 10, bumped to 18 for real
// breathing room, paired with the row-height/font trims below so the
// menu is also genuinely a bit shorter overall, not just repositioned.
const VIEWPORT_MARGIN = 18;
// 2026-09-06 fix (Aleksandr's reactions feature go-ahead): this used to
// end in "😄", a guess -- CONFIRMED off mobile's own
// lib/features/reactions/components/emoji_reactions_panel.dart, the
// real static set is "😁" as the 7th emoji, not "😄".
const REACTION_EMOJIS = ["👍", "👎", "❤️", "🔥", "🥰", "👏", "😁"];

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

// 2026-09-06 follow-up (Reminders-list feature, components/chat/
// reminders-list-modal.tsx) -- exported so the chat header's own new
// "Reminders" trigger button can reuse the SAME glyph this menu's own
// "Нагадати" row already uses, instead of drawing a second bell icon
// (same reuse convention ForwardIcon's own header comment above
// established for chat-preview-line.tsx).
export function RemindIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// 2026-09-05 follow-up (Aleksandr, reference screenshot: chat list
// shows a small forward-arrow before the preview text of a chat whose
// last message was forwarded) -- exported so components/chat/chat-
// preview-line.tsx can reuse the SAME glyph the "Forward" action-menu
// row above already uses, instead of drawing a second one.
export function ForwardIcon({ className }: IconProps) {
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

// Mobile's own icon for the unpinned/"about to pin" and pinned/"tap
// to unpin" states are two different glyphs (CupertinoIcons.pin vs
// .pin_slash) -- ported as the same PinIcon glyph above plus a
// diagonal strike, rather than inventing a second unrelated icon.
function PinSlashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9a2 2 0 0 1-1.11-1.79V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      <path d="M3 3l18 18" />
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

// The "Pin" row's label/icon by `pinState` -- ground-truthed off
// mobile's own receiver_message_item.dart / sender_message_item.dart
// (this file's own onPin/pinState header comment). "pin" reuses
// ACTION_ROWS's own static default entry below rather than repeating
// it here.
const PIN_STATE_LABELS: Record<"replace" | "unpin", Record<Locale, string>> = {
  replace: { uk: "Замінити закріплене", en: "Replace Pin", ru: "Заменить закреп", de: "Anheftung ersetzen", es: "Reemplazar fijado", fr: "Remplacer l'épingle", pl: "Zastąp przypięte", ptBR: "Substituir fixado", zh: "替换置顶" },
  unpin: { uk: "Відкріпити", en: "Unpin", ru: "Открепить", de: "Loslösen", es: "Desfijar", fr: "Détacher", pl: "Odepnij", ptBR: "Desafixar", zh: "取消置顶" },
};

export function MessageActionsMenu({
  anchorRect,
  mine,
  lang,
  onClose,
  onReply,
  onReact,
  myReactionEmoticon,
  onCopy,
  onEdit,
  onForward,
  onDelete,
  onSelect,
  onRemind,
  onPin,
  pinState,
}: {
  anchorRect: DOMRect;
  mine: boolean;
  lang: Locale;
  onClose: () => void;
  onReply: () => void;
  // 2026-09-06 (Aleksandr's reactions feature go-ahead: "делаем реакции
  // на сообщения... правой кнопкой мыши появляются... нажимаем — реакция
  // ставится... при клике на неё повторном, если она уже поставлена, она
  // убирается") -- the reaction quick-bar up top was a visual-only
  // placeholder since this file's own header comment; optional for the
  // same reason as onCopy/onEdit/onForward below (a caller with nothing
  // to do yet just omits it and the row keeps no-oping).
  onReact?: (emoticon: string) => void;
  // Which emoji (if any) the CURRENT USER already has set on this
  // message -- highlights that button and lets tapping it again remove
  // the reaction instead of re-adding it (the toggle half of the
  // feature; see app/chats/[chatId]/page.tsx's handleToggleReaction,
  // which is what actually decides add vs. delete).
  myReactionEmoticon?: string | null;
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
  // 2026-09-06 (Aleksandr: "У нас есть еще фича «remind» она работает
  // на каждое сообщение... Можно поставить ремайндер на кажд
  // сообщение") -- the "Нагадати" row was a visual-only placeholder
  // since this file's own original header comment; optional for the
  // same reason as onCopy/onEdit/onForward above.
  onRemind?: () => void;
  // 2026-09-06 follow-up (Aleksandr, reference screenshot: "Посмотри
  // еще функцию закрепов сообщений «пин» найди документацию и
  // подготовься к имплементации") -- ground-truthed off the ACTUAL
  // BACKEND SOURCE this time (~/mnt/a1_app/aone-api-private-main's
  // own messages_updatePinnedMessage.d.ts + messages.constants.ts),
  // not just the mobile client: mobile's own receiver_message_item.dart
  // / sender_message_item.dart show one dynamic row here that reads
  // "Pin" / "Replace Pin" / "Unpin" depending on pin state -- ported
  // as the separate `pinState` prop below rather than three ActionKeys,
  // same optional-prop convention as onCopy/onEdit/onForward/onRemind
  // (a caller with nothing sensible to do yet can omit it and the row
  // no-ops).
  onPin?: () => void;
  // Which of the three labels/icons the "Pin" row shows. Omitted (or
  // "pin") is the plain placeholder default already in ACTION_ROWS
  // below; a real caller always passes one explicitly once it knows
  // the tapped message's own pinned state and whether the chat already
  // has a different message pinned (mobile's own 1-pin-per-chat rule).
  pinState?: "pin" | "replace" | "unpin";
  onDelete: () => void;
  // 2026-09-05 (Форвард 2.0, Aleksandr greenlighting multi-select:
  // "Очистить чат давай тоже сделаем... " open-questions reply) --
  // the "Вибрати" row was a visual-only placeholder (this file's own
  // header comment) until now. Optional for the same reason as
  // onCopy/onEdit/onForward above: a caller with no batch-selection
  // UI built yet can omit it and the row keeps no-oping.
  onSelect?: () => void;
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
  const [placement, setPlacement] = useState<{ left: number; top: number; openAbove: boolean; needsScroll: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // 2026-09-06 (Aleksandr, screenshot of the reaction row's chevron:
  // "Надо стрелочку возле эмодзи тоже, чтобы можно было открывать
  // полный дропдаун с эмодзи") -- the chevron used to just call
  // onClose() (a leftover no-op from this file's original
  // all-placeholder-except-Reply scope, never wired up once
  // reactions became real). Now it expands an inline emoji grid
  // reusing the same EMOJI_CATEGORIES data as the draft composer's
  // own picker (media-picker-panel.tsx), just without that panel's
  // search box/multi-tab chrome -- there isn't room for those in a
  // 240px-wide popup, and a plain category-row + grid matches this
  // menu's own compact style.
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerCategory, setEmojiPickerCategory] = useState(EMOJI_CATEGORIES[0]?.key ?? "smileys");

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    // 2026-09-06 (Aleksandr, два тикета про одно и то же место: "На
    // купертино меню есть трабла с каким то квадратным фоном в левом
    // нижнем углу, какая то типа подложка, надо ее убрать" + "Убери эту
    // штуку для скролла снизу в купертино") -- обе жалобы даёт один и
    // тот же корень: у корневого дива меню безусловно стояли maxHeight
    // + overflowY:"auto". Скролл-контейнер в Chrome, во-первых, рисует
    // собственную полосу прокрутки (это и есть "штука для скролла"), а
    // во-вторых -- обрезает всё, что вылезает за его бокс, включая
    // shadow-xl у обеих внутренних карточек: мягкая тень у скруглённых
    // углов срезается по прямой и читается как квадратная подложка,
    // выглядывающая из-под меню. Оба артефакта не нужны в норме: меню
    // помещается на экран практически всегда, а overflow был лишь
    // "последней страховкой" на совсем низкий вьюпорт (см. комментарий
    // ниже). Теперь страховка включается только когда реально не
    // помещается, и даже тогда полоса прокрутки прячется через
    // .no-scrollbar (app/globals.css).
    const rawHeight = el.getBoundingClientRect().height;
    const available = window.innerHeight - VIEWPORT_MARGIN * 2;
    const needsScroll = rawHeight > available;
    const menuHeight = Math.min(rawHeight, available);
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
    setPlacement({ left, top, openAbove, needsScroll });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Re-runs when the emoji grid opens/closes (not just on mount)
    // so the menu re-measures its new real height and repositions --
    // otherwise expanding the grid on a message near the bottom of
    // the viewport would grow the popup downward off-screen instead
    // of the whole thing re-clamping/flipping like it does on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiPickerOpen]);

  if (typeof document === "undefined") return null;

  function select(key: ActionKey) {
    // Reaction row + Select (remain visual-only placeholders -- see
    // this file's own header comment). Remind (2026-09-06) and Pin
    // (2026-09-06 follow-up) now do something real too.
    if (key === "reply") onReply();
    if (key === "copy") onCopy?.();
    if (key === "edit") onEdit?.();
    if (key === "remind") onRemind?.();
    if (key === "forward") onForward?.();
    if (key === "pin") onPin?.();
    if (key === "delete") onDelete();
    if (key === "select") onSelect?.();
    onClose();
  }

  return createPortal(
    // Fix Tracker (2026-09-07, Aleksandr: "В мини-чатах модалка с
    // действиями появляется под чатами. Проблемы с оверлеем.") -- this
    // portal renders into document.body (escaping the mini-chat
    // window's own overflow-hidden), but z-50 still lost to that
    // window's own floating panel at z-[70] (components/mini-chat-
    // window.tsx), so the menu visually rendered BEHIND it. Bumped
    // above the highest z-index anywhere else in the app (z-[75]) so
    // this context menu is always on top regardless of which surface
    // (full chat page or mini-chat widget) opened it.
    //
    // Fix Tracker (2026-09-07, order 106: "При нажатии любого
    // функционала в мини-чате... чат отлетает и всё закрывается") --
    // this menu portals straight to document.body, escaping mini-chat-
    // window.tsx's own `panelRef` div even though it's nested inside it
    // in the JSX tree. components/chats-fab.tsx's outside-click
    // listener checks `panelRef.current.contains(event.target)` to
    // decide whether to close the whole mini-chat widget, and a click
    // on any item in THIS menu (Reply/Copy/Pin/Delete/...) landed
    // outside that DOM subtree -- so every click here both fired its
    // own action AND closed the mini-chat out from under it (mousedown
    // fires first, unmounting everything before the click handler
    // could even run). `data-chat-action-menu` marks this portal's
    // real root so that listener can special-case it.
    <div className="fixed inset-0 z-[80]" data-chat-action-menu="true">
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
        className={`absolute flex w-[280px] flex-col gap-2 ${placement?.openAbove ? "animate-popover-up" : "animate-popover-down"} ${
          placement?.needsScroll ? "no-scrollbar" : ""
        }`}
        style={{
          left: placement ? placement.left : -9999,
          top: placement ? placement.top : 0,
          visibility: placement ? "visible" : "hidden",
          // maxHeight/overflow навешиваются только если меню реально не
          // влезает по высоте -- см. комментарий в layout-эффекте выше о
          // том, что безусловный скролл-контейнер давал и полосу
          // прокрутки, и срезанные в квадрат тени.
          maxHeight: placement?.needsScroll ? `${Math.max(0, window.innerHeight - VIEWPORT_MARGIN * 2)}px` : undefined,
          overflowY: placement?.needsScroll ? "auto" : "visible",
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
          {/* Fix Tracker (2026-09-07, order 92: "Расширь модалку +
              поле сверху с эмодзи и вставь стрелку внутрь, а не
              отдельно снаружи") -- the quick-react row and the
              expanded grid below used to be two separate
              rounded-full/rounded-2xl white cards stacked with a gap,
              so the chevron read as opening a whole separate floating
              panel rather than the row itself growing. Now ONE
              container: rounded-full while collapsed, rounded-[26px]
              once the grid is open (still one continuous card, just a
              gentler radius that suits the taller rectangle), with
              the grid section separated from the quick-react row by
              nothing more than an internal hairline divider instead
              of a gap -- the arrow now visibly toggles content INSIDE
              this one surface instead of summoning a separate one
              below it. Also widened from 240 to 280 (MENU_WIDTH
              above) so the grid gets a 7th column, matching the
              quick-react row's own 7 emoji instead of cramming into
              6. */}
          <div
            className={`flex w-full flex-col overflow-hidden bg-white/95 shadow-xl backdrop-blur-sm transition-[border-radius] duration-150 dark:bg-neutral-800/95 ${
              emojiPickerOpen ? "rounded-[26px]" : "rounded-full"
            }`}
          >
            <div className="flex w-full items-center justify-between px-2 py-1.5">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact?.(emoji);
                    onClose();
                  }}
                  className={`rounded-full p-1 text-[19px] leading-none transition hover:scale-110 ${
                    myReactionEmoticon === emoji ? "scale-110 bg-[#335ef7]/10 dark:bg-white/10" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                aria-label="More"
                aria-expanded={emojiPickerOpen}
                className="rounded-full p-1 text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 transition-transform ${emojiPickerOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* Full emoji dropdown -- toggled by the chevron above. Same
                EMOJI_CATEGORIES data + category-row pattern as
                media-picker-panel.tsx's own emoji tab: icon-only
                scrollable category row (no room for text labels), a
                7-column grid now that this menu is 280px wide, capped
                height with its own internal scroll so this doesn't
                blow out the whole popup's height budget -- picking any
                emoji here reacts + closes the menu exactly like the
                quick-react row above. */}
            {emojiPickerOpen && (
              <div className="flex w-full flex-col gap-1.5 border-t border-black/5 p-2 dark:border-white/10">
                <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {EMOJI_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setEmojiPickerCategory(c.key)}
                      title={c.labelRu}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] transition ${
                        emojiPickerCategory === c.key ? "bg-[#335ef7]/15 dark:bg-[#0c8ce9]/20" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                      }`}
                    >
                      {c.icon}
                    </button>
                  ))}
                </div>
                <div className="grid max-h-[168px] grid-cols-7 gap-1 overflow-y-auto no-scrollbar">
                  {(EMOJI_CATEGORIES.find((c) => c.key === emojiPickerCategory)?.emojis ?? []).map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      onClick={() => {
                        onReact?.(emoji);
                        onClose();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[17px] leading-none transition hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
            {ACTION_ROWS.filter((r) => r.group === "main" && (r.key !== "edit" || mine)).map((row, i, arr) => {
              // Pin row only: swap in the dynamic icon/label for
              // whichever of the three states this tapped message is
              // actually in (see this file's own onPin/pinState header
              // comment); every other row just uses its static entry.
              const isUnpinState = row.key === "pin" && pinState === "unpin";
              const RowIcon = isUnpinState ? PinSlashIcon : row.icon;
              const rowLabel =
                row.key === "pin" && (pinState === "replace" || pinState === "unpin")
                  ? PIN_STATE_LABELS[pinState]
                  : row.label;
              return (
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
                  <RowIcon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">
                    <T
                      uk={rowLabel.uk} en={rowLabel.en} ru={rowLabel.ru} de={rowLabel.de} es={rowLabel.es}
                      fr={rowLabel.fr} pl={rowLabel.pl} ptBR={rowLabel.ptBR} zh={rowLabel.zh}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Reactions bar -- one chip per distinct emoji reacting peers currently
// have on a message, rendered on its own line right under the bubble
// (app/chats/[chatId]/page.tsx inserts this as a sibling of the bubble
// row, not inside it, so it works for every message kind -- text,
// photo, file, contact card, calculation -- without touching any of
// those individual render branches). 2026-09-06 (Aleksandr, reference
// screenshots of his own real chat: a reaction chip shows the emoji
// PLUS the reacting peer's own avatar, not a bare count) -- this app's
// chats are 1:1 only for now (see chat-schemas.ts's own CHAT_FLAG_
// PERSONAL/resolvePersonalChat comments), so there are only ever two
// possible reactors: me (no avatar needed, the chip's own highlighted
// fill already shows it's mine) or the other participant, whose avatar
// the caller already has loaded as `headerAvatar` for the chat header
// itself -- passed straight through as `otherAvatarUrl` rather than
// this component doing its own lookup. Group-chat avatar-per-reactor
// (mobile's own _StackedReactorAvatars) is intentionally out of scope
// until this app actually has group chats.
export function ReactionsBar({
  reactions,
  mine,
  myUserId,
  otherAvatarUrl,
  otherInitial,
  flatMedia,
  inline,
  onToggle,
}: {
  reactions: MessagePeerReaction[];
  mine: boolean;
  myUserId: string | null;
  otherAvatarUrl?: string | null;
  // Falls back to a plain initial-letter avatar when the other
  // participant has no profile photo -- same "always show SOMETHING
  // circular" convention the chat header itself already follows.
  otherInitial?: string;
  // True for a chromeless/edge-to-edge bubble (photo, sticker, voice-
  // only, ...) which has no padding of its own to inherit -- see
  // page.tsx's own isFlatMedia flag. Adds this row's own padding in
  // that case only; a regular padded bubble already surrounds every
  // child (this one included) with its own px-3/pt-2/pb-2.
  flatMedia?: boolean;
  // Fix Tracker (2026-09-07, order 102: "Короткие сообщения с
  // реакциями лучше расширяй в сторону и время ставь в ровень с
  // реакцией как на референсе телеграма") -- when true, this row skips
  // its own top margin so a caller can nest it as a flex-wrap ITEM
  // inside the same row as the time/ticks footer: on a short message
  // there's room for both on one line (the bubble naturally widens to
  // fit that combined line, since a bubble's width already tracks its
  // widest content line), and on a longer one flex-wrap just drops
  // this row to a line of its own -- same visual result as before,
  // with no JS width measurement needed either way.
  inline?: boolean;
  onToggle: (emoticon: string) => void;
}) {
  if (reactions.length === 0) return null;
  const groups = groupReactionsByEmoji(reactions);
  if (groups.length === 0) return null;

  return (
    // Fix Tracker (order 87, 2026-09-07, Aleksandr: "сейчас ты сделал
    // реакции врезанными в сообщение, а я хотел чтобы ты автоматически
    // увеличивал их высоту (плавной анимацией) и показывал реакции
    // полностью внутри") -- supersedes orders 82/83's Telegram-style
    // straddle (half on the bubble, half hanging below it): renders as
    // a normal flow row instead of an absolutely-positioned overlay, so
    // it's page.tsx's own bubble div that pushes itself taller to fit
    // this row like any other content -- no manual height math needed
    // for "the bubble should expand". animate-reactions-in (globals.css)
    // gives the row itself a quick pop-in on mount, i.e. exactly when a
    // message's reactions go from none to some. `flatMedia` supplies
    // this row's own padding for a chromeless bubble (photo/sticker/
    // voice-only) that has none of its own to inherit; a regular
    // padded bubble only needs the top margin below.
    <div
      className={`animate-reactions-in flex flex-wrap gap-1.5 ${flatMedia ? "px-2 pb-2 pt-1.5" : inline ? "" : "mt-1.5"} ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      {groups.map((group) => {
        const iReacted = myUserId !== null && group.reactors.some((p) => p.object === "peer-user" && p.user === myUserId);
        const otherReacted = group.reactors.some((p) => p.object === "peer-user" && p.user !== myUserId);
        return (
          <button
            key={group.emoticon}
            type="button"
            onClick={() => onToggle(group.emoticon)}
            className={`flex items-center gap-1 rounded-full py-1 pl-2.5 pr-2 text-[16px] leading-none shadow-md ring-2 transition hover:scale-105 ${
              iReacted
                ? "bg-[#335ef7] text-white ring-white dark:bg-[#0c8ce9] dark:ring-[#0e1116]"
                : "bg-white text-[#262a34] ring-white dark:bg-[#1a1a1a] dark:text-white dark:ring-[#0e1116]"
            }`}
          >
            <span className="leading-none">{group.emoticon}</span>
            {otherReacted &&
              (otherAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny
                // 20px reaction avatar, not worth next/image's overhead here.
                <img src={otherAvatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-[11px] font-semibold dark:bg-white/15">
                  {otherInitial ?? "?"}
                </span>
              ))}
          </button>
        );
      })}
    </div>
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
export function EditComposeBar({
  previewText,
  onCancel,
  inline,
}: {
  // 2026-09-05 follow-up (Aleksandr: "все так, просто сверху еще надо
  // подставлять текст типа что ты редактируешь, как у Телеги") -- this
  // used to show only the "Editing message" label with nothing below
  // it, on the (wrong) assumption that the textarea already showing
  // the same text made a second copy redundant. Telegram's own edit
  // bar always shows a truncated quote of the ORIGINAL text here too
  // (same shape as ReplyComposeBar's previewText right above), which
  // matters once the user has started RETYPING the textarea -- without
  // it there's no way to see what the message used to say.
  previewText: string;
  onCancel: () => void;
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
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
          <T
            uk="Редагування повідомлення" en="Editing message" ru="Редактирование сообщения" de="Nachricht bearbeiten"
            es="Editando mensaje" fr="Modification du message" pl="Edytowanie wiadomości" ptBR="Editando mensagem" zh="正在编辑消息"
          />
        </div>
        <div className="truncate text-[13px] text-[#262a34] dark:text-white">{previewText}</div>
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

// Pending-forward composer preview (Форвард 2.0, Phase 3 -- see lib/
// forward-pending-hold.ts's own header for Aleksandr's exact request:
// "должен быть момент, что ты типа когда пересылаешь и открываешь
// чат, и там тоже сверху это появляется в композере"). Modeled 1:1 on
// EditComposeBar right above -- same accent-bar/title/preview-line/X
// shell, just with a message-count-aware title (mirrors the existing
// "Delete N messages?" convention elsewhere in this file's own caller,
// app/chats/[chatId]/page.tsx's selectionDeleteConfirm dialog: the
// count is always interpolated as a raw number, no per-locale plural
// grammar) and ownerLabel (the original sender's name, precomputed by
// the caller at pick time) as the preview line instead of a text
// snippet.
export function ForwardComposeBar({
  count,
  ownerLabel,
  onCancel,
  onClick,
  inline,
}: {
  count: number;
  ownerLabel: string;
  onCancel: () => void;
  // Форвард 2.0, Phase 4 (Aleksandr, Telegram Web reference screen
  // recording: "нажать превью, и там будет... спрятать имя
  // отправителя") -- tapping anywhere on this bar (except the X, which
  // stops its own click from bubbling here) opens page.tsx's own
  // ForwardPreviewMenu (Show/Hide Sender's Name, Forward to Another
  // Chat, Do Not Forward). Optional so the type stays backward-
  // compatible with any future caller that doesn't want this bar
  // clickable.
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  inline?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={
        (inline
          ? "flex w-full items-center gap-2 border-b border-neutral-200 px-3.5 py-2 dark:border-[#2b2b2b]"
          : "mx-auto flex w-full max-w-[470px] items-center gap-2 rounded-[16px] border border-neutral-200 bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80") +
        (onClick ? " cursor-pointer" : "")
      }
    >
      <div className="h-8 w-[3px] shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
          <T
            uk={`Переслати ${count} повідомлень`} en={`Forward ${count} messages`} ru={`Переслать ${count} сообщений`}
            de={`${count} Nachrichten weiterleiten`} es={`Reenviar ${count} mensajes`} fr={`Transférer ${count} messages`}
            pl={`Przekaż ${count} wiadomości`} ptBR={`Encaminhar ${count} mensagens`} zh={`转发 ${count} 条消息`}
          />
        </div>
        <div className="truncate text-[13px] text-[#262a34] dark:text-white">{ownerLabel}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          // Stop this same click from also bubbling up to the bar's
          // own onClick above -- cancelling the forward should never
          // simultaneously pop open the "what to do with it" menu.
          e.stopPropagation();
          onCancel();
        }}
        aria-label="Cancel forward"
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
  title,
  description,
  confirmLabel,
  deleteForEveryoneLabel,
  anchorRect,
}: {
  deleting: boolean;
  failed: boolean;
  onCancel: () => void;
  // 2026-09-05 follow-up (Aleksandr, reference screenshot: "delete for
  // me and Mao" / "delete for me" as two stacked options -- "Удаление
  // надо показывать в той же модалке, просто менять ее по высоте и
  // показывать другой текст", i.e. NOT a new anchored popup like the
  // reference's own presentation, just this same centered card grown
  // taller) -- `revoke` tells the caller which of the two the user
  // picked. Every existing caller (batch-delete-selected, clear-chat,
  // and this dialog's own plain one-button mode below) passes a
  // `() => ...` callback with no parameters, which TypeScript already
  // allows assigning to a `(revoke: boolean) => void`-typed prop (a
  // function is assignable wherever it declares fewer parameters than
  // the type expects) -- none of them needed to change.
  onConfirm: (revoke: boolean) => void;
  // 2026-09-05 (Форвард 2.0: batch-delete-selected + clear-chat both
  // want this exact same card, just with different copy) -- all
  // optional so the original single-message delete call site (below)
  // is unaffected and keeps its own default text.
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  // 2026-09-05 follow-up -- when set, swaps the plain Cancel+Delete row
  // below for THREE stacked full-width rows (this label on top, in
  // its own red button, revoke:true; confirmLabel/its default right
  // under it, revoke:false; Cancel last) -- same card, same width,
  // just taller. Omitted (the common case: batch-delete-selected,
  // clear-chat) keeps the original two-button row untouched.
  deleteForEveryoneLabel?: ReactNode;
  // Fix Tracker (2026-09-07, order 116: "Модалка должна быть над
  // миничатами" -- reference screenshot shows this dialog centered on
  // the WHOLE page/viewport while the mini-chat floating widget it was
  // opened from sits off to the side, so the dialog lands nowhere near
  // what the user was just looking at) -- when the caller passes the
  // rect of its own floating panel (mini-chat-window.tsx's own
  // panelRef), the card below re-centers itself over THAT rect instead
  // of the full viewport. Omitted (every other caller: the main chat
  // page, which IS the full viewport) keeps the original centered
  // behavior untouched.
  anchorRect?: { top: number; left: number; width: number; height: number } | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [anchoredStyle, setAnchoredStyle] = useState<{ position: "fixed"; left: number; top: number; margin: number } | undefined>(undefined);
  useLayoutEffect(() => {
    if (!anchorRect || !cardRef.current) {
      setAnchoredStyle(undefined);
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const margin = 12;
    const idealLeft = anchorRect.left + anchorRect.width / 2 - rect.width / 2;
    const idealTop = anchorRect.top + anchorRect.height / 2 - rect.height / 2;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    setAnchoredStyle({
      position: "fixed",
      left: Math.min(Math.max(idealLeft, margin), maxLeft),
      top: Math.min(Math.max(idealTop, margin), maxTop),
      margin: 0,
    });
  }, [anchorRect]);
  return (
    // Fix Tracker (2026-09-07, order 95): same z-index fix as the
    // context menu above -- this confirm dialog has no createPortal of
    // its own, so a `fixed` z-50 here could still lose to the
    // mini-chat window's z-[70] floating panel when opened from there.
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6" onClick={onCancel}>
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={anchoredStyle}
        className="w-full max-w-[280px] rounded-2xl bg-[#2c2c2e]/95 p-4 text-center shadow-2xl backdrop-blur-xl"
      >
        <p className="text-[15px] font-medium leading-snug text-white">
          {title ?? (
            <T
              uk="Видалити повідомлення?" en="Delete message?" ru="Удалить сообщение?" de="Nachricht löschen?"
              es="¿Eliminar mensaje?" fr="Supprimer le message ?" pl="Usunąć wiadomość?" ptBR="Excluir mensagem?" zh="删除消息？"
            />
          )}
        </p>
        <p className="mt-1 text-[13px] text-white/50">
          {description ?? (
            <T
              uk="Повідомлення буде видалено лише для вас." en="The message will be deleted for you only."
              ru="Сообщение будет удалено только у вас." de="Die Nachricht wird nur für dich gelöscht."
              es="El mensaje se eliminará solo para ti." fr="Le message ne sera supprimé que pour vous."
              pl="Wiadomość zostanie usunięta tylko u Ciebie." ptBR="A mensagem será excluída só para você."
              zh="消息将仅对你删除。"
            />
          )}
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
        {deleteForEveryoneLabel ? (
          <div className="mt-3.5 flex flex-col gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => onConfirm(true)}
              className="w-full rounded-full bg-red-600 py-2.5 text-[15px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleteForEveryoneLabel}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => onConfirm(false)}
              className="w-full rounded-full bg-red-600 py-2.5 text-[15px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {confirmLabel ?? <T uk="Видалити тільки для мене" en="Delete only for me" ru="Удалить только у меня" de="Nur für mich löschen" es="Eliminar solo para mí" fr="Supprimer seulement pour moi" pl="Usuń tylko u mnie" ptBR="Excluir só para mim" zh="仅对我删除" />}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onCancel}
              className="w-full rounded-full bg-white/10 py-2.5 text-[15px] font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
            </button>
          </div>
        ) : (
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
              onClick={() => onConfirm(false)}
              className="flex-1 rounded-full bg-red-600 py-2.5 text-[15px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {confirmLabel ?? <T uk="Видалити" en="Delete" ru="Удалить" de="Löschen" es="Eliminar" fr="Supprimer" pl="Usuń" ptBR="Excluir" zh="删除" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
