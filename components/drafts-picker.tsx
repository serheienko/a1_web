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
"use client";

import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { useEffect, useState, type RefObject } from "react";
import type { EditablePost } from "@/components/post-editor";

export type DraftPost = EditablePost & { created: number };

type StringKey = "title" | "newPost" | "openIt";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Чернетки", en: "Drafts", ru: "Черновики", de: "Entwürfe", es: "Borradores",
    fr: "Brouillons", pl: "Szkice", ptBR: "Rascunhos", zh: "草稿",
  },
  newPost: {
    uk: "+ Новий допис", en: "+ New post", ru: "+ Новая публикация", de: "+ Neuer Beitrag",
    es: "+ Nueva publicación", fr: "+ Nouvelle publication", pl: "+ Nowy post", ptBR: "+ Nova publicação", zh: "+ 新帖子",
  },
  openIt: {
    uk: "Відкрити", en: "Open", ru: "Открыть", de: "Öffnen", es: "Abrir",
    fr: "Ouvrir", pl: "Otwórz", ptBR: "Abrir", zh: "打开",
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

function DraftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// Same anchoring math as components/fab-auth-prompt.tsx's own
// FAB_POPOVER_BOTTOM -- see that file's comment for the pixel math.
const POPOVER_BOTTOM =
  "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))";

export function DraftsPicker({
  open,
  drafts,
  onClose,
  onSelectDraft,
  onNewPost,
  panelRef,
}: {
  open: boolean;
  drafts: DraftPost[];
  onClose: () => void;
  onSelectDraft: (draft: DraftPost) => void;
  onNewPost: () => void;
  panelRef?: RefObject<HTMLDivElement | null>;
}) {
  const lang = useActiveLocale();

  if (!open) return null;

  return createPortal(
    <div className="animate-backdrop-in fixed inset-0 z-30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        className="animate-popover-up fixed right-5 z-[70] flex max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        style={{ bottom: POPOVER_BOTTOM }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {STRINGS.title[lang]} ({drafts.length})
          </h2>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 py-1.5">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => onSelectDraft(draft)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <DraftIcon />
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
                {draft.title || STRINGS.openIt[lang]}
              </span>
            </button>
          ))}
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
