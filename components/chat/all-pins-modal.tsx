// components/chat/all-pins-modal.tsx
//
// Fix Tracker (2026-09-07, Aleksandr: "Есть ли возможность сделать
// мультизакреп? У нас на мобе пока не реализовано. Суть в том, что
// можешь делать не ограниченное колво закрепов и при нажатии на
// определенную кнопку или правую кнопку мыши показывать все закрепы в
// модалке одновременно") -- app/api/chats/pin/route.ts and
// app/api/chats/pinned/route.ts's own headers cover the backend half
// (dropped the old auto-replace-the-pin behavior, which turned out to
// be a mobile client convention rather than a real backend limit);
// this modal is the "show all of them at once" UI he asked for,
// reachable either from PinnedMessageBanner's own counter pill or a
// right-click anywhere on that banner.
//
// Modeled directly on components/chat/reminders-list-modal.tsx (same
// centered card over a dim backdrop, same ChatPreviewLine + click-to-
// jump row shape) rather than inventing a second modal language --
// the two lists are genuinely the same shape: a set of messages, each
// summarized one line, each with a "jump to it in the chat" action and
// a destructive per-row action (delete a reminder there, unpin here).
"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/t";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { describeMessagePreview, type ChatMessage } from "@/lib/a1/chat-schemas";

function PinRow({
  message,
  onJump,
  onUnpin,
  unpinning,
}: {
  message: ChatMessage;
  onJump: () => void;
  onUnpin: () => void;
  unpinning: boolean;
}) {
  const [confirmingUnpin, setConfirmingUnpin] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function armUnpin() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirmingUnpin(true);
    // Same 6s window as PinnedMessageBanner's own confirm step (Fix
    // Tracker: "Откреп не всегда работает" -- a mouse click needs more
    // room than mobile's original 3s tap-then-tap gesture did).
    resetTimer.current = window.setTimeout(() => setConfirmingUnpin(false), 6000);
  }

  const preview = describeMessagePreview(message);
  const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onJump}
        className="flex min-w-0 flex-1 flex-col rounded-2xl bg-white/10 px-3.5 py-2.5 text-left text-white"
      >
        <ChatPreviewLine
          kind={preview.kind}
          text={preview.text}
          photoUrl={photoUrl}
          isForwarded={preview.isForwarded}
          className="truncate text-[14px] leading-tight"
        />
      </button>
      {confirmingUnpin ? (
        <button
          type="button"
          disabled={unpinning}
          onClick={() => {
            setConfirmingUnpin(false);
            onUnpin();
          }}
          className="shrink-0 self-center rounded-full bg-[#ff3b30] px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#e6352b] disabled:opacity-60"
        >
          <T uk="Відкріпити" en="Unpin" ru="Открепить" de="Lösen" es="Desfijar" fr="Détacher" pl="Odepnij" ptBR="Desafixar" zh="取消" />
        </button>
      ) : (
        <button
          type="button"
          onClick={armUnpin}
          aria-label="Unpin"
          className="group flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function AllPinsModal({
  pinnedMessages,
  unpinningId,
  onClose,
  onJumpToMessage,
  onUnpin,
}: {
  pinnedMessages: ChatMessage[];
  // The one pin currently mid-request (page.tsx's own `pinBusy` is a
  // single in-flight flag, not per-message -- see handleTogglePin's
  // own header -- so this mirrors that: only ever one unpin at a time
  // can be in flight from this modal either).
  unpinningId: number | null;
  onClose: () => void;
  onJumpToMessage: (messageId: number) => void;
  onUnpin: (message: ChatMessage) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[380px] flex-col rounded-2xl bg-[#2c2c2e]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-4">
          <p className="text-[17px] font-semibold text-white">
            <T
              uk="Закріплені повідомлення" en="Pinned messages" ru="Закреплённые сообщения" de="Angeheftete Nachrichten"
              es="Mensajes fijados" fr="Messages épinglés" pl="Przypięte wiadomości" ptBR="Mensagens fixadas" zh="置顶消息"
            />
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="group flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-close-spin" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2 min-h-[80px] flex-1 overflow-y-auto px-4 pb-4">
          {pinnedMessages.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-center text-[14px] text-white/60">
              <T
                uk="У цьому чаті немає закріплених повідомлень." en="No pinned messages in this chat." ru="В этом чате нет закреплённых сообщений."
                de="Keine angehefteten Nachrichten in diesem Chat." es="No hay mensajes fijados en este chat." fr="Aucun message épinglé dans cette discussion."
                pl="Brak przypiętych wiadomości w tym czacie." ptBR="Nenhuma mensagem fixada nesta conversa." zh="此对话中没有置顶消息。"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pinnedMessages.map((message) => (
                <PinRow
                  key={message._id}
                  message={message}
                  onJump={() => {
                    onJumpToMessage(Number(message._id));
                    onClose();
                  }}
                  onUnpin={() => onUnpin(message)}
                  unpinning={unpinningId === Number(message._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
