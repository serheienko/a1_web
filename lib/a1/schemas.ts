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
// `object` is the size variant discriminator (e.g. "size-photo",
// "size-original", "size-stripped" — the last is an inline base64 preview
// blob, not a real fetchable size). Exported so mappers.ts can pick the
// display-worthy variant instead of just taking whichever sorts last.
export const MediaSizeSchema = z
  .object({
    w: z.number().optional(),
    h: z.number().optional(),
    object: z.string().optional(),
  })
  .catchall(z.unknown());
export type MediaSize = z.infer<typeof MediaSizeSchema>;

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
  // Real API shape is `{ object: "empty" }` (or presumably other emoji
  // shapes), not a string — confirmed against a live posts.search response
  // on 2026-08-26, not documented in PLAN.md §0.3. It was typed as
  // `z.string()` and silently failed every real author, which fell through
  // to UserHiddenSchema and rendered every post as "Anonymous". Nothing in
  // WebPostAuthor reads this field, so accept anything.
  emojiStatus: z.unknown().optional(),
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
  // Real bitmask, documented in the backend's OpenAPI spec (see
  // lib/a1/post-flags.ts for the full enum and which bits are actually
  // used, and why). No longer "meaning unknown" as PLAN.md §0.5 assumed.
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
// ---------------------------------------------------------------------------
// posts.createPost / posts.updatePost — write-side input (PLAN.md §6.1,
// verified against the live OpenAPI spec 2026-08-28). For the two live
// post types: required `title, content, links, location, media, money,
// object, tags, categories`; optional `scheduled, draft, apply`.
// Deliberately excludes `hideAuthor`/`premiumPinDays`/`premiumHighlight`
// — no reference screenshot or product ask covers them yet, and PLAN.md
// itself only inferred the last two names by convention, never confirmed
// them; add them later with their own verification pass, not guessed in
// now.
//
// `location`/`money` are typed nullable (a post can have neither a
// resolved location nor a salary) even though PLAN.md lists both as
// "required" — read as "the key must be present", not "must be
// non-null", same interpretation account.updateProfile's own history
// already established for optional-shaped required fields. If the
// backend actually rejects a null value here, that will surface as a
// live 400 on first use (same detection path as every other
// PostInput/Company field this project has gotten wrong before) — fix
// it then, don't pre-guess a fallback value.
//
// `media` reuses MediaDocumentSchema itself: upload.confirm (§6.1)
// returns a real MediaDocument, and the read side already renders
// `media: MediaDocument[]` on a fetched Post — sending exactly what
// upload.confirm handed back keeps the write side symmetrical with the
// read side instead of inventing a slimmer id-only shape.
//
// `PostInputMoneySchema` mirrors MoneySchema above field-for-field. Same
// caveat as MoneySchema's own comment: only the Range variant's literal
// `object` string is confirmed by name in PLAN.md §0.3; the other three
// are inferred by naming convention.
// ---------------------------------------------------------------------------

export const PostInputMoneySchema = z.union([
  z.object({ unitAmount: z.number(), currency: z.string(), object: z.literal("post-money-single") }),
  z.object({ unitAmount: z.number(), currency: z.string(), object: z.literal("post-money-single-annual") }),
  z.object({ unitAmount: z.array(z.number()).length(2), currency: z.string(), object: z.literal("post-money-range") }),
  z.object({ unitAmount: z.array(z.number()).length(2), currency: z.string(), object: z.literal("post-money-range-annual") }),
]);
export type PostInputMoney = z.infer<typeof PostInputMoneySchema>;

export const PostInputLinkSchema = z.object({
  title: z.string().catch(""),
  url: z.string().trim().min(1),
});

/**
 * `apply.questions`' exact item shape is NOT confirmed — PLAN.md §0.3
 * only ever saw it on the read side as `z.array(z.unknown())`, and §6.1
 * doesn't specify the write-side item shape either. `{ question: string
 * }` is a best-effort guess, not a verified fact — deliberately kept
 * optional end-to-end (the form only sends this key at all once the
 * founder actually adds a custom question) so an empty post-creation
 * flow is never blocked on this guess. Verify against the first live
 * 400/200 the moment this is actually exercised, same discipline as
 * Resource.User.Company (this file's own history) — fix the key name
 * here and nowhere else if it's wrong.
 */
export const PostInputQuestionSchema = z.object({
  question: z.string().trim().min(1),
});

// 2026-08-29 round 5 (PLAN.md §6.26): CONFIRMED live — posts.createPost
// rejected `object: "post-job-employing"` (the same literal the READ side
// uses, PostSchema below) with "'object' must be one of:
// post-collaborator-input, post-supplier-b2b-input,
// post-job-employing-input, post-job-seeking-input, post-brainstorm-input,
// post-meetup-input" — the WRITE side's discriminator has its own
// "-input"-suffixed literals, distinct from the read side's. Only this
// schema changes; every other `"post-job-employing"`/`"post-job-seeking"`
// literal in the codebase (Post/mappers/feed/datasets/sitemap, and
// components/post-editor.tsx's own `PostObject` UI type) is unaffected —
// those are all read-side or UI-internal and already verified live.
export const PostInputObjectSchema = z.enum([
  "post-job-employing-input",
  "post-job-seeking-input",
]);
export type PostInputObject = z.infer<typeof PostInputObjectSchema>;

