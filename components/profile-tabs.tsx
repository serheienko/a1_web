// components/profile-tabs.tsx
//
// Aleksandr, 2026-08-30, correcting §6.41's first pass (which just
// appended a "Пости" section under Favorites): "должны быть просто две
// кнопки, как у нас в мобильном приложении... первая — это bio, а
// второе — посты." A small client component purely for the tab switch
// -- app/u/[username]/page.tsx stays a server component (SEO, one round
// trip per profile) and passes both tab bodies in fully server-rendered,
// already fetched; this only toggles which one is visible. `hidden`
// rather than an unmount-on-switch so nothing here needs a second
// client-side fetch or loses scroll position when switching back.
//
// 2026-08-30 follow-up: "во вкладке посты, черновики, просто помечаем
// плашечкой draft, там где у тебя сейчас... другой: Jobs... серенький
// draft, черновики, запланированные scheduled — это уже у нас решенный
// вопрос" -- §6.45 dropped the avatar-menu's "Мої пости" row (the only
// place that showed drafts/scheduled) on the theory that this tab's
// published-only posts list already covered "my posts" unified into
// one place. That left a real gap: drafts/scheduled had nowhere to go.
// This closes it, but ONLY on the visitor's own profile -- someone
// else's profile must keep showing exactly what it showed before
// (published posts only, matching the public feed). There is no
// server-side way to know "is this the visitor's own profile" here
// (app/u/[username]/page.tsx deliberately never reads the session
// itself -- see components/post-owner-menu.tsx's own comment on why,
// same ISR-vs-dynamic-rendering reasoning applies here), so this client
// component resolves it itself: /api/account/whoami for the visitor's
// own username, compared against the `profileUsername` prop (the
// profile actually being viewed) -- only on a match does it fetch
// /api/posts/mine and render its `draftsAndScheduled` cards, above the
// server-rendered published list. Both fetches are silently skipped (no
// spinner, no error state) for a signed-out visitor or someone else's
// profile -- this is a bonus for the profile's own owner, not a
// required part of loading the tab.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LOCALES, LOCALE_CLASS, T, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import { PostEditor, type EditablePost } from "@/components/post-editor";
import type { WebPost } from "@/types/web-post";
import { profileHref } from "@/lib/profile-href";

type StringKey = "statusDraft" | "statusScheduled";

// Same labels/colors as components/my-posts-panel.tsx's own statusOf()
// -- Aleksandr pointed at that exact scheme ("это уже у нас решенный
// вопрос... в Белке тоже были мысли, как это сделать") rather than
// asking for a new one. Both draft and scheduled get the same grayish
// treatment here (he grouped them together as "другим цветом, типа
// сереньким" for both), unlike my-posts-panel.tsx's own version where
// scheduled is accent-tinted -- that file's scheme was never itself
// confirmed live, so this follows his literal wording instead of
// copying its color 1:1.
const STRINGS: Record<StringKey, Record<Locale, string>> = {
  statusDraft: { uk: "Чернетка", en: "Draft", ru: "Черновик", de: "Entwurf", es: "Borrador", fr: "Brouillon", pl: "Szkic", ptBR: "Rascunho", zh: "草稿" },
  statusScheduled: { uk: "Заплановано", en: "Scheduled", ru: "Запланировано", de: "Geplant", es: "Programado", fr: "Planifié", pl: "Zaplanowano", ptBR: "Agendado", zh: "已定时" },
};

const STATUS_BADGE_CLASS = "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

type MinePostCard = { post: WebPost; status: "draft" | "scheduled" };

