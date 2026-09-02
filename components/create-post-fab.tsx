// components/create-post-fab.tsx
//
// 2026-08-29 (Aleksandr, from the same 7-screenshot backlog as the nav-
// shadow/cat-avatar/Google-button fixes): a floating "+" button, bottom
// right, for creating a post — shown whether signed in or not
// ("С логином и без").
//
// Signed OUT: clicking used to navigate straight to /sign-in?reason=
// create-post. 2026-09-02 (Aleksandr: "не уводи со страницы... покажи
// модалку прямо над кнопками") -- now opens components/fab-auth-
// prompt.tsx's small anchored popover instead, right above this
// button; ITS OWN sign-in CTA still routes to /sign-in?reason=create-
// post, so app/sign-in/page.tsx's existing "to create a post, sign up
// or sign in" notice line still shows up once the visitor follows
// through.
//
// Signed IN: clicking now opens the real components/post-editor.tsx in
// mode="create" (2026-08-29, replacing the earlier stub dialog —
// Aleksandr sent 5 screenshots of the real mobile-app flow and asked to
// build it "полностью по аналогии приложения", drafts and scheduled
// posts included from the start, not deferred).
//
// Reads the display cookie the same way components/avatar-menu.tsx and
// its predecessor account-menu.tsx do — a plain client-side cookie read
// in an effect, not a server session, so mounting this in the root
// layout (app/layout.tsx, right alongside <SiteNav/>) never forces the
// whole site into dynamic rendering (PLAN.md §6.2).
//
// Button color: `bg-accent` — already the site's one CSS variable for
// "the brand blue for the current theme" (app/globals.css: #335ef7
// light / #0c8ce9 dark).
//
// Icon: a chunky, rounded-cap plus (thick stroke + round linecaps).
//
// 2026-08-29 follow-up (Aleksandr, from a live mobile screenshot of
// /sign-in: the FAB sat directly on top of the Apple button): (1)
// hidden on /sign-in specifically; (2) button shape switched from
// rounded-2xl to rounded-full (a full circle).
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import { PostEditor } from "@/components/post-editor";
import { FabAuthPrompt } from "@/components/fab-auth-prompt";
import { DraftsPicker, type DraftPost } from "@/components/drafts-picker";
import { useHoverPanel } from "@/lib/use-hover-panel";

type FabStringKey = "label";

