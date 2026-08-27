// components/voice-intro-ring.tsx
//
// Aleksandr, 2026-08-26/27: "У нас у профилем есть голосовые визитки,
// можешь реализовать такие круги в профе возле аватаров у пользователей у
// который она добавлена? Потом при нажатии появляется плеер играется звук
// и круг идет по анимации" — a gradient ring around the avatar for users
// who've recorded a voice intro (Figma ref: node 24332-3095, a blue→cyan
// ring around the profile photo). Click plays the clip; the ring spins
// while it's playing, and a small badge in the corner signals "tap to
// listen" even before it's pressed.
//
// voiceIntroUrl comes from Resource.User.voiceIntroduction — confirmed
// against the live OpenAPI spec 2026-08-27 (was entirely unparsed before;
// see lib/a1/schemas.ts). It resolves through the same /api/media proxy
// as any other MediaDocument (avatarUrl, post photos).
"use client";

import { useRef, useState, type ReactNode } from "react";

export function VoiceIntroRing({
  voiceIntroUrl,
  children,
}: {
  voiceIntroUrl: string | null;
  children: ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      {/* Ring: conic-gradient sweep in a padded circle, spinning while the
          clip plays. A page-background inset between the gradient and the
          avatar is what makes it read as a ring instead of a glow. */}
      <span
        className={"block rounded-full p-[3px] sm:p-1" + (playing ? " animate-spin" : "")}
        style={{
          background: "conic-gradient(from 0deg, var(--color-accent), #7dd3fc, var(--color-accent))",
          animationDuration: "2.2s",
        }}
      >
        <span className="block rounded-full bg-app p-[2px] dark:bg-black sm:p-[3px]">{children}</span>
      </span>
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
