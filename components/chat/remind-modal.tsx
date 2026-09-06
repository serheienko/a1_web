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
"use client";

import { useState } from "react";
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

// <input type="datetime-local">'s value has no timezone -- it's always
// "wall clock time in the browser's own local zone", which is exactly
// what we want here (the picker should show/accept the user's own
// local time); this just formats a Date into that exact string shape
// without going through any UTC conversion.
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RemindModal({
  peerDisplayName,
  submitting,
  failed,
  initialScheduleAt,
  initialLocal,
  onCancel,
  onConfirm,
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
}) {
  const [remindPeerToo, setRemindPeerToo] = useState(() => initialLocal === false);
  const [selected, setSelected] = useState(() => {
    const min = minimumScheduleTime(new Date());
    if (initialScheduleAt === undefined) return min;
    const fromInitial = new Date(initialScheduleAt * 1000);
    return fromInitial < min ? min : fromInitial;
  });

  const minValue = toDatetimeLocalValue(minimumScheduleTime(new Date()));

  function handleConfirm() {
    const min = minimumScheduleTime(new Date());
    const effective = selected < min ? min : selected;
    const scheduleAt = Math.floor(effective.getTime() / 1000);
    onConfirm(scheduleAt, !remindPeerToo);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
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
        <input
          type="datetime-local"
          min={minValue}
          value={toDatetimeLocalValue(selected)}
          onChange={(e) => {
            const parsed = e.target.valueAsNumber;
            if (!Number.isNaN(parsed)) setSelected(new Date(parsed));
          }}
          className="mt-3.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20"
        />
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
