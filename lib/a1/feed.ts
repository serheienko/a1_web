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
};

export async function fetchFeedPage(
  kind: WebPostKind,
  cursor?: string | null,
  filters: FeedFilters = {},
): Promise<FeedPage> {
  const raw = await call<unknown>("posts.search", {
    limit: FEED_PAGE_SIZE,
    object: KIND_TO_OBJECT[kind],
    ...(cursor ? { next: cursor } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.categories && filters.categories.length > 0 ? { categories: filters.categories } : {}),
    ...(filters.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
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
 * number of repeated `tag` params (checkboxes).
 */
export function parseFeedFilters(params: URLSearchParams): FeedFilters {
  const q = params.get("q")?.trim();
  const categoryParam = params.get("category");
  const categoryId = categoryParam ? Number(categoryParam) : NaN;
  const tags = params.getAll("tag").filter(Boolean);

  return {
    q: q || undefined,
    categories: Number.isFinite(categoryId) && categoryParam ? [categoryId] : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
}

export function hasActiveFilters(filters: FeedFilters): boolean {
  return Boolean(filters.q || (filters.categories && filters.categories.length > 0) || (filters.tags && filters.tags.length > 0));
}
