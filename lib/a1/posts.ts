// lib/a1/posts.ts
//
// Single-post fetch for detail pages (PLAN.md Phase 2). Uses posts.get,
// the other posts.* endpoint this project touches besides posts.search
// (§0.1). Wrapped in React's cache() so that generateMetadata() and the
// page component — which both need the same post during one request —
// share a single network round trip instead of logging in and fetching
// twice. (Next's automatic fetch memoization only covers GET; every A1
// call is a POST, so this is done by hand.)

import { cache } from "react";
import { call } from "./client";
import { parsePost } from "./schemas";
import { mapPost } from "./mappers";
import type { WebPost } from "@/types/web-post";

/**
 * Fetch one post by id and map it. Returns null if the post is deleted
 * (posts.get's PostEmpty variant — exact shape undocumented, so anything
 * that fails parsePost() is treated the same way), a legacy type, or the
 * publish gate drops it. The caller renders this as "not found" (PLAN.md
 * §3.4: a deleted post should read as gone, never a soft 200).
 */
export const fetchPostById = cache(async function fetchPostById(id: string): Promise<WebPost | null> {
  const raw = await call<unknown>("posts.get", { ids: [id] });
  const first = Array.isArray(raw) ? raw[0] : undefined;
  if (first === undefined) return null;
  const post = parsePost(first);
  if (!post) return null;
  return mapPost(post);
});
