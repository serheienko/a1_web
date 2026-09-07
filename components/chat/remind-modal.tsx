// components/chat/remind-modal.tsx
//
// "Remind" feature (Aleksandr, reference screenshot showing the
// message context menu's Reply/Copy/Remind/Forward/Pin/Delete/Select
// row -- "У нас есть еще фича «remind» она работает на каждое
// сообщение... Можно поставить ремайндер на кажд сообщение"). The
// "Remind" row in message-actions-menu.tsx was a visual-only
// placeholder since this file's own original header comment
// ("everything is placeholder except Reply"); this wires it to the
// real thing, ground-truthed off the mobile app's own RemindMeModal
// (lib/features/chat/presentation/chat_detail/components/
// remind_me_modal.dart) rather than guessed:
//   - a date+time picker, minimum selectable moment is the START OF
//     THE NEXT MINUTE from now (mobile's own _minimumScheduleTime
//     comment: "avoids backend rejection" of a reminder for "now").
//   - when the chat has a peer name, an optional toggle labelled
//     "Remind {name} too" -- mobile's own switch is inverted from the
//     wire field (`local = !toggle`), default OFF, i.e. `local: true`
//     (self-only) by default; flipping it on sends `local: false`,
//     which also reminds the other side of the chat.
// Deliberately the SAME centered-card visual language as
// DeleteMessageConfirmDialog right in this same file's neighbor
// (message-actions-menu.tsx) rather than a new anchored popup or a
// full-height Cupertino sheet like mobile's own -- this app's chat
// surface already has that "centered card over a dim backdrop"
// pattern established for confirmations, and a date/time picker fits
// it fine without inventing a second modal shape.
//
// 2026-09-06 (reminders list follow-up -- mobile's own RemindMeModal
// doubles as its EDIT dialog too: reminders_modal_item.dart's
// `_showEditReminder` reopens this exact same widget with
// `initialScheduleAt`/`initialLocal` prefilled and its "Set reminder"
// button just calls `createReminder` again -- there is no separate
// "updateReminder" backend method, editing is just re-creating with a
// new scheduleAt for the same message id). `initialScheduleAt`/
// `initialLocal` below are that same optional pair, used only by
// components/chat/reminders-list-modal.tsx's own edit flow; the
// original "Нагадати" call site (a brand-new reminder) simply omits
// them and gets the old default-to-now-plus-a-minute behavior.
//
// 2026-09-06, round two (Fix Tracker "Сделай этот пикер даты более
// современным и более удобным" -- this was the app's last remaining
// raw <input type="datetime-local">, the browser/OS's own stock
// widget, next to schedule-meeting-modal.tsx's own day/hour/minute
// scroll-wheel already shipped for "Schedule meeting"). Replaces it
// with that same wheel-picker LANGUAGE (day / hour / minute columns,
// tap-or-flick-to-select, selected row highlighted) -- kept as its
// own trimmed copy of WheelColumn rather than importing that other
// file's, since this card is a fixed dark surface regardless of the
// app's own light/dark theme (schedule-meeting-modal's WheelColumn is
// theme-aware, this one only ever needs white-on-dark). The day
// column shows locale-free "DD.MM" for everything past "Today" (no
// weekday-name table to keep in sync across 9 languages just for a
// date wheel) rather than schedule-meeting-modal's own localized
// weekday label -- a deliberate, smaller scope than that file's.
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { T } from "@/components/t";

// Minimum schedule time is the start of the next minute, same rule as
// mobile's own _minimumScheduleTime -- the backend rejects "now" or
// anything in the current minute.
function minimumScheduleTime(from: Date): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return next;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Fixed row height for every wheel column, in px -- the item height
// CSS below and this scroll-math have to agree on the exact same
// number, so it's pulled out once rather than repeated as a magic
// value in three different places. Same idea as schedule-meeting-
// modal.tsx's own WHEEL_ITEM_H, just a touch shorter (34 vs 40) to fit
// this card's own much more compact "Нагадати" layout.
const WHEEL_ITEM_H = 34;
// Odd number of visible rows so the selected one sits dead center.
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD = (WHEEL_H - WHEEL_ITEM_H) / 2;

