// lib/a1/schemas.ts
//
// Zod schemas mirroring the backend shapes in PLAN.md §0.2-§0.3. Every API
// response passes through these before anything else touches it (PLAN.md
// §5 rule 2). Sub-fields whose exact shape is inferred rather than
// confirmed (money variants, the anonymous-author shape) use `.catch()` so
// a mismatch degrades that one field instead of dropping the whole post —
// see PLAN.md §5 rule 6 ("a single bad post never breaks a page"), extended
// here to "a single bad field never breaks a post."

import { z } from "zod";

export const WorldLocationSchema = z.object({
  _id: z.number(),
  displayName: z.string().catch(""),
  country: z.string(),
  city: z.string().catch(""),
  adm_level_1: z.string().catch(""),
  coordinates: z.array(z.number()).catch([]),
  object: z.literal("world-location"),
});
export type WorldLocation = z.infer<typeof WorldLocationSchema>;

// The real API returns short field names here (`w` / `h`), not
// `width` / `height` — confirmed against a live posts.search response on
// 2026-08-26. Not documented in PLAN.md §0.3; fixing it here for Phase 3
// (media rendering) since layout-shift-free <Image> needs real dimensions.
const MediaSizeSchema = z
  .object({
    w: z.number().optional(),
    h: z.number().optional(),
  })
  .catchall(z.unknown());

export const MediaDocumentSchema = z.object({
  _id: z.string(),
  mimetype: z.string().catch("application/octet-stream"),
  fileReference: z.string(),
  date: z.number().optional(),
  sizes: z.array(MediaSizeSchema).catch([]),
  ttl: z.number().nullable().optional(),
  flags: z.number().optional(),
  attributes: z.array(z.unknown()).catch([]),
  object: z.literal("media-document"),
});
export type MediaDocument = z.infer<typeof MediaDocumentSchema>;

export const UserPreviewSchema = z.object({
  _id: z.string(),
  fullName: z.string().catch(""),
  photo: z.string().nullable().optional(),
  photos: z.array(MediaDocumentSchema).catch([]),
  username: z.string().nullable().optional(),
  emojiStatus: z.string().nullable().optional(),
  object: z.literal("user-preview"),
});
export type UserPreview = z.infer<typeof UserPreviewSchema>;

export const UserHiddenSchema = z
  .object({
    object: z.literal("user-hidden"),
  })
  .catchall(z.unknown());
export type UserHidden = z.infer<typeof UserHiddenSchema>;

/**
 * The exact anonymous-author shape isn't fully specified in PLAN.md §0.3.
 * `.catch()` means ANY shape that isn't a valid UserPreview — including one
 * we haven't seen yet — resolves to the UserHidden fallback instead of
 * failing the post. mappers.ts renders anything non-"user-preview" as
 * "Anonymous".
 */
export const AuthorSchema = z
  .union([UserPreviewSchema, UserHiddenSchema])
  .catch({ object: "user-hidden" as const });
export type Author = z.infer<typeof AuthorSchema>;

const MoneySingleSchema = z.object({
  unitAmount: z.number(),
  currency: z.string(),
  object: z.literal("post-money-single"),
});
const MoneySingleAnnualSchema = z.object({
  unitAmount: z.number(),
  currency: z.string(),
  object: z.literal("post-money-single-annual"),
});
const MoneyRangeSchema = z.object({
  unitAmount: z.array(z.number()),
  currency: z.string(),
  object: z.literal("post-money-range"),
});
const MoneyRangeAnnualSchema = z.object({
  unitAmount: z.array(z.number()),
  currency: z.string(),
  object: z.literal("post-money-range-annual"),
});

/**
 * PLAN.md §0.3 names the four variants (Single / SingleAnnual / Range /
 * RangeAnnual) but only gives the literal `object` string for Range
 * ("post-money-range"). The other three literal strings are inferred by
 * naming convention, not confirmed — capture a real fixture in Phase 0's
 * smoke test and fix these if they're wrong. Wrapped in `.catch(null)`
 * wherever it's used, so a wrong guess loses one post's salary display,
 * never the post itself.
 */
