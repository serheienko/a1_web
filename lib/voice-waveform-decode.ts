// lib/voice-waveform-decode.ts
//
// 2026-09-04 (Aleksandr, live test: "Потом баг с эквалайзером" -- flagged
// again after the pending-vs-confirmed data-source-swap fix in lib/voice-
// local-waveform-cache.ts, which only covers a clip THIS browser tab
// itself just recorded and sent) -- the decode-from-actual-audio logic
// components/chat/voice-recorder.ts built to compute a SENT clip's own
// waveform (real PCM samples via Web Audio's decodeAudioData, guarded
// against Chrome/MediaRecorder's own truncated-decode quirk -- see that
// function's own header comment for the full trail) is exactly as valid
// for a RECEIVED clip once its audio is actually fetched: the accuracy
// problem was never "whose recording is this", it's "are we reading real
// decoded PCM or trusting whatever the server echoed back". Pulled out of
// voice-recorder.ts into its own module so components/chat/voice-
// bubble.tsx can run the identical decode for ANY voice bubble (not just
// a self-sent one still sitting in lib/voice-local-waveform-cache.ts),
// caching the result there the same way once it resolves.
export async function decodeWaveformFromBlob(
  blob: Blob,
  barCount: number,
  expectedDurationSeconds = 0,
): Promise<number[] | null> {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      if (channelData.length === 0) return null;
      // Same Chrome/MediaRecorder truncated-decode guard voice-recorder.ts's
      // own computeWaveformFromBlob uses: a decode covering well under the
      // real clip length is treated as a failed decode rather than silently
      // zero-padding the tail. `expectedDurationSeconds <= 0` (no known real
      // duration to compare against) skips the check instead of rejecting.
      if (expectedDurationSeconds > 0 && audioBuffer.duration < expectedDurationSeconds * 0.85) {
        return null;
      }
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
