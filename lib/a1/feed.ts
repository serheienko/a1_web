// lib/a1/feed.ts
//
// Shared "fetch one page of a feed" logic used by both the RSC pages
// (app/jobs/page.tsx, app/talents/page.tsx) and the "Load more" API route
// (app/api/feed/route.ts), so cursor handling and object-type mapping only
// live in one place.

import { unstable_cache } from "next/cache";
import { call } from "./client";
import { mapPosts } from "./mappers";
import { PostsSearchOutputSchema } from "./schemas";
import type { WebPost, WebPostKind } from "@/types/web-post";

// 2026-09-05 (Aleksandr: "не загружай всю ленту сразу, а показывай
// только постов 30... подгрузку и пагинацию") -- bumped from the
// original 20 to 30 for the (since replaced) infinite-scroll version of
// this feed.
//
// 2026-09-10 (Aleksandr: "страницы по двадцать... для SEO") -- back down
// to 20, now as a real per-page size for numbered pagination
// (components/pagination.tsx) instead of infinite scroll: separate
// `?page=N` URLs Google can actually crawl and index, which it can't do
// for content that only appears after a client-side scroll fetch.
export const FEED_PAGE_SIZE = 20;

const KIND_TO_OBJECT: Record<WebPostKind, string> = {
  hiring: "post-job-employing",
  seeking: "post-job-seeking",
};

// Aleksandr, 09.09.2026: "выдачу надо показывать вчера, позавчера и тд
// -- от самой свежей вначале до самой поздней" -- posts.search itself
// paginates in the backend's own order (roughly: when the post was
// created on A1), which for imported DOU vacancies is "whenever we ran
// the parser/backfill", not the vacancy's real DOU publish date
// (sourcePublishedAt, see lib/a1/mappers.ts).
//
// First version of this only re-sorted each page in isolation (30 posts
// at a time) -- worked fine while the feed was small, but broke visibly
// the moment one parser run added ~1,600 posts at once (Aleksandr,
// 09.09.2026: "ранжирование по дате отлетело с новым парсингом"): a
// genuinely newer vacancy sitting a few backend-pages back never got a
// chance to surface onto page 1, because the backend's own pagination
// doesn't know about sourcePublishedAt at all. Fixed by getSortedFeed
// below -- see its own comment.
function sortByFreshness<T extends { publishedAt: Date; sourcePublishedAt: Date | null }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const aTime = (a.sourcePublishedAt ?? a.publishedAt).getTime();
    const bTime = (b.sourcePublishedAt ?? b.publishedAt).getTime();
    return bTime - aTime;
  });
}

// Aleksandr, 2026-09-10, looking at the now-date-sorted feed: "постятся
// вакансии все подряд от одной компании... надо аранжировать... но
// должен быть верхний левел, что если вакансия вчера опубликована, то
// она должна показываться" -- keep the real-date order as the top-level
// rule, just mix so same-company posts don't run in a row.
//
// First version of this only did one local pass: walk the date-sorted
// list and swap the nearest later post from a different company into
// any spot that repeated its immediate neighbor. That only guarantees
// no two ADJACENT cards share a company -- with few companies and many
// posts each, the same company can still resurface every 2-3 cards.
//
// Aleksandr, 2026-09-10 (2nd round), on that: "надо все равно
// придумывать какой-то более крутой механизм... если есть 100 вакансий
// и 50 компаний, то мы сначала показываем 50 разных постов от компаний,
// а потом по очереди повторяем" -- replaced with a real round-robin:
// group the (already date-sorted) posts into one bucket per company,
// each bucket staying newest-first internally, then build the output in
// "rounds" -- round 0 is each company's newest post (so with 50
// companies, the first 50 cards are 50 DIFFERENT companies before any
// repeat), round 1 is each company's 2nd-newest, etc. A company with
// fewer posts just drops out of later rounds. Because the input is
// already freshness-sorted, a bucket's place in the round order is
// fixed by ITS newest post's date -- so this still reads top-to-bottom
// as newest-first overall, it just spreads repeats across whole rounds
// instead of letting them cluster.
function authorKey(post: WebPost): string {
  return post.author.userId ?? post.author.username ?? post.author.name;
}

