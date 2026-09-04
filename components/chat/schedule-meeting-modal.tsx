"use client";

// components/chat/schedule-meeting-modal.tsx
//
// Scheduled Meetings (2026-09-04) -- the "Schedule meeting" half of the
// Meetings menu (components/chat/meetings-menu-modal.tsx's own first
// row, previously deliberately inert -- see that file's SCOPE NOTE,
// now wired to open this).
//
// 2026-09-04, round two (Aleksandr, Figma "(1) Schedule a Meeting"
// reference + "1-3 допили") -- round one shipped plain native
// <input type="date"/"time"> as an explicit, flagged scope-cut from
// Figma's own custom scroll-wheel picker. This replaces that with a
// real three-column wheel (day / hour / minute, see WheelColumn below)
// matching the reference, plus the peer identity row above it and the
// tap-to-open "Set Meeting in Your Time" info popup Figma's own "?"
// icon opens (globe glyph + explainer + "Got it!", copy taken verbatim
// off his reference screenshot).
//
// The peer row deliberately shows ONLY name+avatar, no live "Local
// time" bucket the Figma mock also shows there -- unlike
// meeting-message-card.tsx's own participant rows (which have a real
// signal to work with: either the accepter's own stated timeZone, or
// the viewer being that very participant), NOTHING is known yet about
// the peer's timezone at this point -- no proposal has been sent, no
// accept has happened, there's nothing to read a zone off of. Rather
// than fabricate a bucket with no real data behind it (this session's
// own standing rule, see meeting-message-card.tsx's header), that slot
// is simply left off. Flagged to Aleksandr same as every other scope
// note this session.
import { useEffect, useMemo, useRef, useState } from "react";
import { T, type Locale } from "@/components/t";
import { ChatBackArrow, ChatMeetingAttachIcon } from "./icons";
import { bucketForHour, bucketEmoji } from "@/lib/a1/meeting-protocol";
import { LottiePlayer } from "@/components/lottie-player";

