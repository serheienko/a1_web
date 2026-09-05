// lib/voice-local-waveform-cache.ts
//
// 2026-09-04 (Aleksandr, live test after the previous two waveform
// fixes: "Я когда только записываю, только записал, видишь, вот
// нижняя часть... это показало как оно вот только записало. А потом
// оно раз и поменяло отображение и показывает начало, как будто бы
// есть звук, а потом нету" -- the PENDING voice bubble, right after
// recording, shows a full accurate waveform; the moment it swaps over
// to the CONFIRMED bubble, the SAME clip suddenly shows real bars only
// at the start and a flat tail) -- root-caused this as a swap between
// two entirely different DATA SOURCES, not a decode bug in either one
// on its own: components/chat/voice-bubble.tsx's PendingVoiceBubble
// renders straight off the LOCAL 0..1 waveform this browser itself
// just computed off the real recorded audio (voice-recorder.ts's
// computeWaveformFromBlob, already hardened against Chrome's
// truncated-decode quirk), while VoiceMessageBubble -- the confirmed
// bubble that replaces it once the server's own doc reconciles in --
// decodes the base64 `attribute-audio.waveform` string the SERVER
// echoes back on that doc instead. Both round-trip pieces on OUR side
// (encodeBase64Waveform -> decodeWaveformBars, 5-bit pack/unpack) were
// individually verified correct, so a server-side re-derivation (or
// truncation) between upload and confirm is the remaining explanation
// -- outside this web client's control to fix directly.
//
// Rather than trust whatever the server hands back for a clip THIS
// browser tab itself just recorded (when we already hold the exact
// real waveform locally, known-good), this is a small in-memory cache
// keyed by the upload's own `fileReference` -- the one stable id that
// survives from uploadAndSendVoice's confirm step (app/chats/[chatId]/
// page.tsx) through to the confirmed MessageMediaDocument's own
// `fileReference` field. VoiceMessageBubble checks here FIRST and only
// falls back to decoding the server's own attribute-audio.waveform when
// nothing local exists -- i.e. every message actually RECEIVED from the
// other side, or one sent in an earlier browser session/before a page
// reload, both of which have no local recording to fall back on anyway
// and are unaffected by this.
//
// Same plain module-level Map pattern lib/voice-playback-store.ts's own
// header already documents for this codebase (no React Context needed
// -- the writer, uploadAndSendVoice, and the reader, VoiceMessageBubble,
// don't share a tree beyond both living somewhere under one chat page).
//
// 2026-09-05 (t006, still "эквалайзер ломается" after every round
// above) -- root cause was never the decode math, it's that this cache
// was keyed by `fileReference`, which this codebase already proved (see
// lib/a1/stable-media-url.ts's own header, the identical bug for photo
// thumbnails) the backend REISSUES with a new value for the same
// document on every poll. uploadAndSendVoice writes the cache once,
// right after upload.confirm, using THAT response's fileReference; but
// by the time VoiceMessageBubble reads it back for the confirmed
// message, load()'s own poll has already fetched the doc fresh with a
// rotated fileReference -- a guaranteed cache miss, silently falling
// through to the server's own inaccurate attribute-audio.waveform
// every single time, which looked exactly like "the server swapped the
// data" but was actually this cache never being hit at all past the
// very first render. `_id` is the one field stable-media-url.ts already
// proved survives that same rotation untouched, and
// app/api/upload/confirm/route.ts's MediaDocumentSchema guarantees it's
// present on the confirm response too -- so this cache is now keyed by
// `_id` instead, exactly like stable-media-url.ts's own cache is.
const MAX_ENTRIES = 100; // small clips only (0..1 floats, ~48 numbers each) -- capped so a long session can't leak memory

const cache = new Map<string, number[]>();

export function rememberLocalVoiceWaveform(docId: string, waveform: number[]): void {
  if (!docId || waveform.length === 0) return;
  cache.delete(docId); // re-insert at the end so eviction below stays LRU-ish
  cache.set(docId, waveform);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function getLocalVoiceWaveform(docId: string): number[] | null {
  return cache.get(docId) ?? null;
}
