// lib/a1/datasets.ts
//
// Cached lookup tables for the two no-auth dataset.* endpoints backing the
// Phase 3 filter UI (PLAN.md §0.1, repo layout §2.3). Wrapped in React's
// cache() for per-request dedup — same reasoning as lib/a1/posts.ts.

import { cache } from "react";
import { z } from "zod";
import { call } from "./client";
import { decodeHtmlEntities } from "../format";

const CategorySchema = z.object({
  value: z.number(),
  text: z.string().catch(""),
  lottie: z.unknown().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

const CategoriesOutputSchema = z.object({ items: z.array(CategorySchema).catch([]) });

/**
 * `text` arrives HTML-entity-encoded (e.g. "&#x1F33E; Agriculture") —
 * confirmed against the live endpoint 2026-08-26, decoded here so nothing
 * downstream has to know that.
 */
export const fetchCategories = cache(async function fetchCategories(): Promise<Category[]> {
  const raw = await call<unknown>("dataset.postCategories", {});
  const parsed = CategoriesOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[lib/a1/datasets] postCategories failed to parse", parsed.error);
    return [];
  }
  return parsed.data.items.map((c) => ({ ...c, text: decodeHtmlEntities(c.text) }));
});

const TagSchema = z.object({
  value: z.string(),
  text: z.string().catch(""),
});
export type Tag = z.infer<typeof TagSchema>;

/**
 * Keyed by post `object` type. Confirmed live on 2026-08-26: the response
 * has NO "post-job-employing" key at all — only post-job-seeking and the
 * legacy types (post-brainstorm, post-collaborator, post-meetup,
 * post-supplier-b2b), matching PLAN.md OPEN QUESTIONS #5 exactly. Also:
 * each tag is `{ value, text }`, not a bare string as PLAN.md §0.1's
 * sketch implied.
 */
const TagsByObjectSchema = z.record(z.string(), z.array(TagSchema)).catch({});

const fetchTagsByObject = cache(async function fetchTagsByObject(): Promise<Record<string, Tag[]>> {
  const raw = await call<unknown>("dataset.postTags", {});
  return TagsByObjectSchema.parse(raw);
});

/**
 * Jobs (post-job-employing) has no tag list of its own in the API
 * response — see the comment above. Until the backend confirms whether
 * hiring posts share the job-seeking tag set (OPEN QUESTIONS #5), this
 * borrows it as the closest available list rather than showing no tag
 * filter at all on the Jobs page. It's a labeled guess, not a confirmed
 * mapping — revisit once answered.
 */
const OBJECT_BY_KIND: Record<"hiring" | "seeking", string> = {
  hiring: "post-job-employing",
  seeking: "post-job-seeking",
};

export async function fetchTagsForKind(kind: "hiring" | "seeking"): Promise<Tag[]> {
  const byObject = await fetchTagsByObject();
  // Falls back to post-job-seeking's list for "hiring" today (its own key
  // doesn't exist yet — see the comment above); self-heals to the real
  // per-kind list the moment the backend adds it, no code change needed.
  return byObject[OBJECT_BY_KIND[kind]] ?? byObject["post-job-seeking"] ?? [];
}
