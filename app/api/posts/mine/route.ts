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
import { setSession } from "@/lib/a1/session";
import { parsePost, type Post } from "@/lib/a1/schemas";

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
  };
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

    const posts = Array.from(collected.values())
      .sort((a, b) => b.created - a.created)
      .map(summarize);

    const response = NextResponse.json({ ok: true, posts });
    if (refreshed) setSession(response, refreshed);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
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