// 2026-08-29 round 5 (PLAN.md §6.28): CONFIRMED live — with the object/
// wrapper issues fixed, the next 400 was "'media.0' has unknown property
// '_id'". The write side rejects the server-assigned `_id` that
// MediaDocumentSchema carries on the READ side (and that upload.confirm
// hands back) — `.omit` strips it before the request ever reaches the
// backend (zod drops unrecognized/omitted keys by default, no change
// needed where post-editor.tsx builds `media: media.map((m) => m.doc)`).
// Every other MediaDocument field is kept as-is since only `_id` was
// flagged; if the backend later rejects another one of them too, that's
// the next live 400 to fix the same way, not a reason to strip more now.
export const PostInputMediaSchema = MediaDocumentSchema.pick({ fileReference: true });

export const PostInputSchema = z.object({
  object: PostInputObjectSchema,
  title: z.string().trim().min(1),
  content: z.string(),
  links: z.array(PostInputLinkSchema),
  location: z.number().nullable(),
  media: z.array(PostInputMediaSchema),
  money: PostInputMoneySchema.nullable(),
  tags: z.array(z.string()),
  categories: z.array(z.number()),
  scheduled: z.number().nullable().optional(),
  draft: z.boolean().optional(),
  apply: z.object({ questions: z.array(PostInputQuestionSchema) }).optional(),
});
export type PostInput = z.infer<typeof PostInputSchema>;

export function parsePost(raw: unknown): Post | null {
  const result = PostSchema.safeParse(raw);
  if (result.success) return result.data;

  const id = (raw as { _id?: unknown } | null)?._id;
  const kind = (raw as { object?: unknown } | null)?.object;
  console.warn(`[lib/a1/schemas] dropped unparseable post (id=${String(id)}, object=${String(kind)})`);
  return null;
}

// ---------------------------------------------------------------------------
// Public user profiles (users.getByUsername) — added 2026-08-26 for the
// author-profile page. Deliberately separate from AuthorSchema/UserPreview
// above: those exist to render a small author blurb on a post and
// structurally cannot carry PII (no email/phone/dob fields exist on that
// type at all). This is a much wider object — see the security note on
// UserProfileSchema below before touching it.
// ---------------------------------------------------------------------------

const UserLinkSchema = z.object({
  title: z.string().catch(""),
  url: z.string(),
});

const UserSkillSchema = z.object({
  value: z.string(),
  level: z.number().catch(0),
});

const UserLanguageSchema = z.object({
  value: z.string(),
  level: z.number().catch(0),
});

const UserCompanyPositionSchema = z.object({
  description: z.string().nullable().catch(null),
  start: z.string().nullable().catch(null),
  end: z.string().nullable().catch(null),
});

const UserCompanySchema = z.object({
  name: z.string().catch(""),
  description: z.string().nullable().catch(null),
  position: UserCompanyPositionSchema.nullable().catch(null),
  employeesCount: z.number().nullable().catch(null),
  category: z.number().nullable().catch(null),
  link: UserLinkSchema.nullable().catch(null),
  est: z.number().nullable().catch(null),
});

/**
 * `Resource.User` — the full backend user object, confirmed against the
 * live OpenAPI spec on 2026-08-26. It also contains `email`,
 * `emailVerified`, `phoneNumber`, `dob`, `personalChatId`,
 * `personalChatMessage`, `metadata`, `lastSeen`, `notifySettings`, and the
 * `flags`/`featureFlags`/`scopeFlags` bitmasks — NONE of those are parsed
 * here. This is the anti-corruption layer for user profiles the same way
 * mappers.ts is for posts (PLAN.md §2.4): if a field isn't declared below,
 * Zod silently drops it, so it structurally cannot reach lib/a1/
 * user-mappers.ts, let alone the browser. `flags` is the one deliberate
 * exception — parsed as a number so user-mappers.ts can gate `phone` /
 * `email` / `dob` behind the user's own SHOW_* toggles (lib/a1/
 * user-flags.ts) — the same consent signal the app itself uses. Do not
 * add `email`, `phoneNumber`, `dob`, `personalChatId`, `metadata`,
 * `lastSeen`, or `notifySettings` here without re-reading that file.
 *
 * `voiceIntroduction` (Resource.MediaDocument | null) IS parsed below —
 * confirmed present on Resource.User in the live spec 2026-08-27, per
 * Aleksandr: "у нас у профилем есть голосовые визитки" (the mobile app
 * already has these; the web just didn't read the field yet). It's a
 * MediaDocument like `photos` entries, whose `attributes` carries a
 * Resource.MediaDocument.AttributeAudio with `voice: true` — same
 * media-proxy URL resolution as any other MediaDocument.
 */
