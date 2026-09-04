"use client";

// components/chat/schedule-meeting-modal.tsx
//
// Scheduled Meetings (2026-09-04) -- the "Schedule meeting" half of the
// Meetings menu (components/chat/meetings-menu-modal.tsx's own first
// row, previously deliberately inert -- see that file's SCOPE NOTE,
// now wired to open this).
//
// SCOPE CUT, flagged same as every other one this session: the Figma
// reference shows a full custom date/time picker UI. This ships plain
// native <input type="date">/<input type="time">> controls instead --
// every real behavior (native calendar, native time wheel, keyboard
// entry, locale-correct formatting) for a fraction of the surface area
// a hand-built picker would need, at the cost of not visually matching
// the Figma mock pixel-for-pixel. Revisit if Aleksandr wants the exact
// custom look.
import { useState } from "react";
import { T, type Locale } from "@/components/t";
import { ChatBackArrow, ChatMeetingAttachIcon } from "./icons";

type StringKey = "title" | "date" | "time" | "link" | "linkPlaceholder" | "schedule" | "pastError";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Запланувати зустріч", en: "Schedule meeting", ru: "Запланировать встречу",
    de: "Treffen planen", es: "Programar reunión", fr: "Planifier une réunion",
    pl: "Zaplanuj spotkanie", ptBR: "Agendar reunião", zh: "安排会议",
  },
  date: {
    uk: "Дата", en: "Date", ru: "Дата", de: "Datum", es: "Fecha", fr: "Date", pl: "Data", ptBR: "Data", zh: "日期",
  },
  time: {
    uk: "Час", en: "Time", ru: "Время", de: "Uhrzeit", es: "Hora", fr: "Heure", pl: "Godzina", ptBR: "Horário", zh: "时间",
  },
  link: {
    uk: "Посилання на зустріч", en: "Meeting link", ru: "Ссылка на встречу", de: "Meeting-Link",
    es: "Enlace de la reunión", fr: "Lien de la réunion", pl: "Link do spotkania", ptBR: "Link da reunião", zh: "会议链接",
  },
  linkPlaceholder: {
    uk: "Необов\u2019язково", en: "Optional", ru: "Необязательно", de: "Optional", es: "Opcional",
    fr: "Facultatif", pl: "Opcjonalnie", ptBR: "Opcional", zh: "\u53ef\u9009",
  },
  schedule: {
    uk: "Запланувати", en: "Schedule", ru: "Запланировать", de: "Planen", es: "Programar",
    fr: "Planifier", pl: "Zaplanuj", ptBR: "Agendar", zh: "安排",
  },
  pastError: {
    uk: "Оберіть час у майбутньому", en: "Pick a time in the future", ru: "Выберите время в будущем",
    de: "Wähle einen Zeitpunkt in der Zukunft", es: "Elige una hora futura", fr: "Choisissez une heure future",
    pl: "Wybierz przyszłą godzinę", ptBR: "Escolha um horário futuro", zh: "\u8bf7\u9009\u62e9\u4e00\u4e2a\u672a\u6765\u7684\u65f6\u95f4",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

// yyyy-mm-dd for today, in the VIEWER's own local time (device-
// automatic timezone, same source as everywhere else in this feature)
// -- used as the date input's own `min` so nobody schedules into
// yesterday by fumbling the picker.
function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ScheduleMeetingModal({
  lang,
  onClose,
  onBack,
  onSchedule,
  scheduling,
}: {
  lang: Locale;
  onClose: () => void;
  // Back arrow returns to the Meetings menu (Quick Invites) rather than
  // closing outright -- same as ContactsPickerModal/CurrencyPickerModal
  // already do from inside their own parent menus.
  onBack: () => void;
  onSchedule: (payload: { startsAtUtcMs: number; link: string | null }) => void;
  scheduling: boolean;
}) {
  const [date, setDate] = useState(todayLocalIsoDate());
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [pastError, setPastError] = useState(false);

  function handleSubmit() {
    if (!date || !time || scheduling) return;
    // new Date("yyyy-mm-ddTHH:mm") parses as LOCAL time in every
    // evergreen browser (no "Z"/offset suffix) -- exactly the
    // proposer's own device-automatic timezone, which is all this
    // needs: see lib/a1/meeting-protocol.ts's own TIMEZONE NOTE for why
    // storing the resulting UTC instant is enough, with nothing about
    // this device's timezone itself needing to be sent anywhere.
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setPastError(true);
      return;
    }
    setPastError(false);
    onSchedule({ startsAtUtcMs: startsAt.getTime(), link: link.trim() ? link.trim() : null });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
          >
            <ChatBackArrow className="h-2.5 w-[6px]" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5fa2] to-[#2bd6c7] text-white">
            <ChatMeetingAttachIcon className="h-4 w-4" />
          </span>
          <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">
            <T
              uk={STRINGS.title.uk} en={STRINGS.title.en} ru={STRINGS.title.ru} de={STRINGS.title.de}
              es={STRINGS.title.es} fr={STRINGS.title.fr} pl={STRINGS.title.pl} ptBR={STRINGS.title.ptBR} zh={STRINGS.title.zh}
            />
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("date", lang)}
            <input
              type="date"
              value={date}
              min={todayLocalIsoDate()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[14px] text-neutral-900 outline-none focus:border-[#335ef7] dark:border-[#2b2b2b] dark:bg-[#1c1c1e] dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            {t("time", lang)}
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[14px] text-neutral-900 outline-none focus:border-[#335ef7] dark:border-[#2b2b2b] dark:bg-[#1c1c1e] dark:text-white"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
          {t("link", lang)}
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t("linkPlaceholder", lang)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-[#2b2b2b] dark:bg-[#1c1c1e] dark:text-white"
          />
        </label>

        {pastError && <p className="text-[12px] font-medium text-red-500">{t("pastError", lang)}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!date || !time || scheduling}
          className="w-full rounded-full bg-[#335ef7] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#2748d6] disabled:opacity-50 dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
        >
          {t("schedule", lang)}
        </button>
      </div>
    </div>
  );
}
