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
//     exact clock time -- see the "Time visibility" tooltip copy below,
//     taken verbatim off Figma's own annotation -- plus the Accept
//     button.
//   - Everyone else (the proposer themselves at any time, or ANYONE
//     once accepted): the exact date+time, computed by converting the
//     payload's one stored UTC instant into THIS viewer's own local
//     time zone (Intl/Date, device-automatic -- see meeting-protocol.ts
//     for why no other participant's timezone ever needs to be known).
import { T, type Locale } from "@/components/t";
import { ChatMeetingAttachIcon } from "./icons";
import { bucketForHour, type MeetingPayload, type MeetingTimeBucket } from "@/lib/a1/meeting-protocol";

type StringKey =
  | "title"
  | "waitingAcceptance"
  | "scheduledMeeting"
  | "accept"
  | "timeHidden"
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
  timeHidden: {
    uk: "Ваш точний час прихований, доки ви не натиснете «Прийняти». Інший користувач бачить лише орієнтовний проміжок часу.",
    en: "Your exact time is hidden until you press Accept. The other user only sees a time range.",
    ru: "Ваше точное время скрыто, пока вы не нажмёте «Принять». Другой пользователь видит только примерный промежуток времени.",
    de: "Deine genaue Uhrzeit ist verborgen, bis du auf „Annehmen\u201c tippst. Die andere Person sieht nur einen groben Zeitraum.",
    es: "Tu hora exacta está oculta hasta que pulses Aceptar. La otra persona solo ve un rango de tiempo.",
    fr: "Votre heure exacte est masquée jusqu'à ce que vous appuyiez sur Accepter. L'autre personne ne voit qu'une plage horaire.",
    pl: "Twoja dokładna godzina jest ukryta, dopóki nie klikniesz „Akceptuj”. Druga osoba widzi tylko przybliżony przedział czasu.",
    ptBR: "Seu horário exato fica oculto até você tocar em Aceitar. A outra pessoa vê apenas uma faixa de horário.",
    zh: "\u5728\u4f60\u70b9\u51fb\u201c\u63a5\u53d7\u201d\u4e4b\u524d\uff0c\u4f60\u7684\u786e\u5207\u65f6\u95f4\u662f\u9690\u85cf\u7684\u3002\u5bf9\u65b9\u53ea\u80fd\u770b\u5230\u4e00\u4e2a\u5927\u81f4\u7684\u65f6\u95f4\u6bb5\u3002",
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
// added to components/chat/icons.tsx -- these four are only ever used
// here, same "self-contained widget" call this session already made
// for other small one-off pieces (see chats-flyout.tsx/mini-chat-
// window.tsx's own header comments on that convention).
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

export function MeetingMessageCard({
  lang,
  payload,
  accepted,
  canAccept,
  accepting,
  onAccept,
}: {
  lang: Locale;
  payload: MeetingPayload;
  // True once this viewer knows an Accept has landed for this proposal
  // (see app/chats/[chatId]/page.tsx's own acceptedMeetingIds pass) --
  // reveals the exact time to every viewer, proposer and receiver
  // alike, from then on.
  accepted: boolean;
  // Accept only ever makes sense for the person who did NOT propose
  // this meeting, and only while it is still a real (non-pending,
  // already-synced) message -- see canAccept's own call site.
  canAccept: boolean;
  accepting: boolean;
  onAccept: () => void;
}) {
  const startDate = new Date(payload.startsAtUtcMs);
  const showExactTime = accepted || !canAccept;
  const dateLabel = startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const bucket = bucketForHour(startDate.getHours());

  return (
    <div className="w-[240px] max-w-full overflow-hidden rounded-2xl bg-white text-[#262a34] shadow-sm dark:bg-[#1c1c1e] dark:text-white">
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

      <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
        <BucketIcon bucket={bucket} className="shrink-0 text-neutral-500 dark:text-neutral-300" />
        <div className="min-w-0 text-[13px] font-medium">
          <div>{dateLabel}</div>
          <div className="text-neutral-500 dark:text-neutral-400">
            {showExactTime ? timeLabel : bucketLabel(bucket, lang)}
          </div>
        </div>
      </div>

      {!showExactTime && (
        <p className="mx-3 mt-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">{t("timeHidden", lang)}</p>
      )}

      {canAccept && !accepted && (
        <div className="px-3 pb-3 pt-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="w-full rounded-full bg-[#335ef7] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2748d6] disabled:opacity-60 dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
          >
            {t("accept", lang)}
          </button>
        </div>
      )}

      {payload.link && (accepted || !canAccept) && (
        <a
          href={payload.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 border-t border-black/5 px-3 py-2.5 text-[13px] font-semibold text-[#335ef7] transition hover:bg-black/5 dark:border-white/10 dark:text-[#0c8ce9] dark:hover:bg-white/5"
        >
          {t("joinMeeting", lang)}
        </a>
      )}
    </div>
  );
}