// Aleksandr, 2026-08-27 (mobile app video, "профиль показан только
// частично"): hobbies/workInterests/favoriteBooks/favoriteMovies/
// favoriteGames/workStylePreferences below, confirmed field-for-field
// against the openapi.json he sent (not the live endpoint directly —
// this sandbox's network can't reach api.a1appp.com to fetch it; he
// downloaded the file himself and sent it as a file). hobbies and
// workInterests are arrays of dataset ids (resolve via
// lib/a1/datasets.ts's fetchHobbies/fetchWorkInterests, same pattern as
// company categories); favorite books/movies/games are freeform
// title(+author) text, no id lookup needed. workStylePreferences is a
// fixed object of 14 named categories, each its own array of dataset
// ids (fetchWorkStylePreferences) — note one deliberate rename below:
// the *user's* field is `workloadAndTaskDelegation` but the matching
// *dataset* lookup's key is `workloadTaskDelegation` (no "And") per the
// spec — a real, confirmed naming mismatch between the two, not a typo
// here.
const WorkStylePreferencesSchema = z.object({
  workEnvironment: z.array(z.number()).catch([]),
  personalityType: z.array(z.number()).catch([]),
  workLifeBalance: z.array(z.number()).catch([]),
  workStyle: z.array(z.number()).catch([]),
  workAvailability: z.array(z.number()).catch([]),
  projectType: z.array(z.number()).catch([]),
  leadershipStyle: z.array(z.number()).catch([]),
  riskTolerance: z.array(z.number()).catch([]),
  workloadAndTaskDelegation: z.array(z.number()).catch([]),
  decisionMakingStyle: z.array(z.number()).catch([]),
  preferredCollaborationStyle: z.array(z.number()).catch([]),
  partnershipPreference: z.array(z.number()).catch([]),
  preferredWorkingEnvironment: z.array(z.number()).catch([]),
  learningStyle: z.array(z.number()).catch([]),
});
export type UserWorkStylePreferences = z.infer<typeof WorkStylePreferencesSchema>;
const EMPTY_WORK_STYLE_PREFERENCES: UserWorkStylePreferences = {
  workEnvironment: [],
  personalityType: [],
  workLifeBalance: [],
  workStyle: [],
  workAvailability: [],
  projectType: [],
  leadershipStyle: [],
  riskTolerance: [],
  workloadAndTaskDelegation: [],
  decisionMakingStyle: [],
  preferredCollaborationStyle: [],
  partnershipPreference: [],
  preferredWorkingEnvironment: [],
  learningStyle: [],
};

const FavoriteBookSchema = z.object({
  title: z.string().catch(""),
  author: z.string().catch(""),
});
const FavoriteTitleSchema = z.object({
  title: z.string().catch(""),
});

export const UserProfileSchema = z.object({
  _id: z.string(),
  username: z.string().nullable().catch(null),
  firstName: z.string().catch(""),
  lastName: z.string().catch(""),
  occupation: z.string().catch(""),
  expertise: z.string().nullable().catch(null),
  bio: z.string().catch(""),
  profileTitle: z.string().nullable().catch(null),
  photos: z.array(MediaDocumentSchema).catch([]),
  voiceIntroduction: MediaDocumentSchema.nullable().catch(null),
  location: WorldLocationSchema.nullable().catch(null),
  links: z.array(UserLinkSchema).catch([]),
  companies: z.array(UserCompanySchema).catch([]),
  education: z.array(z.string()).catch([]),
  skills: z.array(UserSkillSchema).catch([]),
  languages: z.array(UserLanguageSchema).catch([]),
  hobbies: z.array(z.number()).catch([]),
  workInterests: z.array(z.number()).catch([]),
  favoriteBooks: z.array(FavoriteBookSchema).catch([]),
  favoriteMovies: z.array(FavoriteTitleSchema).catch([]),
  favoriteGames: z.array(FavoriteTitleSchema).catch([]),
  workStylePreferences: WorkStylePreferencesSchema.catch(EMPTY_WORK_STYLE_PREFERENCES),
  flags: z.number().catch(0),
  // Present on the real object but only read behind their own SHOW_*
  // flag check in user-mappers.ts — never returned to a caller otherwise.
  phoneNumber: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
  dob: z.string().nullable().catch(null),
  object: z.literal("user"),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

const UserHiddenProfileSchema = z.object({
  fullName: z.string().catch("Anonymous"),
  username: z.string().catch(""),
  reason: z.string().optional(),
  object: z.literal("user-hidden"),
});
export type UserHiddenProfile = z.infer<typeof UserHiddenProfileSchema>;

const UserProfileResultSchema = z.union([UserProfileSchema, UserHiddenProfileSchema]);
export type UserProfileResult = z.infer<typeof UserProfileResultSchema>;

/** Parse users.getByUsername's response. Never throws — a malformed or
 *  unrecognized shape is treated the same as "not found" by the caller. */
export function parseUserProfile(raw: unknown): UserProfileResult | null {
  const result = UserProfileResultSchema.safeParse(raw);
  if (result.success) return result.data;
  console.warn("[lib/a1/schemas] dropped unparseable user profile");
  return null;
}
