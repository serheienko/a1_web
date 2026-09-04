"use client";

// components/chat/meeting-message-card.tsx
//
// Scheduled Meetings (2026-09-04) -- renders a MeetingPayload (see
// lib/a1/meeting-protocol.ts's own header for the full architecture
// note on why this rides as encoded plain text rather than a real
// backend entity) as the actual card from the Figma "(2) Display
// Meeting" reference, in place of the raw marker+base64 text a message
// carrying one of these actually contains.
//
// Two participant-relative states, per that reference:
//   - Not yet accepted, viewed by the person who did NOT propose it:
//     only a coarse time-of-day bucket (icon + label) is shown, no
//     exact clock time -- see the "Time visibility" popup copy below,
//     taken verbatim off Figma's own annotation -- plus the Accept
//     button.
//   - Everyone else (the proposer themselves at any time, or ANYONE
//     once accepted): the exact date+time, computed by converting the
//     payload's one stored UTC instant into THAT participant's own
//     local time zone (Intl/Date -- see meeting-protocol.ts for why no
//     other participant's timezone is ever LOOKED UP, only carried
//     along in the payload/accept text they themselves generated).
//
// 2026-09-04, round two (Aleksandr, Figma "(2) Display Meeting"
// reference + "1-3 допили") -- round one only ever showed ONE row (the
// single shared instant, bucketed or not depending on viewer). The
// reference shows BOTH participants as their own name+avatar+"Local
// Time" row, each independently converted to THEIR OWN local clock --
// see the two-row layout below, and meeting-protocol.ts's own
// MeetingPayload/MeetingAcceptPayload comments for exactly what data
// this needed (and, just as deliberately, did NOT need) to travel with
// the message text itself.
//
// 2026-09-04, round three (Aleksandr, 2 screenshots comparing this
// against his native app's own card: "У тебя, видишь, ты сделал с
// подложкой, поэтому всё очень мелко... подложку этих меню надо в
// принципе убрать... сделать вот как у меня. У меня оно всё крупно,
// видно и всё нормально") -- the "подложка" (backing) he means is the
// PREVIOUS design's root fill, which turned solid accent-blue for a
// message that's `mine` (the earlier "сделай основной цвет заливки
// такой же як повідомлення" ask below), making this card visually
// indistinguishable from an ordinary text bubble and forcing every
// label inside it down to bubble-text sizes to still fit. His native
// reference uses one fixed dark-navy card regardless of who sent it
// (never the bright message-blue), noticeably bigger avatars/type, and
// a plain centered "Meeting proposal" title with no icon badge -- all
// reproduced below. `mine` no longer drives ANY color in this file; it
// still only decides which identity is "the proposer" vs "the other
// participant" (unchanged, see MeetingMessageCard's own comment).
import { useState } from "react";
import { T, type Locale } from "@/components/t";
import type { ReactNode } from "react";
import { bucketForHour, bucketEmoji, type MeetingPayload, type MeetingAcceptPayload, type MeetingTimeBucket } from "@/lib/a1/meeting-protocol";
import { LottiePlayer } from "@/components/lottie-player";

