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
import { useState } from "react";
import { T, type Locale } from "@/components/t";
import { ChatMeetingAttachIcon } from "./icons";
import { bucketForHour, type MeetingPayload, type MeetingAcceptPayload, type MeetingTimeBucket } from "@/lib/a1/meeting-protocol";

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
  title: {
    uk: "Зустріч", en: "Meeting", ru: "Встреча", de: "Treffen", es: "Reunión",
    fr: "Rendez-vous", pl: "Spotkanie", ptBR: "Reunião", zh: "会议",
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
  ok: {
    uk: "Гаразд", en: "OK", ru: "ОК", de: "OK", es: "OK", fr: "OK", pl: "OK", ptBR: "OK", zh: "好的",
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

// Single-color currentColor glyphs, kept local to this file rather than
// added to components/chat/icons.tsx -- these are only ever used here,
// same "self-contained widget" call this session already made for
// other small one-off pieces (see chats-flyout.tsx/mini-chat-window.tsx
// own header comments on that convention).
function BucketIcon({ bucket, className }: { bucket: MeetingTimeBucket; className?: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  if (bucket === "early-morning") {
    return (
      <svg {...common}>
        <circle cx="12" cy="15" r="4" />
        <path d="M12 3v3M4.2 8.2l1.8 1.8M19.8 8.2 18 10M2 19h20M6 19a6 6 0 0 1 12 0" />
      </svg>
    );
  }
  if (bucket === "daytime") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
      </svg>
    );
  }
  if (bucket === "evening") {
    return (
      <svg {...common}>
        <path d="M3 20h18M5 20V10l3-2 3 2v10M13 20V6l3-2 3 2v14" />
        <path d="M8 13h0M8 16h0M16 10h0M16 13h0M16 16h0" strokeWidth="2.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

// Plain hourglass, for the "hidden until they accept" placeholder row
// -- deliberately a different glyph from BucketIcon's four (nothing
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
    <div className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-[#8a93ff] to-[#5c6bff] text-[11px] font-semibold text-white`}>
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
  const dateLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: zone });
  const timeLabel = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const bucket = bucketForHour(
    Number(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: zone })) % 24,
  );

  return (
    <div className="flex items-center gap-2.5">
      <ParticipantAvatar p={participant} className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{participant.name || "—"}</div>
        <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
          {mode === "hidden" ? (
            t("timeHiddenUntilTheyAccept", lang)
          ) : (
            <>
              {mode === "exact" ? t("localTimeWillBe", lang) : t("localTime", lang)}
              {mode === "exact" ? ` · ${dateLabel}` : ""}
            </>
          )}
        </div>
      </div>
      {mode === "exact" && <div className="shrink-0 text-[15px] font-semibold tabular-nums">{timeLabel}</div>}
      {mode === "bucket" && (
        <div className="flex shrink-0 items-center gap-1 text-neutral-500 dark:text-neutral-400">
          <BucketIcon bucket={bucket} className="h-4 w-4" />
          <span className="text-[12px] font-medium">{bucketLabel(bucket, lang)}</span>
        </div>
      )}
      {mode === "hidden" && <HourglassIcon className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />}
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
}: {
  lang: Locale;
  payload: MeetingPayload;
  // True (via msg.fromId) when THIS viewer is the one who proposed the
  // meeting -- picks which of the two identities below is "the
  // proposer" vs. "the other participant" (see this file's own header
  // and meeting-protocol.ts's MeetingPayload comment for why neither
  // name/avatar needs to ride in the payload itself).
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
    <div className="w-[272px] max-w-full overflow-hidden rounded-2xl bg-white text-[#262a34] shadow-sm dark:bg-[#1c1c1e] dark:text-white">
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5fa2] to-[#2bd6c7] text-white">
          <ChatMeetingAttachIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">
            <T uk={STRINGS.title.uk} en={STRINGS.title.en} ru={STRINGS.title.ru} de={STRINGS.title.de} es={STRINGS.title.es} fr={STRINGS.title.fr} pl={STRINGS.title.pl} ptBR={STRINGS.title.ptBR} zh={STRINGS.title.zh} />
          </div>
          <div className="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {accepted ? (
              <T uk={STRINGS.scheduledMeeting.uk} en={STRINGS.scheduledMeeting.en} ru={STRINGS.scheduledMeeting.ru} de={STRINGS.scheduledMeeting.de} es={STRINGS.scheduledMeeting.es} fr={STRINGS.scheduledMeeting.fr} pl={STRINGS.scheduledMeeting.pl} ptBR={STRINGS.scheduledMeeting.ptBR} zh={STRINGS.scheduledMeeting.zh} />
            ) : (
              <T uk={STRINGS.waitingAcceptance.uk} en={STRINGS.waitingAcceptance.en} ru={STRINGS.waitingAcceptance.ru} de={STRINGS.waitingAcceptance.de} es={STRINGS.waitingAcceptance.es} fr={STRINGS.waitingAcceptance.fr} pl={STRINGS.waitingAcceptance.pl} ptBR={STRINGS.waitingAcceptance.ptBR} zh={STRINGS.waitingAcceptance.zh} />
            )}
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 flex flex-col gap-2.5 rounded-xl bg-black/5 px-3 py-2.5 dark:bg-white/10">
        <ParticipantRow lang={lang} participant={proposer} startsAtUtcMs={payload.startsAtUtcMs} tz={payload.proposerTimeZone} mode="exact" />
        <div className="h-px bg-black/5 dark:bg-white/10" />
        <ParticipantRow
          lang={lang}
          participant={other}
          startsAtUtcMs={payload.startsAtUtcMs}
          tz={accepted ? acceptPayload.accepterTimeZone : undefined}
          mode={otherMode}
        />
      </div>

      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setShowTimeVisibility(true)}
          aria-label={t("timeVisibility", lang)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-neutral-500 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15"
        >
          <InfoIcon className="h-4 w-4" />
        </button>
        {canAccept && !accepted ? (
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="flex-1 rounded-full bg-[#335ef7] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2748d6] disabled:opacity-60 dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
          >
            {t("accept", lang)}
          </button>
        ) : payload.link && (accepted || !canAccept) ? (
          <a
            href={payload.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#335ef7]/10 px-4 py-2 text-[13px] font-semibold text-[#335ef7] transition hover:bg-[#335ef7]/15 dark:bg-[#0c8ce9]/15 dark:text-[#0c8ce9] dark:hover:bg-[#0c8ce9]/20"
          >
            {t("joinMeeting", lang)}
          </a>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {showTimeVisibility && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowTimeVisibility(false);
          }}
        >
          <div
            className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{t("timeVisibility", lang)}</h3>
            <p className="text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{t("timeVisibilityBody", lang)}</p>
            <button
              type="button"
              onClick={() => setShowTimeVisibility(false)}
              className="mt-1 w-full rounded-full bg-[#335ef7] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2748d6] dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
            >
              {t("ok", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