// One scrollable, snap-to-row column -- day, hour and minute all reuse
// this exact same widget, just with different `items`/`selectedIndex`
// (see this file's own header entry for why this is a separate copy
// of schedule-meeting-modal.tsx's own WheelColumn rather than a shared
// import). Native overflow-y + CSS scroll-snap does the actual drag/
// flick/snap physics (touch AND mouse-wheel both work for free); this
// only needs to (a) seed the initial scroll position on mount/
// selection change coming from OUTSIDE (e.g. a tap on another row),
// and (b) read back which row ended up centered once the user's own
// scroll settles.
function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  align = "center",
  className,
}: {
  items: { key: string; label: ReactNode; bold?: boolean }[];
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
    // -- this column's own scroll gestures update selectedIndex via
    // onSelect below without needing this effect to fire back.
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
            className={`flex w-full shrink-0 snap-center items-center text-[15px] tabular-nums transition-colors ${
              align === "start" ? "justify-start pl-1" : align === "end" ? "justify-end pr-1" : "justify-center"
            } ${isSelected ? "font-semibold text-white" : "text-white/40"} ${item.bold && isSelected ? "font-bold" : ""}`}
            style={{ height: WHEEL_ITEM_H }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function RemindModal({
  peerDisplayName,
  submitting,
  failed,
  initialScheduleAt,
  initialLocal,
  onCancel,
  onConfirm,
  anchorRect,
}: {
  // Chat's own display name (headerTitle) -- omitted/empty just hides
  // the "remind X too" toggle row, same as mobile's own `peerDisplayName
  // != null && peerDisplayName.isNotEmpty` guard.
  peerDisplayName?: string;
  submitting: boolean;
  failed: boolean;
  // Editing an existing reminder (see this file's own 2026-09-06
  // header entry): unix seconds + the wire `local` value exactly as
  // stored, same pair reminders-list-modal.tsx reads off the reminder
  // it's editing.
  initialScheduleAt?: number;
  initialLocal?: boolean;
  onCancel: () => void;
  // Unix seconds + the wire `local` value (already inverted from
  // whatever the toggle showed -- see this file's own header comment).
  onConfirm: (scheduleAt: number, local: boolean) => void;
  // Fix Tracker (2026-09-07, order 113: "Модалка с вводом даты и часу
  // нагадування повинна з'являтися поверх мини-чата не по-центру
  // десктопа") -- same anchored-recenter trick as
  // DeleteMessageConfirmDialog's own `anchorRect` (message-actions-
  // menu.tsx): when set, the card re-centers over that rect instead of
  // the full viewport. Omitted (the main chat page) keeps the original
  // full-viewport centering.
  anchorRect?: { top: number; left: number; width: number; height: number } | null;
}) {
  const [remindPeerToo, setRemindPeerToo] = useState(() => initialLocal === false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [anchoredStyle, setAnchoredStyle] = useState<{ position: "fixed"; left: number; top: number; margin: number } | undefined>(undefined);
  useLayoutEffect(() => {
    if (!anchorRect || !cardRef.current) {
      setAnchoredStyle(undefined);
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const margin = 12;
    const idealLeft = anchorRect.left + anchorRect.width / 2 - rect.width / 2;
    const idealTop = anchorRect.top + anchorRect.height / 2 - rect.height / 2;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    setAnchoredStyle({
      position: "fixed",
      left: Math.min(Math.max(idealLeft, margin), maxLeft),
      top: Math.min(Math.max(idealTop, margin), maxTop),
      margin: 0,
    });
  }, [anchorRect]);

  // `today` is a single fixed local-midnight anchor, captured once at
  // mount and shared by both `days` (below) and `initial` (further
  // below) -- same reasoning as schedule-meeting-modal.tsx's own
  // identical anchor (computing "now" separately in each spot risks a
  // dayIndex off-by-one right around local midnight).
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  // Two-week horizon, same as schedule-meeting-modal.tsx's own day
  // wheel -- plenty for "remind me about this message", without an
  // unbounded/scrolling-forever list.
  const days = useMemo(() => {
    const list: { key: string; label: ReactNode; iso: string; bold?: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      list.push({
        key: iso,
        iso,
        bold: i === 0,
        label:
          i === 0 ? (
            <T
              uk="Сьогодні" en="Today" ru="Сегодня" de="Heute" es="Hoy"
              fr="Aujourd’hui" pl="Dzisiaj" ptBR="Hoje" zh="今天"
            />
          ) : (
            `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
          ),
      });
    }
    return list;
  }, [today]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: pad2(h) })), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, m) => ({ key: String(m), label: pad2(m) })), []);

  // Default selection: the minimum schedulable moment (start of the
  // next minute from now), same default the old native input's own
  // `value` used -- or, when editing, the reminder's existing
  // scheduleAt (clamped up to that same minimum if it's somehow
  // already in the past). dayIndex is derived from the actual
  // calendar-day difference against `today`, not hardcoded to 0, for
  // the same local-midnight-rollover reason schedule-meeting-modal.tsx
  // documents on its own identical `initial`.
  const initial = useMemo(() => {
    const min = minimumScheduleTime(new Date());
    const fromInitial = initialScheduleAt === undefined ? null : new Date(initialScheduleAt * 1000);
    const base = fromInitial && fromInitial >= min ? fromInitial : min;
    const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dayIndexRaw = Math.round((baseDay.getTime() - today.getTime()) / 86400000);
    return {
      dayIndex: Math.max(0, Math.min(days.length - 1, dayIndexRaw)),
      hourIndex: base.getHours(),
      minuteIndex: base.getMinutes(),
    };
    // Only meant to seed the initial useState values below, same as
    // schedule-meeting-modal.tsx's own `initial` -- not meant to
    // re-derive on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, days.length]);
  const [dayIndex, setDayIndex] = useState(initial.dayIndex);
  const [hourIndex, setHourIndex] = useState(initial.hourIndex);
  const [minuteIndex, setMinuteIndex] = useState(initial.minuteIndex);

  const selected = useMemo(() => {
    const day = days[dayIndex] ?? days[0]!;
    const [y, m, d] = day.iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!, hourIndex, minuteIndex);
  }, [days, dayIndex, hourIndex, minuteIndex]);

  function handleConfirm() {
    const min = minimumScheduleTime(new Date());
    const effective = selected < min ? min : selected;
    const scheduleAt = Math.floor(effective.getTime() / 1000);
    onConfirm(scheduleAt, !remindPeerToo);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onCancel}>
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={anchoredStyle}
        className="w-full max-w-[300px] rounded-2xl bg-[#2c2c2e]/95 p-4 text-center shadow-2xl backdrop-blur-xl"
      >
        <p className="text-[15px] font-medium leading-snug text-white">
          <T uk="Нагадати" en="Remind me" ru="Напомнить" de="Erinnern" es="Recordar" fr="Rappeler" pl="Przypomnij" ptBR="Lembrar" zh="提醒" />
        </p>
        {failed && (
          <p className="mt-2 text-[13px] text-red-400">
            <T
              uk="Не вдалося встановити нагадування. Спробуйте ще раз." en="Couldn't set the reminder. Try again."
              ru="Не удалось установить напоминание. Попробуйте ещё раз." de="Erinnerung konnte nicht gesetzt werden. Versuch es erneut."
              es="No se pudo programar el recordatorio. Inténtalo de nuevo." fr="Impossible de créer le rappel. Réessayez."
              pl="Nie udało się ustawić przypomnienia. Spróbuj ponownie." ptBR="Não foi possível definir o lembrete. Tente novamente."
              zh="设置提醒失败，请重试。"
            />
          </p>
        )}
        <div className="relative mt-3.5">
          {/* Selected-row highlight, spanning the full width behind all
              three columns -- drawn once here rather than inside each
              WheelColumn, so it reads as one continuous pill across
              day/hour/minute, same trick schedule-meeting-modal.tsx's
              own wheel uses. */}
          <div
            className="pointer-events-none absolute inset-x-1 rounded-lg bg-white/10"
            style={{ top: WHEEL_PAD, height: WHEEL_ITEM_H }}
          />
          <div className="grid grid-cols-[1fr_auto_auto] items-stretch rounded-xl border border-white/10 bg-white/5">
            <WheelColumn items={days} selectedIndex={dayIndex} onSelect={setDayIndex} align="start" className="pl-3" />
            <WheelColumn items={hours} selectedIndex={hourIndex} onSelect={setHourIndex} className="w-10" />
            <WheelColumn items={minutes} selectedIndex={minuteIndex} onSelect={setMinuteIndex} align="end" className="w-10 pr-3" />
          </div>
        </div>
        {peerDisplayName && (
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3.5 py-2.5">
            <span className="truncate text-[14px] text-white">
              <T
                uk={`Нагадати також ${peerDisplayName}`} en={`Remind ${peerDisplayName} too`} ru={`Напомнить также ${peerDisplayName}`}
                de={`${peerDisplayName} auch erinnern`} es={`Recordar también a ${peerDisplayName}`} fr={`Rappeler aussi ${peerDisplayName}`}
                pl={`Przypomnij też ${peerDisplayName}`} ptBR={`Lembrar também ${peerDisplayName}`} zh={`同时提醒 ${peerDisplayName}`}
              />
            </span>
            <input
              type="checkbox"
              checked={remindPeerToo}
              onChange={(e) => setRemindPeerToo(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[#335ef7]"
            />
          </label>
        )}
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="w-full rounded-full bg-white/10 py-2.5 text-[15px] font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="w-full rounded-full bg-[#335ef7] py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#2b4fd6] disabled:opacity-60"
          >
            {submitting ? (
              <T uk="Зачекайте…" en="Please wait…" ru="Подождите…" de="Bitte warten…" es="Espera…" fr="Patientez…" pl="Poczekaj…" ptBR="Aguarde…" zh="请稍候…" />
            ) : (
              <T uk="Встановити" en="Set" ru="Установить" de="Setzen" es="Establecer" fr="Définir" pl="Ustaw" ptBR="Definir" zh="设置" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