type StringKey =
  | "title"
  | "waitingAcceptance"
  | "scheduledMeeting"
  | "accept"
  | "localTime"
  | "localTimeWillBe"
  | "timeHiddenUntilTheyAccept"
  | "timeVisibility"
  | "timeVisibilityBody"
  | "ok"
  | "earlyMorning"
  | "daytime"
  | "evening"
  | "lateNight"
  | "joinMeeting";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  // 2026-09-04 (round three, native reference screenshot's own header
  // literally reads "Meeting proposal", two words) -- was a bare
  // "Зустріч"/"Meeting" single word.
  title: {
    uk: "Пропозиція зустрічі", en: "Meeting proposal", ru: "Предложение о встрече", de: "Terminvorschlag",
    es: "Propuesta de reunión", fr: "Proposition de rendez-vous", pl: "Propozycja spotkania",
    ptBR: "Proposta de reunião", zh: "会议提议",
  },
  waitingAcceptance: {
    uk: "Очікує підтвердження", en: "Waiting for acceptance", ru: "Ожидает подтверждения",
    de: "Warten auf Bestätigung", es: "Esperando confirmación", fr: "En attente de confirmation",
    pl: "Oczekuje na potwierdzenie", ptBR: "Aguardando confirmação", zh: "等待确认",
  },
  scheduledMeeting: {
    uk: "Зустріч заплановано", en: "Scheduled meeting", ru: "Встреча запланирована",
    de: "Geplantes Treffen", es: "Reunión programada", fr: "Réunion planifiée",
    pl: "Zaplanowane spotkanie", ptBR: "Reunião agendada", zh: "已安排会议",
  },
  accept: {
    uk: "Прийняти", en: "Accept", ru: "Принять", de: "Annehmen", es: "Aceptar",
    fr: "Accepter", pl: "Akceptuj", ptBR: "Aceitar", zh: "接受",
  },
  // Figma distinguishes "Local Time" (pre-accept row label) from
  // "Local Time Will Be" (post-accept, that participant has now
  // committed) -- kept as two separate strings rather than one, same
  // distinction his own reference screenshots make.
  localTime: {
    uk: "Місцевий час", en: "Local Time", ru: "Местное время", de: "Ortszeit", es: "Hora local",
    fr: "Heure locale", pl: "Czas lokalny", ptBR: "Horário local", zh: "当地时间",
  },
  localTimeWillBe: {
    uk: "Місцевий час буде", en: "Local Time Will Be", ru: "Местное время будет",
    de: "Ortszeit wird sein", es: "La hora local será", fr: "L'heure locale sera",
    pl: "Czas lokalny będzie", ptBR: "O horário local será", zh: "当地时间将是",
  },
  // Shown on the OTHER participant's row, to a viewer who cannot know
  // that person's real timezone yet (the proposer, looking at their
  // own still-unaccepted proposal) -- deliberately NOT a fabricated
  // bucket guess, see this file's own header above.
  timeHiddenUntilTheyAccept: {
    uk: "Прихований до прийняття", en: "Hidden until they accept", ru: "Скрыто до принятия",
    de: "Verborgen bis zur Annahme", es: "Oculto hasta que acepten", fr: "Masqué jusqu'à acceptation",
    pl: "Ukryte do akceptacji", ptBR: "Oculto até aceitarem", zh: "接受前隐藏",
  },
  timeVisibility: {
    uk: "Видимість часу", en: "Time visibility", ru: "Видимость времени", de: "Zeitsichtbarkeit",
    es: "Visibilidad de la hora", fr: "Visibilité de l'heure", pl: "Widoczność czasu",
    ptBR: "Visibilidade do horário", zh: "时间可见性",
  },
  timeVisibilityBody: {
    uk: "Ваш точний час прихований, доки ви не натиснете «Прийняти». Інший користувач бачить лише орієнтовний проміжок часу.",
    en: "Your exact time is hidden until you press Accept. The other user only sees a time range.",
    ru: "Ваше точное время скрыто, пока вы не нажмёте «Принять». Другой пользователь видит только примерный промежуток времени.",
    de: "Deine genaue Uhrzeit ist verborgen, bis du auf „Annehmen“ tippst. Die andere Person sieht nur einen groben Zeitraum.",
    es: "Tu hora exacta está oculta hasta que pulses Aceptar. La otra persona solo ve un rango de tiempo.",
    fr: "Votre heure exacte est masquée jusqu'à ce que vous appuyiez sur Accepter. L'autre personne ne voit qu'une plage horaire.",
    pl: "Twoja dokładna godzina jest ukryta, dopóki nie klikniesz „Akceptuj”. Druga osoba widzi tylko przybliżony przedział czasu.",
    ptBR: "Seu horário exato fica oculto até você tocar em Aceitar. A outra pessoa vê apenas uma faixa de horário.",
    zh: "在你点击“接受”之前，你的确切时间是隐藏的。对方只能看到一个大致的时间段。",
  },
  // 2026-09-04 (Aleksandr: "ту же самую кнопку 'зрозуміло'") -- was its
  // own "Гаразд"/"OK" wording; unified with schedule-meeting-modal.tsx's
  // own tz-info popup button (its "gotIt" STRINGS entry) now that both
  // popups share the same anchored-popover treatment below.
  ok: {
    uk: "Зрозуміло!", en: "Got it!", ru: "Понятно!", de: "Verstanden!", es: "¡Entendido!",
    fr: "Compris !", pl: "Rozumiem!", ptBR: "Entendi!", zh: "知道了！",
  },
  earlyMorning: {
    uk: "Раній ранок", en: "Early morning", ru: "Раннее утро", de: "Früher Morgen",
    es: "Muy de mañana", fr: "Tôt le matin", pl: "Wczesny poranek", ptBR: "Manhã cedo", zh: "清晨",
  },
  daytime: {
    uk: "День", en: "Daytime", ru: "День", de: "Tagsüber", es: "Durante el día",
    fr: "Journée", pl: "W ciągu dnia", ptBR: "Durante o dia", zh: "白天",
  },
  evening: {
    uk: "Вечір", en: "Evening", ru: "Вечер", de: "Abend", es: "Noche",
    fr: "Soirée", pl: "Wieczór", ptBR: "Noite", zh: "傍晚",
  },
  lateNight: {
    uk: "Пізня ніч", en: "Late night", ru: "Поздняя ночь", de: "Spätnacht", es: "Madrugada",
    fr: "Nuit tardive", pl: "Późna noc", ptBR: "Madrugada", zh: "深夜",
  },
  joinMeeting: {
    uk: "Приєднатися", en: "Join meeting", ru: "Присоединиться", de: "Beitreten", es: "Unirse",
    fr: "Rejoindre", pl: "Dołącz", ptBR: "Entrar", zh: "加入会议",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

function bucketLabel(bucket: MeetingTimeBucket, lang: Locale): string {
  switch (bucket) {
    case "early-morning":
      return t("earlyMorning", lang);
    case "daytime":
      return t("daytime", lang);
    case "evening":
      return t("evening", lang);
    case "late-night":
      return t("lateNight", lang);
  }
}

// Plain hourglass, for the "hidden until they accept" placeholder row
// -- deliberately a different glyph from the bucket emoji (nothing
// here claims to know a time-of-day, unlike those).
function HourglassIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12M6 21h12M7 3c0 5 4 6.5 5 8-1 1.5-5 3-5 8M17 3c0 5-4 6.5-5 8 1 1.5 5 3 5 8" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.25" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type Participant = { name: string; avatarUrl: string | null };

function ParticipantAvatar({ p, className }: { p: Participant; className?: string }) {
  if (p.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied
    // media/data URL, not a next/image-configured remote host.
    return <img src={p.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />;
  }
  const initial = p.name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-[#8a93ff] to-[#5c6bff] font-semibold text-white`}>
      {initial}
    </div>
  );
}

// One participant row -- either the exact date+time (proposer always,
// or anyone once accepted) or a coarse/hidden placeholder (the
// receiver, pre-accept). `tz` is an IANA zone name for an exact
// conversion; omit it to fall back to the VIEWER's own device zone
// (only ever correct when the viewer IS that row's own participant --
// see the two call sites below for why that's always true when tz is
// omitted).
//
// 2026-09-04 (round three, "подложку... убрать... сделать вот как у
// меня") -- no longer takes a `mine` prop: every color here used to
// branch on it purely to stay legible against the root's OLD
// mine-colored fill; the root is now one fixed dark card regardless of
// sender (see MeetingMessageCard below), so one fixed light-on-dark
// palette works for both rows unconditionally. Sized up throughout
// (avatar 28px -> 44px, name 12.5px -> 15px, big time/bucket value
// 14px/14px -> 26px/30px) to match his native reference's own scale,
// and the date/bucket-label value that used to squeeze onto the same
// line as the "Місцевий час" label now gets its own third line below
// it, same stacked shape the reference uses.
function ParticipantRow({
  lang,
  participant,
  startsAtUtcMs,
  tz,
  mode,
}: {
  lang: Locale;
  participant: Participant;
  startsAtUtcMs: number;
  tz?: string;
  // "exact": real date+time, converted into `tz` (or the viewer's own
  // zone if `tz` is empty/absent).
  // "bucket": coarse time-of-day only, computed from the VIEWER's own
  // device clock (only used when the viewer IS this participant).
  // "hidden": no time information at all -- this viewer has no way to
  // know it yet.
  mode: "exact" | "bucket" | "hidden";
}) {
  const zone = tz || undefined;
  const d = new Date(startsAtUtcMs);
  // Full day.month.year, matching the native reference's own
  // "04.09.2026" -- unlike the old inline day.month-only label, this
  // now sits on its own dedicated line (see below) so a full year no
  // longer risks truncating a shared line the way it used to.
  const dateLabel = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const timeLabel = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const bucket = bucketForHour(
    Number(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: zone })) % 24,
  );

  return (
    <div className="flex items-center gap-3">
      <ParticipantAvatar p={participant} className="h-11 w-11 shrink-0 text-[13px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-tight text-white">{participant.name || "—"}</div>
        <div className="truncate text-[12px] leading-snug text-white/50">
          {mode === "hidden" ? t("timeHiddenUntilTheyAccept", lang) : mode === "exact" ? t("localTimeWillBe", lang) : t("localTime", lang)}
        </div>
        {mode === "exact" && <div className="truncate text-[12.5px] font-medium leading-snug text-white/70">{dateLabel}</div>}
        {mode === "bucket" && <div className="truncate text-[12.5px] font-medium leading-snug text-white/70">{bucketLabel(bucket, lang)}</div>}
      </div>
      {mode === "exact" && <div className="shrink-0 text-[26px] font-bold leading-none tabular-nums text-white">{timeLabel}</div>}
      {mode === "bucket" && (
        <span className="shrink-0 text-[30px] leading-none" aria-hidden="true">
          {bucketEmoji(bucket)}
        </span>
      )}
      {mode === "hidden" && <HourglassIcon className="h-6 w-6 shrink-0 text-white/40" />}
    </div>
  );
}

