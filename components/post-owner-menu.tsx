// components/post-owner-menu.tsx
//
// "•••" menu on a post's own detail page (job/talent) — Aleksandr,
// 2026-08-29: "теперь мне нужны ручки для редактирования и удаления...
// Я больше за •••" — wants Edit/Delete reachable straight from the post
// page itself, not only through the "My posts" panel
// (components/my-posts-panel.tsx, which already has both). Went with a
// single "•••" trigger over two separate buttons: matches
// settings-menu.tsx's existing pattern for a small set of secondary
// actions, and it keeps the destructive Delete action one extra tap
// away from an accidental press, unlike a bare button sitting right
// next to Edit.
//
// Ownership check: there is no shared identity field between the
// client-visible session (lib/a1/session-constants.ts's DISPLAY_COOKIE,
// an email) and a post's public author (username/fullName only — see
// mapAuthor() in lib/a1/mappers.ts) — so "is this my post" can't be
// decided from data already on the page, and the server component
// rendering this page deliberately never calls readSession() itself
// (that would force it into dynamic rendering, defeating its
// `revalidate = 60` ISR). Instead this fetches /api/posts/mine — the
// same endpoint components/my-posts-panel.tsx already uses — and checks
// whether this postId is in the signed-in visitor's own list. Renders
// nothing while that's loading or if the post isn't there (visitor
// isn't signed in, or it's someone else's post) — no flash of a menu
// the visitor can't use, and no separate "is this mine" endpoint to add
// and maintain.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostEditor, type EditablePost } from "@/components/post-editor";
import { useHoverPanel } from "@/lib/use-hover-panel";

type MinePost = EditablePost & {
  created: number;
  published: number | null;
  scheduled: number | null;
  isDraft: boolean;
};

type StringKey = "menuLabel" | "edit" | "delete" | "confirmDelete" | "cancel" | "deleteFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  menuLabel: { uk: "Дії з дописом", en: "Post actions", ru: "Действия с публикацией", de: "Beitragsaktionen", es: "Acciones de la publicación", fr: "Actions sur la publication", pl: "Działania na poście", ptBR: "Ações da publicação", zh: "帖子操作" },
  edit: { uk: "Редагувати", en: "Edit", ru: "Редактировать", de: "Bearbeiten", es: "Editar", fr: "Modifier", pl: "Edytuj", ptBR: "Editar", zh: "编辑" },
  delete: { uk: "Видалити", en: "Delete", ru: "Удалить", de: "Löschen", es: "Eliminar", fr: "Supprimer", pl: "Usuń", ptBR: "Excluir", zh: "删除" },
  confirmDelete: { uk: "Точно видалити?", en: "Delete for good?", ru: "Точно удалить?", de: "Wirklich löschen?", es: "¿Eliminar definitivamente?", fr: "Supprimer définitivement ?", pl: "Na pewno usunąć?", ptBR: "Excluir definitivamente?", zh: "确定要删除吗？" },
  cancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  deleteFailed: { uk: "Не вдалося видалити", en: "Couldn't delete", ru: "Не удалось удалить", de: "Löschen fehlgeschlagen", es: "No se pudo eliminar", fr: "Échec de la suppression", pl: "Nie udało się usunąć", ptBR: "Não foi possível excluir", zh: "删除失败" },
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

