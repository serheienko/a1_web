// lib/a1/post-flags.ts
//
// PLAN.md §0.5 originally said "never read `flags`, meaning unknown" —
// that was true when this was written, before the backend's own OpenAPI
// spec was checked for it (2026-08-26, tag[14].description). It documents
// a real bitmask:
//
//   const POST_FLAG = {
//     NONE: 0,
//     PUBLISHED: 1 << 0,
//     ARCHIVED: 1 << 1,
//     MODIFIED: 1 << 2,
//     HIDE_AUTHOR: 1 << 3,
//     FAVORED: 1 << 4,
//     MY_POST: 1 << 5,
//     SCHEDULED_PUBLICATION: 1 << 6,
//     DRAFT: 1 << 7,
//     APPLIED: 1 << 8,
//     APPLY_DRAFT: 1 << 9,
//   };
//
// Only the two bits below are used anywhere in this codebase, and only
// defensively:
//
// - HIDE_AUTHOR: the author explicitly asked to be hidden on this post.
//   mapAuthor() must render Anonymous when this is set, regardless of
//   what author.object looks like — this is the exact "hidden post
//   leaking author info onto a public, indexed page" risk HANDOFF.md
//   flagged before Phase 2.
// - ARCHIVED / DRAFT: a post in either state has no business in public
//   search results. posts.search almost certainly already excludes
//   these server-side, so this is a defense-in-depth check, not the
//   primary gate — safe to keep even if it's usually a no-op.
//
// FAVORED / MY_POST / APPLIED / APPLY_DRAFT / SCHEDULED_PUBLICATION are
// relative to the *calling user* (our read-only service account, which
// never favorites/applies/authors anything) — meaningless here, and
// deliberately still never read. PUBLISHED is deliberately not used as a
// gate either: post.published (the timestamp, already the source of
// truth for publishedAt) predates this bit existing, so trusting the bit
// over the timestamp risks silently hiding older valid posts.

const HIDE_AUTHOR = 1 << 3;
const ARCHIVED = 1 << 1;
const DRAFT = 1 << 7;

export function authorIsHidden(flags: number): boolean {
  return (flags & HIDE_AUTHOR) !== 0;
}

export function isArchivedOrDraft(flags: number): boolean {
  return (flags & ARCHIVED) !== 0 || (flags & DRAFT) !== 0;
}

// Aleksandr, 2026-08-30 (live report, "Мої пости" panel: "вот эти
// посты, они все удалённые, сверху ты их зачем-то показал"):
// app/api/posts/mine/route.ts deliberately bypasses mapPosts() (and so
// isArchivedOrDraft above) to keep drafts/scheduled posts visible to
// their own author, which the public feed's mapper always excludes --
// but that meant it never excluded ARCHIVED (this backend's delete,
// confirmed by posts.deletePost's own PLAN.md entry sitting right next
// to this bit's definition) either, so a post the visitor had already
// deleted kept showing up there, mislabeled "Опубліковано". This
// isolates just the ARCHIVED check so "mine" can drop deleted posts
// while still keeping drafts.
export function isArchived(flags: number): boolean {
  return (flags & ARCHIVED) !== 0;
}

// 2026-09-01: unlike the comment above says for the anonymous
// service-account reads (fetchPostById/mapPosts — FAVORED is genuinely
// meaningless there, since that account never favorites anything),
// this bit IS meaningful on an authenticated callAsVisitor call, where
// it reflects the real signed-in visitor. Used by
// app/api/favorites/list/route.ts, itself the initial-state check
// behind the post-detail page's "Зберегти пост" toggle
// (components/post-viewer-menu.tsx) — mirrors how
// components/add-contact-button.tsx resolves its own initial toggle
// state from app/api/contacts/list/route.ts.
const FAVORED = 1 << 4;

export function isFavorited(flags: number): boolean {
  return (flags & FAVORED) !== 0;
}