export function MeetingMessageCard({
  lang,
  payload,
  mine,
  myName,
  myAvatarUrl,
  peerName,
  peerAvatarUrl,
  acceptPayload,
  canAccept,
  accepting,
  onAccept,
  footer,
}: {
  lang: Locale;
  payload: MeetingPayload;
  // True (via msg.fromId) when THIS viewer is the one who proposed the
  // meeting -- picks which of the two identities below is "the
  // proposer" vs. "the other participant" (see this file's own header
  // and meeting-protocol.ts's MeetingPayload comment for why neither
  // name/avatar needs to ride in the payload itself). Doesn't drive any
  // COLOR in this file any more -- see this file's own round-three
  // header comment.
  mine: boolean;
  myName: string;
  myAvatarUrl: string | null;
  peerName: string;
  peerAvatarUrl: string | null;
  // Non-null once this viewer knows an Accept has landed for this
  // proposal (see app/chats/[chatId]/page.tsx's own acceptedMeetings
  // map) -- carries the accepter's own timeZone, so their row can
  // finally render an exact time too.
  acceptPayload: MeetingAcceptPayload | null;
  // Accept only ever makes sense for the person who did NOT propose
  // this meeting, and only while it is still a real (non-pending,
  // already-synced) message -- see canAccept's own call site.
  canAccept: boolean;
  accepting: boolean;
  onAccept: () => void;
  // 2026-09-04 (Aleksandr: "Убери подложку со встречи") -- a meeting
  // message now renders flat, same as a lone photo/voice/file/contact
  // (app/chats/[chatId]/page.tsx's own isFlatMedia), with no colored
  // bubble wrapper of its own behind this already-self-contained card.
  // That wrapper used to be where the shared time+ticks row lived, so
  // page.tsx now hands it down as `footer` instead (same
  // ContactMessageCard convention, see that file's own `footer` prop),
  // rendered inside this card's own bottom padding.
  footer?: ReactNode;
}) {
  const [showTimeVisibility, setShowTimeVisibility] = useState(false);
  const accepted = acceptPayload !== null;

  const proposer: Participant = mine ? { name: myName, avatarUrl: myAvatarUrl } : { name: peerName, avatarUrl: peerAvatarUrl };
  const other: Participant = mine ? { name: peerName, avatarUrl: peerAvatarUrl } : { name: myName, avatarUrl: myAvatarUrl };

  // The other participant's row: exact once accepted (their own
  // timeZone rode in on the accept payload); a bucket if THIS viewer
  // happens to be that very participant, pre-accept (their own device
  // clock, always correct for themselves); otherwise genuinely hidden
  // -- see ParticipantRow's own `mode` doc above.
  const otherMode: "exact" | "bucket" | "hidden" = accepted ? "exact" : canAccept ? "bucket" : "hidden";

  return (
    <div className="relative w-[300px] max-w-full overflow-hidden rounded-2xl bg-[#12233d] p-4 text-white shadow-sm">
      {/* 2026-09-04 (Aleksandr, screenshot: the "Зрозуміло!" button at
          the bottom of the time-visibility panel below was clipped by
          this root's own `overflow-hidden`, cut off flush with the
          card's rounded corner and overlapped by the NEXT chat bubble
          -- "Это окно надо увеличивать при переключении") -- the panel
          used to render as an `absolute inset-0` layer, which forces
          its height to match whatever this card's own NORMAL content
          (header+rows+button, unrelated to the panel) happens to be --
          shorter than the panel's own icon+title+paragraph+button
          content actually needs, and `absolute` can't grow the root's
          real layout height to compensate anyway (chat bubbles below
          are positioned by normal flow, oblivious to anything
          overflowing past this box). Swapping the panel IN for the
          normal content (same root frame, just no longer layered via
          `absolute`) lets the root size itself to whichever content is
          actually showing, so the card genuinely grows and pushes
          later messages down instead of clipping. */}
      {showTimeVisibility ? (
        <div className="flex w-full flex-col items-center gap-3 text-center">
          {/* 2026-09-04 (Aleksandr, Figma "(1) Schedule a Meeting"
              reference + his own supplied planet2.json): the
              reference shows a big globe/planet icon centered above
              this exact copy -- his own animation now sits there
              instead of a static icon, same LottiePlayer convention
              every other in-app animation (planet-loader, the cat
              mascots) already uses. */}
          <LottiePlayer src="/animations/planet2.json" size={72} />
          <h3 className="text-[16px] font-semibold text-white">{t("timeVisibility", lang)}</h3>
          <p className="text-[13px] leading-snug text-white/60">{t("timeVisibilityBody", lang)}</p>
          <button
            type="button"
            onClick={() => setShowTimeVisibility(false)}
            className="mt-1 w-full rounded-full bg-[#335ef7] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#2748d6]"
          >
            {t("ok", lang)}
          </button>
        </div>
      ) : (
        <>
          {/* 2026-09-04 (round three, native reference): plain centered
              title, no icon badge -- his own screenshot's "Meeting
              proposal" header has neither a colored icon nor a
              secondary status line under it (that status moved down
              into the bottom row below, see the "waiting"/"scheduled"
              branch further down). */}
          <h3 className="mb-3.5 text-center text-[16px] font-semibold text-white">
            <T uk={STRINGS.title.uk} en={STRINGS.title.en} ru={STRINGS.title.ru} de={STRINGS.title.de} es={STRINGS.title.es} fr={STRINGS.title.fr} pl={STRINGS.title.pl} ptBR={STRINGS.title.ptBR} zh={STRINGS.title.zh} />
          </h3>

          <div className="flex flex-col gap-3">
            <ParticipantRow lang={lang} participant={proposer} startsAtUtcMs={payload.startsAtUtcMs} tz={payload.proposerTimeZone} mode="exact" />
            <div className="h-px bg-white/10" />
            <ParticipantRow
              lang={lang}
              participant={other}
              startsAtUtcMs={payload.startsAtUtcMs}
              tz={accepted ? acceptPayload.accepterTimeZone : undefined}
              mode={otherMode}
            />
          </div>

          <div className="mt-3.5 flex items-center gap-2 border-t border-white/10 pt-3.5">
            <button
              type="button"
              onClick={() => setShowTimeVisibility(true)}
              aria-label={t("timeVisibility", lang)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
            {canAccept && !accepted ? (
              <button
                type="button"
                onClick={onAccept}
                disabled={accepting}
                className="flex-1 rounded-full bg-[#335ef7] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#2748d6] disabled:opacity-60"
              >
                {t("accept", lang)}
              </button>
            ) : payload.link && (accepted || !canAccept) ? (
              <a
                href={payload.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-white/20"
              >
                {t("joinMeeting", lang)}
              </a>
            ) : (
              // 2026-09-04 (round three, native reference): the empty
              // spacer here used to just be dead space when neither an
              // Accept button nor a Join link applies (the proposer
              // looking at their own still-unaccepted proposal) --
              // native fills that same slot with an hourglass +
              // status label instead, which this now matches.
              <div className="flex flex-1 items-center gap-1.5 text-white/45">
                <HourglassIcon className="h-4 w-4 shrink-0" />
                <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                  {accepted ? (
                    <T uk={STRINGS.scheduledMeeting.uk} en={STRINGS.scheduledMeeting.en} ru={STRINGS.scheduledMeeting.ru} de={STRINGS.scheduledMeeting.de} es={STRINGS.scheduledMeeting.es} fr={STRINGS.scheduledMeeting.fr} pl={STRINGS.scheduledMeeting.pl} ptBR={STRINGS.scheduledMeeting.ptBR} zh={STRINGS.scheduledMeeting.zh} />
                  ) : (
                    <T uk={STRINGS.waitingAcceptance.uk} en={STRINGS.waitingAcceptance.en} ru={STRINGS.waitingAcceptance.ru} de={STRINGS.waitingAcceptance.de} es={STRINGS.waitingAcceptance.es} fr={STRINGS.waitingAcceptance.fr} pl={STRINGS.waitingAcceptance.pl} ptBR={STRINGS.waitingAcceptance.ptBR} zh={STRINGS.waitingAcceptance.zh} />
                  )}
                </span>
              </div>
            )}
          </div>

          {footer && <div className="mt-2 flex justify-end">{footer}</div>}
        </>
      )}
    </div>
  );
}
