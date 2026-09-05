// components/chat/voice-now-playing-bar.tsx
//
// 2026-09-03 (Aleksandr, sending the reference screenshot after the
// earlier Figma mock was flagged as the OLDER version, PLAN.md 6.99:
// "Аватар слева, управление сгрупировано справа. это акттуальный UI")
// -- the cross-page "now playing" mini-bar, last piece of PLAN.md 6.99's
// implementation order that was still blocked. CONFIRMED layout off
// that screenshot: avatar + stacked name/"Voice Message" subtitle on
// the LEFT, play/pause + "1x" + close (X) grouped on the RIGHT, a thin
// progress line along the card's own bottom edge.
//
// Mounted globally as a sibling of <SiteNav/>/<ChatsFab/>/
// <CreatePostFab/> in app/layout.tsx (same reasoning those already
// have -- shown on every page, not just /chats) rather than inside the
// chat page itself, so playback keeps running -- and stays visible and
// controllable -- after the user navigates away from the chat that
// started it. Reads/drives lib/voice-playback-store.ts, the single
// app-wide store components/chat/voice-bubble.tsx now delegates all
// actual <audio> ownership to (see that file's own header for the full
// "why not own audio locally" reasoning).
//
// Deliberately NOT scoped to hide itself while the user is already
// looking at the very chat that contains the playing bubble (which
// would make it redundant with that bubble's own inline player) --
// always shows whenever something's playing, on every route including
// the source chat. A dedupe pass is possible future polish, not
// required for this milestone.
//
// 2026-09-04 (Aleksandr, mobile screenshots: "оно перекрывает как бы
// меню наше... невозможно типа навигацию нормально делать" -- this bar
// used to be `position: fixed` at a hardcoded `env(safe-area-inset-
// top)+8px` offset, painted at z-50 directly on top of <SiteNav/>'s own
// `sticky top-0 z-40` box (components/site-nav.tsx) instead of beside
// it, hiding the logo/tabs/avatar row underneath and eating its clicks
// (higher z-index wins the hit-test too, not just the paint). Fix:
// switched from `fixed` (removed from flow, always relative to the
// viewport) to `sticky`, positioned as SiteNav's own next sibling here
// -- app/layout.tsx already renders it directly after <SiteNav/>, so as
// a normal flow box it now pushes {children} (a chat list's "Чати"
// heading/search/rows, a feed, ...) down by its own real height instead
// of floating over the top of it, exactly the "подвинуть вниз... и
// сверху поставить эту штуку" Aleksandr asked for -- while `top` still
// pins it in place during scroll, same as before, just anchored below
// the nav instead of below the safe-area inset. The offset itself
// reuses `--site-nav-h`, the CSS var SiteNav already publishes off a
// live ResizeObserver for this exact class of problem (see that
// component's own 2026-09-02 comment) -- so this never needs its own
// hardcoded nav-height guess, and stays correct if that bar's height
// ever changes (safe-area inset differs per device, its search slot
// can grow on some pages). z-30 (below SiteNav's z-40) is now purely
// defensive -- flow layout already keeps them from ever overlapping --
// rather than the thing doing the separating.
"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { usePathname } from "next/navigation";
import {
  closeVoicePlayback,
  cycleVoiceRate,
  getVoicePlaybackSnapshot,
  seekVoiceFraction,
  subscribeVoicePlayback,
  toggleVoice,
} from "@/lib/voice-playback-store";
import { PauseGlyph, PlayGlyph } from "@/components/chat/voice-bubble";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { CachedAvatar } from "@/components/cached-avatar";

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function MicFallbackGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function VoiceNowPlayingBar() {
  const { entry, playing, elapsed, rate } = useSyncExternalStore(
    subscribeVoicePlayback,
    getVoicePlaybackSnapshot,
    getVoicePlaybackSnapshot,
  );
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  // 2026-09-03 (Aleksandr, second live test round: "когда мы находимся
  // в чате, поп-ап показывать не надо, сверху там где вы, голосовое
  // уведомление") -- this bar used to show on every route, deliberately
  // including the very chat that started playback (see this file's own
  // header comment, now superseded here). While an actual open
  // conversation is on screen, its own VoiceMessageBubble already gives
  // full playback controls inline, so the floating bar on top of it is
  // redundant chrome he does not want there. Still shows on /chats
  // itself (the conversation LIST, no inline player visible) and on
  // every other route, same as before.
  if (!entry || /^\/chats\/.+/.test(pathname ?? "")) return null;

  const progressFraction = entry.totalSeconds > 0 ? Math.min(1, elapsed / entry.totalSeconds) : 0;

  // 2026-09-03 (Aleksandr, second live test round: "у того попапа
  // должна бути строка, ну не строка, а типа скролл, який можна
  // прокрутити, а його немає") -- the thin progress line used to be
  // purely decorative (just a styled div, no handlers). Same drag-to-
  // seek pattern components/chat/voice-bubble.tsx's own waveform
  // already uses (pointer capture + seekVoiceFraction off the pointer's
  // fraction across the track), just against this bar's own single
  // track instead of per-bar waveform columns.
  function fractionFromPointer(clientX: number): number {
    const el = progressRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return (clientX - rect.left) / rect.width;
  }
  function onProgressPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekVoiceFraction(fractionFromPointer(e.clientX));
  }
  function onProgressPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    seekVoiceFraction(fractionFromPointer(e.clientX));
  }
  function onProgressPointerUp(e: PointerEvent<HTMLDivElement>) {
    setScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // no-op -- pointer capture may already have been released (e.g.
      // pointercancel fired first).
    }
  }

  return (
    <div
      className="animate-popover-up sticky top-[calc(var(--site-nav-h,0px)+8px)] z-30 mx-auto mt-2 mb-2 w-[calc(100%-24px)] max-w-[420px] overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-xl dark:bg-[#1c1c1e]/95"
    >
      <div className="flex items-center gap-2.5 px-3 py-2">
        {entry.avatarUrl ? (
          // 2026-09-05 (Aleksandr: "кешировать вообще всё, если оно
          // хотя бы 1 раз открывалось") -- this bar shows on every
          // voice-message play, site-wide, so it's a high-frequency
          // avatar surface -- same persistent Cache Storage-backed
          // CachedAvatar every other avatar surface on the site now
          // uses.
          <CachedAvatar src={entry.avatarUrl} blurDataURL={BLUR_DATA_URL} size={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7]/10 text-[#335ef7] dark:bg-[#0c8ce9]/15 dark:text-[#0c8ce9]">
            <MicFallbackGlyph className="h-4 w-4" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold text-[#262a34] dark:text-white">{entry.title}</span>
          <span className="truncate text-[12px] text-[#989aa6] dark:text-[#adafbb]">{entry.subtitle}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => toggleVoice(entry)}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center text-[#262a34] transition hover:opacity-70 dark:text-white"
          >
            {playing ? <PauseGlyph className="h-4 w-4" /> : <PlayGlyph className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={cycleVoiceRate}
            aria-label="Playback speed"
            className="rounded-full px-1.5 py-1 text-[13px] font-medium tabular-nums text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          >
            {rate}x
          </button>
          <button
            type="button"
            onClick={closeVoicePlayback}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center text-[#262a34] transition hover:opacity-70 dark:text-white"
          >
            <CloseGlyph className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={progressRef}
        onPointerDown={onProgressPointerDown}
        onPointerMove={onProgressPointerMove}
        onPointerUp={onProgressPointerUp}
        onPointerCancel={onProgressPointerUp}
        className="relative h-[6px] w-full shrink-0 cursor-pointer touch-none select-none bg-black/5 dark:bg-white/10"
      >
        <div
          className={`h-full bg-[#335ef7] dark:bg-[#0c8ce9] ${scrubbing ? "" : "transition-[width] duration-200 ease-linear"}`}
          style={{ width: `${progressFraction * 100}%` }}
        />
      </div>
    </div>
  );
}
