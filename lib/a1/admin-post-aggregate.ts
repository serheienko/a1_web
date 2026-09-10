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
// from a handful of pilot accounts to ~500). First attempt was a
// concurrency cap (CONCURRENCY) plus a whole-list in-memory cache --
// that stopped this from hammering the A1 backend, but fetching ALL
// ~500 accounts in one request still blew past Vercel's 60s function
// limit on Hobby (confirmed: /api/admin/all-posts was 504ing every
// time). Fixed properly this round (Aleksandr: "пагинация в самой
// админке -- частями по 50 + кеширование"): this module now serves one
// PAGE of accounts at a time (fetchAccountsPostsPage), and
// app/api/admin/all-posts/route.ts's caller loads page after page --
// each page's own aggregate fetch comfortably finishes in a few
// seconds instead of the whole thing racing a 60s clock. Each page's
// result is cached separately (CACHE_TTL_MS) so re-requesting the same
// page within the window is instant. Each account's own 3
// posts.search variants (plain / drafts / scheduled) still run in
// parallel instead of sequentially -- independent reads, merged by
// _id same as before.
import { call, A1ApiError } from "./client";
import { parsePost, type Post } from "./schemas";
import { isArchived } from "./post-flags";
import { loadTechnicalAccounts, type TechnicalAccount } from "./admin-accounts";

const CONCURRENCY = 25;
const CACHE_TTL_MS = 45_000;
const pageCache = new Map<string, { data: AccountsPostsPage; fetchedAt: number }>();

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

export type AccountsPostsPage = {
  posts: AdminAggregatedPost[];
  // Total number of technical accounts on file -- lets the caller know
  // how many pages there are and show "loaded X/Y accounts" progress.
  total: number;
  nextOffset: number | null;
  hasMore: boolean;
};

export async function fetchAccountsPostsPage(offset: number, limit: number): Promise<AccountsPostsPage> {
  const cacheKey = `${offset}:${limit}`;
  const cached = pageCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  const accounts = loadTechnicalAccounts();
  const page = accounts.slice(offset, offset + limit);
  const results = await mapWithConcurrency(page, CONCURRENCY, fetchAccountPosts);
  const posts = results.flat().sort((a, b) => b.created - a.created);
  const nextOffset = offset + limit < accounts.length ? offset + limit : null;
  const data: AccountsPostsPage = {
    posts,
    total: accounts.length,
    nextOffset,
    hasMore: nextOffset !== null,
  };
  pageCache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}
