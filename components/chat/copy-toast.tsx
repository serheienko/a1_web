// components/chat/copy-toast.tsx
//
// 2026-09-05 (Aleksandr, MessageActionsMenu's Copy row + attached
// done.tgs: "Сделай чтобы 'скопировать' работало и показывай попап
// сверху, типа скопировано и добавляй в него анимацию, попап должен
// сам исчезать через 3 сек") -- a small confirmation pill, deliberately
// its OWN component rather than something message-actions-menu.tsx
// renders internally: that menu unmounts the instant any row is
// picked (Copy included, same `onClose()` every other row already
// calls), so a toast living inside it would vanish with the menu
// instead of surviving its own 3 seconds. Lifted out to whichever page
// owns the actionsMenu state instead (app/chats/[chatId]/page.tsx,
// components/mini-chat-window.tsx), same way onReply already hands the
// "what happens next" decision back up to the parent rather than
// deciding it here.
//
// 2026-09-05 follow-up (Aleksandr, live Telegram reference video: "Еще
// сделай такой попап сверху на кнопку «скопировать», и реально копируй
// текст, анимацию я тебе пришлю позже") -- was a fixed pill centered at
// the TOP of the viewport; the reference shows it instead appearing
// right ON TOP of the message bubble that was actually copied, then
// fading out in place. Repositioned to float over the same
// `anchorRect` MessageActionsMenu already uses to place itself next to
// that bubble (both page.tsx and mini-chat-window.tsx already compute
// it via `e.currentTarget.getBoundingClientRect()` when opening the
// menu), centered on the bubble's own center point instead of a fixed
// screen location. The real `navigator.clipboard.writeText` call
// itself was already there before this follow-up -- both callers pass
// `onCopy` only when there is actual text to copy, so this pass is
// about *where* the confirmation shows, not whether the copy itself
// happens. The animation is still done.json (see below) as a
// placeholder; Aleksandr said he will send a proper animation asset
// separately -- swapping it later is just changing the `src` below,
// nothing structural.
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
// Keeps the pill fully on-screen even when the copied bubble sits right
// at an edge (a narrow mini-chat window, a message near the top of a
// short viewport) -- same margin concept message-actions-menu.tsx
// already clamps its own popup against.
const VIEWPORT_MARGIN = 14;

export type CopyToastState = {
  // A bump-only value, not a boolean: two copies in a row (copy one
  // message, then immediately copy another, possibly at the very same
  // spot) need the 3-second timer -- and the anchor -- to restart from
  // zero each time. Date.now() also doubles as a fresh React key for
  // the LottiePlayer below.
  trigger: number;
  // The copied bubble's own on-screen rect at the moment Copy was
  // pressed (MessageActionsMenu's `anchorRect`, reused as-is rather
  // than recomputed) -- the pill centers itself on this rect's own
  // center point.
  anchorRect: DOMRect;
};

export function CopyToast({
  state,
  lang,
  minTop,
}: {
  state: CopyToastState | null;
  lang: Locale;
  // 2026-09-05 follow-up (Aleksandr, live screenshot: a message copied
  // right at the top of the chat put this pill directly on top of the
  // sticky header, covering the contact's name) -- the anchor-to-
  // bubble behavior above is otherwise correct (the whole point of
  // that follow-up), this only raises the floor `top` can never go
  // above so the pill lands just BELOW the header instead of over it.
  // Optional: app/chats/[chatId]/page.tsx passes its own live-measured
  // headerHeight; any caller that skips this (components/mini-chat-
  // window.tsx, whose header never sits over the message list to begin
  // with) keeps the old VIEWPORT_MARGIN-only clamp.
  minTop?: number;
}) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!state) return;
    const { anchorRect } = state;
    const left = Math.min(
      Math.max(anchorRect.left + anchorRect.width / 2, VIEWPORT_MARGIN),
      window.innerWidth - VIEWPORT_MARGIN,
    );
    const top = Math.min(
      Math.max(anchorRect.top + anchorRect.height / 2, minTop ?? VIEWPORT_MARGIN),
      window.innerHeight - VIEWPORT_MARGIN,
    );
    setPoint({ left, top });
    setOpen(true);
    const hide = window.setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => window.clearTimeout(hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (typeof document === "undefined" || !point) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      style={{ left: point.left, top: point.top }}
      className={`pointer-events-none fixed z-[70] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-neutral-900/90 py-1.5 pl-2 pr-4 text-[14px] font-medium text-white shadow-xl backdrop-blur-sm transition-all duration-300 ease-out dark:bg-neutral-800/95 ${
        open ? "scale-100 opacity-100" : "scale-90 opacity-0"
      }`}
    >
      {/* key={state.trigger} forces a fresh LottiePlayer mount (and so a
          fresh one-shot play) every time the toast re-fires, instead of
          reusing an already-completed, frozen-on-last-frame instance. */}
      <LottiePlayer key={state?.trigger} src="/animations/done.json" size={26} loop={false} />
      <span>
        <T uk="Скопійовано" en="Copied" ru="Скопировано" de="Kopiert" es="Copiado" fr="Copié" pl="Skopiowano" ptBR="Copiado" zh="已复制" />
      </span>
    </div>,
    document.body,
  );
}
