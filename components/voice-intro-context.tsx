// components/voice-intro-context.tsx
//
// Aleksandr, 2026-08-27: after the ring (components/voice-intro-ring.tsx)
// shipped, he asked for a second, richer element for the same voice
// intro — "элемент который будет показывать возможность ускорения звука и
// возможность его прокрутки" (an element showing speed control and
// scrubbing), explicitly: "Возможность выключить, наверное, не надо" (no
// need for an off/mute control) but "ускорение и прокрутка нам нужна
// правильная" (speed + scrubbing need to work properly) — see
// components/voice-intro-player.tsx.
//
// The ring's click-to-play behavior is NOT changing ("на кольце... там
// ничего не меняем, кроме самого отображения" — don't touch the ring's
// behavior, only how it's rendered) — but the ring and the new player
// bar both need to control the SAME <audio> element, or you could get two
// clips playing at once. So the single <audio> element and its state move
// up here, into a context provider that wraps both — VoiceIntroRing and
// VoiceIntroPlayer are now both just consumers.
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const RATES = [1, 1.5, 2] as const;
type Rate = (typeof RATES)[number];

type VoiceIntroState = {
  playing: boolean;
  // Aleksandr, 2026-08-27, second follow-up: the player bar (see
  // voice-intro-player.tsx) shouldn't hide again once you've paused —
  // "если нажимаю паузу, он остается, потому что мы можем захотеть
  // потом с этой точки прокрутить или прослушать или нажать x2" (if I
  // hit pause it should stay, since I might want to scrub or change
  // speed from that point). So visibility isn't `playing` anymore, it's
  // "has this ever been tapped" — true forever once set, only reset by
  // a fresh page load (new provider instance).
  revealed: boolean;
  currentTime: number;
  duration: number;
  rate: Rate;
  toggle: () => void;
  seek: (time: number) => void;
  cycleRate: () => void;
};

const VoiceIntroContext = createContext<VoiceIntroState | null>(null);

export function VoiceIntroProvider({ url, children }: { url: string | null; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<Rate>(RATES[0]);

  // Drives both the ring's progress arc and the player's scrubber off the
  // real <audio> clock via rAF (smoother than the coarse `timeupdate`
  // event) — reading audio.duration here too, not just from
  // onLoadedMetadata, since that event has been flaky for this proxied
  // media URL in testing.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        setCurrentTime(audio.currentTime);
        if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const toggle = useCallback(() => {
    setRevealed(true);
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Aleksandr (screen recording, 2026-08-31): after a clip finishes,
      // the ring/scrubber should sit EMPTY (fully played), not snap back
      // to full -- see onEnded below, which used to force this rewind
      // immediately on end instead of on the NEXT play. `audio.ended` is
      // only true right after natural completion; a manual pause never
      // sets it, so this never affects a normal resume-from-pause tap.
      if (audio.ended) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      void audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // No "off" — just cycles 1x -> 1.5x -> 2x -> 1x per Aleksandr's note.
  //
  // RATES[idx] below is typed `Rate | undefined` because tsconfig has
  // noUncheckedIndexedAccess on and idx isn't a literal — this actually
  // broke the Vercel build the first time around (assigning that to
  // audio.playbackRate: number, and returning it from a Rate-typed
  // updater, both failed strict typecheck; the deploy silently kept
  // serving the previous build while this sat broken). `?? RATES[0]` is
  // a real fallback for the type checker, never for logic — the modulo
  // always yields a valid tuple index.
  const cycleRate = useCallback(() => {
    setRate((r) => {
      const idx = (RATES.indexOf(r) + 1) % RATES.length;
      const next = RATES[idx] ?? RATES[0];
      const audio = audioRef.current;
      if (audio) audio.playbackRate = next;
      return next;
    });
  }, []);

  if (!url) return <>{children}</>;

  return (
    <VoiceIntroContext.Provider value={{ playing, revealed, currentTime, duration, rate, toggle, seek, cycleRate }}>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          // 2026-08-31 fix (screen recording: ring flashed back to a
          // full circle the instant a clip finished, instead of ending
          // empty like Aleksandr wants -- "запись слева направо бежит
          // от полной к пустой"): this used to force currentTime back to
          // 0 right here, which is exactly what produced that flash --
          // progress = currentTime/duration became 0 = full ring, right
          // when it should read 1 = empty. Now it reflects the real
          // "fully played" position instead, and the rewind-to-0 only
          // happens when the NEXT play starts (see toggle() above).
          setPlaying(false);
          const audio = audioRef.current;
          if (audio && Number.isFinite(audio.duration)) setCurrentTime(audio.duration);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden"
      />
      {children}
    </VoiceIntroContext.Provider>
  );
}

export function useVoiceIntro() {
  return useContext(VoiceIntroContext);
}
