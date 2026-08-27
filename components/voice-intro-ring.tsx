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
// span the AVATAR PHOTO itself instead of just the ring — Aleksandr caught
// this: "Сейчас крутится сама аватарка, а надо чтобы кольцо уходило по
// часовой стрелке по мере прослушивания" (the avatar itself is spinning;
// the ring should sweep clockwise as playback progresses, not rotate the
// photo). Rebuilt as a real progress ring: a separate absolutely-positioned
// SVG circle overlay, stroke-dashoffset driven by audio.currentTime /
// audio.duration via a rAF loop — the avatar element is never transformed.
//
// voiceIntroUrl comes from Resource.User.voiceIntroduction — confirmed
// against the live OpenAPI spec 2026-08-27 (was entirely unparsed before;
// see lib/a1/schemas.ts). It resolves through the same /api/media proxy
// as any other MediaDocument (avatarUrl, post photos).
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Big enough that stroke-width scales cleanly at both the 96px mobile and
// 150px desktop avatar sizes (viewBox is unitless, so the SVG just scales
// with its CSS box — see the wrapping <span>'s h-full w-full below).
const SIZE = 100;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function VoiceIntroRing({
  voiceIntroUrl,
  children,
}: {
  voiceIntroUrl: string | null;
  children: ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1, elapsed / duration
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio && audio.duration > 0 && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  if (!voiceIntroUrl) return <>{children}</>;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  // Clockwise sweep from 12 o'clock: rotate the SVG -90deg so 0,0 on the
  // circle starts at the top, then dashoffset shrinks as progress grows —
  // the drawn (colored) arc is what's already been listened to.
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Остановить голосовую визитку" : "Прослушать голосовую визитку"}
      className="group relative shrink-0 rounded-full transition-transform active:scale-95"
    >
      <audio
        ref={audioRef}
        src={voiceIntroUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
      {/* Avatar itself — never transformed, never rotated. */}
      <span className="block rounded-full p-[3px] sm:p-1">
        <span className="block rounded-full bg-app p-[2px] dark:bg-black sm:p-[3px]">{children}</span>
      </span>
      {/* Ring overlay: faint full track underneath, accent arc sweeping
          clockwise on top as the clip plays. Static (unfilled) blue→cyan
          gradient track when not yet started, so it's still discoverable
          as a ring before the first tap. */}
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
          strokeOpacity={playing ? 0.25 : 1}
        />
        {playing && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#voice-ring-gradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        )}
      </svg>
      {/* Corner badge — always visible so a voice intro is discoverable
          before the first tap, not just while playing. */}
      <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white ring-2 ring-app transition-transform group-hover:scale-110 dark:ring-black sm:h-8 sm:w-8">
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 sm:h-4 sm:w-4">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 sm:h-4 sm:w-4">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
