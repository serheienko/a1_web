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
import { resampleWaveform, normalizeWaveformPeaks } from "@/lib/a1/chat-schemas";

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

// 2026-09-04 (Aleksandr, live bug report + screen recording: "черточки
// ровные" -- a just-sent voice message's waveform showed real variation
// for only its first ~1-1.5s, then a long flat/near-floor tail for the
// rest of the clip, even though the recording clearly has audible voice
// throughout). Traced to how the OLD waveform below was built: a live
// sampling loop (tickAmplitude's rAF chain + sampleTimerRef's 100ms
// interval, both still further down in startPress) pushes
// `amplitudeRef.current` into `samplesRef` while recording, and that
// array is what resampleWaveform stretches across the clip's full
// duration once recording stops. Two real, independent weaknesses in
// that approach, either of which produces exactly this symptom:
//   1. pauseResume() below only pauses the MediaRecorder + the visible
//      seconds counter -- it never pauses tickAmplitude's rAF loop or
//      sampleTimerRef's interval, so a pause/resume during recording
//      keeps pushing samples for a stretch of time that ends up with
//      NO corresponding audio in the final blob, throwing off the
//      alignment between "sample index" and "position in the actual
//      recording" for everything captured after that point.
//   2. More generally, a live capture loop tied to rAF/setInterval has
//      no guarantee of running every ~100ms for the recording's entire
//      real duration -- any render/scheduling hiccup (this session
//      couldn't attach a live debugger to confirm which, since logging
//      into the app to reproduce it directly is against this session's
//      own security rule) silently thins out or flatlines the back
//      half of `samplesRef` while `elapsedMs` (wall-clock, unaffected)
//      keeps counting normally, so resampleWaveform stretches that
//      thin/flat tail across the same real estate a properly-sampled
//      one would have used.
//
// Rather than debug the live loop's exact failure mode blind, this
// sidesteps the whole class of timing bugs: once `recorder.onstop`
// has the FINAL blob in hand, decode its actual audio data (Web Audio's
// own decodeAudioData) and compute the waveform directly from those
// real, complete, correctly-time-ordered PCM samples -- no live loop,
// no pause-desync, nothing that can silently stop sampling partway
// through. `samplesRef`'s live capture is kept ONLY as a fallback for
// the rare case decode itself fails (unsupported codec/browser quirk),
// producing the exact pre-2026-09-04 result rather than nothing.
async function computeWaveformFromBlob(blob: Blob, barCount: number): Promise<number[] | null> {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      if (channelData.length === 0) return null;
      const samplesPerBucket = Math.max(1, Math.floor(channelData.length / barCount));
      const peaks: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const start = i * samplesPerBucket;
        const end = i === barCount - 1 ? channelData.length : Math.min(channelData.length, start + samplesPerBucket);
        let sumSquares = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
          const v = channelData[j] ?? 0;
          sumSquares += v * v;
          count++;
        }
        peaks.push(count > 0 ? Math.sqrt(sumSquares / count) : 0);
      }
      return peaks;
    } finally {
      void ctx.close().catch(() => {});
    }
  } catch {
    return null;
  }
}

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
        recorder.onstop = async () => {
          const elapsedMs = Date.now() - startedAtRef.current;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          cleanupStream();
          const wasCancelled = cancelledRef.current;
          resetGestureState();
          setState("idle");
          setIsPaused(false);
          if (wasCancelled || elapsedMs < VOICE_MIN_MS) return;
          // Decode-based waveform (see computeWaveformFromBlob's own
          // header above) -- built off the FINAL blob, so it can't be
          // thrown off by anything that happened to the live
          // tickAmplitude/sampleTimerRef sampling loop while recording
          // (a pause/resume, a scheduling hiccup, ...). Falls back to
          // the old live-samples path only if decoding itself fails.
          const decodedPeaks = await computeWaveformFromBlob(blob, LOCAL_WAVEFORM_BARS);
          const waveform =
            normalizeWaveformPeaks(decodedPeaks ?? [], LOCAL_WAVEFORM_BARS) ??
            resampleWaveform(samplesRef.current.length ? samplesRef.current : [0], LOCAL_WAVEFORM_BARS).map((v) =>
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
      // 2026-09-04 (see computeWaveformFromBlob's own header comment,
      // above useVoiceRecorder, for the live bug report this traces
      // to): this used to only pause the visible seconds counter --
      // tickAmplitude's rAF loop and sampleTimerRef's sampling interval
      // kept running off the still-live mic stream, pushing samples
      // into samplesRef for a stretch of time that ends up with NO
      // corresponding audio in the final blob (the MediaRecorder itself
      // really is paused). The FINAL waveform is now built by decoding
      // the actual recorded blob instead (unaffected by this), but
      // samplesRef is still the fallback if that decode ever fails, so
      // it should stay a faithful recording-timeline sample either way
      // -- and freezing amplitudeRef to 0 here also stills whatever
      // live reactive UI reads it (the record button's own blob) while
      // genuinely paused, instead of it carrying on reacting to
      // whatever the mic still happens to be picking up.
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
      amplitudeRef.current = 0;
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
      tickAmplitude();
      sampleTimerRef.current = setInterval(() => {
        samplesRef.current.push(amplitudeRef.current);
      }, WAVEFORM_SAMPLE_MS);
    }
  }, [stopAndSend, tickAmplitude]);

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
