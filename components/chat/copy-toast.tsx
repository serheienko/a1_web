// components/chat/copy-toast.tsx
//
// 2026-09-05 (Aleksandr, MessageActionsMenu's Copy row + attached
// done.tgs: "Сделай чтобы 'скопировать' работало и показывай попап
// сверху, типа скопировано и добавляй в него анимацию, попап должен
// сам исчезать через 3 сек") -- a small top-of-viewport confirmation
// pill, deliberately its OWN component rather than something
// message-actions-menu.tsx renders internally: that menu unmounts the
// instant any row is picked (Copy included, same `onClose()` every
// other row already calls), so a toast living inside it would vanish
// with the menu instead of surviving its own 3 seconds. Lifted out to
// whichever page owns the actionsMenu state instead (app/chats/
// [chatId]/page.tsx, components/mini-chat-window.tsx), same way
// onReply already hands the "what happens next" decision back up to
// the parent rather than deciding it here.
//
// done.tgs (a gzipped Lottie/Telegram sticker) was decompressed to
// plain Lottie JSON and committed as public/animations/done.json --
// exactly the format components/lottie-player.tsx already knows how
// to play, so no new rendering path was needed, just its new `loop`
// prop (default true for every existing decorative-icon caller; this
// is the one caller passing `loop={false}` for a single play).
// done.json's own animation happens to run exactly 3 seconds at its
// authored frame rate (180 frames @ 60fps) -- the same 3s Aleksandr
// asked for the toast to live -- so the animation finishing and the
// toast's own dismiss timer land together instead of one cutting the
// other off early.
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LottiePlayer } from "@/components/lottie-player";
import { T, type Locale } from "@/components/t";

const VISIBLE_MS = 3000;

export function CopyToast({
  // A bump-only counter, not a boolean: two copies in a row (copy one
  // message, then immediately copy another) need the 3-second timer to
  // restart from zero each time, which a boolean staying `true` across
  // both clicks would never re-trigger the effect for.
  trigger,
  lang,
}: {
  trigger: number;
  lang: Locale;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setOpen(true);
    const hide = window.setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => window.clearTimeout(hide);
  }, [trigger]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden={!open}
      className={`pointer-events-none fixed left-1/2 top-4 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 py-1.5 pl-2 pr-4 text-[14px] font-medium text-white shadow-xl backdrop-blur-sm transition-all duration-300 ease-out dark:bg-neutral-800/95 ${
        open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      {/* key={trigger} forces a fresh LottiePlayer mount (and so a
          fresh one-shot play) every time the toast re-fires, instead of
          reusing an already-completed, frozen-on-last-frame instance. */}
      <LottiePlayer key={trigger} src="/animations/done.json" size={26} loop={false} />
      <span>
        <T uk="Скопійовано" en="Copied" ru="Скопировано" de="Kopiert" es="Copiado" fr="Copié" pl="Skopiowano" ptBR="Copiado" zh="已复制" />
      </span>
    </div>,
    document.body,
  );
}
