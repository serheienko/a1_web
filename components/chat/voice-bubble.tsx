// components/chat/voice-bubble.tsx
//
// 2026-09-03 (Aleksandr, "Да, продолжай с голосовыми" -- continuing
// PLAN.md 6.99's own implementation order past the recording engine +
// compose UI shipped in 6.100) -- the REAL voice-message player: a
// sent/received `media-doc` whose isVoiceMediaDocument() (lib/a1/chat-
// schemas.ts) is true renders through here instead of the generic
// per-extension file-attachment row, replacing the placeholder mic-
// glyph-only row that pending (not-yet-uploaded) voice bubbles already
// use (app/chats/[chatId]/page.tsx's pendingAttachments render loop --
// unchanged, that one's fine as a brief in-flight placeholder).
//
// Built against the confirmed pieces only (see PLAN.md 6.96-6.99 for
// the full research trail); anything below not explicitly called out
// as confirmed is a best-effort, clearly-scoped design decision:
//
// - Play button (round, accent-blue circle, white glyph) + waveform +
//   duration: CONFIRMED live screen-recording capture (6.97, "Sent
//   voice bubble"). Same accent-blue regardless of mine/theirs (matches
//   the confirmed sent-bubble capture, which itself sits on a blue
//   background -- so the received side reuses the identical button
//   rather than inventing a second treatment).
// - Fire badge + tap-popup default copy ("Автоматически удаляется" /
//   "120 мин после просмотра или 7 дней без открытия"): CONFIRMED live,
//   word-for-word (6.97's "Fire-tap popup" capture). Translated to the
//   other 8 locales here the same way every other UI string in this
//   app already is (only the Russian/Ukrainian source was ever given
//   verbatim) -- not itself locale-confirmed beyond that pair.
// - Countdown FORMAT (H:MM:SS once >=1hr, else M:SS,
//   formatVoiceDeleteCountdown in lib/a1/chat-schemas.ts): CONFIRMED
//   against voice_delete_countdown_banner.dart's own `_formatCountdown`
//   (6.99). The exact copy of the LIVE counting-down popup variant
//   (6.96's `VoiceDeleteCountdownBanner`) was never itself captured --
//   this appends a plain "Time left: <countdown>" line under the
//   already-confirmed static card rather than guessing a whole second
//   popup layout.
// - "ttl border": lib/a1/chat-schemas.ts's own voiceDeleteCountdownFraction()
//   doc comment says this drives "a left-border countdown animation" --
//   that's a confirmed INTENT (from the Dart source reading), not a
//   confirmed pixel layout, so this is a thin draining bar on the left
//   edge of the player itself (not the whole message bubble), amber
//   fading to red under 15% remaining. Only shown once a window is
//   actually counting down (`pending: false`) -- the untouched
//   "will self-destruct once opened" state before that has no border,
//   just the static fire badge.
// - Blue "unopened" dot: 6.97's own capture flags this as unconfirmed
//   which end it belongs to ("needs a RECEIVER-side capture"). Originally
//   scoped to the receiving side only; 2026-09-03 live-test follow-up
//   below (Aleksandr: "надо и на отправленных, и на полученных... точно
//   так же, как в Telegram") made it bidirectional -- see that comment,
//   right above `showUnopenedDot`'s own definition, for how each side
//   now decides.
//
// 2026-09-03 follow-up (Aleksandr sent the promised now-playing-bar
// reference -- "Аватар слева, управление сгрупировано справа. это
// акттуальный UI"): playback itself moved OUT of this component and
// into lib/voice-playback-store.ts, a single app-wide store/audio
// element (see that file's own header for the full reasoning) so
// components/chat/voice-now-playing-bar.tsx -- mounted globally in app/
// layout.tsx, well outside this chat page's own tree -- can keep
// controlling/reflecting playback after the user navigates away. This
// component now just renders its own UI off that shared store's
// snapshot (`isCurrent`/`playing`/`elapsed` below) instead of owning a
// private <audio>; "only one clip plays at a time" is the store's
// guarantee now, not a local module singleton here.
//
// 2026-09-03 update: turns out no explicit `messages.updateContentOpened`
// call is needed at all -- the live OpenAPI spec's own glossary states
// "Accessing the media download URL marks it as viewed" (confirmed via
// https://api.a1appp.com/openapi.json), i.e. the <audio> element simply
// requesting the file (lib/voice-playback-store.ts's playVoice(), fired
// from THIS user's own play/scrub) is itself what flips the doc's
// server-side `viewed` for anyone who fetches it. The still-open gap is
// the LOCAL delete-window start (`markOpened` below) staying purely
// optimistic pending server echo via the next poll, same as before --
// and reply-to-voice UI, still not built.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { T, type Locale } from "@/components/t";
import { buildMediaProxyUrl } from "@/lib/a1/media-proxy";
import {
  decodeWaveformBars,
  formatVoiceDeleteCountdown,
  isVoiceViewDestroy,
  messageVoiceAttribute,
  resampleWaveform,
  resolveVoiceDeleteWindow,
  voiceDeleteCountdownFraction,
  voiceDurationSeconds,
  type MessageMediaDocument,
} from "@/lib/a1/chat-schemas";
import { formatVoiceTimer } from "@/components/chat/voice-recorder";
import {
  getVoicePlaybackSnapshot,
  seekVoiceFraction,
  subscribeVoicePlayback,
  toggleVoice,
  type VoicePlaybackEntry,
} from "@/lib/voice-playback-store";
import { getLocalVoiceWaveform, rememberLocalVoiceWaveform } from "@/lib/voice-local-waveform-cache";
import { decodeWaveformFromBlob } from "@/lib/voice-waveform-decode";

