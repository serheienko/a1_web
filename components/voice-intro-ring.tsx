// components/voice-intro-ring.tsx
//
// Aleksandr, 2026-08-26/27: "У нас у профилем есть голосовые визитки,
// можешь реализовать такие круги в профе возле аватаров у пользователей у
// который она добавлена? Потом при нажатии появляется плеер играется звук
// и круг идет по анимации" — a gradient ring around the avatar for users
// who've recorded a voice intro (Figma ref: node 24332-3095, a blue→cyan
// ring around the profile photo). Click plays the clip.
//
// First cut span-nested an `animate-spin` around the whole avatar, which
// spun the AVATAR PHOTO itself instead of just the ring — Aleksandr caught
// this: "Сейчас крутится сама аватарка, а надо чтобы кольцо уходило по
// часовой стрелке по мере прослушивания" (the avatar itself is spinning;
// the ring should sweep clockwise as playback progresses, not rotate the
// photo). Rebuilt as a real progress ring: a separate absolutely-positioned
// SVG circle overlay, stroke-dashoffset driven by audio.currentTime /
// audio.duration — the avatar element is never transformed.
//
// 2026-08-27, second follow-up: Aleksandr asked for a richer player
// element too (speed + scrubbing — see voice-intro-player.tsx), explicit
// that the ring's own behavior/click-to-play should NOT change, only its
// rendering. So this component no longer owns the <audio> element or its
// state directly — that moved up to voice-intro-context.tsx, shared with
// the new player so only one clip can ever be playing at once. Everything
// this component renders is unchanged from the previous version.
//
// voiceIntroUrl comes from Resource.User.voiceIntroduction — confirmed
// against the live OpenAPI spec 2026-08-27 (was entirely unparsed before;
// see lib/a1/schemas.ts). It resolves through the same /api/media proxy
// as any other MediaDocument (avatarUrl, post photos).
"use client";

import type { ReactNode } from "react";
import { useVoiceIntro } from "@/components/voice-intro-context";

// Big enough that stroke-width scales cleanly at both the 96px mobile and
// 150px desktop avatar sizes (viewBox is unitless, so the SVG just scales
// with its CSS box — see the wrapping <span>'s h-full w-full below).
const SIZE = 100;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function VoiceIntroRing({ children }: { children: ReactNode }) {
  const voice = useVoiceIntro();

  if (!voice) return <>{children}</>;

  const { playing, currentTime, duration, toggle } = voice;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Остановить голосовую визитку" : "Прослушать голосовую визитку"}
      className="group relative shrink-0 rounded-full transition-transform active:scale-95"
    >
      {/* Avatar itself — never transformed, never rotated. */}
      <span className="block rounded-full p-[3px] sm:p-1">
        <span className="block rounded-full bg-app p-[2px] dark:bg-black sm:p-[3px]">{children}</span>
      </span>
      {/* Ring overlay: a faint full track underneath (so the ring never
          fully disappears once a clip finishes), plus a solid accent arc
          on top representing what's LEFT to listen to — full at rest,
          then eaten away clockwise starting at 12 o'clock as it plays.
          Aleksandr, 2026-08-27: "она из полной... должна становиться
          пустой по мере прослушивания" (should go from full to empty as
          it plays, not the reverse) — a negative dashoffset is what
          erodes the arc from its start point instead of growing it.
          
          2026-08-31: a same-day round trip on this exact rotate value.
          First read of "кольцо должно ехать слева направо" (the ring
          should travel left to right) was taken as "move the START
          point off of 12 o'clock", and changed this to -rotate-180
          (start at 9 o'clock/west instead). Aleksandr caught that on
          the actual live ring right after: "Ты сделал прослушивание
          опять каким-то странным) Должно начинаться в заполненном
          состоянии с 12 часов, слева-направо" -- 12 o'clock IS the
          correct start point; "слева-направо" describes the SWEEP
          direction from there (erode towards 3 o'clock first, i.e.
          rightward across the top from the 12 o'clock anchor), which
          is exactly what plain -rotate-90 already did before either
          change. So this is a straight revert back to -rotate-90.
          
          Confirmed this time by literally rendering both variants (a
          plain HTML/SVG copy of this exact markup -- same SIZE/STROKE/
          dasharray/dashoffset formula) live on the page at several
          progress values and screenshotting them side by side, rather
          than trusting a Canvas2D stand-in or hand-derived geometry
          again: -rotate-90 visibly starts the erosion right at 12
          o'clock and eats rightward/clockwise (12->3->6->9) as
          progress increases, matching Aleksandr's description exactly;
          -rotate-180 visibly starts at 9 o'clock instead, which is
          what he flagged as "странным" (weird). */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="voice-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#voice-ring-gradient)"
          strokeWidth={STROKE}
          strokeOpacity={0.25}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#voice-ring-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={-CIRCUMFERENCE * progress}
        />
      </svg>
      {/* Corner badge — always visible so a voice intro is discoverable
          before the first tap, not just while playing. Sized down along
          with the avatar itself (2026-08-27, see app/u/[username]/page.tsx)
          but not by the exact same ratio — a strictly-proportional shrink
          left the mic icon inside it unreadably small. */}
      <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-app transition-transform group-hover:scale-110 dark:ring-black sm:h-6 sm:w-6">
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5 sm:h-3 sm:w-3">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5 sm:h-3 sm:w-3">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