type StringKey =
  | "title"
  | "link"
  | "linkPlaceholder"
  | "schedule"
  | "pastError"
  | "linkInvalid"
  | "setMeetingInYourTime"
  | "timeZoneInfoBody"
  | "gotIt"
  | "today";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Запланувати зустріч", en: "Schedule meeting", ru: "Запланировать встречу",
    de: "Treffen planen", es: "Programar reunión", fr: "Planifier une réunion",
    pl: "Zaplanuj spotkanie", ptBR: "Agendar reunião", zh: "安排会议",
  },
  link: {
    uk: "Посилання на зустріч", en: "Meeting link", ru: "Ссылка на встречу", de: "Meeting-Link",
    es: "Enlace de la reunión", fr: "Lien de la réunion", pl: "Link do spotkania", ptBR: "Link da reunião", zh: "会议链接",
  },
  linkPlaceholder: {
    uk: "Необов’язково", en: "Optional", ru: "Необязательно", de: "Optional", es: "Opcional",
    fr: "Facultatif", pl: "Opcjonalnie", ptBR: "Opcional", zh: "可选",
  },
  schedule: {
    uk: "Запланувати", en: "Schedule", ru: "Запланировать", de: "Planen", es: "Programar",
    fr: "Planifier", pl: "Zaplanuj", ptBR: "Agendar", zh: "安排",
  },
  pastError: {
    uk: "Оберіть час у майбутньому", en: "Pick a time in the future", ru: "Выберите время в будущем",
    de: "Wähle einen Zeitpunkt in der Zukunft", es: "Elige una hora futura", fr: "Choisissez une heure future",
    pl: "Wybierz przyszłą godzinę", ptBR: "Escolha um horário futuro", zh: "请选择一个未来的时间",
  },
  // 2026-09-04 (Aleksandr: "Делай базовую проверку линка, не давай
  // создать без .com и т.д.") -- link stays optional (linkPlaceholder
  // above), this only fires once something IS typed but doesn't look
  // like a real domain -- see isLikelyValidLink below for what "looks
  // like" means here.
  linkInvalid: {
    uk: "Схоже, це не посилання", en: "Doesn't look like a link", ru: "Похоже, это не ссылка",
    de: "Sieht nicht nach einem Link aus", es: "No parece un enlace", fr: "Cela ne ressemble pas à un lien",
    pl: "To nie wygląda na link", ptBR: "Isso não parece um link", zh: "这看起来不像一个链接",
  },
  setMeetingInYourTime: {
    uk: "Встановіть зустріч у вашому часі", en: "Set Meeting in Your Time", ru: "Установите встречу в вашем времени",
    de: "Termin in deiner Zeitzone festlegen", es: "Configura la reunión en tu hora",
    fr: "Définir la réunion dans votre fuseau", pl: "Ustaw spotkanie w swoim czasie",
    ptBR: "Defina a reunião no seu horário", zh: "按你的时间设置会议",
  },
  timeZoneInfoBody: {
    uk: "Встановіть час у своєму часовому поясі та перевірте доступність іншого користувача. Переконайтеся, що це підходить і йому!",
    en: "Set the time in your time zone and check the other user’s availability. Make sure it works for them too!",
    ru: "Установите время в своём часовом поясе и проверьте доступность другого пользователя. Убедитесь, что это удобно и ему!",
    de: "Lege die Uhrzeit in deiner Zeitzone fest und prüfe die Verfügbarkeit der anderen Person. Stelle sicher, dass es auch für sie passt!",
    es: "Configura la hora en tu zona horaria y comprueba la disponibilidad del otro usuario. ¡Asegúrate de que también le venga bien!",
    fr: "Définissez l'heure dans votre fuseau et vérifiez la disponibilité de l'autre personne. Assurez-vous que cela lui convient aussi !",
    pl: "Ustaw godzinę w swojej strefie czasowej i sprawdź dostępność drugiej osoby. Upewnij się, że to jej też pasuje!",
    ptBR: "Defina o horário no seu fuso e verifique a disponibilidade da outra pessoa. Confirme que também funciona para ela!",
    zh: "按你所在时区设置时间，并确认对方是否有空。请确保这个时间对他们也合适！",
  },
  gotIt: {
    uk: "Зрозуміло!", en: "Got it!", ru: "Понятно!", de: "Verstanden!", es: "¡Entendido!",
    fr: "Compris !", pl: "Rozumiem!", ptBR: "Entendi!", zh: "知道了！",
  },
  today: {
    uk: "Сьогодні", en: "Today", ru: "Сегодня", de: "Heute", es: "Hoy", fr: "Aujourd’hui", pl: "Dzisiaj", ptBR: "Hoje", zh: "今天",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
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

// Fixed row height for every wheel column, in px -- both the item
// height CSS below and this scroll-math have to agree on the exact
// same number, so it's pulled out once rather than repeated as a
// magic "40" in three different places.
const WHEEL_ITEM_H = 40;
// Odd number of visible rows so the selected one sits dead center
// (3 above, selected, 3 below) -- matches the Figma reference's own
// 7-row wheel exactly.
const WHEEL_VISIBLE_ROWS = 7;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD = (WHEEL_H - WHEEL_ITEM_H) / 2;

// One scrollable, snap-to-row column -- day, hour, or minute all reuse
// this exact same widget, just with different `items`/`selectedIndex`.
// Native overflow-y + CSS scroll-snap does the actual drag/flick/snap
// physics (touch AND mouse-wheel both work for free); this only needs
// to (a) seed the initial scroll position on mount/selection change
// coming from OUTSIDE (e.g. a tap on another row), and (b) read back
// which row ended up centered once the user's own scroll settles.
function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  align = "center",
  className,
}: {
  items: { key: string; label: string; bold?: boolean }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while THIS column is driving its own scroll position (either
  // the initial seed or a tap-to-select smooth-scroll) -- the onScroll
  // handler ignores index updates while a programmatic scroll is still
  // in flight, so it doesn't fight itself mid-animation.
  const programmatic = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = selectedIndex * WHEEL_ITEM_H;
    if (Math.abs(el.scrollTop - target) < 1) return;
    programmatic.current = true;
    el.scrollTo({ top: target, behavior: "auto" });
    const id = requestAnimationFrame(() => {
      programmatic.current = false;
    });
    return () => cancelAnimationFrame(id);
    // Only re-seed when the index was changed from OUTSIDE this column
    // (another row's tap driving this one, or the day list changing
    // shape) -- this column's own scroll gestures update selectedIndex
    // via onSelect below without needing this effect to fire back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, items.length]);

  function handleScroll() {
    if (programmatic.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const index = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_H)));
      if (index !== selectedIndex) onSelect(index);
    }, 80);
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={`snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
      style={{ height: WHEEL_H, paddingTop: WHEEL_PAD, paddingBottom: WHEEL_PAD }}
    >
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <button
            type="button"
            key={item.key}
            onClick={() => {
              const el = ref.current;
              if (el) el.scrollTo({ top: i * WHEEL_ITEM_H, behavior: "smooth" });
              onSelect(i);
            }}
            className={`flex w-full snap-center items-center text-[16px] tabular-nums transition-colors ${
              align === "start" ? "justify-start pl-1" : align === "end" ? "justify-end pr-1" : "justify-center"
            } ${
              isSelected
                ? "font-semibold text-neutral-900 dark:text-neutral-50"
                : "text-neutral-400 dark:text-neutral-500"
            } ${item.bold && isSelected ? "font-bold" : ""}`}
            style={{ height: WHEEL_ITEM_H }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 2026-09-04 (Aleksandr: "Делай базовую проверку линка, не давай
// создать без .com и т.д.") -- deliberately basic, per his own wording:
// empty is fine (the field stays optional, see linkPlaceholder above),
// anything typed just needs to look like a real host -- at least one
// dot and a 2+ letter TLD after it, no spaces -- not a full RFC 3986
// parse. Strips an optional scheme first so "https://meet.google.com/
// abc" and "meet.google.com/abc" validate the same way.
function isLikelyValidLink(raw: string): boolean {
  const value = raw.trim();
  if (!value) return true;
  const withoutScheme = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  const host = withoutScheme.split(/[/?#]/)[0] ?? "";
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(host) && /\.[a-zA-Z]{2,}$/.test(host);
}

export function ScheduleMeetingModal({
  open,
  lang,
  peerName,
  peerAvatarUrl,
  onClose,
  onBack,
  onSchedule,
  scheduling,
}: {
  // 2026-09-04 (Aleksandr: "Время оставляй при переключении" -- backing
  // out to the Meetings quick-invite screen and reopening Schedule used
  // to fully unmount/remount this component (the parent's own
  // `{scheduleMeetingOpen && <ScheduleMeetingModal .../>}`), resetting
  // every useState below (dayIndex/hourIndex/minuteIndex/link/...) back
  // to their defaults each time. The parent now mounts this
  // unconditionally and only toggles `open`; the early return below
  // (AFTER every hook) just hides the output while closed, same
  // "stays mounted, state survives" convention components/chats-
  // flyout.tsx and components/mini-chat-window.tsx already use for
  // their own `open` props.
  open: boolean;
  lang: Locale;
  peerName: string;
  peerAvatarUrl: string | null;
  onClose: () => void;
  // Back arrow returns to the Meetings menu (Quick Invites) rather than
  // closing outright -- same as ContactsPickerModal/CurrencyPickerModal
  // already do from inside their own parent menus.
  onBack: () => void;
  onSchedule: (payload: { startsAtUtcMs: number; link: string | null }) => void;
  scheduling: boolean;
}) {
  // 14 days out, starting today -- generous enough for any reasonable
  // "schedule a meeting" horizon without an unbounded/scrolling-forever
  // list. Built once (device-local calendar days from "now" at mount),
  // not recomputed on every render.
  // `today` is a single fixed local-midnight anchor, captured once at
  // mount and shared by both `days` (below) and `initial` (further
  // below) -- computing "now" separately in each used to leave
  // `initial` with a hardcoded dayIndex: 0, which was wrong for any
  // schedule attempt within an hour of local midnight (see `initial`'s
  // own comment for the actual bug this caused).
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const days = useMemo(() => {
    const list: { key: string; label: string; iso: string; bold?: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const label =
        i === 0
          ? t("today", lang)
          : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
      list.push({ key: iso, label, iso, bold: i === 0 });
    }
    return list;
  }, [lang, today]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: pad2(h) })), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ key: String(i * 5), label: pad2(i * 5) })), []);

  // Default selection: one hour from now, rounded up to the next
  // 5-minute mark -- a sensible "ready to schedule" starting point
  // rather than defaulting into the past (00:00) and forcing the user
  // to dial the whole wheel up themselves every time.
  //
  // dayIndex is derived from the actual calendar-day difference between
  // that +1h instant and `today` above, NOT hardcoded to 0 -- an
  // earlier version of this always defaulted to "Today", which for
  // anyone scheduling within roughly an hour of local midnight put the
  // default hour on the WRONG day (e.g. now 23:30 -> +1h rounds to
  // 00:30, but with dayIndex stuck at 0 that rendered as "Today 00:30",
  // i.e. earlier today, already in the past -- caught on review before
  // Aleksandr ever saw it live).
  const initial = useMemo(() => {
    // Rounding done entirely in millisecond-epoch arithmetic (round
    // "now + 1h" up to the next 5-minute mark, THEN build a Date from
    // that), so hour/day/month/year rollovers are all handled by the
    // Date object itself -- no manual hour/day carry math that could
    // (and, in an earlier draft of this, did) miss a rollover case.
    const FIVE_MIN_MS = 5 * 60 * 1000;
    const roundedMs = Math.ceil((Date.now() + 60 * 60 * 1000) / FIVE_MIN_MS) * FIVE_MIN_MS;
    const target = new Date(roundedMs);
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const dayIndexRaw = Math.round((targetDay.getTime() - today.getTime()) / 86400000);
    return {
      dayIndex: Math.max(0, Math.min(days.length - 1, dayIndexRaw)),
      hourIndex: target.getHours(),
      minuteIndex: target.getMinutes() / 5,
    };
  }, [today, days.length]);
  const [dayIndex, setDayIndex] = useState(initial.dayIndex);
  const [hourIndex, setHourIndex] = useState(initial.hourIndex);
  const [minuteIndex, setMinuteIndex] = useState(initial.minuteIndex);
  const [link, setLink] = useState("");
  const [pastError, setPastError] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [showTzInfo, setShowTzInfo] = useState(false);

  const selectedDay = days[dayIndex] ?? days[0]!;
  const selectedHour = hours[hourIndex]!.key;
  const selectedMinute = minutes[minuteIndex]!.key;
  // Live bucket glyph above the wheel -- see this hook's own call site
  // below for the "Аleksandr, 'показывай сверху иконку какое время
  // суток'" request this feeds.
  const selectedBucket = bucketForHour(Number(selectedHour));

  function handleSubmit() {
    if (scheduling) return;
    if (!isLikelyValidLink(link)) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    const startsAt = new Date(`${selectedDay.iso}T${pad2(Number(selectedHour))}:${pad2(Number(selectedMinute))}`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setPastError(true);
      return;
    }
    setPastError(false);
    onSchedule({ startsAtUtcMs: startsAt.getTime(), link: link.trim() ? link.trim() : null });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
          >
            <ChatBackArrow className="h-2.5 w-[6px] animate-back-arrow" />
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

        <div className="flex items-center gap-2.5 rounded-xl bg-black/5 px-3 py-2.5 dark:bg-white/10">
          {peerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- proxied
            // media URL, not a next/image-configured remote host.
            <img src={peerAvatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8a93ff] to-[#5c6bff] text-[13px] font-semibold text-white">
              {peerName.trim().slice(0, 1).toUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0 truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{peerName}</div>
        </div>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
          {t("link", lang)}
          <input
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (linkError) setLinkError(false);
            }}
            placeholder={t("linkPlaceholder", lang)}
            className={`rounded-lg border bg-white px-2.5 py-2 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:bg-[#1c1c1e] dark:text-white ${
              linkError
                ? "border-red-400 focus:border-red-500 dark:border-red-500"
                : "border-neutral-200 focus:border-[#335ef7] dark:border-[#2b2b2b]"
            }`}
          />
          {linkError && <span className="text-[11px] font-normal text-red-500">{t("linkInvalid", lang)}</span>}
        </label>

        <div className="rounded-xl border border-neutral-200 dark:border-[#2b2b2b]">
          <div className="flex items-center justify-between px-3 pt-2.5">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              {t("setMeetingInYourTime", lang)}
              {/* 2026-09-04 (Aleksandr: "При скролле времени показывай
                  сверху иконку какое время суток... Все те иконки это
                  обычные эмодзи") -- live, re-derives off `selectedHour`
                  (the WheelColumn's own currently-centered hour) on
                  every scroll tick, same bucketForHour/bucketEmoji this
                  file shares with meeting-message-card.tsx's own
                  per-participant bucket row. */}
              <span className="text-[15px] leading-none" aria-hidden="true">{bucketEmoji(selectedBucket)}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTzInfo(true)}
              aria-label={t("setMeetingInYourTime", lang)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-300"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-1">
            {/* Selected-row highlight, spanning the full width behind
                all three columns -- drawn once here rather than inside
                each WheelColumn, so it reads as one continuous pill
                across day/hour/minute exactly like the Figma reference. */}
            <div
              className="pointer-events-none absolute inset-x-2 rounded-xl bg-black/5 dark:bg-white/10"
              style={{ top: WHEEL_PAD, height: WHEEL_ITEM_H }}
            />
            <div className="grid grid-cols-[1fr_auto_auto] items-stretch">
              <WheelColumn items={days} selectedIndex={dayIndex} onSelect={setDayIndex} align="start" className="pl-3" />
              <WheelColumn items={hours} selectedIndex={hourIndex} onSelect={setHourIndex} className="w-12" />
              <WheelColumn items={minutes} selectedIndex={minuteIndex} onSelect={setMinuteIndex} align="end" className="w-12 pr-3" />
            </div>
          </div>
        </div>

        {pastError && <p className="text-[12px] font-medium text-red-500">{t("pastError", lang)}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={scheduling}
          className="w-full rounded-full bg-[#335ef7] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#2748d6] disabled:opacity-50 dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
        >
          {t("schedule", lang)}
        </button>
      </div>

      {/* 2026-09-04 (Aleksandr: "Показывай эту штуку на самом инвайте
          не перекрывая флоу и без затемнения всего экрана" -- applied
          here too, "Этот текст тоже показывай внутри этого блока и ту
          же самую кнопку 'зрозуміло'") -- was its own second `fixed
          inset-0` scrim stacked on top of this modal's already-dimmed
          backdrop above (double dimming). Now `absolute inset-0`
          against this panel's own `relative` root instead -- covers
          only the modal's own panel, in the panel's own bg color, no
          extra scrim layer. Button copy already matched the "gotIt"
          wording meeting-message-card.tsx's own popup just adopted too
          (STRINGS.gotIt here, that file's own STRINGS.ok) -- kept as is. */}
      {showTzInfo && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/98 p-5 backdrop-blur-sm dark:bg-neutral-900/98"
          onClick={(e) => {
            e.stopPropagation();
            setShowTzInfo(false);
          }}
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center" onClick={(e) => e.stopPropagation()}>
            {/* 2026-09-04 (Aleksandr, Figma "(1) Schedule a Meeting"
                reference + his own supplied planet2.json): same swap as
                meeting-message-card.tsx's own "Видимість часу" popup --
                see that file's own comment. */}
            <LottiePlayer src="/animations/planet2.json" size={72} />
            <p className="text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">{t("timeZoneInfoBody", lang)}</p>
            <button
              type="button"
              onClick={() => setShowTzInfo(false)}
              className="mt-1 w-full rounded-full bg-[#335ef7] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2748d6] dark:bg-[#0c8ce9] dark:hover:bg-[#0a75c2]"
            >
              {t("gotIt", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
