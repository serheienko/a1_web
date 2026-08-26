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

export async function fetchFeedPage(kind: WebPostKind, cursor?: string | null): Promise<FeedPage> {
  const raw = await call<unknown>("posts.search", {
    limit: FEED_PAGE_SIZE,
    object: KIND_TO_OBJECT[kind],
    ...(cursor ? { next: cursor } : {}),
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
