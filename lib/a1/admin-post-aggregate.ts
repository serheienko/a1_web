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
// 2026-09-10 (Aleksandr: bulk-provisioning grew TECHNICAL_ACCOUNTS_JSON
// from a handful of pilot accounts to ~490 -- the "revisit" this
// comment used to flag is now due). Two changes below: a concurrency
// cap (CONCURRENCY) instead of firing every account's login at once,
// which was both hammering the A1 backend and risking this route's own
// Vercel execution timeout; and a short in-memory cache (CACHE_TTL_MS)
// so repeated admin-page loads on a still-warm lambda don't redo the
// full ~490-account fetch every time -- a cold start still pays the
// full cost once. Each account's own 3 posts.search variants (plain /
// drafts / scheduled) now also run in parallel instead of sequentially
// -- they're independent reads, merged by _id same as before.
import { call, A1ApiError } from "./client";
import { parsePost, type Post } from "./schemas";
import { isArchived } from "./post-flags";
import { loadTechnicalAccounts, type TechnicalAccount } from "./admin-accounts";

const CONCURRENCY = 25;
const CACHE_TTL_MS = 45_000;
let cache: { data: AdminAggregatedPost[]; fetchedAt: number } | null = null;

// Runs `worker` over `items` with at most `limit` in flight at once --
// see the comment above for why an unbounded Promise.all stopped being
// safe once TECHNICAL_ACCOUNTS_JSON grew to hundreds of entries.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}


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
    // The three variants are independent reads, so run them in
    // parallel (2026-09-10) instead of one-at-a-time -- with ~490
    // accounts now in play, tripling every account's own latency by
    // going sequential here was adding up.
    const searchResults = await Promise.all(
      [{}, { drafts: true }, { scheduled: true }].map((extra) =>
        call<SearchOutput>(
          "posts.search",
          { author: "me", limit: 100, ...extra },
          { accessToken: login.accessToken },
        ),
      ),
    );
    const collected = new Map<string, Post>();
    for (const data of searchResults) {
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
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const accounts = loadTechnicalAccounts();
  const results = await mapWithConcurrency(accounts, CONCURRENCY, fetchAccountPosts);
  const data = results.flat().sort((a, b) => b.created - a.created);
  cache = { data, fetchedAt: Date.now() };
  return data;
}
