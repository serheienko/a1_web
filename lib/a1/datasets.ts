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

/**
 * Aleksandr, 2026-08-27: his mobile-app walkthrough video showed a
 * company card with "IT" as a labeled category, distinct from the post
 * category id we already resolve above. UserCompanySchema.category
 * (lib/a1/schemas.ts) only ever carried a raw number — this is its label
 * lookup, same no-auth dataset.* shape/pattern as postCategories, per the
 * endpoint PLAN.md §0.1 already documents as existing
 * (dataset.companyCategories) but that nothing in the repo had called
 * yet. Returns [] on any parse failure so a company card degrades to
 * "no category shown" rather than breaking the whole profile page.
 */
export const fetchCompanyCategories = cache(async function fetchCompanyCategories(): Promise<Category[]> {
  const raw = await call<unknown>("dataset.companyCategories", {});
  const parsed = CategoriesOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[lib/a1/datasets] companyCategories failed to parse", parsed.error);
    return [];
  }
  return parsed.data.items.map((c) => ({ ...c, text: decodeHtmlEntities(c.text) }));
});

/**
 * Aleksandr, 2026-08-27: three more no-auth dataset.* lookups, all for
 * the profile-page fields his mobile-app video showed were missing on
 * the web (hobbies, work interests, work style preferences) — confirmed
 * field-for-field against the openapi.json he sent (see lib/a1/
 * schemas.ts's WorkStylePreferencesSchema comment for how; this
 * sandbox's own network can't reach api.a1appp.com directly).
 *
 * dataset.hobbies is shaped differently from every other dataset.* here
 * — an ARRAY of `{ group, items: [{value,text,lottie}] }` (e.g. a
 * "Sports" group containing "Football"), not a flat `{items:[...]}`.
 * fetchHobbies() keeps that group structure (useful if a future design
 * wants to show hobbies grouped); fetchHobbyLabels() flattens it to a
 * plain id -> text Map for the simple "just show the tag pills" case
 * app/u/[username]/page.tsx actually needs today.
 */
const HobbyItemSchema = z.object({
  value: z.number(),
  text: z.string().catch(""),
});
const HobbiesOutputSchema = z
  .array(z.object({ group: z.string().catch(""), items: z.array(HobbyItemSchema).catch([]) }))
  .catch([]);

export const fetchHobbies = cache(async function fetchHobbies() {
  const raw = await call<unknown>("dataset.hobbies", {});
  const parsed = HobbiesOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[lib/a1/datasets] hobbies failed to parse", parsed.error);
    return [];
  }
  return parsed.data.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, text: decodeHtmlEntities(i.text) })) }));
});

export const fetchHobbyLabels = cache(async function fetchHobbyLabels(): Promise<Map<number, string>> {
  const groups = await fetchHobbies();
  const map = new Map<number, string>();
  for (const g of groups) for (const i of g.items) map.set(i.value, i.text);
  return map;
});

const WorkInterestsOutputSchema = z.object({ items: z.array(CategorySchema).catch([]) });

export const fetchWorkInterests = cache(async function fetchWorkInterests(): Promise<Category[]> {
  const raw = await call<unknown>("dataset.workInterests", {});
  const parsed = WorkInterestsOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[lib/a1/datasets] workInterests failed to parse", parsed.error);
    return [];
  }
  return parsed.data.items.map((c) => ({ ...c, text: decodeHtmlEntities(c.text) }));
});

/**
 * The 14 work-style categories on Resource.User.WorkStylePreferences,
 * label-resolved. One deliberate rename: the *user's own* field is
 * `workloadAndTaskDelegation` (see lib/a1/schemas.ts) but this dataset's
 * matching key is `workloadTaskDelegation` (no "And") — confirmed in the
 * openapi.json, not a typo. WORK_STYLE_DATASET_KEYS is the single place
 * that mapping lives; nowhere else needs to know about it.
 */
const WorkStyleItemSchema = z.object({ value: z.number(), text: z.string().catch("") });
const WorkStylePreferencesOutputSchema = z
  .object({
    workEnvironment: z.array(WorkStyleItemSchema).catch([]),
    personalityType: z.array(WorkStyleItemSchema).catch([]),
    workLifeBalance: z.array(WorkStyleItemSchema).catch([]),
    workStyle: z.array(WorkStyleItemSchema).catch([]),
    workAvailability: z.array(WorkStyleItemSchema).catch([]),
    projectType: z.array(WorkStyleItemSchema).catch([]),
    leadershipStyle: z.array(WorkStyleItemSchema).catch([]),
    riskTolerance: z.array(WorkStyleItemSchema).catch([]),
    workloadTaskDelegation: z.array(WorkStyleItemSchema).catch([]),
    decisionMakingStyle: z.array(WorkStyleItemSchema).catch([]),
    preferredCollaborationStyle: z.array(WorkStyleItemSchema).catch([]),
    partnershipPreference: z.array(WorkStyleItemSchema).catch([]),
    preferredWorkingEnvironment: z.array(WorkStyleItemSchema).catch([]),
    learningStyle: z.array(WorkStyleItemSchema).catch([]),
  })
  .catch({
    workEnvironment: [],
    personalityType: [],
    workLifeBalance: [],
    workStyle: [],
    workAvailability: [],
    projectType: [],
    leadershipStyle: [],
    riskTolerance: [],
    workloadTaskDelegation: [],
    decisionMakingStyle: [],
    preferredCollaborationStyle: [],
    partnershipPreference: [],
    preferredWorkingEnvironment: [],
    learningStyle: [],
  });
export type WorkStylePreferencesDataset = z.infer<typeof WorkStylePreferencesOutputSchema>;

// User-field key -> dataset key. Every key maps to itself except the one
// confirmed rename above.
export const WORK_STYLE_DATASET_KEYS = {
  workEnvironment: "workEnvironment",
  personalityType: "personalityType",
  workLifeBalance: "workLifeBalance",
  workStyle: "workStyle",
  workAvailability: "workAvailability",
  projectType: "projectType",
  leadershipStyle: "leadershipStyle",
  riskTolerance: "riskTolerance",
  workloadAndTaskDelegation: "workloadTaskDelegation",
  decisionMakingStyle: "decisionMakingStyle",
  preferredCollaborationStyle: "preferredCollaborationStyle",
  partnershipPreference: "partnershipPreference",
  preferredWorkingEnvironment: "preferredWorkingEnvironment",
  learningStyle: "learningStyle",
} as const satisfies Record<string, keyof WorkStylePreferencesDataset>;

export const fetchWorkStylePreferences = cache(async function fetchWorkStylePreferences(): Promise<WorkStylePreferencesDataset> {
  const raw = await call<unknown>("dataset.workStylePreferences", {});
  return WorkStylePreferencesOutputSchema.parse(raw);
});
