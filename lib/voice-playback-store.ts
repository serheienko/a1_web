// lib/voice-playback-store.ts
//
// 2026-09-03 (Aleksandr, Figma "now-playing bar" reference confirmed
// live -- avatar+name grouped LEFT, play/1x/close grouped RIGHT, thin
// progress line along the bottom edge): the cross-page mini-bar from
// PLAN.md 6.99's own implementation order. A voice note started from
// inside components/chat/voice-bubble.tsx has to keep playing (and stay
// controllable) after the user navigates away from that chat entirely
// -- so playback can't be owned by the bubble component itself, which
// unmounts the instant its page does.
//
// Same "plain module-level external store, not React Context" pattern
// lib/account-menu-open.ts already established for exactly this shape
// of problem (two otherwise-unrelated trees -- here, any VoiceMessage-
// Bubble deep inside app/chats/[chatId]/page.tsx, and components/chat/
// voice-now-playing-bar.tsx mounted as a sibling of <SiteNav/> in app/
// layout.tsx -- that need to share one boolean/object without Context
// forcing a provider around the whole app just to thread it). Both
// sides read via useSyncExternalStore(subscribeVoicePlayback,
// getVoicePlaybackSnapshot).
//
// This ALSO replaces voice-bubble.tsx's own former per-component
// `currentlyPlayingAudio` module singleton + private <audio> element --
// there is now exactly ONE <audio> element for the whole app, owned
// here, so "only one voice note plays at a time" and "the mini-bar
// reflects/controls whatever's actually playing" are the same guarantee
// instead of two separate mechanisms that could drift apart.

export type VoicePlaybackEntry = {
  /** MessageMediaDocument._id -- identifies which bubble "owns" the
   *  currently loaded clip. */
  docId: string;
  url: string;
  /** Sender display name (peer's name for a received note, "You" for
   *  one you sent yourself) -- see voice-bubble.tsx's own VOICE_BUBBLE_
   *  STRINGS for how mine/theirs picks this. */
  title: string;
  /** Always the localized "Voice Message" label -- CONFIRMED literal
   *  subtitle text, PLAN.md 6.99's own now-playing-bar reference. */
  subtitle: string;
  avatarUrl: string | null;
  /** From the doc's own attribute-audio.duration (voiceDurationSeconds)
   *  -- used as the seek/progress-fraction denominator whenever the
   *  audio element's own `duration` isn't loaded yet (NaN before
   *  metadata arrives), same fallback role it already played inside
   *  the bubble component pre-refactor. */
  totalSeconds: number;
};

type VoicePlaybackSnapshot = {
  entry: VoicePlaybackEntry | null;
  playing: boolean;
  elapsed: number;
  rate: number;
  // 2026-09-03 (Aleksandr, live production capture: a real sent clip's
  // own attribute-audio.duration came back 0 -- traced to the classic
  // MediaRecorder-produced webm issue, its container header carries no
  // usable duration unless something actually probes the decoded audio
  // -- so voiceDurationSeconds(doc) alone is not reliable). The <audio>
  // element itself always resolves the REAL duration once its metadata
  // loads (browsers decode the actual stream, they don't trust the
  // possibly-broken header either) -- surfaced here so voice-bubble.tsx
  // can prefer it over the doc's own attribute for whichever clip is
  // CURRENTLY loaded, same "browser decode wins over a flaky server
  // value" fix already proven for the seek math below. NaN until a
  // clip's metadata has actually loaded.
  duration: number;
};

// Playback-speed cycle -- 1x/1.5x/2x. Not itself a captured/confirmed
// step sequence (the Figma reference only ever shows a static "1x"),
// just the conventional set every other messenger's own voice player
// cycles through; revisit if Aleksandr sends a reference that pins a
// different set.
const RATES = [1, 1.5, 2] as const;

let audio: HTMLAudioElement | null = null;
let snapshot: VoicePlaybackSnapshot = { entry: null, playing: false, elapsed: 0, rate: 1, duration: NaN };
const listeners = new Set<() => void>();

function setSnapshot(next: Partial<VoicePlaybackSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.addEventListener("timeupdate", () => setSnapshot({ elapsed: el.currentTime }));
  el.addEventListener("durationchange", () => setSnapshot({ duration: el.duration }));
  el.addEventListener("ended", () => setSnapshot({ playing: false, elapsed: 0 }));
  // Covers every route an element can stop playing through (a second
  // playVoice() call pausing this one, an OS-level media-key pause,
  // etc.), not just the explicit pauseVoice() below -- so the mini-bar
  // and every bubble's play/pause glyph never drift out of sync with
  // the actual element.
  el.addEventListener("pause", () => {
    if (snapshot.playing) setSnapshot({ playing: false });
  });
  audio = el;
  return el;
}

export function playVoice(entry: VoicePlaybackEntry) {
  const el = ensureAudio();
  if (snapshot.entry?.docId === entry.docId) {
    // Same clip already loaded (just paused, or replaying after
    // `ended`) -- resume/restart in place, keep its elapsed position.
    void el.play().catch(() => setSnapshot({ playing: false }));
    setSnapshot({ playing: true, entry });
    return;
  }
  el.pause();
  el.src = entry.url;
  el.currentTime = 0;
  el.playbackRate = snapshot.rate;
  setSnapshot({ entry, playing: true, elapsed: 0, duration: NaN });
  void el.play().catch(() => setSnapshot({ playing: false }));
}

export function pauseVoice() {
  if (!audio || !snapshot.playing) return;
  audio.pause();
  setSnapshot({ playing: false });
}

export function toggleVoice(entry: VoicePlaybackEntry) {
  if (snapshot.entry?.docId === entry.docId && snapshot.playing) {
    pauseVoice();
  } else {
    playVoice(entry);
  }
}

export function seekVoiceFraction(frac: number) {
  if (!audio || !snapshot.entry) return;
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : snapshot.entry.totalSeconds;
  if (!duration) return;
  const clamped = Math.min(1, Math.max(0, frac));
  audio.currentTime = clamped * duration;
  setSnapshot({ elapsed: audio.currentTime });
}

export function cycleVoiceRate() {
  const idx = RATES.indexOf(snapshot.rate as (typeof RATES)[number]);
  const next = RATES[(idx + 1) % RATES.length] ?? RATES[0];
  if (audio) audio.playbackRate = next;
  setSnapshot({ rate: next });
}

export function closeVoicePlayback() {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
  setSnapshot({ entry: null, playing: false, elapsed: 0 });
}

export function subscribeVoicePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVoicePlaybackSnapshot(): VoicePlaybackSnapshot {
  return snapshot;
}
