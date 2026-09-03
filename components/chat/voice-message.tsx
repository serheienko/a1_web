// components/chat/voice-message.tsx
//
// Voice messages (Aleksandr, 2026-09-03) -- compose-time UI: the record
// button (mic idle / red pulsing while held / locked send-arrow), the
// floating recording bar (timer, cancel hint, lock pill), and the
// sound-reactive blob canvas behind the button.
//
// The blob is a close port of the Flutter app's own VoiceWaveBlob
// (lib/features/chat/presentation/chat_detail/components/
// voice_wave_blob.dart -- read directly this session, no EDEADLK) --
// same per-blob morphing-polygon-via-cubic-beziers algorithm, same
// amplitude smoothing constants. The PRNG that seeds each vertex's
// next target is NOT bit-for-bit ported (Dart's `_random.nextInt` vs
// `Math.random()` -- purely cosmetic noise, doesn't need to match) but
// every constant that affects the visible motion (speed range, angle
// jitter, scale-with-amplitude) is the same value as the Dart source.
//
// SCOPE NOTE (told to Aleksandr, not silently decided): this first pass
// ships the recording bar as a full replacement for the paperclip/
// textarea/send row while recording, not the Figma "(4) Voice + Text"
// exact mechanic (text field staying visible above a growing card) --
// he said he'd send a separate video for that combine flow, not sent
// yet as of this commit. Also deferred: the desktop "click outside a
// locked recording" confirm-dialog nuance from the Telegram Desktop
// reference (PLAN.md 6.98) -- this build only offers explicit Cancel/
// Send buttons in the locked bar, no outside-click handling at all,
// which is safer than a half-built silent-cancel-on-any-click.
"use client";

import { useEffect, useRef, type RefObject } from "react";
import { T, type Locale } from "@/components/t";
import { formatVoiceTimer, VOICE_MAX_SECONDS, type VoiceRecorderPointer } from "./voice-recorder";
import type { useVoiceRecorder } from "./voice-recorder";

// ---------------------------------------------------------------------------
// Sound-reactive blob canvas
// ---------------------------------------------------------------------------

type BlobShape = {
  n: number;
  L: number;
  radius: number[];
  angle: number[];
  radiusNext: number[];
  angleNext: number[];
  progress: number[];
  speed: number[];
  minRadius: number;
  maxRadius: number;
  seeded: boolean;
  amplitude: number;
  animateTo: number;
  animateDiff: number;
};

const BLOB_MAX_SCALE = 1.26;
const BLOB_MIN_SPEED = 0.8;
const BLOB_MAX_SPEED = 6.6;

function makeBlob(n: number): BlobShape {
  return {
    n,
    L: (4 / 3) * Math.tan(Math.PI / (2 * n)),
    radius: new Array(n).fill(0),
    angle: new Array(n).fill(0),
    radiusNext: new Array(n).fill(0),
    angleNext: new Array(n).fill(0),
    progress: new Array(n).fill(0),
    speed: new Array(n).fill(0),
    minRadius: -1,
    maxRadius: -1,
    seeded: false,
    amplitude: 0,
    animateTo: 0,
    animateDiff: 0,
  };
}

function generateVertex(b: BlobShape, r: number[], a: number[], i: number) {
  const angleDif = (360 / b.n) * 0.05;
  const radDif = b.maxRadius - b.minRadius;
  r[i] = b.minRadius + Math.random() * radDif;
  a[i] = (360 / b.n) * i + (Math.random() * 2 - 1) * angleDif;
  b.speed[i] = 0.017 + 0.003 * Math.random();
}

function seedBlob(b: BlobShape) {
  for (let i = 0; i < b.n; i++) {
    generateVertex(b, b.radius, b.angle, i);
    generateVertex(b, b.radiusNext, b.angleNext, i);
    b.progress[i] = 0;
  }
}

function configureBlob(b: BlobShape, maxRadius: number, minRadius: number) {
  const first = !b.seeded;
  b.maxRadius = maxRadius;
  b.minRadius = minRadius;
  if (first) {
    seedBlob(b);
    b.seeded = true;
  }
}

function setBlobAmplitude(b: BlobShape, target: number) {
  const clamped = Math.min(1, Math.max(0, target));
  if (b.amplitude === 0 && clamped > 0) {
    b.amplitude = clamped;
    b.animateTo = clamped;
    b.animateDiff = 0;
    return;
  }
  b.animateTo = clamped;
  b.animateDiff = (b.animateTo - b.amplitude) / 17;
}