function interleaveByAuthor(posts: WebPost[]): WebPost[] {
  const buckets = new Map<string, WebPost[]>();
  for (const post of posts) {
    const key = authorKey(post);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(post);
    } else {
      buckets.set(key, [post]);
    }
  }
  const bucketList = [...buckets.values()];

  const result: WebPost[] = [];
  let round = 0;
  while (result.length < posts.length) {
    for (const bucket of bucketList) {
      const post = bucket[round];
      if (post !== undefined) {
        result.push(post);
      }
    }
    round++;
  }
  return result;
}

export type FeedPage = {
  posts: WebPost[];
  next: string | null;
  hasMore: boolean;
  // 2026-09-11 (Aleksandr: "покажи цифрами 20 страниц... после 20-й меняй
  // весь ряд на 20-40") -- numbered pagination needs to know how many pages
  // there are, which "hasMore" alone can't answer. Free to carry: both code
  // paths below already hold the full match list, they were just throwing
  // its length away.
  total: number;
};

/** Phase 3: category/tag/free-text filters, all optional and all
 *  OR-matched server-side per PLAN.md §0.2. */
export type FeedFilters = {
  q?: string;
  categories?: number[];
  tags?: string[];
  // 2026-08-28: WorldLocation._id, sent to posts.search's own `location`
  // field (lib/a1/schemas.ts's PostsSearchInputSchema already had this
  // typed — nothing used it until now). locationLabel is NOT sent to the
  // backend at all — it's the human-readable place name the user picked
  // in components/filters-form.tsx's location search (lib/a1/locations.ts),
  // round-tripped through the URL purely so a reloaded/shared link can
  // redisplay "Kyiv, Ukraine" instead of just the bare id.
  location?: number;
  locationLabel?: string;
};

// Aleksandr, 2026-08-27: "надо модернизировать и улучшить поиск, чтобы он
// подбирал не только по введенному полному слову, а начиная... со
// второго символа" (typing "FR" should already surface "Frontend...").
// Confirmed live: the backend's own `q` on posts.search needs something
// close to a full word -- "frontend" finds the post, "fr" finds nothing --
// and the openapi spec (Method.v1_posts_search_input) has no alternate
// matchType/fuzzy/prefix param to ask it to do this differently, and we
// don't know where exactly its cutoff is between "fr" and "frontend"
// either. So rather than guess a length threshold, ANY non-empty `q`
// bypasses the backend's own matching entirely and substring-matches
// client-side instead (categories/tags/location filters still go to the
// backend as normal).
//
// 2026-09-09: this used to be a `q`-only code path (scanFeedForQuery) --
// generalized into scanFullFeed below so the SAME "walk every matching
// post" approach also powers plain (no-`q`) listings, which is what
// getSortedFeed needs to sort the whole feed instead of one page at a
// time. `needle` is undefined for a plain listing, and every post is
// then treated as a match (see the `!needle ||` below).
const FULL_SCAN_MAX_PAGES = 30; // 30 * 100 = 3,000 posts scanned, max
const FULL_SCAN_PAGE_SIZE = 100; // posts.search's documented max per request
const LOCAL_CURSOR_PREFIX = "local-offset:";

