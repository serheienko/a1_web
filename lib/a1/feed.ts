// lib/a1/feed.ts
//
// Shared "fetch one page of a feed" logic used by both the RSC pages
// (app/jobs/page.tsx, app/talents/page.tsx) and the "Load more" API route
// (app/api/feed/route.ts), so cursor handling and object-type mapping only
// live in one place.

import { call } from "./client";
import { mapPosts } from "./mappers";
import { PostsSearchOutputSchema } from "./schemas";
import type { WebPost, WebPostKind } from "@/types/web-post";

export const FEED_PAGE_SIZE = 20;

const KIND_TO_OBJECT: Record<WebPostKind, string> = {
  hiring: "post-job-employing",
  seeking: "post-job-seeking",
};

export type FeedPage = {
  posts: WebPost[];
  next: string | null;
  hasMore: boolean;
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
// close to a full word — "frontend" finds the post, "fr" finds nothing —
// and the openapi spec (Method.v1_posts_search_input) has no alternate
// matchType/fuzzy/prefix param to ask it to do this differently, and we
// don't know where exactly its cutoff is between "fr" and "frontend"
// either. So rather than guess a length threshold, ANY non-empty `q`
// bypasses the backend's own matching entirely and substring-matches
// client-side instead, against a bounded scan of this feed's own posts
// (ignoring `q` in that scan, keeping categories/tags).
const CLIENT_SEARCH_SCAN_PAGES = 5; // 5 * 100 = 500 posts scanned, max
const CLIENT_SEARCH_SCAN_PAGE_SIZE = 100; // posts.search's documented max
const CLIENT_SEARCH_CURSOR_PREFIX = "local-q-offset:";

async function scanFeedForQuery(
  kind: WebPostKind,
  filters: FeedFilters,
): Promise<WebPost[]> {
  const needle = (filters.q ?? "").trim().toLowerCase();
  const matches: WebPost[] = [];
  let cursor: string | null | undefined;

  for (let page = 0; page < CLIENT_SEARCH_SCAN_PAGES; page++) {
    const raw = await call<unknown>("posts.search", {
      limit: CLIENT_SEARCH_SCAN_PAGE_SIZE,
      object: KIND_TO_OBJECT[kind],
      ...(cursor ? { next: cursor } : {}),
      ...(filters.categories && filters.categories.length > 0 ? { categories: filters.categories } : {}),
      ...(filters.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
      ...(filters.location != null ? { location: filters.location } : {}),
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

  // Not logged/surfaced anywhere further than this comment: past
  // CLIENT_SEARCH_SCAN_PAGES * CLIENT_SEARCH_SCAN_PAGE_SIZE posts, a
  // short-query match can silently go unseen. Fine at today's post
  // volume; revisit (real backend prefix search, or a raised cap) if a
  // feed ever gets close to 500 live posts.
  return matches;
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

export async function fetchFeedPage(
  kind: WebPostKind,
  cursor?: string | null,
  filters: FeedFilters = {},
): Promise<FeedPage> {
  const q = filters.q?.trim() ?? "";

  if (q.length > 0) {
    const offset = cursor?.startsWith(CLIENT_SEARCH_CURSOR_PREFIX)
      ? Number(cursor.slice(CLIENT_SEARCH_CURSOR_PREFIX.length)) || 0
      : 0;
    const allMatches = await scanFeedForQuery(kind, filters);
    const nextOffset = offset + FEED_PAGE_SIZE;
    const hasMore = nextOffset < allMatches.length;
    return {
      posts: allMatches.slice(offset, nextOffset),
      next: hasMore ? `${CLIENT_SEARCH_CURSOR_PREFIX}${nextOffset}` : null,
      hasMore,
    };
  }

  // q is always "" here — any non-empty q already returned above.
  const raw = await call<unknown>("posts.search", {
    limit: FEED_PAGE_SIZE,
    object: KIND_TO_OBJECT[kind],
    ...(cursor ? { next: cursor } : {}),
    ...(filters.categories && filters.categories.length > 0 ? { categories: filters.categories } : {}),
    ...(filters.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
    ...(filters.location != null ? { location: filters.location } : {}),
  });

  // The envelope itself must be well-formed, or something is badly wrong
  // upstream — let this throw and surface via the route's/page's error
  // handling. Individual malformed *items* inside it are handled by
  // mapPosts(), which never throws (PLAN.md §5 rule 6).
  const parsed = PostsSearchOutputSchema.parse(raw);

  return {
    posts: mapPosts(parsed.items),
    next: parsed.pagination.next,
    hasMore: parsed.pagination.hasMore,
  };
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
