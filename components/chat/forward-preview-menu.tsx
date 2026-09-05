// components/chat/forward-preview-menu.tsx
//
// Форвард 2.0, Phase 4 (Aleksandr, Telegram Web reference screen
// recording: "это типа когда выбрал это сообщение, пересылаешь в
// определенный чат... оно показывает в композере это сообщение,
// которое ты можешь ещё нажать превью, и там будет, если на него
// тапнешь, там будет типа спрятать имя отправителя, это всё, вот этот
// весь функционал") -- tapping the pending-forward composer preview
// (ForwardComposeBar, see its own onClick prop) opens this small
// anchored popup: "Show Sender's Name" / "Hide Sender's Name" /
// "Forward to Another Chat" / "Do Not Forward", confirmed off the
// reference recording frame-by-frame (Telegram Web, web.telegram.org).
//
// Same visual language as message-actions-menu.tsx's own popup
// (rounded white/dark card, icon+label rows, red destructive row last)
// -- deliberately its OWN component rather than folded into that file,
// since this one has a fixed 4-row list (no per-message-kind branching)
// and a much simpler placement rule: it always opens ABOVE its anchor.
// The ForwardComposeBar it's anchored to always sits directly above
// the composer's own textarea, itself pinned to the very bottom of the
// viewport -- there is never more room below the bar than above it, so
// this skips message-actions-menu's own two-pass "which side has more
// room" measurement entirely and just measures its own height once to
// clamp against the top of the viewport.
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T, type Locale } from "@/components/t";

const MENU_WIDTH = 260;
const VIEWPORT_MARGIN = 14;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ForwardToChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H10a5 5 0 0 0-5 5v1" />
    </svg>
  );
}

function DoNotForwardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function ForwardPreviewMenu({
  anchorRect,
  hideSenderName,
  onShowSenderName,
  onHideSenderName,
  onForwardToAnotherChat,
  onDoNotForward,
  onClose,
}: {
  anchorRect: DOMRect;
  // Current state of the pending forward's own hideSenderName flag
  // (lib/forward-pending-hold.ts's own ForwardPendingDraft field) --
  // drives which of the two top rows shows the leading checkmark,
  // Telegram-style (both rows always render; only the check toggles).
  hideSenderName: boolean;
  onShowSenderName: () => void;
  onHideSenderName: () => void;
  onForwardToAnotherChat: () => void;
  onDoNotForward: () => void;
  onClose: () => void;
}) {
  const [top, setTop] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const menuHeight = el.getBoundingClientRect().height;
    const idealTop = anchorRect.top - 8 - menuHeight;
    setTop(Math.max(VIEWPORT_MARGIN, idealTop));
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  const left =
    typeof window === "undefined"
      ? anchorRect.left
      : Math.min(Math.max(anchorRect.left, VIEWPORT_MARGIN), window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);

  function pick(action: () => void) {
    action();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* No dim/blur behind it -- same "Cupertino menu, no backdrop"
          reference message-actions-menu.tsx's own click-catcher already
          follows (its 2026-09-05 Telegram Desktop screenshot comment). */}
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={menuRef}
        style={{
          left,
          top: top ?? -9999,
          width: MENU_WIDTH,
          visibility: top === null ? "hidden" : "visible",
        }}
        className="animate-popover-up absolute overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95"
      >
        <button
          type="button"
          onClick={() => pick(onShowSenderName)}
          className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-2.5 text-left text-[14px] text-[#262a34] transition hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        >
          <CheckIcon className={`h-4 w-4 shrink-0 ${hideSenderName ? "invisible" : ""}`} />
          <span className="flex-1">
            <T
              uk="Показати ім'я відправника" en="Show Sender's Name" ru="Показать имя отправителя" de="Absendername anzeigen"
              es="Mostrar nombre del remitente" fr="Afficher le nom de l'expéditeur" pl="Pokaż nazwę nadawcy"
              ptBR="Mostrar nome do remetente" zh="显示发件人姓名"
            />
          </span>
        </button>
        <button
          type="button"
          onClick={() => pick(onHideSenderName)}
          className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-2.5 text-left text-[14px] text-[#262a34] transition hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        >
          <CheckIcon className={`h-4 w-4 shrink-0 ${hideSenderName ? "" : "invisible"}`} />
          <span className="flex-1">
            <T
              uk="Приховати ім'я відправника" en="Hide Sender's Name" ru="Скрыть имя отправителя" de="Absendername ausblenden"
              es="Ocultar nombre del remitente" fr="Masquer le nom de l'expéditeur" pl="Ukryj nazwę nadawcy"
              ptBR="Ocultar nome do remetente" zh="隐藏发件人姓名"
            />
          </span>
        </button>
        <button
          type="button"
          onClick={() => pick(onForwardToAnotherChat)}
          className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-2.5 text-left text-[14px] text-[#262a34] transition hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        >
          <ForwardToChatIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <T
              uk="Переслати в інший чат" en="Forward to Another Chat" ru="Переслать в другой чат"
              de="An einen anderen Chat weiterleiten" es="Reenviar a otro chat" fr="Transférer vers une autre discussion"
              pl="Prześlij do innego czatu" ptBR="Encaminhar para outro chat" zh="转发到其他聊天"
            />
          </span>
        </button>
        <button
          type="button"
          onClick={() => pick(onDoNotForward)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[#ff3b30] transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          <DoNotForwardIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <T uk="Не пересилати" en="Do Not Forward" ru="Не пересылать" de="Nicht weiterleiten" es="No reenviar" fr="Ne pas transférer" pl="Nie przesyłaj dalej" ptBR="Não encaminhar" zh="不转发" />
          </span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