const STRINGS: Record<FabStringKey, Record<Locale, string>> = {
  label: {
    uk: "Створити допис", en: "Create post", ru: "Создать публикацию", de: "Beitrag erstellen",
    es: "Crear publicación", fr: "Créer une publication", pl: "Utwórz post",
    ptBR: "Criar publicação", zh: "创建帖子",
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

function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

// Thick stroke + round caps/join is what makes this read as "chunky"
// rather than the thin, sharp-cornered plus a default icon set would
// give — deliberately not reused from anywhere else in this app since
// nothing else needed this weight.
function ChunkyPlusIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CreatePostFab() {
  const lang = useActiveLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DraftPost | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // 2026-09-02 (Aleksandr: "коли я повертаюся назад, у мене немає
  // ніяких чернеток... а має бути написано, типу, чернетки") -- see
  // components/drafts-picker.tsx's own header comment for the full
  // story. `null` = not checked yet / none found (go straight to a
  // blank editor, unchanged); a non-empty array shows the picker
  // first instead.
  const [drafts, setDrafts] = useState<DraftPost[] | null>(null);
  const [draftsPickerOpen, setDraftsPickerOpen] = useState(false);
  // 2026-09-02 (Aleksandr: "давай в разлогиненом стейте тоже добавим к
  // этим попапс эффект появления при наведении, без клика") -- same
  // hook/wiring as components/chats-fab.tsx's own signed-out button;
  // see that file's comment on why trigger+panel need explicit handlers
  // instead of one shared wrapping div (fab-auth-prompt.tsx portals to
  // document.body). Guarded to the signed-out branch only in the
  // handlers below -- hovering this button while signed in should never
  // pop the auth prompt, only a click should open the post editor.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { handleMouseEnter, handleMouseLeave } = useHoverPanel(authPromptOpen, setAuthPromptOpen, [
    { trigger: triggerRef, panel: panelRef },
  ]);

  useEffect(() => {
    setEmail(readDisplayCookie());
  }, []);

  // Nothing to create a post from on the auth screen itself, and the
  // FAB has nowhere to sit there without overlapping the sign-in
  // buttons (confirmed via a live mobile screenshot).
  //
  // 2026-09-02 (Aleksandr, live mobile screenshot of an open chat: this
  // button sat right on top of the compose bar's own send/mic icon,
  // and "create a post" makes no sense mid-conversation anyway) --
  // same pathname guard components/chats-fab.tsx already has for the
  // same route, for the same reason (see that file's own comment).
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/chats")) return null;

  // 2026-09-02 (Aleksandr: "В незалогиненых тоже показывай модалку на
  // обе кнопки и не уводи со страницы") -- this used to navigate
  // straight to /sign-in on a signed-out click. Now it opens the
  // anchored auth-prompt popover instead, right above this button.
  async function handleClick() {
    if (!email) {
      setAuthPromptOpen(true);
      return;
    }
    try {
      const res = await fetch("/api/posts/mine");
      const data = await res.json();
      const draftPosts: DraftPost[] = (data.posts ?? []).filter((p: DraftPost & { isDraft?: boolean }) => p.isDraft);
      if (draftPosts.length > 0) {
        setDrafts(draftPosts);
        setDraftsPickerOpen(true);
        return;
      }
    } catch {
      // Same "never let a broken drafts lookup block posting" fallback
      // as below -- open a blank editor same as always.
    }
    setEditingDraft(null);
    setEditorOpen(true);
  }

  return (
    <>
      {/* 2026-08-30, live-testing feedback: "Крестик на закрытик крутится
          при наведении, а создание поста нет, а я просил чтобы ты его
          сделал" -- same hover-rotate treatment already on the profile
          editor's close icon (see this codebase's CloseIcon/`group-hover:
          rotate-90` usage), applied here too: `group` on the button,
          `group-hover:rotate-90` on the icon itself. */}
      <button
        type="button"
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={() => {
          if (!email) handleMouseEnter();
        }}
        onMouseLeave={() => {
          if (!email) handleMouseLeave();
        }}
        aria-label={STRINGS.label[lang]}
        className="group fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:opacity-90 active:scale-95"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <ChunkyPlusIcon className="transition-transform duration-200 ease-out group-hover:rotate-90" />
      </button>

      {editorOpen && (
        <PostEditor
          mode={editingDraft ? "edit" : "create"}
          initialPost={editingDraft ?? undefined}
          onClose={() => {
            setEditorOpen(false);
            setEditingDraft(null);
          }}
          // 2026-08-30 (Aleksandr: "чтобы лента сама типа дергалась, как
          // бы рефрешилась"): this FAB was the one PostEditor mount point
          // with no onSaved at all, so a post made from here never
          // refreshed the feed underneath -- router.refresh() re-renders
          // the current route's server components against whatever
          // app/api/posts/create/route.ts's own revalidatePath() calls
          // just invalidated.
          onSaved={() => router.refresh()}
        />
      )}

      <FabAuthPrompt
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        signInHref="/sign-in?reason=create-post"
        panelRef={panelRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      <DraftsPicker
        open={draftsPickerOpen}
        drafts={drafts ?? []}
        onClose={() => setDraftsPickerOpen(false)}
        onSelectDraft={(draft) => {
          setDraftsPickerOpen(false);
          setEditingDraft(draft);
          setEditorOpen(true);
        }}
        onNewPost={() => {
          setDraftsPickerOpen(false);
          setEditingDraft(null);
          setEditorOpen(true);
        }}
      />
    </>
  );
}