// LIMITATION (same idea as before, just a much higher ceiling now that
// this runs for every listing, not only text search): past
// FULL_SCAN_MAX_PAGES * FULL_SCAN_PAGE_SIZE live posts for one filter
// combination, the oldest ones stop being seen (and sorted) at all --
// comfortable headroom over today's ~1,700 live posts total; revisit
// (raise the cap, or get real backend sort support) if the live feed for
// one category/tag/location/q combination ever approaches 3,000.
async function scanFullFeed(kind: WebPostKind, filters: FeedFilters): Promise<WebPost[]> {
  const needle = filters.q?.trim().toLowerCase();
  const matches: WebPost[] = [];
  let cursor: string | null | undefined;

  for (let page = 0; page < FULL_SCAN_MAX_PAGES; page++) {
    const raw = await call<unknown>("posts.search", {
      limit: FULL_SCAN_PAGE_SIZE,
      object: KIND_TO_OBJECT[kind],
      ...(cursor ? { next: cursor } : {}),
      ...(filters.categories && filters.categories.length > 0 ? { categories: filters.categories } : {}),
      ...(filters.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
      ...(filters.location != null ? { location: filters.location } : {}),
    });
    const parsed = PostsSearchOutputSchema.parse(raw);
    for (const post of mapPosts(parsed.items)) {
      if (!needle || post.title.toLowerCase().includes(needle) || post.contentText.toLowerCase().includes(needle)) {
        matches.push(post);
      }
    }
    if (!parsed.pagination.hasMore || !parsed.pagination.next) break;
    cursor = parsed.pagination.next;
  }

  return matches;
}

// 2026-09-10 (Aleksandr: главная грузится долго, "х100 костит" -- сервер
// пересчитывал всю ленту заново практически на каждый заход): first
// attempt at a real fix was going to be a scheduled background job
// (Vercel Cron) writing a precomputed result to Vercel Blob storage --
// works, but frequent Cron (more than once/day) needs the paid Pro plan.
// Turns out that's not actually necessary: Next's own Data Cache
// (`unstable_cache`, see https://vercel.com/docs/caching/runtime-cache/
// data-cache) already IS a cache shared across every serverless instance
// and region on Vercel -- including Hobby -- unlike sortedFeedCache
// below, which only helps within one warm process. Revalidation is
// stale-while-revalidate: whoever's request happens to land after the
// interval below still gets the last cached list INSTANTLY, while Next
// reruns the scan in the background for the next request -- nobody
// actually waits on scanFullFeed anymore, regardless of the interval.
//
// Two things that shaped this:
// 1. Data Cache entries are capped at 2MB (Vercel's documented limit) --
//    caching the WHOLE scanned feed (up to FULL_SCAN_MAX_PAGES *
//    FULL_SCAN_PAGE_SIZE = 3,000 posts) risks that as the live post
//    count grows. Only the first CACHED_FEED_PREFIX posts (already
//    sorted + interleaved) are cached -- comfortably covers every
//    "Load more" click a real visitor makes in practice. Paging past
//    it (rare) falls through to the older live-scan path below.
// 2. unstable_cache serializes its result through JSON, which silently
//    turns every `Date` into a string and does NOT turn it back --
//    serializeForCache/deserializeFromCache below convert WebPost's 3
//    date fields before caching and back to real Dates after reading,
//    so every caller still gets real Date objects same as before.
//
// Deliberately scoped to the UNFILTERED feed only (no q/category/tag/
// location) -- that's what app/page.tsx and app/talents/page.tsx render
// by default, and it keeps the cache key space small. A filtered/search
// view still goes through getSortedFeed/sortedFeedCache below,
// unchanged -- lower-traffic, and correctness there matters more than
// speed.
// 2026-09-11: raised from 300 to 600 (30 pages of FEED_PAGE_SIZE) now that a
// cached post is ~8x smaller -- see serializeForCache below. Numbered
// pagination (components/pagination.tsx) made deep pages reachable for
// visitors AND crawlable for Google, and every page past this prefix costs a
// full live scan, so the prefix should cover as much of the feed as fits.
const CACHED_FEED_PREFIX = 600;
const FEED_CACHE_REVALIDATE_SECONDS = 60;
// Comfortably more than a feed card can show (post-card.tsx renders the
// description as line-clamp-6, i.e. ~700 characters at the widest), and small
// enough that even an all-Cyrillic worst case (600 posts x 6,000-character
// descriptions, 2 bytes per character) serializes to ~1.3MB, inside the 2MB
// limit -- measured, not guessed.
const FEED_CACHE_EXCERPT_CHARS = 900;

type SerializedWebPost = Omit<WebPost, "publishedAt" | "sourcePublishedAt" | "updatedAt"> & {
  publishedAt: string;
  sourcePublishedAt: string | null;
  updatedAt: string | null;
};

// 2026-09-11 -- measured against the live feed: an average post is ~12KB of
// JSON, almost all of it the description, which WebPost carries TWICE
// (contentText plus contentHtml, the latter purely derived from it by
// mapPosts). 300 such posts is ~3.5MB, well over Vercel's documented 2MB
// per-entry limit for the Data Cache -- an oversized entry is silently not
// cached, so the "shared feed cache" was quietly doing nothing and every
// request fell through to the per-instance cache and, failing that, a full
// live scan. The cached copy therefore keeps only what the feed itself
// renders: a generous excerpt instead of the whole description, and no
// derived HTML at all (only the job/talent detail pages read contentHtml,
// and they load their post separately via fetchPostById). Result: ~1.5KB per
// post, under ~1MB for the whole 600-post prefix, comfortably inside it.
function serializeForCache(post: WebPost): SerializedWebPost {
  return {
    ...post,
    contentText:
      post.contentText.length > FEED_CACHE_EXCERPT_CHARS
        ? `${post.contentText.slice(0, FEED_CACHE_EXCERPT_CHARS)}…`
        : post.contentText,
    contentHtml: "",
    publishedAt: post.publishedAt.toISOString(),
    sourcePublishedAt: post.sourcePublishedAt ? post.sourcePublishedAt.toISOString() : null,
    updatedAt: post.updatedAt ? post.updatedAt.toISOString() : null,
  };
}

function deserializeFromCache(post: SerializedWebPost): WebPost {
  return {
    ...post,
    publishedAt: new Date(post.publishedAt),
    sourcePublishedAt: post.sourcePublishedAt ? new Date(post.sourcePublishedAt) : null,
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
  };
}

// `total` is the size of the WHOLE scanned feed, not of the cached prefix --
// it costs nothing extra (the scan already produced the full list) and it is
// what numbered pagination needs. Cache key bumped to -v2 because the shape
// of the cached value changed; a stale v1 entry would deserialize wrong.
const getCachedFeedPrefixRaw = unstable_cache(
  async (kind: WebPostKind): Promise<{ posts: SerializedWebPost[]; total: number }> => {
    const sorted = interleaveByAuthor(sortByFreshness(await scanFullFeed(kind, {})));
    return { posts: sorted.slice(0, CACHED_FEED_PREFIX).map(serializeForCache), total: sorted.length };
  },
  ["feed-prefix-v3"],
  { revalidate: FEED_CACHE_REVALIDATE_SECONDS },
);

async function getCachedFeedPrefix(kind: WebPostKind): Promise<{ posts: WebPost[]; total: number }> {
  const cached = await getCachedFeedPrefixRaw(kind);
  return { posts: cached.posts.map(deserializeFromCache), total: cached.total };
}

// 2026-09-09: scanFullFeed is NOT cheap -- up to 30 sequential requests
// to api.a1appp.com just to answer one page of the feed. This in-memory
// cache (one warm serverless instance reuses the same sorted list for
// TTL_MS instead of re-scanning) is now only the FALLBACK path -- a
// filtered/search view, or paging past CACHED_FEED_PREFIX on the
// unfiltered feed above. Both are comparatively rare, so a per-instance
// (not cross-instance) cache is an acceptable trade-off here.
const SORTED_FEED_CACHE_TTL_MS = 60_000;
const sortedFeedCache = new Map<string, { expiresAt: number; promise: Promise<WebPost[]> }>();

function sortedFeedCacheKey(kind: WebPostKind, filters: FeedFilters): string {
  return JSON.stringify([
    kind,
    filters.q?.trim().toLowerCase() ?? "",
    [...(filters.categories ?? [])].sort(),
    [...(filters.tags ?? [])].sort(),
    filters.location ?? null,
  ]);
}

async function getSortedFeed(kind: WebPostKind, filters: FeedFilters): Promise<WebPost[]> {
  const key = sortedFeedCacheKey(kind, filters);
  const now = Date.now();
  const cached = sortedFeedCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = scanFullFeed(kind, filters).then(sortByFreshness).then(interleaveByAuthor);
  sortedFeedCache.set(key, { expiresAt: now + SORTED_FEED_CACHE_TTL_MS, promise });
  // A failed scan shouldn't keep serving/retrying the same rejection for
  // the rest of the TTL window -- let the next call try fresh.
  promise.catch(() => sortedFeedCache.delete(key));
  return promise;
}

// Aleksandr, 2026-08-27: "Категории в которых пока пусто показывай 50%
// прозрачности и не активными" — the category filter list should visibly
// dim/disable a category that currently has zero live posts, rather than
// let someone pick it and land on an empty feed. dataset.postCategories
// (lib/a1/datasets.ts) carries no post-count of its own, so this asks
// posts.search directly, one minimal (limit: 1) request per category, in
// parallel — the same "count" field posts.search already returns
// (schemas.ts's PostsSearchOutputSchema) is reused here rather than
// counting items.length, since a single-item page can't tell "1 total"
// apart from "100 total" on its own. A category that errors is treated
// as non-empty (fails open) rather than getting hidden/disabled by a
// transient network hiccup.
export async function fetchEmptyCategoryValues(
  kind: WebPostKind,
  categoryValues: number[],
): Promise<number[]> {
  const results = await Promise.all(
    categoryValues.map(async (categoryValue) => {
      try {
        const raw = await call<unknown>("posts.search", {
          limit: 1,
          object: KIND_TO_OBJECT[kind],
          categories: [categoryValue],
        });
        const parsed = PostsSearchOutputSchema.parse(raw);
        const total = parsed.count?.total ?? parsed.items.length;
        return total === 0 ? categoryValue : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((v): v is number => v !== null);
}

// 2026-08-30 (Aleksandr: "могли... нажать на наши посты и чтобы наши
// посты отображались такими типа карточками") -- app/u/[username]/
// page.tsx's own "posts by this author" section, any profile not just
// the visitor's own. `author` here is the raw user _id (lib/a1/
// users.ts's fetchUserRawByUsername), not a username or "me" -- confirmed
// PostsSearchInputSchema accepts any string there, and app/api/posts/
// mine/route.ts's own `author: "me"` call already proves the field
// works with no `object` filter (returns both hiring and seeking posts
// in one call). No `drafts`/`scheduled` flags set, same as the public
// feed pages' own calls -- a profile page (viewed by anyone, signed in
// or not) should only ever show what's actually live, regardless of
// whose profile it is.
export async function fetchPostsByAuthor(authorId: string, limit = 12): Promise<WebPost[]> {
  const raw = await call<unknown>("posts.search", { author: authorId, limit });
  const parsed = PostsSearchOutputSchema.safeParse(raw);
  if (!parsed.success) return [];
  return mapPosts(parsed.data.items);
}

export async function fetchFeedPage(
  kind: WebPostKind,
  cursor?: string | null,
  filters: FeedFilters = {},
): Promise<FeedPage> {
  // 2026-09-09: always paginate over the FULL, already-sorted feed
  // instead of forwarding the backend's own cursor -- that's what lets
  // a genuinely newer post several backend-pages back still land on
  // page 1. `cursor` here is always one of OUR offsets
  // (LOCAL_CURSOR_PREFIX), never the backend's own `next`.
  const offset = cursor?.startsWith(LOCAL_CURSOR_PREFIX)
    ? Number(cursor.slice(LOCAL_CURSOR_PREFIX.length)) || 0
    : 0;
  const nextOffset = offset + FEED_PAGE_SIZE;

  // 2026-09-10: the common case (unfiltered feed, within the first
  // CACHED_FEED_PREFIX posts) is served from the shared cross-instance
  // cache above -- no live scan at all. See that block's comment.
  if (!hasActiveFilters(filters) && nextOffset <= CACHED_FEED_PREFIX) {
    // 2026-09-11: `total` now comes from the cache too, so this branch knows
    // the real feed size even though it only holds the first
    // CACHED_FEED_PREFIX posts -- no more optimistic "probably hasMore".
    const { posts: cachedPrefix, total } = await getCachedFeedPrefix(kind);
    const hasMore = nextOffset < total;
    return {
      posts: cachedPrefix.slice(offset, nextOffset),
      next: hasMore ? `${LOCAL_CURSOR_PREFIX}${nextOffset}` : null,
      hasMore,
      total,
    };
  }

  const allMatches = await getSortedFeed(kind, filters);
  const hasMore = nextOffset < allMatches.length;
  return {
    posts: allMatches.slice(offset, nextOffset),
    next: hasMore ? `${LOCAL_CURSOR_PREFIX}${nextOffset}` : null,
    hasMore,
    total: allMatches.length,
  };
}

/**
 * Turns a 1-based page number into the cursor fetchFeedPage expects --
 * page 1 has no cursor (offset 0), page 2 is offset FEED_PAGE_SIZE, etc.
 * Callers (app/page.tsx, app/talents/page.tsx) never need to know the
 * cursor's actual string shape.
 */
export function pageToCursor(page: number): string | undefined {
  const offset = (Math.max(1, page) - 1) * FEED_PAGE_SIZE;
  return offset > 0 ? `${LOCAL_CURSOR_PREFIX}${offset}` : undefined;
}

/** Reads `?page=N` off the URL, clamped to a sane 1-based integer. */
export function parsePageParam(params: URLSearchParams): number {
  const raw = Number(params.get("page"));
  return Number.isInteger(raw) && raw > 1 ? raw : 1;
}

/**
 * Next 15 hands RSC pages `searchParams` as a plain
 * `{ [key: string]: string | string[] | undefined }` object, not a real
 * URLSearchParams like a Route Handler gets from `request.nextUrl`. This
 * normalizes either into one shape so parseFeedFilters() below works from
 * both app/jobs/page.tsx and app/api/feed/route.ts.
 */
export function toURLSearchParams(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.append(key, value);
    }
  }
  return params;
}

/**
 * URL shape (PLAN.md §3.1): `?q=...&category=<id>&tag=<value>&tag=<value>`
 * — one category (a <select>, not a multi-select — 39 options), any
 * number of repeated `tag` params (checkboxes). 2026-08-28: `&location=
 * <id>&locationLabel=<name>` added the same way — one location, an id +
 * its display label riding along in its own param (see FeedFilters above
 * for why the label needs to be in the URL at all).
 */
export function parseFeedFilters(params: URLSearchParams): FeedFilters {
  const q = params.get("q")?.trim();
  const categoryParam = params.get("category");
  const categoryId = categoryParam ? Number(categoryParam) : NaN;
  const tags = params.getAll("tag").filter(Boolean);
  const locationParam = params.get("location");
  const locationId = locationParam ? Number(locationParam) : NaN;
  const locationLabel = params.get("locationLabel")?.trim();

  return {
    q: q || undefined,
    categories: Number.isFinite(categoryId) && categoryParam ? [categoryId] : undefined,
    tags: tags.length > 0 ? tags : undefined,
    location: Number.isFinite(locationId) && locationParam ? locationId : undefined,
    locationLabel: locationLabel || undefined,
  };
}

export function hasActiveFilters(filters: FeedFilters): boolean {
  return Boolean(
    filters.q ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      filters.location != null,
  );
}
