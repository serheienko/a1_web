// components/chat/voice-recorder.ts
//
// Voice messages (Aleksandr, 2026-09-03: "давай следующей фичой сделаем
// запись голосового сообщения") -- the recording ENGINE: mic capture,
// live amplitude sampling (drives the sound-reactive blob behind the
// record button), and the press-hold / drag-to-lock / drag-to-cancel
// gesture state machine. No UI here -- see voice-message.tsx for the
// recording bar / bubble / blob canvas that consume this hook.
//
// Gesture thresholds and copy are CONFIRMED against three independent
// sources this session (see PLAN.md 6.96-6.99): the Flutter mobile app's
// own source (chat_input_field_voice.dart -- not directly readable this
// session past EDEADLK, so gesture *gist* only, from live screen
// recordings), the mobile screen recordings themselves (frame-by-frame),
// and a Telegram Desktop screen recording for the mouse-specific
// behavior. Exact pixel thresholds below (LOCK_DRAG_PX/CANCEL_DRAG_PX)
// are NOT numerically confirmed from source -- picked to visually match
// the recordings, tune if they feel off.
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { resampleWaveform } from "@/lib/a1/chat-schemas";

export const VOICE_MAX_SECONDS = 600; // 10:00 cap (CONFIRMED, both mobile + desktop references)
export const VOICE_MIN_MS = 600; // shorter than this is silently discarded (CONFIRMED via mobile recording)
const VOICE_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const VOICE_BITRATE = 32000; // voice notes stay small -- lower than profile-editor.tsx's 64kbps intro clip
const LOCK_DRAG_PX = 60; // drag up this far (from the initial touch/click point) to lock hands-free
const CANCEL_DRAG_PX = 80; // touch only: drag left this far to cancel
const BUTTON_HIT_RADIUS = 28; // desktop only: release outside this radius (from the button's own center) cancels
const WAVEFORM_SAMPLE_MS = 100; // ~10 samples/sec while recording, for the local optimistic waveform
const LOCAL_WAVEFORM_BARS = 48;

export type VoiceRecorderState = "idle" | "requesting" | "recording" | "locked" | "denied";

export type VoiceRecordingResult = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  /** 0..1 normalised bars -- the LOCAL approximate waveform, shown until the
   * server's own attribute-audio.waveform reconciles in (see PLAN.md 6.96's
   * confirmed finding that send-input carries no attributes at all -- the
   * server derives the authoritative one itself). */
  waveform: number[];
};

export type VoiceRecorderPointer = { clientX: number; clientY: number };

