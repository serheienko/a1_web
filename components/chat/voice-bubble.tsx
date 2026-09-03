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
//   which end it belongs to ("needs a RECEIVER-side capture"). Scoped
//   here to the receiving side only (`!mine`), matching every other
//   messenger's own convention that an "unread" dot is meaningful only
//   to the person who hasn't read/heard it yet.
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
// Deliberately NOT done yet, per PLAN.md 6.99's own order: `messages.
// updateContentOpened` wiring (this file marks a doc "opened" purely
// client-side/optimistically, same as the local delete-window start
// already does -- nothing is POSTed to the backend yet, so a page
// reload currently re-shows the blue dot until the server's own
// `viewed` field catches up through a future wiring pass), and
// reply-to-voice UI.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { T, type Locale } from "@/components/t";
import { buildMediaProxyUrl } from "@/lib/a1/media-proxy";
import {
  decodeWaveformBars,
  formatVoiceDeleteCountdown,
  isVoiceViewDestroy,
  messageVoiceAttribute,
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

const WAVEFORM_BARS = 32;
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
}: {
  doc: MessageMediaDocument;
  mine: boolean;
  messageDateMs: number;
  lang: Locale;
  /** The chat partner's own name/avatar (app/chats/[chatId]/page.tsx's
   *  own headerTitle/headerAvatar -- this is a 1:1 chat page, so
   *  "whoever isn't me" is always the same person). Used for the
   *  now-playing-bar entry on a RECEIVED clip; a self-sent (`mine`)
   *  clip uses the localized "You" label instead (see VOICE_BUBBLE_
   *  STRINGS) since this page doesn't otherwise load my own name/
   *  avatar anywhere. */
  peerName: string;
  peerAvatarUrl: string;
}) {
  const voiceAttr = messageVoiceAttribute(doc);
  const totalSeconds = voiceDurationSeconds(doc);
  const bars = decodeWaveformBars(voiceAttr?.waveform, WAVEFORM_BARS) ?? new Array<number>(WAVEFORM_BARS).fill(0.35);

  const playback = useSyncExternalStore(subscribeVoicePlayback, getVoicePlaybackSnapshot, getVoicePlaybackSnapshot);
  const isCurrent = playback.entry?.docId === doc._id;
  const playing = isCurrent && playback.playing;
  const elapsed = isCurrent ? playback.elapsed : 0;

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

  const entry: VoicePlaybackEntry = {
    docId: doc._id,
    url: buildMediaProxyUrl(doc),
    title: mine ? VOICE_BUBBLE_STRINGS.you[lang] : peerName,
    subtitle: VOICE_BUBBLE_STRINGS.voiceMessage[lang],
    avatarUrl: mine ? null : peerAvatarUrl,
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

  const playedFraction = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));
  const timerLabel = playing || elapsed > 0 ? formatVoiceTimer(remainingSeconds) : formatVoiceTimer(totalSeconds);

  const showUnopenedDot = !mine && !opened;

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
      className={`relative flex items-center gap-2.5 overflow-hidden rounded-xl py-2 pl-3 pr-2 ${
        mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
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

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 dark:bg-[#0c8ce9]"
      >
        {playing ? <PauseGlyph className="h-4 w-4" /> : <PlayGlyph className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          ref={waveformRef}
          onPointerDown={onWaveformPointerDown}
          onPointerMove={onWaveformPointerMove}
          onPointerUp={onWaveformPointerUp}
          onPointerCancel={onWaveformPointerUp}
          className="flex h-6 touch-none select-none items-center gap-[2.5px] cursor-pointer"
        >
          {bars.map((h, i) => {
            const played = WAVEFORM_BARS > 1 ? i / (WAVEFORM_BARS - 1) <= playedFraction : playedFraction >= 1;
            return (
              <span
                key={i}
                className={`w-[2.5px] shrink-0 rounded-full transition-colors ${
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
          {showUnopenedDot && <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />}
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
  );
}