const WAVEFORM_BARS = 32;
// Bar count used only for the ONE-TIME client-side decode below --
// deliberately higher than WAVEFORM_BARS itself (same 48 components/
// chat/voice-recorder.ts decodes a fresh recording at) so the cached
// result stays useful at whatever resolution a caller resamples it to,
// rather than being pre-baked to this component's own 32.
const DECODE_BARS = 48;

// 2026-09-03 (Aleksandr, live test: "у голосовых динамическая длина в
// зависимости от того на сколько они сек... если сообщение 3 сек, то
// UI будет коротеньким") -- every bubble used to render at a single
// fixed w-64 (256px) no matter the clip length, same width for a 1s
// "ok" and a 2min explanation. Scales linearly from a 180px floor (very
// short clips, e.g. VOICE_MIN_MS-length taps) up to a 288px ceiling
// reached at 40s+ -- not itself a confirmed pixel curve from any
// reference, just a reasonable Telegram/WhatsApp-style feel; tune if it
// looks off.
const VOICE_BUBBLE_MIN_WIDTH = 180;
const VOICE_BUBBLE_MAX_WIDTH = 288;
const VOICE_BUBBLE_WIDTH_CAP_SECONDS = 40;

function voiceBubbleWidthPx(totalSeconds: number): number {
  if (!(totalSeconds > 0)) return VOICE_BUBBLE_MIN_WIDTH;
  const t = Math.min(totalSeconds, VOICE_BUBBLE_WIDTH_CAP_SECONDS);
  return Math.round(
    VOICE_BUBBLE_MIN_WIDTH + (t / VOICE_BUBBLE_WIDTH_CAP_SECONDS) * (VOICE_BUBBLE_MAX_WIDTH - VOICE_BUBBLE_MIN_WIDTH),
  );
}
// 120 min after first open -- CONFIRMED copy (PLAN.md 6.97's fire-popup
// capture). Only used as a fallback when a VIEW_DESTROY doc doesn't
// itself carry a `ttlSeconds` yet (the local optimistic pre-echo start,
// same fallback role FALLBACK_TTL_SECONDS plays in
// VoiceDeleteWindowOptions' own comment in chat-schemas.ts).
const FALLBACK_TTL_SECONDS = 120 * 60;