// 2026-09-02 (Aleksandr: "на редагувати и выдалить слева иконки тоже")
// -- same leading-icon-on-the-left convention post-viewer-menu.tsx's
// own dropdown already uses.
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-pencil-write" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-trash-wobble" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function PostOwnerMenu({
  postId,
  redirectAfterDeleteTo,
  // 2026-08-30 (Aleksandr: "добавь 3 точки для редактирования и
  // удаления прямо в общ ленту в профиле, чтобы було не обов'язково
  // переходити в пост... по-ідеї можна під слово Чернетка, і вакансія")
  // -- this same self-contained "•••" (it already does its own
  // /api/posts/mine ownership check and renders nothing when the post
  // isn't the visitor's own, exactly like components/my-post-badge.tsx
  // already does on every card) is now also mounted directly inside
  // components/post-card.tsx, nested under the status/kind badge
  // instead of standing alone at the top of a detail page.
  // `className` lets that call site override the positioning wrapper
  // without touching the two existing detail-page call sites
  // (app/jobs/[slug]/page.tsx, app/talents/[slug]/page.tsx), which keep
  // the original "ml-auto shrink-0 self-start" untouched via the
  // default below.
  className = "relative ml-auto shrink-0 self-start",
}: {
  postId: string;
  redirectAfterDeleteTo: string;
  className?: string;
}) {
  const lang = useActiveLocale();
  const router = useRouter();
  const [mine, setMine] = useState<MinePost | null>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 2026-09-02 (Aleksandr, screenshot of this exact menu: "Этот попап
  // тоже сделай по наведению на °°°") -- same lib/use-hover-panel.ts
  // hook components/profile-action-row.tsx's own "•••" menu already
  // uses (that file's header has the full "why" -- shared, identical
  // hover mechanics everywhere this app has a "•••" popover). Click
  // still toggles `open` directly, same as before; hover is additive.
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: triggerRef, panel: panelRef },
  ]);
  // The confirm-delete step used to only ever reset via the backdrop's
  // own onClick (a click outside the menu). Now that the menu can also
  // close from a hover-leave timeout, this makes sure "Точно видалити?"
  // doesn't silently survive a close-by-hover and reappear pre-armed
  // the next time this same post's menu is hovered open again.
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts/mine")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        const found = (data.posts as MinePost[]).find((p) => p.id === postId);
        if (found) setMine(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function confirmDelete() {
    setDeleteError(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/posts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: postId }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setDeleteError(true);
        setDeleting(false);
        return;
      }
      // 2026-08-30, live-testing feedback ("после удаления должно
      // возвращать туда откуда удалили, а не всегда в одно место"):
      // this redirectAfterDeleteTo/window.location.pathname comparison
      // already IS exactly that -- /jobs or /talents from the two
      // detail-page call sites (app/jobs/[slug]/page.tsx, app/talents/
      // [slug]/page.tsx), or back to /u/:username (via a no-op refresh,
      // since you're already there) from both of the profile page's own
      // lists (app/u/[username]/page.tsx's published posts, components/
      // profile-tabs.tsx's own drafts/scheduled). Reviewed and left
      // unchanged: the reported failure to delete at all was actually
      // components/post-card.tsx's z-index bug (see that file's own
      // comment on the "•••" wrapper) making this code unreachable from
      // the profile page in the first place -- an invisible backdrop
      // was swallowing every click on Edit/Delete before either one
      // could ever run. Fixing that (not this function) is what makes
      // the redirect below actually observable there.
      //
      // 2026-08-30: mounted inline on a card that's already sitting on
      // `redirectAfterDeleteTo` (the profile feed use above), a
      // router.push to the exact current URL is a well-known Next.js
      // no-op — it doesn't re-run the server component, so the deleted
      // card would keep showing until a manual reload. router.refresh()
      // is the actual "re-fetch this route's server data" call for that
      // case; push only makes sense when the target genuinely differs
      // (the two existing detail-page call sites, which send you back
      // to /jobs or /talents after deleting the post you were just on).
      // The client-side drafts/scheduled list in components/profile-
      // tabs.tsx doesn't come from a server component at all — it's its
      // own fetch, refreshed by the same "a1:post-saved"-style window
      // event post-editor.tsx already uses for saves, mirrored here as
      // "a1:post-deleted" so that list drops the card immediately too.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("a1:post-deleted", { detail: { id: postId } }));
        if (redirectAfterDeleteTo === window.location.pathname) {
          router.refresh();
        } else {
          router.push(redirectAfterDeleteTo);
        }
      } else {
        router.push(redirectAfterDeleteTo);
      }
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  }

  if (!mine) return null;

  if (editing) {
    return (
      <PostEditor
        mode="edit"
        initialPost={mine}
        onClose={() => setEditing(false)}
        onSaved={() => router.refresh()}
      />
    );
  }

  return (
    <div className={className} ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={STRINGS.menuLabel[lang]}
        aria-expanded={open}
        className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 transition hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-white/10 dark:hover:text-neutral-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 animate-dots-bounce" aria-hidden="true">
          <circle cx="4" cy="10" r="1.7" />
          <circle cx="10" cy="10" r="1.7" />
          <circle cx="16" cy="10" r="1.7" />
        </svg>
      </button>

      {rendered && (
        <>
          {/* Same click-outside-to-close backdrop as components/settings-menu.tsx
              — see that file's own comment for why a portaled full-viewport
              backdrop (rather than a plain outside-mousedown listener) is
              what's needed here. */}
          {open &&
            createPortal(
              <div
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />,
              document.body,
            )}
          {/* pt-2 (padding, not margin) keeps the hoverable rectangle
              continuous from the trigger's bottom edge through to this
              panel -- see lib/use-hover-panel.ts's own header for why a
              margin gap there makes the close side flaky. The visible
              card is the separate inner div so the padding itself stays
              invisible. */}
          <div
            className="absolute right-0 top-full z-50 w-52 max-w-[calc(100vw-2rem)] origin-top-right pt-2"
            ref={panelRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
          <div
            className={
              "overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg transition duration-150 ease-out dark:border-neutral-700 dark:bg-neutral-900 " +
              (visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")
            }
          >
            {confirming ? (
              <div className="p-1.5">
                <p className="mb-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">{STRINGS.confirmDelete[lang]}</p>
                {deleteError && <p className="mb-2 px-1 text-xs text-red-600 dark:text-red-400">{STRINGS.deleteFailed[lang]}</p>}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {STRINGS.delete[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-700 dark:hover:text-neutral-50"
                  >
                    {STRINGS.cancel[lang]}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setEditing(true);
                  }}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
                >
                  <PencilIcon />
                  {STRINGS.edit[lang]}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10"
                >
                  <TrashIcon />
                  {STRINGS.delete[lang]}
                </button>
              </>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
