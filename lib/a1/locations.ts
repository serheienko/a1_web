// lib/a1/locations.ts
//
// Aleksandr, 2026-08-28: "В Фильтрах надо добавить фильтрацию через
// локацию" — location-based filtering for the job/talent feed, using the
// backend's `locations.search` endpoint (PLAN.md §... lists it as
// "POST /v1/locations.search (auth) -> location lookup, only if location
// filter UI is built" — exactly this feature). posts.search's own
// `location` field (WorldLocation._id) already existed in
// PostsSearchInputSchema before this — see lib/a1/feed.ts's FeedFilters.
//
// locations.search's exact request/response shape could NOT be verified
// live while building this (the backend's openapi.json is too large for
// the tools available and its `paths` section — where this endpoint's
// schema actually lives — never got reached). This guesses the most
// plausible shape by analogy with posts.search's own `q`/`limit` params,
// and parses the response permissively: any envelope shape mismatch, or
// a per-item shape that doesn't match WorldLocationSchema, is dropped
// rather than thrown, with a `console.warn` naming just the response's
// top-level keys (never full bodies, never the query text someone
// typed) so a wrong guess can be diagnosed and fixed from Vercel's logs
// without waiting on another live debugging round-trip. Same contract as
// lib/covers.ts and lib/avatar-blur.ts: a broken location search must
// never break the filters UI, it just yields no suggestions.
//
// Wrapped in React's cache() for per-request dedup, same pattern as
// lib/covers.ts / lib/avatar-blur.ts / lib/a1/datasets.ts.

import { cache } from "react";
import { call } from "./client";
import { WorldLocationSchema, type WorldLocation } from "./schemas";

const MAX_RESULTS = 10;

export const searchLocations = cache(async function searchLocations(
  query: string,
): Promise<WorldLocation[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    // locations.search requires auth per PLAN.md — same as posts.search,
    // called without skipAuth so it carries the service-account bearer
    // token like every other non-public endpoint in this file's siblings.
    const raw = await call<unknown>("locations.search", { q, limit: MAX_RESULTS });

    // Guessed envelope: an array directly, or an { items: [...] } wrapper
    // (posts.search's own shape) — accept either without committing to
    // one until a live response confirms it.
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { items?: unknown } | null)?.items)
        ? (raw as { items: unknown[] }).items
        : null;

    if (items === null) {
      console.warn(
        "[locations] unexpected locations.search response shape, top-level keys:",
        raw && typeof raw === "object" ? Object.keys(raw) : typeof raw,
      );
      return [];
    }

    const results: WorldLocation[] = [];
    for (const item of items) {
      const parsed = WorldLocationSchema.safeParse(item);
      if (parsed.success) {
        results.push(parsed.data);
      } else {
        console.warn(
          "[locations] locations.search item didn't match WorldLocationSchema, keys:",
          item && typeof item === "object" ? Object.keys(item) : typeof item,
        );
      }
    }
    return results.slice(0, MAX_RESULTS);
  } catch (err) {
    console.warn("[locations] locations.search failed:", err instanceof Error ? err.message : err);
    return [];
  }
});