export function useVoiceRecorder(onFinish: (result: VoiceRecordingResult) => void) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Live drag feedback while unlocked -- how close to the cancel/lock
  // threshold the pointer currently is, [0,1] each, for the UI to fade/
  // nudge the hint text and lock pill.
  const [cancelProgress, setCancelProgress] = useState(0);
  const [lockProgress, setLockProgress] = useState(0);

  const amplitudeRef = useRef(0); // read directly by the canvas blob's own rAF loop, no re-render per frame
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);
  const originRef = useRef<VoiceRecorderPointer | null>(null);
  const buttonCenterRef = useRef<VoiceRecorderPointer | null>(null);
  const lockedRef = useRef(false);
  const cancelledRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  // 2026-09-03 (Aleksandr, second live test round: "нажал один тап, оно
  // начало полностью записывать нон-стоп... нечего отпустить") --
  // startPress is async (awaits getUserMedia, which can easily outlast
  // a quick tap-release). A pointerup that arrives while still
  // "requesting" has nothing to act on yet: mediaRecorderRef.current is
  // still null (recorder.start() only runs after the await below), so
  // the old onPointerUp handler's stop() call was a silent no-op -- the
  // release was simply lost, and once getUserMedia DID resolve moments
  // later the code had no memory the button was already let go, so it
  // just kept recording with nothing left that could stop it. This
  // remembers that a release already happened during the requesting
  // window so startPress own continuation below can finalize
  // immediately once there is actually a recorder to stop.
  const pendingReleaseRef = useRef(false);

  const cleanupStream = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    sampleTimerRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    amplitudeRef.current = 0;
  }, []);

  const tickAmplitude = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sumSquares = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i]! - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / buf.length);
    // RMS for normal speech sits well under 1 -- scale up so the blob
    // actually reacts visibly instead of barely twitching.
    amplitudeRef.current = Math.min(1, rms * 4);
    rafRef.current = requestAnimationFrame(tickAmplitude);
  }, []);

  const resetGestureState = useCallback(() => {
    originRef.current = null;
    buttonCenterRef.current = null;
    lockedRef.current = false;
    cancelledRef.current = false;
    pointerIdRef.current = null;
    setCancelProgress(0);
    setLockProgress(0);
    setIsPaused(false);
  }, []);

  const startPress = useCallback(
    async (
      pointer: VoiceRecorderPointer,
      buttonCenter: VoiceRecorderPointer,
      pointerId: number | null,
      opts?: { autoLock?: boolean },
    ) => {
      if (state === "recording" || state === "locked" || state === "requesting") return;
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("denied");
        return;
      }
      setState("requesting");
      originRef.current = pointer;
      buttonCenterRef.current = buttonCenter;
      pointerIdRef.current = pointerId;
      // 2026-09-03 (Aleksandr, live test: "лонг тап тут проблематично на
      // этой версии... нажимаем запись одним тапом коротким, у нас она
      // начинается сразу... максимально просто, без замочка на мобильной
      // версии") -- mobile web's press-and-hold + drag-to-lock gesture
      // was unreliable (iOS Safari's own long-press text-selection
      // callout kept racing it, see VoiceRecordButton's own touch-safety
      // classes for that half of the fix) and just awkward to hold with
      // a thumb. `opts.autoLock` (set by VoiceRecordButton for any
      // `pointerType === "touch"` press) skips the whole unlocked/drag
      // phase entirely -- lockedRef.current is already true by the time
      // the async continuation below reads it, so state resolves
      // straight to "locked" the instant the mic is ready, same as if
      // the user had actually dragged up. onPointerMove/onPointerUp
      // already both no-op once lockedRef.current is true, so lifting
      // the finger right after the initial tap correctly does nothing --
      // recording just keeps going until an explicit Cancel/Send tap.
      lockedRef.current = opts?.autoLock === true;
      cancelledRef.current = false;
      pendingReleaseRef.current = false;
      samplesRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyserRef.current = analyser;
        source.connect(analyser);

        const mimeType = VOICE_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: VOICE_BITRATE })
          : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const elapsedMs = Date.now() - startedAtRef.current;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          cleanupStream();
          const wasCancelled = cancelledRef.current;
          resetGestureState();
          setState("idle");
          setIsPaused(false);
          if (wasCancelled || elapsedMs < VOICE_MIN_MS) return;
          const waveform = resampleWaveform(samplesRef.current.length ? samplesRef.current : [0], LOCAL_WAVEFORM_BARS).map((v) =>
            Math.min(1, Math.max(0.06, v)),
          );
          onFinish({
            blob,
            mimeType: recorder.mimeType || "audio/webm",
            durationSeconds: elapsedMs / 1000,
            waveform,
          });
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        startedAtRef.current = Date.now();
        // 2026-09-03 (Aleksandr, live test: "замок не всегда
        // срабатывает") -- traced to a second async-gap race, same
        // family as pendingReleaseRef above but for the LOCK gesture
        // instead of release: a fast drag-up-to-lock can finish (
        // onPointerMove already set lockedRef.current = true and
        // called setState("locked")) WHILE getUserMedia was still
        // resolving. This continuation used to always setState(
        // "recording") unconditionally right here, silently
        // overwriting that already-locked state the instant the mic
        // finished initializing -- so a lock that visually engaged a
        // moment earlier would revert back to the plain held-button
        // state with nothing left to explain why. Reading
        // lockedRef.current here instead of forcing "recording"
        // preserves a lock that already happened during the requesting
        // window.
        setState(lockedRef.current ? "locked" : "recording");
        setSeconds(0);
        // The gesture already ended while the mic permission/init was
        // still pending (see pendingReleaseRef own declaration above) --
        // finalize right away instead of leaving this recording running
        // with no way left to stop it. A near-zero-length clip like
        // this is exactly what VOICE_MIN_MS in onstop below silently
        // discards, so a plain quick tap correctly produces nothing
        // sent, same as it would if the whole gesture had been fast
        // enough to land after getUserMedia resolved.
        if (pendingReleaseRef.current) {
          pendingReleaseRef.current = false;
          stopAndSend();
          return;
        }
        tickAmplitude();
        timerRef.current = setInterval(() => {
          setSeconds((s) => {
            const next = s + 1;
            if (next >= VOICE_MAX_SECONDS) {
              // 10:00 cap -- CONFIRMED both mobile + desktop references show
              // the button freezing to the locked/send-ready state at this
              // point. Simplification (documented, not yet asked of
              // Aleksandr): rather than freeze-and-wait-for-a-manual-tap,
              // this auto-finalizes and sends immediately -- the rare-edge
              // "recorded a full 10 minutes" case, worth revisiting if he'd
              // rather it wait for an explicit send tap.
              stopAndSend();
            }
            return next;
          });
        }, 1000);
        sampleTimerRef.current = setInterval(() => {
          samplesRef.current.push(amplitudeRef.current);
        }, WAVEFORM_SAMPLE_MS);
      } catch {
        cleanupStream();
        resetGestureState();
        setState("denied");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, cleanupStream, resetGestureState, tickAmplitude],
  );

  const onPointerMove = useCallback((pointer: VoiceRecorderPointer) => {
    const origin = originRef.current;
    if (!origin || lockedRef.current) return;
    const dx = pointer.clientX - origin.clientX;
    const dy = pointer.clientY - origin.clientY;

    // Drag up -> lock (both touch and mouse).
    const upProgress = Math.min(1, Math.max(0, -dy / LOCK_DRAG_PX));
    setLockProgress(upProgress);
    if (-dy >= LOCK_DRAG_PX) {
      lockedRef.current = true;
      setLockProgress(1);
      setState("locked");
      return;
    }

    // Drag left -> cancel preview (touch's own gesture; desktop cancels by
    // releasing outside the button's circular hit-area instead, checked in
    // onPointerUp below, not here).
    const leftProgress = Math.min(1, Math.max(0, -dx / CANCEL_DRAG_PX));
    setCancelProgress(leftProgress);
  }, []);

  const stopAndSend = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
  }, []);

  const onPointerUp = useCallback(
    (pointer: VoiceRecorderPointer) => {
      if (lockedRef.current) return; // hands-free now -- release does nothing
      if (state === "requesting") {
        // Mic permission/init has not resolved yet -- there is no
        // MediaRecorder to stop (mediaRecorderRef.current is still
        // null), so remember the release for startPress own async
        // continuation to finalize instead (see pendingReleaseRef own
        // declaration above for the full race this closes).
        pendingReleaseRef.current = true;
        return;
      }
      const center = buttonCenterRef.current;
      if (center) {
        const dist = Math.hypot(pointer.clientX - center.clientX, pointer.clientY - center.clientY);
        if (dist > BUTTON_HIT_RADIUS) {
          cancelRecording();
          return;
        }
      }
      if (cancelProgress >= 1) {
        cancelRecording();
        return;
      }
      stopAndSend();
    },
    [state, cancelProgress, cancelRecording, stopAndSend],
  );

  const pauseResume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= VOICE_MAX_SECONDS) stopAndSend();
          return next;
        });
      }, 1000);
    }
  }, [stopAndSend]);

  return useMemo(
    () => ({
      state,
      seconds,
      isPaused,
      cancelProgress,
      lockProgress,
      amplitudeRef,
      startPress,
      onPointerMove,
      onPointerUp,
      cancelRecording,
      stopAndSend,
      pauseResume,
      dismissDenied: () => setState("idle"),
    }),
    [state, seconds, isPaused, cancelProgress, lockProgress, startPress, onPointerMove, onPointerUp, cancelRecording, stopAndSend, pauseResume],
  );
}

export function formatVoiceTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