function updateBlob(b: BlobShape, amplitude: number, speedScale: number) {
  for (let i = 0; i < b.n; i++) {
    b.progress[i]! += b.speed[i]! * BLOB_MIN_SPEED + amplitude * b.speed[i]! * BLOB_MAX_SPEED * speedScale;
    if (b.progress[i]! >= 1) {
      b.progress[i] = 0;
      b.radius[i] = b.radiusNext[i]!;
      b.angle[i] = b.angleNext[i]!;
      generateVertex(b, b.radiusNext, b.angleNext, i);
    }
  }
}

function rotatePoint(x: number, y: number, cx: number, cy: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function drawBlob(ctx: CanvasRenderingContext2D, b: BlobShape, cx: number, cy: number, colors: [string, string]) {
  if (b.animateTo !== b.amplitude) {
    b.amplitude += b.animateDiff * 16;
    if (b.animateDiff > 0) {
      if (b.amplitude > b.animateTo) b.amplitude = b.animateTo;
    } else if (b.amplitude < b.animateTo) {
      b.amplitude = b.animateTo;
    }
  }
  updateBlob(b, b.amplitude, 0.8);

  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    const nextIndex = i + 1 < b.n ? i + 1 : 0;
    const progress = b.progress[i]!;
    const progressNext = b.progress[nextIndex]!;
    const r1 = b.radius[i]! * (1 - progress) + b.radiusNext[i]! * progress;
    const r2 = b.radius[nextIndex]! * (1 - progressNext) + b.radiusNext[nextIndex]! * progressNext;
    const angle1 = b.angle[i]! * (1 - progress) + b.angleNext[i]! * progress;
    const angle2 = b.angle[nextIndex]! * (1 - progressNext) + b.angleNext[nextIndex]! * progressNext;
    const l = b.L * (Math.min(r1, r2) + (Math.max(r1, r2) - Math.min(r1, r2)) / 2);

    const sp1 = rotatePoint(cx, cy - r1, cx, cy, angle1);
    const sp2 = rotatePoint(cx + l, cy - r1, cx, cy, angle1);
    const ep1 = rotatePoint(cx, cy - r2, cx, cy, angle2);
    const ep2 = rotatePoint(cx - l, cy - r2, cx, cy, angle2);

    if (i === 0) ctx.moveTo(sp1.x, sp1.y);
    ctx.bezierCurveTo(sp2.x, sp2.y, ep2.x, ep2.y, ep1.x, ep1.y);
  }
  ctx.closePath();

  const scale = Math.min(BLOB_MAX_SCALE, 1 + 0.21 * b.amplitude);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  const gradient = ctx.createLinearGradient(cx - 50, cy - 50, cx + 50, cy + 50);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

const BLOB_COLORS: [string, string] = ["rgba(43,206,255,0.3)", "rgba(9,118,227,0.3)"];

export function VoiceBlobCanvas({ amplitudeRef, size = 56 }: { amplitudeRef: RefObject<number>; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<BlobShape[] | null>(null);
  if (!blobsRef.current) {
    blobsRef.current = [8, 9, 10].map((n) => makeBlob(n));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const blobs = blobsRef.current!;
    for (const b of blobs) configureBlob(b, size / 2 / 1.5, size / 2 / 1.8);

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, size, size);
      const level = Math.min(1, Math.max(0, amplitudeRef.current ?? 0));
      for (const b of blobs) {
        setBlobAmplitude(b, level);
        drawBlob(ctx, b, cx, cy, BLOB_COLORS);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="pointer-events-none" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Copy (RU/EN CONFIRMED live off the mobile app + Telegram Desktop
// reference, see PLAN.md 6.96-6.98; other locales are this session's own
// translation, same convention as every other multi-locale string this
// file already carries -- correct on first live mismatch, don't guess
// past it).
// ---------------------------------------------------------------------------

type StringKey = "slideToCancel" | "cancel" | "releaseOutsideToCancel" | "clickOutsideToCancel" | "micDenied" | "recording";

const VOICE_STRINGS: Record<StringKey, Record<Locale, string>> = {
  slideToCancel: {
    uk: "Вліво -- скасувати",
    en: "Slide to cancel",
    ru: "Влево -- отмена",
    de: "Nach links wischen zum Abbrechen",
    es: "Desliza para cancelar",
    fr: "Glissez pour annuler",
    pl: "Przesuń w lewo, aby anulować",
    ptBR: "Deslize para cancelar",
    zh: "左滑取消",
  },
  cancel: {
    uk: "Скасувати",
    en: "Cancel",
    ru: "Отмена",
    de: "Abbrechen",
    es: "Cancelar",
    fr: "Annuler",
    pl: "Anuluj",
    ptBR: "Cancelar",
    zh: "取消",
  },
  releaseOutsideToCancel: {
    uk: "Відпустіть за межами кола, щоб скасувати",
    en: "Release outside of circle to cancel",
    ru: "Отпустите за пределами круга для отмены",
    de: "Außerhalb des Kreises loslassen zum Abbrechen",
    es: "Suelta fuera del círculo para cancelar",
    fr: "Relâchez en dehors du cercle pour annuler",
    pl: "Puść poza kołem, aby anulować",
    ptBR: "Solte fora do círculo para cancelar",
    zh: "在圆圈外松开可取消",
  },
  clickOutsideToCancel: {
    uk: "Натисніть за межами кола, щоб скасувати",
    en: "Click outside of circle to cancel",
    ru: "Нажмите за пределами круга для отмены",
    de: "Außerhalb des Kreises klicken zum Abbrechen",
    es: "Haz clic fuera del círculo para cancelar",
    fr: "Cliquez en dehors du cercle pour annuler",
    pl: "Kliknij poza kołem, aby anulować",
    ptBR: "Clique fora do círculo para cancelar",
    zh: "在圆圈外点击可取消",
  },
  micDenied: {
    uk: "Немає доступу до мікрофона",
    en: "Microphone access denied",
    ru: "Нет доступа к микрофону",
    de: "Kein Mikrofonzugriff",
    es: "Sin acceso al micrófono",
    fr: "Accès au micro refusé",
    pl: "Brak dostępu do mikrofonu",
    ptBR: "Sem acesso ao microfone",
    zh: "无法访问麦克风",
  },
  recording: {
    uk: "Запис",
    en: "Recording",
    ru: "Запись",
    de: "Aufnahme",
    es: "Grabando",
    fr: "Enregistrement",
    pl: "Nagrywanie",
    ptBR: "Gravando",
    zh: "录音中",
  },
};

function vt(key: StringKey, lang: Locale): string {
  return VOICE_STRINGS[key][lang];
}

// ---------------------------------------------------------------------------
// Record button -- press-hold gesture surface. Renders as: idle mic ->
// red pulsing circle (with the blob canvas behind it) while held/locked
// -> a send-arrow once locked (click sends).
// ---------------------------------------------------------------------------

type Recorder = ReturnType<typeof useVoiceRecorder>;

export function VoiceRecordButton({ recorder, disabled, lang }: { recorder: Recorder; disabled?: boolean; lang: Locale }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  function centerOf(el: HTMLElement): VoiceRecorderPointer {
    const rect = el.getBoundingClientRect();
    return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  }

  if (recorder.state === "locked") {
    return (
      <button
        type="button"
        onClick={() => recorder.stopAndSend()}
        aria-label="Send voice message"
        className="group relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 dark:bg-[#0c8ce9]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    );
  }

  const isActive = recorder.state === "recording" || recorder.state === "requesting";

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-label={vt("recording", lang)}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const center = centerOf(e.currentTarget);
        void recorder.startPress({ clientX: e.clientX, clientY: e.clientY }, center, e.pointerId);
      }}
      onPointerMove={(e) => {
        if (isActive) recorder.onPointerMove({ clientX: e.clientX, clientY: e.clientY });
      }}
      onPointerUp={(e) => {
        if (isActive) recorder.onPointerUp({ clientX: e.clientX, clientY: e.clientY });
      }}
      onPointerCancel={(e) => {
        if (isActive) recorder.onPointerUp({ clientX: e.clientX, clientY: e.clientY });
      }}
      className={`relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${
        isActive
          ? "border-transparent bg-[#ff3b30] text-white"
          : "border-neutral-200 bg-white/90 text-neutral-400 backdrop-blur-sm hover:border-neutral-300 hover:text-neutral-600 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#adafbb] dark:hover:border-[#3a3a3a] dark:hover:text-white"
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 -m-1 flex items-center justify-center">
          <VoiceBlobCanvas amplitudeRef={recorder.amplitudeRef} size={56} />
        </div>
      )}
      <svg width="30" height="30" viewBox="0 0 33 33" fill="none" className="relative" aria-hidden="true">
        <rect x="14.6384" y="8.85" width="8.72105" height="13.5653" rx="4.36053" stroke="currentColor" strokeWidth="1.7" />
        <path d="M18.1996 29.9994C18.1996 30.4413 18.5578 30.7994 18.9996 30.7994C19.4415 30.7994 19.7996 30.4413 19.7996 29.9994L18.9996 29.9994L18.1996 29.9994ZM18.9996 25.9586L18.1996 25.9586L18.1996 29.9994L18.9996 29.9994L19.7996 29.9994L19.7996 25.9586L18.9996 25.9586Z" fill="currentColor" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Recording bar -- replaces the paperclip/textarea pair while a
// recording is in progress (unlocked or locked); VoiceRecordButton
// itself still sits at the row's trailing edge, unchanged, so the same
// element keeps pointer capture for the whole gesture (2026-09-03 fix,
// see app/chats/[chatId]/page.tsx's own comment on the compose-row
// wiring for why that matters). `flex-1` here, not the standalone
// `w-full max-w-[470px]` this used to have, since it's now a flex
// sibling of that button inside the row's own already-constrained
// max-w-[470px] container, not the entire row by itself. See this
// file's header re: this being a scope-trimmed stand-in for the Figma
// "text stays visible above a growing card" combine mechanic.
// ---------------------------------------------------------------------------

export function VoiceRecordingBar({ recorder, lang }: { recorder: Recorder; lang: Locale }) {
  const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const timer = formatVoiceTimer(recorder.seconds);
  const nearMax = recorder.seconds >= VOICE_MAX_SECONDS - 10;

  if (recorder.state === "locked") {
    return (
      <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-[22px] border border-neutral-200 bg-white/90 px-3.5 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
        <button
          type="button"
          onClick={() => recorder.pauseResume()}
          aria-label={recorder.isPaused ? "Resume" : "Pause"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
        >
          {recorder.isPaused ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          )}
        </button>
        <span className={`shrink-0 text-[15px] tabular-nums text-[#262a34] dark:text-white ${nearMax ? "text-[#ff3b30]" : ""}`}>{timer}</span>
        <button
          type="button"
          onClick={() => recorder.cancelRecording()}
          className="flex-1 truncate text-center text-[14px] font-medium text-[#989aa6] transition hover:text-[#ff3b30] dark:text-[#8a8a8f]"
        >
          <T
            uk={vt("cancel", "uk")}
            en={vt("cancel", "en")}
            ru={vt("cancel", "ru")}
            de={vt("cancel", "de")}
            es={vt("cancel", "es")}
            fr={vt("cancel", "fr")}
            pl={vt("cancel", "pl")}
            ptBR={vt("cancel", "ptBR")}
            zh={vt("cancel", "zh")}
          />
        </button>
      </div>
    );
  }

  const cancelHintKey: StringKey = isTouch ? "slideToCancel" : "releaseOutsideToCancel";
  const dim = Math.max(0.35, 1 - recorder.cancelProgress);

  return (
    <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-[22px] border border-neutral-200 bg-white/90 px-3.5 py-2 backdrop-blur-sm dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff3b30] opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff3b30]" />
      </span>
      <span className={`shrink-0 text-[15px] tabular-nums text-[#262a34] dark:text-white ${nearMax ? "text-[#ff3b30]" : ""}`}>{timer}</span>
      <span className="flex-1 truncate text-center text-[13px] text-[#989aa6] dark:text-[#8a8a8f]" style={{ opacity: dim }}>
        <T
          uk={vt(cancelHintKey, "uk")}
          en={vt(cancelHintKey, "en")}
          ru={vt(cancelHintKey, "ru")}
          de={vt(cancelHintKey, "de")}
          es={vt(cancelHintKey, "es")}
          fr={vt(cancelHintKey, "fr")}
          pl={vt(cancelHintKey, "pl")}
          ptBR={vt(cancelHintKey, "ptBR")}
          zh={vt(cancelHintKey, "zh")}
        />
      </span>
      {/* Lock pill -- fades/rises toward the record button as lockProgress
          climbs to 1, same up-drag-to-lock affordance as mobile. */}
      <div
        className="pointer-events-none flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition dark:bg-white/10 dark:text-[#adafbb]"
        style={{ opacity: 0.4 + recorder.lockProgress * 0.6, transform: `translateY(${-recorder.lockProgress * 6}px)` }}
        aria-hidden="true"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
    </div>
  );
}

export function VoiceMicDeniedNotice({ lang, onDismiss }: { lang: Locale; onDismiss: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[470px] items-center justify-between gap-3 rounded-[22px] border border-[#ff3b30]/30 bg-[#ff3b30]/10 px-3.5 py-2.5 text-[13.5px] text-[#ff3b30]">
      <span>
        <T
          uk={vt("micDenied", "uk")}
          en={vt("micDenied", "en")}
          ru={vt("micDenied", "ru")}
          de={vt("micDenied", "de")}
          es={vt("micDenied", "es")}
          fr={vt("micDenied", "fr")}
          pl={vt("micDenied", "pl")}
          ptBR={vt("micDenied", "ptBR")}
          zh={vt("micDenied", "zh")}
        />
      </span>
      <button type="button" onClick={onDismiss} className="shrink-0 text-[#ff3b30]/70 hover:text-[#ff3b30]" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
