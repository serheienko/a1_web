// components/chat/reminders-list-modal.tsx
//
// Reminders list (2026-09-06, design-reference screenshots: an iOS-
// style "Remind me" sheet showing "Remind on July 8" / "Remind on
// July 9" pill headers, each followed by the reminded message's own
// bubble preview). app/api/chats/reminders/create/route.ts's own
// header already flagged this as the deferred half of the "Remind"
// feature ("mobile's own Reminders bottom sheet / Shortcuts tab are a
// separate, bigger follow-up, not built here") -- this is that
// follow-up, ground-truthed off mobile's own
// reminders_modal_item.dart:
//   - reminders are grouped by date+hour (mobile's own
//     _formatRemindDateAndHour: same calendar day AND same clock
//     hour share one header -- two reminders 5 minutes apart share a
//     header, one 90 minutes apart does not), sorted chronologically.
//   - each header is the SAME rounded pill the main chat thread
//     already uses for its own day separators (see this page's own
//     `showDate` block), just always in the fixed dark palette this
//     modal uses (RemindModal's own bg-[#2c2c2e]/95 card) rather than
//     the thread's light/dark-aware one.
//   - each row is a compact preview (this app's own ChatPreviewLine +
//     describeMessagePreview, the same pair PinnedMessageBanner uses
//     for the exact same "one-line summary of any message kind"
//     problem) rather than re-rendering a full message bubble --
//     mobile reuses its actual Sender/ReceiverMessage widgets, which
//     web has no equivalent single component for.
//   - long-press-to-reveal Edit/Delete (mobile's own
//     CustomContextMenu) becomes always-visible icon buttons on web,
//     this app's usual convention for message-row actions; Delete
//     asks for confirmation via the same tap-to-confirm morph
//     PinnedMessageBanner's own "Unpin" control already established
//     (a plain trash icon that turns into a red "Delete" pill for 3s)
//     rather than mobile's extra confirmation sub-menu.
//   - Edit reopens RemindModal prefilled (initialScheduleAt/
//     initialLocal) and re-submits through the SAME create endpoint --
//     mobile's own _showEditReminder does the exact same
//     re-create-with-a-new-scheduleAt, there is no separate "update"
//     call.
"use client";

import { useEffect, useRef, useState } from "react";
import { T, type Locale } from "@/components/t";
import { ChatPreviewLine } from "@/components/chat/chat-preview-line";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { describeMessagePreview, type ReminderItem } from "@/lib/a1/chat-schemas";
import { RemindModal } from "@/components/chat/remind-modal";

// Fix Tracker: "закэшируй напоминания + скелетон загрузку для них" --
// this modal fully unmounts on close (app/chats/[chatId]/page.tsx only
// renders it while remindersListOpen), so a per-render state/ref cache
// would be wiped every time; module-level survives that. Keyed by
// chatId since each chat has its own reminder list. Stale-while-
// revalidate: a cache hit renders instantly with no skeleton flash,
// then a fresh fetch still runs in the background and quietly updates
// both the cache and the list once it lands.
export const remindersCache = new Map<string, ReminderItem[]>();

