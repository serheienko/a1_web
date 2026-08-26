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
