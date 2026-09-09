// lib/a1/admin-post-aggregate.ts
//
// 2026-09-09: server-side helper the "all posts" admin surface uses to
// fetch every technical account's own posts.search results and merge
// them into one list — there is no such aggregate on the A1 backend
// itself (see lib/a1/admin-accounts.ts's header for why one account per
// company can't just be merged into one). Logs in as each account
// fresh via auth.email(), the same public endpoint app/api/auth/sign-in
// uses — never touches a browser cookie/session, only ever runs
// server-side with a short-lived Bearer token per account per request
// (lib/a1/client.ts's call() `accessToken` option, the same mechanism
// app/api/account/update-profile already uses for a per-visitor token).
//
// Deliberately no cross-request token cache yet (2026-09-09): with a
// single test account today, a fresh login per account per request is
// cheap and simplest to reason about. Revisit with an in-memory
// (per-warm-lambda) token cache and a concurrency cap on the
// Promise.all below once TECHNICAL_ACCOUNTS_JSON actually holds
// hundreds of entries — logging into 500 accounts on every page load
// would be much too slow and hammer the backend.

import { call, A1ApiError } from "./client";
import { parsePost, type Post } from "./schemas";
import { isArchived } from "./post-flags";
import { loadTechnicalAccounts, type TechnicalAccount } from "./admin-accounts";

// Field-for-field the same shape app/api/posts/mine/route.ts's own
// summarize() returns (title/content/object/etc, enough to both list a
// row and prefill components/post-editor.tsx's edit form) plus two
// fields that route doesn't need: which company/account this post
// belongs to, so the admin panel can label the card and — critically —
// so a later edit/delete knows which account's password to log in with
// (app/api/admin/posts/update, app/api/admin/posts/delete).
export type AdminAggregatedPost = {
  id: string;
  title: string;
  content: string;
  object: Post["object"];
  links: Post["links"];
  location: { id: number; label: string } | null;
  categories: number[];
  tags: Post["tags"];
  money: Post["money"];
  media: Post["media"];
  created: number;
  published: number | null;
  scheduled: number | null;
  isDraft: boolean;
  companyName: string;
  companyEmail: string;
};

type SearchOutput = { items: unknown[] };
type LoginOutput = { accessToken: string };

function summarize(post: Post, account: TechnicalAccount): AdminAggregatedPost {
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
    companyName: account.name,
    companyEmail: account.email,
  };
}

async function fetchAccountPosts(account: TechnicalAccount): Promise<AdminAggregatedPost[]> {
  try {
    const login = await call<LoginOutput>(
      "auth.email",
      { email: account.email, password: account.password },
      { skipAuth: true },
    );

    // Same "call it three ways and merge by _id" as app/api/posts/mine —
    // posts.search's `author: "me"` alone isn't confirmed to already
    // include drafts/scheduled posts (see that route's own header
    // comment), so this doesn't bet on an unconfirmed default either.
    const collected = new Map<string, Post>();
    for (const extra of [{}, { drafts: true }, { scheduled: true }]) {
      const data = await call<SearchOutput>(
        "posts.search",
        { author: "me", limit: 100, ...extra },
        { accessToken: login.accessToken },
      );
      for (const raw of data.items ?? []) {
        const post = parsePost(raw);
        if (post) collected.set(post._id, post);
      }
    }

    return Array.from(collected.values())
      .filter((post) => !isArchived(post.flags))
      .map((post) => summarize(post, account));
  } catch (err) {
    // One bad account (an expired/rotated password, a rate-limited
    // login) should not blank out the whole admin page — skip it and
    // let every other account still show. The failure is still logged
    // so a silently-missing company is diagnosable from Vercel's logs.
    if (err instanceof A1ApiError) {
      console.error(`[admin-post-aggregate] ${account.email} failed:`, err.httpStatus, err.body.slice(0, 300));
    } else {
      console.error(`[admin-post-aggregate] ${account.email} failed:`, err);
    }
    return [];
  }
}

export async function fetchAllAccountsPosts(): Promise<AdminAggregatedPost[]> {
  const accounts = loadTechnicalAccounts();
  const results = await Promise.all(accounts.map(fetchAccountPosts));
  return results.flat().sort((a, b) => b.created - a.created);
}
