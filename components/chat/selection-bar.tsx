// components/chat/selection-bar.tsx
//
// Multi-select mode chrome (2026-09-05, "Форвард 2.0" master plan +
// Aleksandr's greenlight on the open questions: "Очистить чат давай
// тоже сделаем сразу, почему нет?"). Modeled directly off the mobile
// app's own reference (read straight from source, not guessed):
// lib/features/chat/presentation/chat_detail/components/
// chat_detail_selection_app_bar.dart (top bar: Clear Chat pill / count
// pill / Cancel pill) and .../widgets/chat_selection_action_bar.dart
// (bottom bar replacing the composer: delete circle left, forward
// circle right, both dimmed to 40% opacity + disabled while nothing's
// picked). Two separate small components so app/chats/[chatId]/
// page.tsx's already-massive JSX doesn't grow two more inline blocks
// -- same "extract once it's a distinct visual unit" convention this
// codebase already used for copy-toast.tsx and forward-picker-modal.tsx.
"use client";

import { T, type Locale } from "@/components/t";

function DeleteCircleIcon({ className }: { className?: string }) {
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

function ForwardCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H10a5 5 0 0 0-5 5v1" />
    </svg>
  );
}

// Replaces the normal header (peer name/avatar) while selectionMode is
// on -- same fixed/sticky positioning slot in page.tsx, just different
// content, so nothing about the header's own frosted-glass container
// needs to change, only what's rendered inside it.
export function SelectionTopBar({
  count,
  onClearChat,
  onCancel,
}: {
  count: number;
  onClearChat: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative mx-auto flex w-full max-w-[470px] items-center gap-2 px-4 py-3">
      <button
        type="button"
        onClick={onClearChat}
        className="shrink-0 rounded-full border border-neutral-200 bg-white/90 px-3.5 py-2 text-[14px] font-semibold text-[#ff3b30] backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:hover:bg-[#1c1c1e]"
      >
        <T uk="Очистити чат" en="Clear Chat" ru="Очистить чат" de="Chat leeren" es="Vaciar chat" fr="Vider la discussion" pl="Wyczyść czat" ptBR="Limpar conversa" zh="清空聊天" />
      </button>
      <div className="flex min-h-[38px] flex-1 items-center justify-center truncate rounded-full bg-black/5 px-4 text-center dark:bg-white/10">
        <span className="truncate text-[15px] font-semibold leading-tight">
          {count === 0 ? (
            <T uk="Виберіть повідомлення" en="Select messages" ru="Выберите сообщения" de="Nachrichten auswählen" es="Seleccionar mensajes" fr="Sélectionner des messages" pl="Wybierz wiadomości" ptBR="Selecionar mensagens" zh="选择消息" />
          ) : (
            <T uk={`Вибрано: ${count}`} en={`${count} Selected`} ru={`Выбрано: ${count}`} de={`${count} ausgewählt`} es={`${count} seleccionados`} fr={`${count} sélectionnés`} pl={`Wybrano: ${count}`} ptBR={`${count} selecionadas`} zh={`已选择 ${count} 条`} />
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-full border border-neutral-200 bg-white/90 px-3.5 py-2 text-[14px] font-semibold text-[#335ef7] backdrop-blur-sm transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
      >
        <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
      </button>
    </div>
  );
}

// Replaces the compose bar while selectionMode is on. Both actions act
// on whatever's currently in selectedMessageIds -- the caller (page.tsx)
// owns that state and is what disables/no-ops these at 0 selected.
export function SelectionBottomBar({
  hasSelection,
  onDelete,
  onForward,
}: {
  hasSelection: boolean;
  onDelete: () => void;
  onForward: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[470px] items-center justify-between px-3.5 py-2">
      <button
        type="button"
        disabled={!hasSelection}
        onClick={onDelete}
        aria-label="Delete selected"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#ff3b30] backdrop-blur-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:hover:bg-[#1c1c1e]"
      >
        <DeleteCircleIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled={!hasSelection}
        onClick={onForward}
        aria-label="Forward selected"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] backdrop-blur-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
      >
        <ForwardCircleIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