// Now-playing-bar title/subtitle strings (the bar itself, components/
// chat/voice-now-playing-bar.tsx, lives outside this component's own
// tree and just reflects whatever plain string it's handed via the
// shared store -- easier to resolve the locale here, where this
// component already has `lang`, than to thread it through the store).
// "Voice Message" subtitle is CONFIRMED literal copy (Aleksandr's
// now-playing-bar reference screenshot); "You"/"Ви" for a self-sent
// clip is this file's own choice, same translate-from-the-Russian-
// brief convention as everywhere else in this app.
const VOICE_BUBBLE_STRINGS = {
  you: { uk: "Ви", en: "You", ru: "Вы", de: "Du", es: "Tú", fr: "Toi", pl: "Ty", ptBR: "Você", zh: "你" },
  voiceMessage: {
    uk: "Голосове повідомлення", en: "Voice Message", ru: "Голосовое сообщение", de: "Sprachnachricht",
    es: "Mensaje de voz", fr: "Message vocal", pl: "Wiadomość głosowa", ptBR: "Mensagem de voz", zh: "语音消息",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function FlameGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5c.6 2 .1 3.3-1 4.6-1.3 1.5-2.7 2.9-2.7 5.3a3.7 3.7 0 0 0 7.4 0c0-1-.3-1.8-.8-2.6.9.5 1.6 1.5 1.6 3a4.5 4.5 0 0 1-9 0c0-4.2 3-5.7 4.5-10.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VoiceMessageBubble({
  doc,
  mine,
  messageDateMs,
  lang,
  peerName,
  peerAvatarUrl,
  myAvatarUrl,
  footer,
}: {
  doc: MessageMediaDocument;
  mine: boolean;
  messageDateMs: number;
  lang: Locale;
  /** The chat partner's own name/avatar (app/chats/[chatId]/page.tsx's
   *  own headerTitle/headerAvatar -- this is a 1:1 chat page, so
   *  "whoever isn't me" is always the same person). Used for the
   *  now-playing-bar entry on a RECEIVED clip; a self-sent (`mine`)
   *  clip uses the localized "You" label plus `myAvatarUrl` instead. */
  peerName: string;
  peerAvatarUrl: string;
  /** 2026-09-04 (Aleksandr, live screenshot of the now-playing bar on a
   *  self-sent clip: "поставь в этот попап аватар того чье голосовое
   *  вместо микрофона слева") -- the bar (components/chat/voice-now-
   *  playing-bar.tsx) already shows `entry.avatarUrl` when set and only
   *  falls back to its own generic mic glyph when it's null; that null
   *  was hardcoded below for every `mine` clip (this page never loaded
   *  the visitor's OWN avatar anywhere, per this prop's old comment).
   *  app/chats/[chatId]/page.tsx now fetches it once via /api/account/
   *  whoami (same route/shape components/avatar-menu.tsx already uses
   *  for the nav's own account row) and passes it through here. */
  myAvatarUrl: string | null;
  /** 2026-09-03 (Aleksandr, third live-feedback round: "подложку синюю
   *  убери... время и просмотрено внутрь") -- this component used to
   *  sit INSIDE app/chats/[chatId]/page.tsx's own generic message-
   *  bubble chrome (solid-color rounded card, padding, and a shared
   *  time+ticks footer below whatever content it wrapped), so a voice
   *  message ended up with TWO stacked colored layers -- that outer
   *  bubble plus this component's own translucent panel -- which read
   *  as extra bulk/padding around an already-compact player. The page
   *  now skips its own chrome entirely for a voice-only message and
   *  hands the already-built time+ticks row straight in here instead,
   *  so this component's own solid-color card (see the outer div's
   *  className below) is the ONLY layer, with that row rendered at its
   *  bottom edge same as every other bubble's footer position. */
  footer?: ReactNode;
}) {
  const voiceAttr = messageVoiceAttribute(doc);
  const totalSeconds = voiceDurationSeconds(doc);
  // 2026-09-04 (see lib/voice-local-waveform-cache.ts's own header for
  // the full live-test trail: "показывает начало, как будто бы есть
  // звук, а потом нету" the instant this bubble swapped in for the
  // pending one) -- a clip THIS browser tab itself just recorded and
  // uploaded has a known-good local waveform sitting in that cache,
  // keyed by this exact doc's own fileReference; prefer it over
  // decoding whatever attribute-audio.waveform the server echoed back,
  // and only fall back to that decode for a clip with no local entry
  // (received from the other side, or sent in an earlier session).
  const [decodedWaveform, setDecodedWaveform] = useState<number[] | null>(null);
  const localWaveform = getLocalVoiceWaveform(doc.fileReference);
  // 2026-09-04 (Aleksandr, still flagged after the sent-side fix above:
  // "Потом баг с эквалайзером") -- that fix only covers a clip THIS
  // browser tab itself just recorded (localWaveform, populated at send
  // time). A RECEIVED clip -- or one sent from another session/device --
  // has no local entry, so it fell all the way back to decoding whatever
  // attribute-audio.waveform the server echoed back, which is the
  // actually-inaccurate data in the first place. This effect runs the
  // exact same real-audio decode voice-recorder.ts uses for a fresh
  // recording (lib/voice-waveform-decode.ts's shared decodeWaveformFromBlob)
  // against the clip's OWN proxied audio file, once, the first time this
  // bubble renders it with nothing local cached yet -- and remembers the
  // result in that same cache (keyed by fileReference) so every other
  // bubble for this clip (a re-render, the now-playing bar, reopening the
  // chat) reads it back instantly instead of re-decoding.
  useEffect(() => {
    if (localWaveform) return;
    if (getLocalVoiceWaveform(doc.fileReference)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildMediaProxyUrl(doc));
        if (!res.ok) return;
        const blob = await res.blob();
        const decoded = await decodeWaveformFromBlob(blob, DECODE_BARS, totalSeconds);
        if (cancelled || !decoded) return;
        rememberLocalVoiceWaveform(doc.fileReference, decoded);
        setDecodedWaveform(decoded);
      } catch {
        // Best-effort only -- decodeWaveformBars(voiceAttr?.waveform, ...)
        // below stays the fallback exactly as before this effect existed.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.fileReference]);
  const bars = localWaveform
    ? resampleWaveform(localWaveform, WAVEFORM_BARS)
    : decodedWaveform
      ? resampleWaveform(decodedWaveform, WAVEFORM_BARS)
      : (decodeWaveformBars(voiceAttr?.waveform, WAVEFORM_BARS) ?? new Array<number>(WAVEFORM_BARS).fill(0.35));

  const playback = useSyncExternalStore(subscribeVoicePlayback, getVoicePlaybackSnapshot, getVoicePlaybackSnapshot);
  const isCurrent = playback.entry?.docId === doc._id;
  const playing = isCurrent && playback.playing;
  const elapsed = isCurrent ? playback.elapsed : 0;
  // 2026-09-03 (Aleksandr, live test: "прогресс в голосовых
  // показывается криво, это сообщение 8 сек и на 6-ой секунде всего
  // одна палочка заполнилась") -- traced to a REAL production doc
  // whose own attribute-audio.duration came back 0 (confirmed live via
  // the chats/messages API, not guessed): totalSeconds > 0 ? ... : 0
  // below made playedFraction permanently 0 whenever that happens, so
  // only bar index 0 (0/31 <= 0) ever counted as "played" no matter how
  // far along playback actually was -- exactly what he saw. The
  // <audio> element's own `duration` (lib/voice-playback-store.ts,
  // durationchange) is the browser's REAL decode of the file and isn't
  // subject to whatever server-side probing produced that 0, so it
  // wins whenever this clip is the one currently loaded and its
  // metadata has actually arrived.
  const effectiveTotalSeconds =
    isCurrent && Number.isFinite(playback.duration) && playback.duration > 0 ? playback.duration : totalSeconds;

  const waveformRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const fireButtonRef = useRef<HTMLButtonElement | null>(null);

  const [scrubbing, setScrubbing] = useState(false);
  const [opened, setOpened] = useState(doc.viewed != null);
  const [localWindow, setLocalWindow] = useState<{ start: number; expires: number } | null>(null);
  const [firePopoverOpen, setFirePopoverOpen] = useState(false);
  const [, forceTick] = useState(0);

  const deleteWindow = resolveVoiceDeleteWindow(doc, {
    messageDateMs,
    localStartUnix: localWindow?.start ?? null,
    localExpiresUnix: localWindow?.expires ?? null,
  });
  const hasDeleteWindow = deleteWindow !== null;
  const isCountingDown = deleteWindow !== null && !deleteWindow.pending;

  // Re-renders once a second while a window is actively counting down
  // so the ttl-border height and the popup's "Time left" line stay
  // current -- resolveVoiceDeleteWindow/voiceDeleteCountdownFraction
  // are both pure functions of Date.now(), this just forces the redraw.
  useEffect(() => {
    if (!isCountingDown) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are
    // the primitive `isCountingDown` only; deleteWindow itself is
    // recomputed every render and would loop this effect forever.
  }, [isCountingDown]);

  useEffect(() => {
    if (!firePopoverOpen) return;
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (fireButtonRef.current?.contains(target)) return;
      setFirePopoverOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [firePopoverOpen]);

  // 2026-09-03 (Aleksandr, live test: "это надо и на отправленных, и на
  // полученных... я отправляю сообщение, я понимаю, человек просмотрел
  // или нет" -- Telegram-style bidirectional unopened dot) -- confirmed
  // off the live OpenAPI spec's own glossary (https://api.a1appp.com/
  // openapi.json): "File Viewing: Accessing the media download URL
  // marks it as viewed" -- so `doc.viewed` becomes server-authoritative
  // the instant EITHER side's <audio> element actually requests the
  // file, regardless of which side. app/chats/[chatId]/page.tsx already
  // polls messages.getMessages every POLL_MS (3s), so once the
  // RECIPIENT presses play, the next poll on the SENDER's own open chat
  // brings back this same doc with `viewed` now set -- this effect just
  // picks that up if the bubble stayed mounted across that poll (a
  // fresh `doc` prop, not a remount, so useState's initializer alone
  // wouldn't see it).
  useEffect(() => {
    if (doc.viewed != null && !opened) setOpened(true);
  }, [doc.viewed, opened]);

  const entry: VoicePlaybackEntry = {
    docId: doc._id,
    url: buildMediaProxyUrl(doc),
    title: mine ? VOICE_BUBBLE_STRINGS.you[lang] : peerName,
    subtitle: VOICE_BUBBLE_STRINGS.voiceMessage[lang],
    avatarUrl: mine ? myAvatarUrl : peerAvatarUrl,
    totalSeconds,
  };

  function markOpened() {
    if (opened) return;
    setOpened(true);
    // Only the RECEIVING side's own play press starts a VIEW_DESTROY
    // countdown -- a sender replaying their own already-sent clip must
    // never burn its own message. (This is also why `mine` bubbles stay
    // in the `pending` resolveVoiceDeleteWindow state, full untouched
    // bar, until a future poll refresh brings back the server's own
    // `viewed` once the recipient actually opens it.)
    if (!mine && isVoiceViewDestroy(doc) && doc.viewed == null) {
      const nowUnix = Math.floor(Date.now() / 1000);
      const durationSec = doc.ttlSeconds && doc.ttlSeconds > 0 ? doc.ttlSeconds : FALLBACK_TTL_SECONDS;
      setLocalWindow({ start: nowUnix, expires: nowUnix + durationSec });
    }
  }

  function togglePlay() {
    markOpened();
    toggleVoice(entry);
  }

  function fractionFromPointer(clientX: number) {
    const el = waveformRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return (clientX - rect.left) / rect.width;
  }

  function onWaveformPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    markOpened();
    if (!isCurrent) toggleVoice(entry);
    seekVoiceFraction(fractionFromPointer(e.clientX));
  }
  function onWaveformPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    seekVoiceFraction(fractionFromPointer(e.clientX));
  }
  function onWaveformPointerUp(e: PointerEvent<HTMLDivElement>) {
    setScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // no-op -- pointer capture may already have been released (e.g.
      // pointercancel fired first).
    }
  }

  const playedFraction = effectiveTotalSeconds > 0 ? Math.min(1, elapsed / effectiveTotalSeconds) : 0;
  // 2026-09-03 (Aleksandr, second live test round: "не идет время
  // голосового сообщения") -- this used to count DOWN from totalSeconds
  // (a "time remaining" style timer). When totalSeconds itself was not
  // yet known for a doc (voiceDurationSeconds falling back to 0 -- e.g.
  // a clip whose attribute-audio has not been reconciled by a poll
  // yet), `totalSeconds - elapsed` floors at 0 immediately and the
  // label was permanently stuck at "0:00" for the whole clip regardless
  // of real playback progress -- exactly what he saw. Counting UP from
  // elapsed instead (the Telegram/WhatsApp convention anyway) only ever
  // depends on the <audio> element own currentTime, which is always
  // correct once playback has actually started, so it can not get
  // stuck this way even when totalSeconds is wrong or missing.
  const timerLabel = playing || elapsed > 0 ? formatVoiceTimer(elapsed) : formatVoiceTimer(effectiveTotalSeconds);

  // Bidirectional: the RECEIVING side's own dot still hides the instant
  // THIS user presses play/scrub (optimistic, via `opened` above, so it
  // doesn't wait on a poll round-trip). The SENDING side has no local
  // "I opened my own clip" signal worth showing -- replaying your own
  // sent voice note doesn't mean the recipient heard it -- so `mine`
  // reads `doc.viewed` directly instead, which only becomes non-null
  // once the *recipient's* device has actually fetched the file (see
  // the effect above for how that reaches this render).
  const showUnopenedDot = mine ? doc.viewed == null : !opened;

  const deleteFraction = isCountingDown
    ? voiceDeleteCountdownFraction(doc, {
        messageDateMs,
        localStartUnix: localWindow?.start ?? null,
        localExpiresUnix: localWindow?.expires ?? null,
      })
    : null;
  const countdownSecondsLeft =
    isCountingDown && deleteWindow ? Math.max(0, deleteWindow.expiresUnix - Math.floor(Date.now() / 1000)) : null;

  return (
    <div
      style={{ width: voiceBubbleWidthPx(effectiveTotalSeconds) }}
      className={`relative flex max-w-full flex-col gap-1.5 overflow-hidden rounded-[18px] py-2.5 pl-3 pr-2.5 ${
        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
      }`}
    >
      {isCountingDown && deleteFraction !== null && (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 w-[3px] transition-[height] duration-1000 ease-linear ${
            deleteFraction < 0.15 ? "bg-red-500" : "bg-[#ff9f43]"
          }`}
          style={{ height: `${Math.max(0, deleteFraction * 100)}%` }}
        />
      )}

      <div className="flex items-center gap-2.5">
      {/* 2026-09-03 (Aleksandr, third live-feedback round: "с кнопкой
          поиграться, чтобы она была видна") -- now that the bubble
          itself is a SOLID accent-blue card on the `mine` side (see the
          outer div above), the old always-blue button became
          invisible, blue-on-blue. Inverted to a white circle with a
          blue glyph for `mine` only -- the `theirs` side sits on a
          white/dark card instead, where the original blue-circle-white-
          glyph treatment already reads fine and is left unchanged. */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:brightness-110 active:scale-95 ${
          mine ? "bg-white text-[#335ef7] dark:text-[#009bff]" : "bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
        }`}
      >
        {playing ? <PauseGlyph className="h-4 w-4" /> : <PlayGlyph className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* 2026-09-04 (Aleksandr, live screen recording: "баг с
            эквалайзером" -- a long clip's real waveform rendered as a
            small cluster of bars jammed against the left edge with the
            rest of the track empty) -- each bar below is `flex-1`
            capped at `max-w-[3px]` (WAVEFORM_BARS is a fixed 32
            regardless of clip length), so on a SHORT clip's narrow
            track (voiceBubbleWidthPx's 180px floor) 32 maxed-out bars
            already overflow it and get clipped, masking the cap; on a
            LONG clip's wide track (up to the 288px ceiling) the same
            32 bars hit their max width well before filling it, and
            with no `justify-content` set they just pack against the
            container's start instead of spreading out -- exactly the
            "short burst, then dead air" look he saw. `justify-between`
            spends that leftover space as extra room BETWEEN bars
            instead, so all 32 always span the full track edge-to-edge
            no matter the clip's length. */}
        <div
          ref={waveformRef}
          onPointerDown={onWaveformPointerDown}
          onPointerMove={onWaveformPointerMove}
          onPointerUp={onWaveformPointerUp}
          onPointerCancel={onWaveformPointerUp}
          className="flex h-6 touch-none select-none items-center justify-between gap-[1.5px] overflow-hidden cursor-pointer"
        >
          {bars.map((h, i) => {
            const played = WAVEFORM_BARS > 1 ? i / (WAVEFORM_BARS - 1) <= playedFraction : playedFraction >= 1;
            return (
              <span
                key={i}
                className={`min-w-[1px] max-w-[3px] flex-1 rounded-full transition-colors ${
                  played
                    ? mine
                      ? "bg-white"
                      : "bg-[#335ef7] dark:bg-[#0c8ce9]"
                    : mine
                      ? "bg-white/35"
                      : "bg-black/20 dark:bg-white/25"
                }`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div className={`flex items-center gap-1.5 text-[12px] tabular-nums ${mine ? "opacity-85" : "opacity-60"}`}>
          <span>{timerLabel}</span>
          {showUnopenedDot && (
            // `mine` bubbles are themselves a solid accent-blue card
            // (see the outer div's own className) -- the original
            // dot's color was the SAME blue, invisible in light mode.
            // Same fix as the play button just above: inverted to
            // white for `mine`, left as-is for the white/dark `theirs`
            // card where the blue dot already reads fine.
            <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${mine ? "bg-white" : "bg-[#335ef7] dark:bg-[#0c8ce9]"}`} />
          )}
        </div>
      </div>

      {hasDeleteWindow && (
        <div className="relative shrink-0">
          <button
            ref={fireButtonRef}
            type="button"
            onClick={() => setFirePopoverOpen((v) => !v)}
            aria-label="Auto-delete info"
            className={`flex h-7 w-7 items-center justify-center rounded-[10px] transition ${
              mine
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-[#335ef7]/10 text-[#335ef7] hover:bg-[#335ef7]/20 dark:bg-[#0c8ce9]/15 dark:text-[#0c8ce9]"
            }`}
          >
            <FlameGlyph className="h-3.5 w-3.5" />
          </button>

          {firePopoverOpen && (
            <div
              ref={popoverRef}
              className="animate-popover-up absolute bottom-full right-0 z-10 mb-2 w-56 rounded-2xl bg-white p-3 text-left shadow-xl dark:bg-neutral-900"
            >
              <p className="text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
                <T
                  uk="Автоматично видаляється" en="Auto-deletes" ru="Автоматически удаляется" de="Löscht sich automatisch"
                  es="Se elimina automáticamente" fr="Suppression automatique" pl="Usuwa się automatycznie"
                  ptBR="Exclui-se automaticamente" zh="自动删除"
                />
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#262a34] dark:text-white">
                {"🔥 "}
                <T
                  uk="120 хв після перегляду або 7 днів без відкриття"
                  en="120 min after opening, or 7 days if never opened"
                  ru="120 мин после просмотра или 7 дней без открытия"
                  de="120 Min. nach dem Öffnen oder 7 Tage ohne Öffnen"
                  es="120 min después de abrirlo, o 7 días si no se abre"
                  fr="120 min après l'ouverture, ou 7 jours sans ouverture"
                  pl="120 min po otwarciu lub 7 dni bez otwarcia"
                  ptBR="120 min após abrir, ou 7 dias sem abrir"
                  zh="打开后 120 分钟，或 7 天未打开"
                />
              </p>
              {isCountingDown && countdownSecondsLeft !== null && (
                <p className="mt-1.5 text-[12px] tabular-nums text-red-500 dark:text-red-400">
                  <T
                    uk="Залишилось:" en="Time left:" ru="Осталось:" de="Verbleibend:" es="Queda:"
                    fr="Reste :" pl="Pozostało:" ptBR="Restante:" zh="剩余："
                  />{" "}
                  {formatVoiceDeleteCountdown(countdownSecondsLeft)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {footer}
    </div>
  );
}

// 2026-09-03 (Aleksandr, live test: "отправленное голосовое сначала
// отображается старой версией, потом переобувается, надо чтобы сразу
// было с правильным UI") -- app/chats/[chatId]/page.tsx used to render
// a just-recorded, not-yet-confirmed voice attachment as a bare mic-
// glyph-in-a-pill placeholder (PendingAttachment carries durationSeconds
// + waveform specifically so a real player COULD be shown here, per
// that type's own comment, but nothing used them yet) -- then swapped
// to this file's real VoiceMessageBubble the instant load()'s poll
// reconciled the real message in, a visible "reshoe". This renders the
// exact same card shell (width, colors, play glyph, waveform, timer) so
// that swap is now a no-op visually -- just no playback wiring (there's
// no fileReference/URL yet while `status === "uploading"`) and no fire-
// badge/delete-window (those only ever apply to a real doc).
export function PendingVoiceBubble({
  mine,
  durationSeconds,
  waveform,
  uploading,
  footer,
}: {
  mine: boolean;
  durationSeconds: number;
  waveform?: number[];
  uploading: boolean;
  footer?: ReactNode;
}) {
  const bars = waveform && waveform.length > 0 ? resampleWaveform(waveform, WAVEFORM_BARS) : new Array<number>(WAVEFORM_BARS).fill(0.35);

  return (
    <div
      style={{ width: voiceBubbleWidthPx(durationSeconds) }}
      className={`relative flex max-w-full flex-col gap-1.5 overflow-hidden rounded-[18px] py-2.5 pl-3 pr-2.5 ${
        mine ? "rounded-tr-[6px] bg-[#335ef7] text-white dark:bg-[#009bff]" : "rounded-tl-[6px] bg-white text-[#262a34] dark:bg-[#1a1a1a] dark:text-white"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            mine ? "bg-white text-[#335ef7] dark:text-[#009bff]" : "bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
          }`}
        >
          <PlayGlyph className="ml-0.5 h-4 w-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Same justify-between fix as VoiceMessageBubble's own
              waveform track above -- this pending/uploading card uses
              the identical fixed-32-bars-capped-at-3px layout, so it
              needs the same fix or a long recording would show the
              bug from the very first frame, before the real message
              even reconciles in. */}
          <div className="flex h-6 items-center justify-between gap-[1.5px] overflow-hidden">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`min-w-[1px] max-w-[3px] flex-1 rounded-full ${mine ? "bg-white/35" : "bg-black/20 dark:bg-white/25"}`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            ))}
          </div>
          <div className={`flex items-center gap-1.5 text-[12px] tabular-nums ${mine ? "opacity-85" : "opacity-60"}`}>
            <span>{formatVoiceTimer(durationSeconds)}</span>
          </div>
        </div>
      </div>
      {footer}
      {/* 2026-09-04 (Aleksandr, live test: "убери лоадер по центру
          бабла сообщения") -- this used to cover the whole bubble with
          a dark scrim + spinning ring while `uploading`. `uploading` is
          still threaded in from the caller (app/chats/[chatId]/
          page.tsx's PendingVoiceBubble usage) even though nothing here
          reads it now -- no other element in this component depends on
          it, so there's nothing left to wire it into without inventing
          a new indicator he didn't ask for. */}
    </div>
  );
}
