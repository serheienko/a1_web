// lib/a1/sitemap-posts.ts
//
// Walks every live Jobs post for the Phase 4 sitemap (PLAN.md §4 Phase 4,
// §3.4 "expired/deleted posts are excluded from the sitemap"). Talents
// posts are deliberately never included here — the whole /talents tree is
// noindex (PLAN.md OPEN QUESTIONS, still-open privacy question), and a
// noindex URL has no business in a sitemap.
//
// PLAN.md §1 rule 2: no own database in v1.0, so this re-walks
// posts.search from scratch on every call. Bounded by the page-level
// revalidate = 3600 on the sitemap routes that call it — acceptable at
// today's post volume; PLAN.md itself flags revisiting this "only if §5
// sitemap generation becomes too slow at >20k posts."

import { call } from "./client";
import { mapPosts } from "./mappers";
import { PostsSearchOutputSchema } from "./schemas";
import { isJobPostingExpired } from "../seo/jsonld";
import type { WebPost } from "@/types/web-post";

const PAGE_SIZE = 100; // posts.search's documented max (PLAN.md §0.2)

// PLAN.md §3.1: each chunked sitemap file caps at 45,000 URLs. Exported so
// app/sitemap.ts and app/robots.ts derive the same chunk count from the
// same number — robots.txt has to list every /sitemap/<id>.xml URL by hand
// (see app/robots.ts for why: generateSitemaps() does not serve an index
// at /sitemap.xml, confirmed live).
export const SITEMAP_CHUNK_SIZE = 45_000;

// A hard safety stop across ALL chunks combined, well above any volume
// this site will plausibly reach for a long while — it exists so a
// backend bug (e.g. a cursor that never terminates) can't spin this into
// an infinite loop, not because we expect to hit it.
const MAX_TOTAL_POSTS = SITEMAP_CHUNK_SIZE * 5;

/** Every live (non-expired, non-legacy-type, schema-valid), published Jobs
 *  post — walked to exhaustion via posts.search's cursor. */
export async function fetchAllSitemapJobPosts(): Promise<WebPost[]> {
  const posts: WebPost[] = [];
  let cursor: string | undefined;

  for (;;) {
    const raw = await call<unknown>("posts.search", {
      limit: PAGE_SIZE,
      object: "post-job-employing",
      ...(cursor ? { next: cursor } : {}),
    });
    const parsed = PostsSearchOutputSchema.parse(raw);

    for (const mapped of mapPosts(parsed.items)) {
      if (!isJobPostingExpired(mapped)) posts.push(mapped);
    }

    if (!parsed.pagination.hasMore || !parsed.pagination.next) break;
    cursor = parsed.pagination.next;

    if (posts.length >= MAX_TOTAL_POSTS) {
      console.warn(
        `[lib/a1/sitemap-posts] hit the ${MAX_TOTAL_POSTS}-post safety cap — sitemap is truncated, not exhaustive`,
      );
      break;
    }
  }

  return posts;
}
