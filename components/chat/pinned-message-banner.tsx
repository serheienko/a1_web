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
//
// Fix Tracker (2026-09-07, "Есть ли возможность сделать мультизакреп?
// ... при нажатии на определенную кнопку или правую кнопку мыши
// показывать все закрепы в модалке одновременно") -- the chat can now
// carry more than one pin (app/api/chats/pin(ned)/route.ts's own
// headers). This banner still only ever shows ONE pin at a time (the
// most-recently-pinned message, same "one visible slot" mobile itself
// still has no design for) -- `pinCount`/`onOpenAll` below add the
// "see everything" escape hatch Aleksandr asked for: a small counter
// pill next to the preview when there's more than one pin, PLUS a
// right-click anywhere on the banner, both opening the new
// AllPinsModal (components/chat/all-pins-modal.tsx) rather than
// redesigning this banner into a carousel.
"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/t";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { TgsSticker } from "@/components/chat/tgs-sticker";
import { ChatFileTypeIcon, fileKindFromName } from "@/components/chat/file-type-icon";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { strippedPreviewDataUrl } from "@/lib/a1/media-proxy";
import { describeMessagePreview, mediaDocumentThumbnail, mediaDocumentFileName, type ChatMessage } from "@/lib/a1/chat-schemas";

// Fix Tracker (2026-09-07, "В закрепах надо слева показывать маленькую
// картинку превью, если закрепили фото и так же со всеми остальными
// энтити включая стикеры и все файлы") -- describeMessagePreview
// already exposed a photoDoc for a pinned photo (used below via
// photoUrl/ChatPreviewLine), but sticker/file pins had no thumbnail at
// all, just the plain accent bar + "Pinned Message" + label text. Same
// "always degrade to something real, never a dead render" thumbnail
// sources this app already ships elsewhere: a real (if tiny) sticker
// render for stickers (TgsSticker, same component chat bubbles and the
// media picker use), and the message's own size-stripped preview blob
// for a file (mediaDocumentThumbnail -- the exact same helper
// components/chat/blurred-photo.tsx already uses for photo bubbles),
// falling back to a plain file-type badge when no stripped preview
// came down for that particular document.
function StickerThumbFallback() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-black/5 dark:bg-white/10">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#989aa6]" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9 10.2h.01M15 10.2h.01" />
        <path d="M8.7 14.2c1.9 1.6 4.7 1.6 6.6 0" />
      </svg>
    </div>
  );
}

export function PinnedMessageBanner({
  pinnedMessage,
  onTap,
  onUnpin,
  unpinning,
  pinCount = 1,
  onOpenAll,
}: {
  pinnedMessage: ChatMessage;
  onTap: () => void;
  onUnpin: () => void;
  unpinning?: boolean;
  // Total number of currently-pinned messages in this chat -- 1 (the
  // default) hides the counter pill below entirely, same as before
  // this ticket for every chat that only ever has the one pin mobile
  // already supports.
  pinCount?: number;
  onOpenAll?: () => void;
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
    // Fix Tracker: "Откреп не всегда работает" -- mobile's own
    // _autoResetTimer uses 3s, which suits a tap-X-then-tap-Unpin
    // mobile gesture, but on the web a mouse-driven click often took
    // long enough (moving the cursor, reading "Відкріпити закріплене
    // повідомлення?" first) that the window closed back to the plain X
    // before the second click landed -- which then just re-opened the
    // confirmation instead of unpinning, reading as "doesn't work".
    // 6s keeps the same auto-reset behavior, just with real room for a
    // deliberate mouse click.
    resetTimer.current = window.setTimeout(() => setConfirming(false), 6000);
  }

  function confirmUnpin() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirming(false);
    onUnpin();
  }

  const preview = describeMessagePreview(pinnedMessage);
  const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;

  // See this file's own header comment above for the "why" -- this is
  // just picking which of the three real thumbnail sources applies (or
  // none, for text/voice/contact/calc/meeting, same as before this fix).
  const fileThumbUrl = preview.kind === "file" && preview.fileDoc ? mediaDocumentThumbnail(preview.fileDoc) : null;
  const thumbBox =
    preview.kind === "photo" && photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- proxied through /api/media.
      <img src={photoUrl} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
    ) : preview.kind === "sticker" && preview.stickerDoc ? (
      <TgsSticker
        src={getStableMediaProxyUrl(preview.stickerDoc)}
        size={32}
        fallback={<StickerThumbFallback />}
        previewUrl={strippedPreviewDataUrl(preview.stickerDoc)}
      />
    ) : preview.kind === "file" && preview.fileDoc ? (
      fileThumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- inline base64 blob, not a proxied URL.
        <img src={fileThumbUrl} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <ChatFileTypeIcon kind={fileKindFromName(mediaDocumentFileName(preview.fileDoc))} className="h-8 w-8" />
      )
    ) : null;

  return (
    <div
      onContextMenu={
        onOpenAll
          ? (e) => {
              e.preventDefault();
              onOpenAll();
            }
          : undefined
      }
      className="animate-pin-banner-in mt-2 flex h-[46px] w-full items-stretch overflow-hidden rounded-[20px] border border-black/10 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/80"
    >
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
          {thumbBox}
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
      {!confirming && pinCount > 1 && onOpenAll && (
        <button
          type="button"
          onClick={onOpenAll}
          className="animate-pin-content-fade flex shrink-0 items-center self-center rounded-full bg-black/5 px-2 py-1 text-[12px] font-semibold text-[#262a34]/70 transition hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
          aria-label="All pinned messages"
        >
          {pinCount}
        </button>
      )}
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
