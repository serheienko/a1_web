// lib/a1/feed.ts
//
// Shared "fetch one page of a feed" logic used by both the RSC pages
// (app/page.tsx, app/talents/page.tsx) and the "Load more" API route
// (app/api/feed/route.ts), so cursor handling and object-type mapping only
// live in one place.
//
// 2026-09-11 -- this file used to be much bigger. It read the ENTIRE live
// feed through posts.search (up to 30 sequential requests of 100 posts),
// sorted it by real publish date, interleaved it round-robin by company and
// served pages out of that, with two layers of caching bolted on to hide the
// cost. All of that now lives in the backend instead (aone-api-private,
// docs/superpowers/specs/2026-09-11-feed-ordering-design.md): posts.search
// ranks and paginates the feed itself, and takes an `offset`, so a page of
// this feed is one ordinary request again -- and the mobile app, which calls
// the same method directly, gets the identical order for free.
//
// One thing stayed here: free-text search. The backend's `q` matches whole
// words ("fr" finds nothing, "frontend" finds the post), and Aleksandr asked
// for typing "FR" to already surface "Frontend..." (2026-08-27), so a search
// query still scans the feed and substring-matches locally. That path is the
// only remaining reason scanFullFeed exists.

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

export type FeedPage = {
  posts: WebPost[];
  next: string | null;
  hasMore: boolean;
  // How many posts match this listing in total, so numbered pagination
  // (components/pagination.tsx) knows how many pages exist. Comes from
  // posts.search's own `expand=count` on the common path.
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

// This app's own cursor: an offset into the listing, not the backend's
// opaque cursor. Pages are addressed by number here (`?page=N`), so the
// offset is what a page maps to.
const LOCAL_CURSOR_PREFIX = "local-offset:";

function cursorToOffset(cursor?: string | null): number {
  return cursor?.startsWith(LOCAL_CURSOR_PREFIX) ? Number(cursor.slice(LOCAL_CURSOR_PREFIX.length)) || 0 : 0;
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

/** The filter half of a posts.search request, shared by both paths below.
 *  `q` is deliberately NOT forwarded — see this file's header. */
function filterParams(kind: WebPostKind, filters: FeedFilters): Record<string, unknown> {
  return {
    object: KIND_TO_OBJECT[kind],
    ...(filters.categories && filters.categories.length > 0 ? { categories: filters.categories } : {}),
    ...(filters.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
    ...(filters.location != null ? { location: filters.location } : {}),
  };
}

// LIMITATION (search path only): past FULL_SCAN_MAX_PAGES *
// FULL_SCAN_PAGE_SIZE live posts for one filter combination, the oldest ones
// stop being searched at all. Comfortable headroom over today's ~1,700 live
// posts; revisit if one filter combination ever approaches 3,000.
const FULL_SCAN_MAX_PAGES = 30; // 30 * 100 = 3,000 posts scanned, max
const FULL_SCAN_PAGE_SIZE = 100; // posts.search's documented max per request

/**
 * Walks the whole (already backend-ordered) listing and keeps the posts whose
 * title or body contains `needle`. Order is preserved exactly as the backend
 * returned it, so the result reads the same as the unfiltered feed.
 */
async function scanForQuery(kind: WebPostKind, filters: FeedFilters, needle: string): Promise<WebPost[]> {
  const matches: WebPost[] = [];
  let cursor: string | null | undefined;

  for (let page = 0; page < FULL_SCAN_MAX_PAGES; page++) {
    const raw = await call<unknown>("posts.search", {
      limit: FULL_SCAN_PAGE_SIZE,
      ...filterParams(kind, filters),
      ...(cursor ? { next: cursor } : {}),
    });
    const parsed = PostsSearchOutputSchema.parse(raw);
    for (const post of mapPosts(parsed.items)) {
      if (post.title.toLowerCase().includes(needle) || post.contentText.toLowerCase().includes(needle)) {
        matches.push(post);
      }
    }
    if (!parsed.pagination.hasMore || !parsed.pagination.next) break;
    cursor = parsed.pagination.next;
  }

  return matches;
}

// A scan is expensive, and paging through search results would otherwise
// repeat it per page. One warm serverless instance reuses the same match list
// for this window instead. Search is a comparatively rare path, so a
// per-instance (not cross-instance) cache is fine here.
const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { expiresAt: number; promise: Promise<WebPost[]> }>();

function searchCacheKey(kind: WebPostKind, filters: FeedFilters, needle: string): string {
  return JSON.stringify([
    kind,
    needle,
    [...(filters.categories ?? [])].sort(),
    [...(filters.tags ?? [])].sort(),
    filters.location ?? null,
  ]);
}

async function getSearchMatches(kind: WebPostKind, filters: FeedFilters, needle: string): Promise<WebPost[]> {
  const key = searchCacheKey(kind, filters, needle);
  const now = Date.now();
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = scanForQuery(kind, filters, needle);
  searchCache.set(key, { expiresAt: now + SEARCH_CACHE_TTL_MS, promise });
  // A failed scan shouldn't keep serving/retrying the same rejection for
  // the rest of the TTL window -- let the next call try fresh.
  promise.catch(() => searchCache.delete(key));
  return promise;
}

export async function fetchFeedPage(
  kind: WebPostKind,
  cursor?: string | null,
  filters: FeedFilters = {},
): Promise<FeedPage> {
  const offset = cursorToOffset(cursor);
  const nextOffset = offset + FEED_PAGE_SIZE;
  const needle = filters.q?.trim().toLowerCase();

  if (!needle) {
    // The common case: one request. The backend ranks the feed (real publish
    // date + round-robin by company), slices the page with `offset`, and
    // `expand=count` rides along so we know how many pages exist.
    const raw = await call<unknown>("posts.search", {
      limit: FEED_PAGE_SIZE,
      ...(offset > 0 ? { offset } : {}),
      ...filterParams(kind, filters),
      expand: "count",
    });
    const parsed = PostsSearchOutputSchema.parse(raw);
    const posts = mapPosts(parsed.items);
    const hasMore = parsed.pagination.hasMore;
    // count.total spans every post type (the backend counts with `object`
    // cleared), so the per-kind number is the one to use; fall back to what
    // this page proves exists if the expand is ever missing.
    const total =
      parsed.count?.object[KIND_TO_OBJECT[kind]] ??
      parsed.count?.total ??
      offset + posts.length + (hasMore ? 1 : 0);

    return {
      posts,
      next: hasMore ? `${LOCAL_CURSOR_PREFIX}${nextOffset}` : null,
      hasMore,
      total,
    };
  }

  const matches = await getSearchMatches(kind, filters, needle);
  const hasMore = nextOffset < matches.length;
  return {
    posts: matches.slice(offset, nextOffset),
    next: hasMore ? `${LOCAL_CURSOR_PREFIX}${nextOffset}` : null,
    hasMore,
    total: matches.length,
  };
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

/**
 * Next 15 hands RSC pages `searchParams` as a plain
 * `{ [key: string]: string | string[] | undefined }` object, not a real
 * URLSearchParams like a Route Handler gets from `request.nextUrl`. This
 * normalizes either into one shape so parseFeedFilters() below works from
 * both app/page.tsx and app/api/feed/route.ts.
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
