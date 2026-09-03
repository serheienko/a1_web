// components/drafts-picker.tsx
//
// 2026-09-02 (Aleksandr, detailed voice note: "не работает функция
// сберегти чернетку... і має бути написано, типа, чернетки, і там
// повинна бути іконка... скільки я там хотів зберігати. Тут не треба
// обмежувати по кількості") -- part (c) of that report. Parts (a) and
// (b) (draft-save silently no-op'ing on an invalid form, and the
// confirm-close dialog re-asking to save when nothing changed) were
// fixed directly in components/post-editor.tsx. This is the third part:
// an actual entry point back to saved drafts, since until now they were
// unreachable once you closed the editor (there was no "Чернетки"
// anywhere in the create-post flow) -- components/create-post-fab.tsx's
// "+" button always opened a blank editor, drafts or not.
//
// Mounted by create-post-fab.tsx instead of going straight to a blank
// PostEditor: that FAB now fetches /api/posts/mine on click, and only
// when there's at least one draft does this popover show first (zero
// extra friction for a visitor with none, same as before). No count
// cap per Aleksandr's own "не треба обмежувати" -- every draft the
// endpoint returns is listed, the list itself just scrolls.
//
// Same anchored-card visual language as components/fab-auth-prompt.tsx
// (portaled, right-5, pointer tail) rather than components/my-posts-
// panel.tsx's full centered sheet -- this opens from the same FAB, in
// the same corner, and only ever shows drafts (not every post state),
// so the lighter popover fits better than a full modal.
//
// 2026-09-03 (Aleksandr, live screenshot, 2 fixes at once):
//
// (1) "Нажатие на кнопку (+) не открывает сразу модалку, из за этого
// ощущение подвисания... лучше сразу показывать модалку, а в ней
// скелетон лоад" -- create-post-fab.tsx used to `await` the
// /api/posts/mine fetch before ever opening this popover, so the
// button just sat there doing nothing for the round-trip. That file
// now opens this popover immediately on click (drafts=null means "in
// flight") and this component renders skeleton rows for that state
// instead of the caller ever showing an empty/blank popover.
//
// (2) "Добавь еще иконку справа 'удалить' ведерко... и анимируй тоже
// иконки слева, при ховере" -- each row used to be a single <button>
// (select-only). Now it's a `group` wrapper containing that same
// select button plus a sibling delete button (own /api/posts/delete
// call, same endpoint and fire-and-remove-locally contract components/
// my-posts-panel.tsx's own confirmDelete already established -- no
// confirm step here, deliberately: Aleksandr's own "щоб можна було
// швидко видалити" asks for quick, and everything in this popover is
// an unpublished draft/scheduled post, not a live one). DraftIcon
// picked up app/globals.css's new draft-doc-flip, one-shot on row
// hover like every other icon animation in this app.
"use client";

import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { useEffect, useState, type MouseEvent, type RefObject } from "react";
import type { EditablePost } from "@/components/post-editor";
import { formatRelativeTime } from "@/lib/format";

export type DraftPost = EditablePost & { created: number };

type StringKey = "title" | "newPost" | "openIt" | "scheduledFor" | "delete" | "deleteFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  // 2026-09-02 (Aleksandr: "Запланированные посты тоже показывай тут"):
  // this popover used to only ever hold drafts, hence the old plain
  // "Чернетки" title -- now that components/create-post-fab.tsx also
  // feeds it scheduled-not-yet-published posts (see that file's own
  // comment), a title naming only drafts would be wrong for half of
  // what can show up in it.
  title: {
    uk: "Мої дописи", en: "My posts", ru: "Мои публикации", de: "Meine Beiträge", es: "Mis publicaciones",
    fr: "Mes publications", pl: "Moje posty", ptBR: "Minhas publicações", zh: "我的帖子",
  },
  scheduledFor: {
    uk: "Заплановано", en: "Scheduled", ru: "Запланировано", de: "Geplant", es: "Programado",
    fr: "Planifié", pl: "Zaplanowano", ptBR: "Agendado", zh: "已定时",
  },
  newPost: {
    uk: "+ Новий допис", en: "+ New post", ru: "+ Новая публикация", de: "+ Neuer Beitrag",
    es: "+ Nueva publicación", fr: "+ Nouvelle publication", pl: "+ Nowy post", ptBR: "+ Nova publicação", zh: "+ 新帖子",
  },
  openIt: {
    uk: "Відкрити", en: "Open", ru: "Открыть", de: "Öffnen", es: "Abrir",
    fr: "Ouvrir", pl: "Otwórz", ptBR: "Abrir", zh: "打开",
  },
  delete: {
    uk: "Видалити", en: "Delete", ru: "Удалить", de: "Löschen", es: "Eliminar",
    fr: "Supprimer", pl: "Usuń", ptBR: "Excluir", zh: "删除",
  },
  deleteFailed: {
    uk: "Не вдалося видалити", en: "Couldn't delete", ru: "Не удалось удалить", de: "Löschen fehlgeschlagen",
    es: "No se pudo eliminar", fr: "Échec de la suppression", pl: "Nie udało się usunąć",
    ptBR: "Não foi possível excluir", zh: "删除失败",
  },
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

