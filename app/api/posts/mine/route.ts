// app/api/posts/mine/route.ts
//
// "My posts" panel (Aleksandr, 2026-08-29 CRUD follow-up) — lists the
// signed-in visitor's own posts across every state so Edit/Delete has
// something to act on. posts.search (PLAN.md §0.2) takes `drafts` and
// `scheduled` as separate boolean flags rather than "give me
// everything I own regardless of state" in one call, and it's not
// documented whether `author: "me"` alone already includes drafts/
// scheduled posts by default — so this calls it three times (plain,
// drafts:true, scheduled:true) and merges by `_id` rather than betting
// on an unconfirmed default. A little redundant network-wise, cheap in
// practice (three small authenticated calls, once per panel open, not
// on every page load).
//
// Only the fields the panel actually renders are returned — title,
// object (Jobs vs Talents), created/published/scheduled timestamps, and
// enough of `flags` to label the row — never the full raw Post, per
// this project's usual anti-corruption-layer discipline (PLAN.md §2.4)
// even though this is an authenticated, same-user read.

import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parsePost, type Post } from "@/lib/a1/schemas";
import { isArchived } from "@/lib/a1/post-flags";
import { mapOwnPost } from "@/lib/a1/mappers";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import type { WebPost } from "@/types/web-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = { items: unknown[] };

// Full enough to both list a row AND prefill the edit form — this is
// always the caller's OWN post (posts.search { author: "me" }), so
// there's no cross-user leak risk in returning everything the editor
// needs to reconstruct a PostInput, unlike the public-facing WebPost
// mapper (PLAN.md §2.4) which exists specifically to keep other users'
// raw post data narrow. Still not the literal raw object — `viewCount`,
// `pinExpiresAt`, `highlightExpiresAt`, `apply.questions`' internal
// shape, etc. stay out because the editor doesn't need them, not
// because they're sensitive.
function summarize(post: Post) {
  return {
    id: post._id,
    title: post.title,
    content: post.content,
    object: post.object,
    links: post.links,
    location: post.location ? { id: post.location._id, label: post.location.displayName } : null,
    categories: post.categories,
    tags: post.tags,
    money: post.money,
    media: post.media,
    created: post.created,
    published: post.published,
    scheduled: post.scheduled,
    isDraft: (post.flags & (1 << 7)) !== 0,
    // 2026-08-30 (Aleksandr: "могли зайти к себе на профиль и
    // посмотреть, как там у нас всё устроено"): there's still no
    // "whoami"/get-my-profile endpoint (components/avatar-menu.tsx's own
    // header comment, 2026-08-29) for the client to learn its own
    // username from directly. `author: "me"` above guarantees every post
    // this route returns is the caller's own, so its author.username is
    // reliably the visitor's own username -- the closest thing to a
    // whoami this app has today, good enough for a "View my profile"
    // link, but only for a visitor with at least one post (see
    // avatar-menu.tsx for how it degrades otherwise).
    authorUsername: post.author.object === "user-preview" ? (post.author.username ?? null) : null,
  };
}

// 2026-08-30 (Aleksandr: "во вкладке посты, черновики, просто помечаем
// плашечкой draft... запланированные scheduled — это уже у нас
// решенный вопрос"): components/profile-tabs.tsx's own "Пости" tab, on
// the visitor's OWN profile only, shows drafts/scheduled posts
// alongside already-published ones, styled exactly like a feed card
// (components/post-card.tsx) but with a gray status pill instead of the
// colored Jobs/Talent one. mapOwnPost() (lib/a1/mappers.ts) is the one
// place allowed to map a draft/scheduled post to a WebPost at all; this
// exists only to attach the badge's status alongside it, kept as a
// SEPARATE field from `posts` above so the editor-shape summaries this
// route has returned since the CRUD panel work stay byte-for-byte
// unchanged for any existing caller.
export type MinePostCard = { post: WebPost; status: "draft" | "scheduled"; avatarBlurDataUrl: string | null };

type DraftCard = { post: WebPost; status: "draft" | "scheduled" };

function toCard(post: Post): DraftCard | null {
  const isDraft = (post.flags & (1 << 7)) !== 0;
  const isScheduledUnpublished = post.scheduled != null && post.published == null;
  if (!isDraft && !isScheduledUnpublished) return null;
  const mapped = mapOwnPost(post);
  if (!mapped) return null;
  return { post: mapped, status: isDraft ? "draft" : "scheduled" };
}

export async function GET() {
  try {
    let refreshed = null;
    const collected = new Map<string, Post>();

    for (const extra of [{}, { drafts: true }, { scheduled: true }]) {
      const { data, refreshedSession } = await callAsVisitor<SearchOutput>("posts.search", {
        author: "me",
        limit: 100,
        ...extra,
      });
      if (refreshedSession) refreshed = refreshedSession;
      for (const raw of data.items ?? []) {
        const post = parsePost(raw);
        if (post) collected.set(post._id, post);
      }
    }

    const nonArchived = Array.from(collected.values())
      // 2026-08-30 (see lib/a1/post-flags.ts's isArchived comment): a
      // deleted post is a soft-delete on this backend (the ARCHIVED
      // flag bit), not removed from posts.search's results, so it has
      // to be filtered out here explicitly -- this route deliberately
      // reads the raw Post, bypassing mapPosts()'s equivalent filter.
      .filter((post) => !isArchived(post.flags))
      .sort((a, b) => b.created - a.created);

    const posts = nonArchived.map(summarize);
    const draftCards = nonArchived
      .map(toCard)
      .filter((card): card is DraftCard => card !== null);
    // Same real per-avatar blur app/api/posts/mine-feed/route.ts already
    // computes (see this route's import comment above) -- every author
    // here is "me" (a single avatarUrl), so generateAvatarBlurDataUrl's
    // react cache() dedup means this is one extra fetch+sharp() per
    // request, not one per draft/scheduled post.
    const avatarBlurs = await Promise.all(
      draftCards.map((card) => generateAvatarBlurDataUrl(card.post.author.avatarUrl)),
    );
    const draftsAndScheduled: MinePostCard[] = draftCards.map((card, i) => ({
      ...card,
      avatarBlurDataUrl: avatarBlurs[i] ?? null,
    }));

    const response = NextResponse.json({ ok: true, posts, draftsAndScheduled });
    if (refreshed) setSession(response, refreshed);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      // The visitor's session cookie is unusable (never existed, or its
      // refresh token was itself rejected by the backend — see
      // lib/a1/visitor-call.ts's callAsVisitor for when that happens) —
      // clear it so a stale cookie does not keep silently failing every
      // later call instead of sending the visitor back to /sign-in.
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/posts/mine] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/mine] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}