function dateHourKey(scheduleAt: number): string {
  const d = new Date(scheduleAt * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

function groupByDateHour(reminders: ReminderItem[]): ReminderItem[][] {
  const groups = new Map<string, ReminderItem[]>();
  for (const r of reminders) {
    const key = dateHourKey(r.scheduleAt);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return Array.from(groups.values());
}

function groupHeaderLabel(scheduleAt: number, lang: Locale): string {
  const d = new Date(scheduleAt * 1000);
  const dateStr = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang === "ptBR" ? "pt-BR" : lang, {
    month: "short",
    day: "numeric",
  }).format(d);
  const timeStr = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang === "ptBR" ? "pt-BR" : lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${dateStr}, ${timeStr}`;
}

// Fix Tracker: "скелетон загрузку" -- same shape as a real ReminderRow
// below (a flex-1 bubble placeholder + two circular action-button
// placeholders), same animate-pulse gray-block language every other
// loading list in this app already uses.
function ReminderRowSkeleton() {
  return (
    <div className="flex items-stretch gap-2">
      <div className="h-[52px] flex-1 animate-pulse rounded-2xl bg-white/10" />
      <div className="flex shrink-0 items-center gap-1">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function ReminderRow({
  reminder,
  mine,
  onJump,
  onEdit,
  onDelete,
  deleting,
}: {
  reminder: ReminderItem;
  mine: boolean;
  onJump: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function armDelete() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirmingDelete(true);
    resetTimer.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
  }

  const preview = describeMessagePreview(reminder.message);
  const photoUrl = preview.kind === "photo" && preview.photoDoc ? getStableMediaProxyUrl(preview.photoDoc) : null;

  return (
    <div className={`flex items-stretch gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <button
        type="button"
        onClick={onJump}
        className={`flex min-w-0 max-w-[75%] flex-1 flex-col rounded-2xl px-3.5 py-2.5 text-left ${
          mine ? "bg-[#335ef7] text-white" : "bg-white/10 text-white"
        }`}
      >
        <ChatPreviewLine
          kind={preview.kind}
          text={preview.text}
          photoUrl={photoUrl}
          isForwarded={preview.isForwarded}
          className="truncate text-[14px] leading-tight"
        />
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="group flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {/* Fix Tracker: "анимируй все три иконки в напоминаниях" --
              same animate-pencil-write components/post-owner-menu.tsx's
              own Edit row already uses. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-pencil-write" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        {confirmingDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-full bg-[#ff3b30] px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#e6352b] disabled:opacity-60"
          >
            <T uk="Видалити" en="Delete" ru="Удалить" de="Löschen" es="Eliminar" fr="Supprimer" pl="Usuń" ptBR="Excluir" zh="删除" />
          </button>
        ) : (
          <button
            type="button"
            onClick={armDelete}
            aria-label="Delete"
            className="group flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {/* Fix Tracker: "анимируй все три иконки в напоминаниях" --
                same animate-trash-wobble components/chat/photo-viewer.tsx
                already uses for its own trash glyph. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-trash-wobble" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function RemindersListModal({
  chatId,
  myUserId,
  lang,
  onClose,
  onJumpToMessage,
}: {
  chatId: string;
  myUserId: string | null;
  lang: Locale;
  onClose: () => void;
  onJumpToMessage: (messageId: number) => void;
}) {
  // Fix Tracker (2026-09-07, order 85: "Если напоминания уже
  // закешированы - не надо показывать скелетон лоад, потому что это
  // создает визуальный баг") -- these used to always start as
  // `null`/`true` and only synced to the cache inside the effect
  // below, which runs AFTER the first paint -- so a cache hit still
  // flashed one frame of skeleton before flipping to the real list.
  // Lazy initializers read the cache synchronously for the very first
  // render instead, so a cached chat never shows a skeleton at all.
  const [reminders, setReminders] = useState<ReminderItem[] | null>(() => remindersCache.get(chatId) ?? null);
  const [loading, setLoading] = useState(() => !remindersCache.has(chatId));
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<ReminderItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFailed, setEditFailed] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchReminders() {
    try {
      const res = await fetch(`/api/chats/reminders/list?chat=${encodeURIComponent(chatId)}`);
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        const list: ReminderItem[] = data.reminders ?? [];
        remindersCache.set(chatId, list);
        setReminders(list);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fix Tracker: "закэшируй напоминания" -- a cache hit shows the
    // list immediately (no skeleton), then fetchReminders below still
    // refreshes it in the background so edits/deletes made elsewhere
    // (another tab, mobile) eventually show up here too.
    // The lazy initializers above already applied a cache hit
    // synchronously for the very first render of a given chatId; this
    // effect's job is just the background refresh (and re-checking the
    // cache if `chatId` itself changes without a full remount).
    const cached = remindersCache.get(chatId);
    if (cached) {
      setReminders(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    void fetchReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  async function handleDelete(messageId: number) {
    setDeletingId(messageId);
    try {
      const res = await fetch("/api/chats/reminders/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, messageId }),
      });
      if (res.ok) {
        setReminders((prev) => {
          const next = prev?.filter((r) => Number(r.message._id) !== messageId) ?? null;
          if (next) remindersCache.set(chatId, next);
          return next;
        });
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleEditSubmit(scheduleAt: number, local: boolean) {
    if (!editing) return;
    setEditSubmitting(true);
    setEditFailed(false);
    try {
      const res = await fetch("/api/chats/reminders/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, messageId: Number(editing.message._id), scheduleAt, local }),
      });
      if (!res.ok) throw new Error("failed");
      setEditing(null);
      void fetchReminders();
    } catch {
      setEditFailed(true);
    } finally {
      setEditSubmitting(false);
    }
  }

  const groups = reminders ? groupByDateHour(reminders) : [];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[380px] flex-col rounded-2xl bg-[#2c2c2e]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-4">
          <p className="text-[17px] font-semibold text-white">
            <T uk="Нагадування" en="Reminders" ru="Напоминания" de="Erinnerungen" es="Recordatorios" fr="Rappels" pl="Przypomnienia" ptBR="Lembretes" zh="提醒" />
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="group flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {/* Fix Tracker: "анимируй все три иконки в напоминаниях" --
                reuses this app's existing close-spin keyframe
                (app/globals.css), same glyph shape as every other
                close "X" it's already wired to. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-close-spin" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2 min-h-[120px] flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            // Fix Tracker: "скелетон загрузку" -- was a single centered
            // "Загрузка…" string; now a stack of row-shaped
            // placeholders (only reached on a cold, uncached fetch --
            // see the cache check in the effect above).
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 3 }, (_, i) => (
                <ReminderRowSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 text-center text-[14px] text-white/60">
              <T
                uk="Не вдалося завантажити нагадування." en="Couldn't load reminders." ru="Не удалось загрузить напоминания."
                de="Erinnerungen konnten nicht geladen werden." es="No se pudieron cargar los recordatorios." fr="Impossible de charger les rappels."
                pl="Nie udało się wczytać przypomnień." ptBR="Não foi possível carregar os lembretes." zh="无法加载提醒。"
              />
              <button type="button" onClick={() => { setLoading(true); void fetchReminders(); }} className="text-[13px] font-semibold text-[#7c93ff]">
                <T uk="Повторити" en="Retry" ru="Повторить" de="Erneut versuchen" es="Reintentar" fr="Réessayer" pl="Ponów" ptBR="Tentar novamente" zh="重试" />
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-center text-[14px] text-white/60">
              <T
                uk="Немає активних нагадувань у цьому чаті." en="No active reminders in this chat." ru="Нет активных напоминаний в этом чате."
                de="Keine aktiven Erinnerungen in diesem Chat." es="No hay recordatorios activos en este chat." fr="Aucun rappel actif dans cette conversation."
                pl="Brak aktywnych przypomnień w tym czacie." ptBR="Nenhum lembrete ativo neste chat." zh="此对话中没有活跃的提醒。"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => {
                // group is always non-empty (groupByDateHour only creates a
                // bucket when pushing its first item), but noUncheckedIndexedAccess
                // still types group[0] as possibly undefined -- guard explicitly
                // instead of a non-null assertion so a real empty group is a no-op,
                // not a crash.
                const first = group[0];
                if (!first) return null;
                return (
                  <div key={dateHourKey(first.scheduleAt)} className="flex flex-col gap-2">
                    <div className="flex justify-center">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80">
                        {groupHeaderLabel(first.scheduleAt, lang)}
                      </span>
                    </div>
                    {group.map((reminder) => (
                      <ReminderRow
                        key={reminder.message._id}
                        reminder={reminder}
                        mine={myUserId !== null && reminder.message.fromId === myUserId}
                        onJump={() => {
                          onJumpToMessage(Number(reminder.message._id));
                          onClose();
                        }}
                        onEdit={() => setEditing(reminder)}
                        onDelete={() => void handleDelete(Number(reminder.message._id))}
                        deleting={deletingId === Number(reminder.message._id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {editing && (
        <RemindModal
          submitting={editSubmitting}
          failed={editFailed}
          initialScheduleAt={editing.scheduleAt}
          initialLocal={editing.local}
          onCancel={() => setEditing(null)}
          onConfirm={handleEditSubmit}
        />
      )}
    </div>
  );
}