// 2026-09-02 (Aleksandr, live screenshot: "сделай иконку черновиков
// чуть больше и отцентрируй с текстом") -- 16px -> 20px. The glyph
// itself was already vertically centered in its own viewBox (the
// document shape spans y=3..21 of 0..24, dead center), and the row
// below is already `items-center`, so the "не по центру" read was this
// icon simply looking small/thin next to the row's own text -- bumping
// the size (kept shrink-0 so it can't get squeezed by a long title) is
// the actual fix.
//
// 2026-09-03: added animate-draft-flip (see this file's own header
// comment, part (2)) -- the row div below carries `group`, so hovering
// anywhere in the row (select button OR the new delete button) plays
// it once, same convention as every other row-icon animation in this
// app.
function DraftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-draft-flip shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// Small bin glyph for the new per-row quick-delete button -- deliberately
// its own (smaller, thinner-stroke) icon rather than reusing components/
// chat/photo-viewer.tsx's TrashIcon, which is sized for that file's
// 20px round icon buttons, not this popover's compact row.
function DeleteDraftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Skeleton row: same icon-slot + text-line shape as a real row below,
// animate-pulse gray blocks per this app's established loading-state
// language (app/jobs/loading.tsx, components/chats-flyout.tsx's
// ChatRowSkeleton). One row (index 1 of 3) gets a second, shorter line
// so the skeleton reads as "could be a scheduled post" without
// claiming to know the real count yet.
function DraftRowSkeleton({ twoLines }: { twoLines: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2" aria-hidden="true">
      <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="min-w-0 flex-1">
        <div className={`h-3.5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800 ${twoLines ? "w-2/3" : "w-4/5"}`} />
        {twoLines && <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />}
      </div>
    </div>
  );
}

// Same anchoring math as components/fab-auth-prompt.tsx's own
// FAB_POPOVER_BOTTOM -- see that file's comment for the pixel math.
const POPOVER_BOTTOM =
  "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))";

export function DraftsPicker({
  open,
  loading,
  drafts,
  onClose,
  onSelectDraft,
  onNewPost,
  onDraftDeleted,
  panelRef,
}: {
  open: boolean;
  // 2026-09-03: true while components/create-post-fab.tsx's own
  // /api/posts/mine fetch is still in flight -- see this file's header
  // comment, part (1). The popover is already open and visible at this
  // point; this only swaps its body for skeleton rows.
  loading: boolean;
  drafts: DraftPost[];
  onClose: () => void;
  onSelectDraft: (draft: DraftPost) => void;
  onNewPost: () => void;
  // 2026-09-03: fired after a row's own delete actually succeeds, so
  // the caller (which owns the real `drafts` array) can drop it --
  // this component only ever renders what it's given, it doesn't own
  // the list.
  onDraftDeleted: (id: string) => void;
  panelRef?: RefObject<HTMLDivElement | null>;
}) {
  const lang = useActiveLocale();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);

  if (!open) return null;

  async function handleDelete(e: MouseEvent<HTMLButtonElement>, draft: DraftPost) {
    e.stopPropagation();
    if (deletingId) return;
    setDeleteFailedId(null);
    setDeletingId(draft.id);
    try {
      const res = await fetch("/api/posts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setDeleteFailedId(draft.id);
        return;
      }
      onDraftDeleted(draft.id);
    } catch {
      setDeleteFailedId(draft.id);
    } finally {
      setDeletingId((current) => (current === draft.id ? null : current));
    }
  }

  return createPortal(
    <div className="animate-backdrop-in fixed inset-0 z-30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        className="animate-popover-up fixed right-5 z-[70] flex max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        style={{ bottom: POPOVER_BOTTOM }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {STRINGS.title[lang]}
            {!loading && ` (${drafts.length})`}
          </h2>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 py-1.5">
          {loading && (
            <>
              <DraftRowSkeleton twoLines={false} />
              <DraftRowSkeleton twoLines={true} />
              <DraftRowSkeleton twoLines={false} />
            </>
          )}

          {!loading &&
            drafts.map((draft) => {
              // See the `title` STRINGS comment above -- a row here is
              // either a real draft or a scheduled-not-yet-published
              // post (app/api/posts/mine's own isScheduledUnpublished
              // condition, mirrored here since DraftPost carries the
              // same scheduled/published fields components/post-
              // editor.tsx's EditablePost does). Showing the actual
              // scheduled time (formatRelativeTime -- "through 3 hours"
              // style, not just a static label) is Aleksandr's own
              // "убедись, что они реально будут выходить в
              // запланированное время" ask made visible: if this reads
              // wrong, it was set wrong, right here where it's easy to
              // check.
              const isScheduled = !draft.isDraft && draft.scheduled != null && draft.published == null;
              const isDeleting = deletingId === draft.id;
              return (
                <div
                  key={draft.id}
                  className="group flex w-full items-center gap-1 rounded-xl px-1 py-1 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => onSelectDraft(draft)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left"
                  >
                    <DraftIcon />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-700 dark:text-neutral-300">
                        {draft.title || STRINGS.openIt[lang]}
                      </span>
                      {isScheduled && (
                        <span className="mt-0.5 block truncate text-xs text-accent">
                          {STRINGS.scheduledFor[lang]} · {formatRelativeTime(new Date(draft.scheduled! * 1000), lang)}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(e, draft)}
                    disabled={isDeleting}
                    aria-label={STRINGS.delete[lang]}
                    className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-500"
                  >
                    {isDeleting ? <SmallSpinner /> : <DeleteDraftIcon />}
                  </button>
                </div>
              );
            })}

          {!loading && deleteFailedId && (
            <p className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400">{STRINGS.deleteFailed[lang]}</p>
          )}
        </div>

        <div className="border-t border-neutral-100 p-2 dark:border-neutral-800">
          <button
            type="button"
            onClick={onNewPost}
            className="w-full rounded-xl border border-dashed border-accent/40 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
          >
            {STRINGS.newPost[lang]}
          </button>
        </div>

        <div
          className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-white dark:bg-neutral-900"
          aria-hidden="true"
        />
      </div>
    </div>,
    document.body,
  );
}
