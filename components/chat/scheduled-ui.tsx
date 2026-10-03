"use client";

// components/chat/scheduled-ui.tsx
//
// Отложенная отправка на сайте (волна 4B), как scheduled_messages_sheet.dart
// и RemindMeModal приложения: окно выбора даты/времени и список
// «Заплановані повідомлення» с кнопками «Надіслати зараз» / «Змінити час» /
// «Видалити».
import { useState } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import type { GroupLang } from "@/lib/a1/group-chat";
import { extraText } from "@/lib/a1/chat-extras";
import type { ScheduledItem } from "@/app/api/chats/scheduled/route";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
/** Дата для <input type="datetime-local"> в местном времени. */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleModal({
  lang,
  title,
  submitLabel,
  initialAtSec,
  onSubmit,
  onClose,
}: {
  lang: GroupLang;
  title: string;
  submitLabel: string;
  initialAtSec?: number;
  onSubmit: (atSec: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const now = new Date();
  const start = initialAtSec ? new Date(initialAtSec * 1000) : new Date(now.getTime() + 60 * 60 * 1000);
  const [value, setValue] = useState(toLocalInput(start));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const at = Math.floor(new Date(value).getTime() / 1000);
  const valid = Number.isFinite(at) && at * 1000 > Date.now() + 30_000;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div data-testid="schedule-modal" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
        <input
          type="datetime-local"
          data-testid="schedule-input"
          value={value}
          min={toLocalInput(now)}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/15 dark:text-white"
        />
        {failed && <p className="mt-2 text-[13px] text-[#ef392c]">!</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl bg-black/5 text-[15px] font-medium text-neutral-900 hover:bg-black/10 dark:bg-white/10 dark:text-white">
            {extraText(lang, "cancelAction")}
          </button>
          <button
            type="button"
            data-testid="schedule-submit"
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              setFailed(false);
              const ok = await onSubmit(at).catch(() => false);
              setBusy(false);
              if (ok) onClose();
              else setFailed(true);
            }}
            className="h-11 flex-1 rounded-xl bg-[#335ef7] text-[15px] font-medium text-white disabled:opacity-40 dark:bg-[#0c8ce9]"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(atSec: number): string {
  const d = new Date(atSec * 1000);
  return d.toLocaleString(undefined, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function ScheduledListModal({
  lang,
  items,
  onSendNow,
  onDelete,
  onReschedule,
  onClose,
}: {
  lang: GroupLang;
  items: ScheduledItem[];
  onSendNow: (it: ScheduledItem) => void;
  onDelete: (it: ScheduledItem) => void;
  onReschedule: (it: ScheduledItem) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div data-testid="scheduled-list" className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{extraText(lang, "scheduledMessagesTitle")}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 && <div className="py-8 text-center text-[13px] text-neutral-400">—</div>}
          {items.map((it) => (
            <div key={it.id} data-testid="scheduled-item" className="mb-2 rounded-xl bg-black/[0.04] p-3 dark:bg-white/[0.06]">
              <div className="text-[12.5px] font-medium text-[#335ef7] dark:text-[#0c8ce9]">{fmt(it.at)}</div>
              <div className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[14.5px] text-neutral-900 dark:text-neutral-50">{it.text}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium">
                <button type="button" data-testid="scheduled-send-now" onClick={() => onSendNow(it)} className="text-[#335ef7] dark:text-[#0c8ce9]">
                  {extraText(lang, "sendNow")}
                </button>
                <button type="button" data-testid="scheduled-reschedule" onClick={() => onReschedule(it)} className="text-[#335ef7] dark:text-[#0c8ce9]">
                  {extraText(lang, "rescheduleMessage")}
                </button>
                <button type="button" data-testid="scheduled-delete" onClick={() => onDelete(it)} className="text-[#ef392c]">
                  {extraText(lang, "deleteAction")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
