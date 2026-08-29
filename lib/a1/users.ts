// lib/a1/users.ts
//
// Single-profile fetch for the author-profile page (/u/[username]),
// mirrors lib/a1/posts.ts's fetchPostById: wrapped in React's cache() so
// generateMetadata() and the page component share one network round trip
// instead of two (Next's automatic fetch memoization only covers GET;
// every A1 call is a POST).

import { cache } from "react";
import { call, A1ApiError } from "./client";
import { parseUserProfile, type UserProfileResult } from "./schemas";
import { mapUserProfile } from "./user-mappers";
import type { WebProfile } from "@/types/web-profile";

/**
 * Fetch one user by username and map it. Returns null for: not found,
 * the UserHidden variant (a private/deactivated account), a deleted
 * account, or a profile with no username to key a page on — see
 * mapUserProfile() for the exact rules. The caller renders null as
 * "not found" (PLAN.md's usual "gone" handling, same as fetchPostById).
 *
 * Unlike posts.get (which is documented to return a PostEmpty placeholder
 * for a missing id, never an error), users.getByUsername's own spec lists
 * 400 as a real response — an unrecognized username plausibly throws
 * rather than returning a graceful "not found" body. Treating any
 * A1ApiError here as "not found" rather than letting it bubble into an
 * unhandled 500 — a wrong or stale /u/<username> URL should 404, not
 * crash the page.
 */
// 2026-08-30: split out of fetchUserByUsername below so app/u/[username]/
// page.tsx can also get at the raw `_id` (UserProfileSchema only, not the
// UserHiddenProfile variant, which carries no id) for its own new "posts
// by this author" section -- posts.search's `author` filter (lib/a1/
// feed.ts's fetchPostsByAuthor) takes a real user id, not a username, and
// WebProfile deliberately never exposes raw ids to begin with (PLAN.md
// §2.4's anti-corruption layer) so this stays server-side only, never
// reaching a client component.
export const fetchUserRawByUsername = cache(async function fetchUserRawByUsername(
  username: string,
): Promise<UserProfileResult | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>("users.getByUsername", { username });
  } catch (err) {
    if (err instanceof A1ApiError) return null;
    throw err;
  }
  return parseUserProfile(raw);
});

export const fetchUserByUsername = cache(async function fetchUserByUsername(
  username: string,
): Promise<WebProfile | null> {
  const profile = await fetchUserRawByUsername(username);
  if (!profile) return null;
  return mapUserProfile(profile);
});