export const MoneySchema = z.union([
  MoneySingleSchema,
  MoneySingleAnnualSchema,
  MoneyRangeSchema,
  MoneyRangeAnnualSchema,
]);
export type Money = z.infer<typeof MoneySchema>;

const LinkSchema = z.object({
  title: z.string().catch(""),
  url: z.string(),
});

const BasePostFields = {
  _id: z.string(),
  title: z.string(),
  content: z.string().catch(""),
  links: z.array(LinkSchema).catch([]),
  location: WorldLocationSchema.nullable().catch(null),
  created: z.number(),
  updated: z.number().nullable().catch(null),
  published: z.number().nullable().catch(null),
  scheduled: z.number().nullable().catch(null),
  author: AuthorSchema,
  categories: z.array(z.number()).catch([]),
  tags: z.array(z.string()).catch([]),
  viewCount: z.number().catch(0),
  // Parsed so the shape stays honest, never read — meaning unknown
  // (PLAN.md §0.5 / OPEN QUESTIONS #2). Do not add logic keyed on this.
  flags: z.number().catch(0),
  media: z.array(MediaDocumentSchema).catch([]),
  pinExpiresAt: z.number().nullable().catch(null),
  highlightExpiresAt: z.number().nullable().catch(null),
  apply: z
    .object({ questions: z.array(z.unknown()) })
    .nullable()
    .catch(null),
  money: MoneySchema.nullable().catch(null),
};

export const JobEmployingPostSchema = z.object({
  ...BasePostFields,
  object: z.literal("post-job-employing"),
});

export const JobSeekingPostSchema = z.object({
  ...BasePostFields,
  object: z.literal("post-job-seeking"),
});

/**
 * Only the two live post types (PLAN.md §0.3, founder correction
 * 2026-08-26). The four legacy `object` values that still exist in the
 * OpenAPI schema (post-collaborator, post-supplier-b2b, post-brainstorm,
 * post-meetup) are deliberately absent from this union — an item with one
 * of those fails validation and parsePost() below drops it. Never add them
 * back without a product decision.
 */
export const PostSchema = z.discriminatedUnion("object", [
  JobEmployingPostSchema,
  JobSeekingPostSchema,
]);
export type Post = z.infer<typeof PostSchema>;

export const PostsSearchInputSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  next: z.string().optional(),
  previous: z.string().optional(),
  q: z.string().optional(),
  author: z.union([z.literal("me"), z.string()]).optional(),
  location: z.number().optional(),
  object: z.string().optional(),
  expand: z.union([z.string(), z.array(z.string())]).optional(),
  favorited: z.boolean().optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  scheduled: z.boolean().optional(),
  drafts: z.boolean().optional(),
  eventFromStart: z.number().optional(),
  eventToStart: z.number().optional(),
});
export type PostsSearchInput = z.infer<typeof PostsSearchInputSchema>;

/**
 * `items` is `unknown[]`, not `Post[]`: the backend can return the four
 * legacy types too, and one malformed item must never fail the whole page
 * (PLAN.md §5 rule 6). Callers run each item through parsePost() below.
 */
export const PostsSearchOutputSchema = z.object({
  items: z.array(z.unknown()),
  pagination: z.object({
    next: z.string().nullable(),
    previous: z.string().nullable(),
    hasMore: z.boolean(),
  }),
  promoted: z.array(z.unknown()).catch([]),
  count: z
    .object({
      total: z.number(),
      object: z.record(z.string(), z.number()),
    })
    .optional(),
});
export type PostsSearchOutput = z.infer<typeof PostsSearchOutputSchema>;

/**
 * Parse one raw search-result item into a live Post, or null if it's a
 * legacy type or otherwise malformed. Logs the id/object for triage but
 * never throws — the caller keeps going (PLAN.md §5 rule 6).
 */
export function parsePost(raw: unknown): Post | null {
  const result = PostSchema.safeParse(raw);
  if (result.success) return result.data;

  const id = (raw as { _id?: unknown } | null)?._id;
  const kind = (raw as { object?: unknown } | null)?.object;
  console.warn(`[lib/a1/schemas] dropped unparseable post (id=${String(id)}, object=${String(kind)})`);
  return null;
}