export function ProfileTabs({
  bio,
  posts,
  postsCount,
  profileUsername,
}: {
  bio: ReactNode;
  posts: ReactNode;
  postsCount: number;
  profileUsername: string;
}) {
  const [tab, setTab] = useState<"bio" | "posts">("bio");
  const lang = useActiveLocale();
  const [ownDrafts, setOwnDrafts] = useState<MinePostCard[]>([]);
  // 2026-08-30: /api/posts/mine's `posts` array is the same
  // EditablePost-shaped summary components/my-posts-panel.tsx already
  // feeds straight into <PostEditor mode="edit">. Keyed by id so a
  // click on one of ownDrafts's cards (below) can look up its full
  // editable data and open the same editor in place, instead of
  // navigating to a public URL that doesn't exist for an unpublished
  // post -- see components/post-card.tsx's onOpen prop.
  const [ownEditable, setOwnEditable] = useState<Record<string, EditablePost>>({});
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Pulled into a named function so it can also be re-run when a
    // post is created/edited/scheduled from anywhere else on the page
    // (the "+" FAB, in components/create-post-fab.tsx, is mounted
    // globally in the root layout -- entirely outside this component's
    // tree). Aleksandr, 2026-08-30 (screen recording): scheduled a
    // post from the FAB, the editor closed and the "Публікується..."
    // banner ran, but the newly-scheduled post never showed up here --
    // only a full page reload brought it in. Root cause: this effect
    // only ever fetched once, on mount; nothing told it a save had
    // happened. components/post-editor.tsx now dispatches a plain
    // "a1:post-saved" window event right after every successful save
    // (post, draft, or schedule, from every entry point it has) --
    // listening for that here and re-running the same fetch chain
    // closes the gap without this component needing to know which
    // editor instance did the saving.
    function load() {
      fetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok || data.username !== profileUsername) return null;
        // Only reached when this IS the visitor's own profile.
        return fetch("/api/posts/mine").then((r) => r.json());
      })
      .then((data) => {
        if (cancelled || !data || !data.ok) return;
        // Aleksandr, 2026-08-30 (screen recording): reloading a profile
        // right after this shipped crashed the whole page -- root cause,
        // confirmed by inspection rather than reproduced directly (this
        // sandbox can't hit the live API): a tab that already had
        // /api/posts/mine's OLD response cached, or a request that raced
        // a rolling deploy, gets back `{ ok: true, posts }` with no
        // `draftsAndScheduled` field at all (it didn't exist before this
        // feature). `data.ok` alone doesn't guarantee that field's
        // shape -- setOwnDrafts(undefined) then crashed on the very next
        // render's `ownDrafts.length`/`ownDrafts.map`, with no
        // profile-specific error boundary to catch it (app/error.tsx is
        // the global fallback, hence the unrelated "не вдалося
        // завантажити вакансії" copy in what was actually a profile-page
        // crash). Validating the shape here, not just `data.ok`, means
        // any unexpected response degrades to "no drafts/scheduled
        // shown" -- same as before this feature existed -- instead of
        // taking the whole page down.
        if (Array.isArray(data.draftsAndScheduled)) {
          // 2026-08-30 follow-up (Aleksandr, live: opening/reloading a
          // profile with a draft crashed with "Не вдалося завантажити
          // профіль" again even after the Array.isArray guard above --
          // reproduced live, console showed "TypeError: e.getTime is
          // not a function" from lib/format.ts's formatRelativeTime(),
          // called by PostCard with `post.publishedAt`. Root cause:
          // WebPost's `publishedAt`/`updatedAt` are typed as `Date`,
          // which holds for `posts` (server-rendered, passed down as a
          // prop -- Next's RSC payload keeps real Date instances across
          // that boundary), but NOT for this array -- it crossed a
          // plain `fetch().json()` from a CLIENT component, and
          // `JSON.stringify` on the API route turned those Dates into
          // ISO strings with nothing on this end to revive them.
          // `ownDrafts` is also rendered into the DOM even while the
          // "Про мене" tab is active (this whole section only gets
          // `hidden`, not unmounted -- see this component's own header
          // comment on why), so the crash could happen right after
          // opening the profile, before ever touching the "Пости" tab,
          // matching every "просто открыл профиль и упало" report so
          // far. Reviving both fields back into real Date objects here
          // keeps this array honoring the same WebPost contract the
          // server-rendered `posts` prop already does, instead of
          // quietly handing PostCard a string where its type says Date.
          const revived = (data.draftsAndScheduled as MinePostCard[]).map((card) => ({
            ...card,
            post: {
              ...card.post,
              publishedAt: new Date(card.post.publishedAt),
              updatedAt: card.post.updatedAt ? new Date(card.post.updatedAt) : null,
            },
          }));
          setOwnDrafts(revived);
        }
        if (Array.isArray(data.posts)) {
          const byId: Record<string, EditablePost> = {};
          for (const p of data.posts as EditablePost[]) byId[p.id] = p;
          setOwnEditable(byId);
        }
      })
      .catch(() => {
        // Signed out, or either call failed -- no drafts/scheduled
        // section, same as before this feature existed.
      });
    }

    load();
    window.addEventListener("a1:post-saved", load);
    // 2026-08-30: components/post-owner-menu.tsx's new inline "•••" (see
    // its own comment) fires this after a successful delete -- the
    // draft/scheduled list above is this component's own client-side
    // fetch, not server-rendered, so router.refresh() alone (also called
    // by post-owner-menu.tsx when it detects it's already on this exact
    // profile URL) doesn't touch it; re-running the same `load()` does.
    window.addEventListener("a1:post-deleted", load);
    return () => {
      cancelled = true;
      window.removeEventListener("a1:post-saved", load);
      window.removeEventListener("a1:post-deleted", load);
    };
  }, [profileUsername]);

  return (
    <div className="mt-6">
      {/* Aleksandr, 2026-08-30: "сделай заливку кнопки полностью FFFFF
          100%, а то она теряется" -- first pass (bg-white/100) was
          already, measurably, pure #FFFFFF (confirmed by sampling the
          live screenshot's pixels: 255,255,255 exactly) -- the real
          complaint wasn't opacity, it was that white-on-nearly-white
          (bg-neutral-100 container, ~245,245,245) barely reads as
          "highlighted" at all. He then pointed at site-nav.tsx's own
          Вакансії/Фахівці switcher as the exact effect he wants copied:
          a plain WHITE outer pill with the active tab tinted
          `bg-accent/15 text-accent` (light blue), not a
          gray-container-with-white-tab scheme -- copied byte-for-byte
          from that component below (container: `bg-white
          dark:bg-neutral-900`; active button: `bg-accent/15
          text-accent`) instead of inventing a new treatment here. */}
      <div className="flex gap-1 rounded-full bg-white p-1 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setTab("bio")}
          aria-pressed={tab === "bio"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "bio"
              ? "bg-accent/15 text-accent"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
          }
        >
          <T uk="Про мене" en="Bio" ru="О себе" de="Bio" es="Bio" fr="Bio" pl="Bio" ptBR="Bio" zh="简介" />
        </button>
        <button
          type="button"
          onClick={() => setTab("posts")}
          aria-pressed={tab === "posts"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "posts"
              ? "bg-accent/15 text-accent"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
          }
        >
          <T uk="Пости" en="Posts" ru="Посты" de="Beiträge" es="Publicaciones" fr="Publications" pl="Posty" ptBR="Publicações" zh="帖子" />
          {postsCount > 0 ? ` (${postsCount})` : ""}
        </button>
      </div>

      <div hidden={tab !== "bio"}>{bio}</div>
      {/* Aleksandr, 2026-08-30, live screenshot: "опусти на 10 px вниз
          черновик" -- clarified right after ("в смысле весь пост... и
          все остальные посты какие будут") that this is about the
          whole posts list sitting flush against the tab pill above,
          not something specific to the draft card, so the gap goes on
          this shared wrapper -- covers ownDrafts below AND the
          server-rendered `posts` after it, for every card either way,
          not just the first one.

          2026-08-30 follow-up, live screenshot of a long title wrapping
          into a 5-line block: "используй ширину карточек такую же как
          в фиде, чтобы не делать лишний вертикальный скролл" -- this
          whole page is deliberately fixed at sm:w-[420px] (see <main>'s
          own long comment in app/u/[username]/page.tsx for exactly why
          that fixed width exists and why a fluid one kept breaking), but
          that width was tuned for the PROFILE HEADER's left-aligned rows
          (name/bio/skill bars), not for cards that need to match the
          feed's own sm:max-w-3xl (48rem/768px).

          2026-08-30, live-testing feedback: "по центру карточки постов
          зроби" -- the first pass at this breakout (a fixed `-mx-[174px]`,
          computed as (768 - 420) / 2 against the 420px parent) is a real
          centering bug, found by re-deriving the math rather than by
          reproducing it live: that -174px offset is only correct once
          the block's own width has actually reached the full 768px cap.
          The old `sm:w-[min(48rem,calc(100vw_-_2rem))]` clause shrinks
          the width on any window under ~816px wide (already anticipated
          by the previous comment, above) but the -174px margin does NOT
          shrink alongside it, so on exactly the window sizes that
          clause exists for (roughly 640-816px -- a resized/tiled desktop
          browser, not full-screen) the block's left edge sits up to
          ~34px further left than its right edge is from the viewport's
          right side: visibly off-center, not just "smaller than the
          feed." Switched to the standard viewport-relative full-bleed
          technique instead of a parent-relative offset: `left-1/2
          -translate-x-1/2 w-screen` centers this wrapper on the
          VIEWPORT directly, independent of the fixed-width parent's own
          size or position, so there's no longer a magic number tied to
          420px that can drift out of sync with it. The `max-w-3xl`
          (48rem/768px) + `px-4` inner div reproduces the feed's own
          sm:max-w-3xl cap and side padding, mx-auto'd inside the
          full-bleed wrapper. Mobile (`sm:` prefix) is untouched, same
          convention as <main>'s own fixed width already uses. */}
      {/* 2026-08-30, live-testing feedback ("Edit / Del не нажимаются"):
          this breakout wrapper's own `-translate-x-1/2` was the actual
          cause -- a CSS `transform` establishes a new stacking context
          on WHATEVER element carries it, no z-index required. Every
          card rendered inside here (both `ownDrafts` above and the
          server-rendered `{posts}` below, including their own
          PostOwnerMenu's `z-40` wrapper -- see post-card.tsx's own
          comment on that) ended up nested inside this wrapper's new
          stacking context, so their z-40 could only ever win against
          siblings INSIDE that same context; from the OUTSIDE, this
          entire wrapper counts as one z-index:auto box being compared
          against components/post-owner-menu.tsx's click-outside
          backdrop (a `fixed z-30` div portaled straight to
          document.body) -- and an auto-z-index box always paints below
          a positive-z-index one, so the backdrop won regardless of the
          z-40 inside. Only reproduces at `sm:` widths and up, since the
          transform (and this whole breakout trick) is mobile-excluded
          by design -- exactly what the screenshot showed, a windowed
          desktop viewport. Fix: swap the transform for an equivalent
          margin-based full-bleed (`-ml-[50vw]` instead of
          `-translate-x-1/2` on a `left-1/2, w-screen` box is the same
          arithmetic -- both shift a 100vw-wide box left by half its own
          width -- but a plain negative margin doesn't create a stacking
          context the way transform does), so this wrapper stops being a
          stacking-context root at all and the z-40 fix inside it can
          finally be compared directly against the backdrop as intended. */}
      {/* 2026-08-31, live-testing feedback ("Уехала надпись 'нет
          постов'"): the breakout above (w-screen/-ml-[50vw], centered on
          the VIEWPORT) exists so real post cards can match the feed's
          own wider sm:max-w-3xl column instead of being squeezed into
          this page's narrow sm:w-[420px] profile column -- see this
          file's own long comment on that wrapper. The empty-state
          message below has no reason to stretch into that same wide,
          differently-centered box: with no cards to widen for, it just
          sat at the wide box's own left edge, which -- since that box
          is centered on the viewport rather than on the narrow column
          everything else in this page uses -- reliably lands well to
          the left of the avatar/name/tabs above it, reading as "the
          text drifted off" rather than as a deliberate layout. Only
          apply the breakout once there's an actual card list backing
          it (own drafts, fetched client-side, or the server-rendered
          published posts) -- the empty state stays in normal flow,
          same width and alignment as the rest of the profile. */}
      {(() => {
        const hasAnyPosts = ownDrafts.length > 0 || postsCount > 0;
        const wrapperClass = hasAnyPosts
          ? "mt-2.5 sm:relative sm:left-1/2 sm:w-screen sm:-ml-[50vw]"
          : "mt-2.5";
        const innerClass = hasAnyPosts ? "sm:mx-auto sm:max-w-3xl sm:px-4" : "";
        return (
      <div hidden={tab !== "posts"} className={wrapperClass}>
        <div className={innerClass}>
          {ownDrafts.length > 0 && (
            <div className="mb-4 flex flex-col gap-4">
              {ownDrafts.map(({ post, status }) => {
                const editable = ownEditable[post.id];
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    statusBadge={{ label: STRINGS[status === "draft" ? "statusDraft" : "statusScheduled"][lang], className: STATUS_BADGE_CLASS }}
                    onOpen={editable ? () => setEditingPost(editable) : undefined}
                    ownerMenu={{ redirectAfterDeleteTo: profileHref(profileUsername) }}
                  />
                );
              })}
            </div>
          )}
          {posts}
        </div>
      </div>
        );
      })()}
      {editingPost && (
        // No onSaved wired here on purpose: components/post-editor.tsx
        // already dispatches "a1:post-saved" on every successful save,
        // and this component's own useEffect above already listens for
        // that event and re-runs load() -- `load` itself lives inside
        // that effect's closure, out of reach from here. Passing it
        // through some extra plumbing would just duplicate a refresh
        // that already happens.
        <PostEditor
          mode="edit"
          initialPost={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </div>
  );
}
