// components/voice-intro-player.tsx
//
// Aleksandr, 2026-08-27: after the avatar ring shipped, asked for a
// second, fuller element for the same clip — "элемент который будет
// показывать возможность ускорения звука и возможность его прокрутки...
// Возможность выключить, наверное, не надо, окей? Ускорение и прокрутка
// нам нужна правильная" (an element with speed control + scrubbing; no
// need for an off/close control, but speed + seeking need to work
// properly). Reference: a screen recording of the mobile app's own voice
// message bar (play button, name, "Voice Message" caption, 1x speed
// pill, progress track) — this mirrors that shape but drops the close
// (X) button per his note, and reads from the same shared audio state as
// the ring (voice-intro-context.tsx) so only one clip ever plays.
"use client";

import { useVoiceIntro } from "@/components/voice-intro-context";

const RATE_LABELS: Record<number, string> = { 1: "1×", 1.5: "1.5×", 2: "2×" };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceIntroPlayer() {
  const voice = useVoiceIntro();
  if (!voice) return null;

  const { playing, currentTime, duration, rate, toggle, seek, cycleRate } = voice;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-full bg-card px-3 py-2 shadow-sm dark:border dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Воспроизвести голосовую визитку"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform active:scale-95"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-x-[1px]">
            <path d="M8 5v14l11-7-11-7Z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-ink dark:text-neutral-200">Голосовая визитка</div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-8 shrink-0 text-[11px] tabular-nums text-ink-faint">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Перемотка голосовой визитки"
            className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-700
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
          />
          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">{formatTime(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cycleRate}
        aria-label="Скорость воспроизведения"
        className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1.5 text-xs font-medium tabular-nums text-ink transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
      >
        {RATE_LABELS[rate] ?? `${rate}×`}
      </button>
    </div>
  );
}
