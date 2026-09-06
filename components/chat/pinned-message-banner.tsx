// components/chat/pinned-message-banner.tsx
//
// "Pin" feature (Aleksandr, reference screenshot: message context
// menu's "Pin" row -- "Посмотри еще функцию закрепов сообщений «пин»
// найди документацию и подготовься к имплементации"). Ports mobile's
// own PinnedMessageItem (lib/features/chat/presentation/chat_detail/
// components/pinned_message_item.dart) in spirit, read directly off
// its source rather than guessed:
//   - accent bar + "Pinned Message" title + a one-line preview of the
//     pinned message's own content, reused straight from the same
//     reply-quote preview machinery this app already has
//     (ChatPreviewLine + describeMessagePreview) rather than a second
//     preview implementation.
//   - tapping the body scrolls the pinned message into view via
//     `onTap` (the caller wires this to the same data-message-id +
//     highlight mechanism app/chats/[chatId]/page.tsx already has for
//     the photo viewer's own "Show in chat" action) -- a no-op if that
//     message isn't in the currently-loaded window, same accepted
//     limitation that file's own resolveReplyPreview documents for its
//     reply-quote lookup.
//   - the right-side control is a close (X) that does NOT unpin
//     immediately -- tapping it enters a 3-second "Unpin pinned
//     message?" confirmation (mobile's own _enterConfirmation/
//     _autoResetTimer), during which the X morphs into an actual
//     "Unpin" pill; only THAT confirms the unpin (`onUnpin`).
//     Auto-resets back to the plain X after 3s if never confirmed, and
//     whenever the pinned message itself changes (a fresh pin should
//     never silently reopen an already-showing "Unpin?" prompt for the
//     previous one).
//
// 2026-09-06 (Fix Tracker: "Сузь закреп на ширину нашего чатового окна
// начиная от стрелки назад, заканчивая аватаром справа" + "делай чтобы
// он сверху появлялся плавно, с эффектом fade in" + "чтобы работали
// плавно все механики внутри него и тексты") -- this component no
// longer sets its own horizontal margin (the caller, app/chats/
// [chatId]/page.tsx, now wraps it in the SAME `mx-auto w-full max-w-
// [470px] px-4` container the header row above it uses, so the banner
// lines up edge-to-edge with the back-arrow/avatar instead of its own
// fixed mx-3); it mounts with .animate-pin-banner-in (fade + slight
// drop, app/globals.css), and the two inner states below (default row
// / confirm row) each carry .animate-pin-content-fade + a `key` so
// swapping between them (and the pinned message's own text/preview
// changing under an already-open banner) crossfades instead of
// snapping.
"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/t";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { describeMessagePreview, type ChatMessage } from "@/lib/a1/chat-schemas";

export function PinnedMessageBanner({
  pinnedMessage,
  onTap,
  onUnpin,
  unpinning,
}: {
  pinnedMessage: ChatMessage;
  onTap: () => void;
  onUnpin: () => void;
  unpinning?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    // A new (or cleared) pin resets the confirmation state -- same as
    // mobile's own didUpdateWidget guard -- so switching pins never
    // re-appears already showing "Unpin pinned message?" for the old
    // one.
    setConfirming(false);
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, [pinnedMessage._id]);

  function enterConfirmation() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirming(true);
    resetTimer.current = window.setTimeout(() => setConfirming(false), 3000);
  }

  function confirmUnpin() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirming(false);
    onUnpin();
  }

  const preview = describeMessagePreview(pinnedMessage);
  const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;

  return (
    <div className="animate-pin-banner-in mt-2 flex h-[46px] w-full items-stretch overflow-hidden rounded-[20px] border border-black/10 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/80">
      {confirming ? (
        <div key="confirm" className="animate-pin-content-fade flex min-w-0 flex-1 items-center px-4">
          <span className="truncate text-[15px] font-medium leading-tight text-[#1c1c1e] dark:text-white">
            <T
              uk="Відкріпити закріплене повідомлення?" en="Unpin pinned message?" ru="Открепить закреплённое сообщение?"
              de="Angeheftete Nachricht lösen?" es="¿Desfijar el mensaje fijado?" fr="Détacher le message épinglé ?"
              pl="Odpiąć przypiętą wiadomość?" ptBR="Desafixar a mensagem fixada?" zh="取消置顶消息？"
            />
          </span>
        </div>
      ) : (
        <button key="default" type="button" onClick={onTap} className="animate-pin-content-fade flex min-w-0 flex-1 items-center gap-2.5 px-2.5 text-left">
          <span className="h-[30px] w-[3px] shrink-0 rounded-full bg-[#262a34] dark:bg-white" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight text-[#262a34] dark:text-white">
              <T uk="Закріплене повідомлення" en="Pinned Message" ru="Закреплённое сообщение" de="Angeheftete Nachricht" es="Mensaje fijado" fr="Message épinglé" pl="Przypięta wiadomość" ptBR="Mensagem fixada" zh="置顶消息" />
            </span>
            <ChatPreviewLine
              kind={preview.kind}
              text={preview.text}
              photoUrl={photoUrl}
              isForwarded={preview.isForwarded}
              className="truncate text-[13px] leading-tight text-[#262a34]/70 dark:text-white/70"
            />
          </span>
        </button>
      )}
      {/* 2026-09-06 (Aleksandr, скриншот: красная кнопка "Відкріпити"
          обрезана правым краем баннера -- "Не влезла кнопка. можешь
          весь бар расширять с 2-х сторон чуть, чтобы был норм паддинг,
          если она не влезает?") -- корень не в ширине бара, а в этом
          слоте: он был жёстко w-[54px], под маленький крестик (h-8 w-8)
          в обычном состоянии. В состоянии подтверждения сюда встаёт
          пилюля "Відкріпити", которая заметно шире 54px, а у контейнера
          выше стоит overflow-hidden -- отсюда и срез ровно по краю.
          Бар при этом специально сужен по ширине чатового окна (см.
          §6.235 и его же просьбу "Сузь закреп на ширину нашего чатового
          окна"), поэтому расширять его обратно нельзя -- вместо этого
          слот теперь в режиме подтверждения занимает ровно столько,
          сколько нужно пилюле, со своим правым паддингом, а вопрос
          слева ужимается через min-w-0 + truncate, если места мало.
          Клипа не будет ни при какой ширине окна. */}
      <div
        className={`flex shrink-0 items-center justify-center ${
          confirming ? "pl-1 pr-3" : "w-[54px]"
        }`}
      >
        {confirming ? (
          <button
            key="unpin"
            type="button"
            disabled={unpinning}
            onClick={confirmUnpin}
            className="animate-pin-content-fade rounded-full bg-[#ff3b30] px-3 py-1 text-[13px] font-semibold text-white transition hover:bg-[#e6352b] disabled:opacity-60"
          >
            <T uk="Відкріпити" en="Unpin" ru="Открепить" de="Lösen" es="Desfijar" fr="Détacher" pl="Odepnij" ptBR="Desafixar" zh="取消" />
          </button>
        ) : (
          <button
            key="close"
            type="button"
            onClick={enterConfirmation}
            aria-label="Close"
            className="animate-pin-content-fade flex h-8 w-8 items-center justify-center rounded-full text-[#262a34]/60 transition hover:bg-black/5 hover:text-[#262a34] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
