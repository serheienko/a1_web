// lib/a1/mappers.ts
//
// The only file that knows both the raw API shape (lib/a1/schemas.ts) and
// our own domain shape (types/web-post.ts). If a field isn't copied out
// explicitly below, it does not exist on the other side — see PLAN.md §2.4,
// the anti-corruption layer. This is where the prior `/v1/users.search`
// email-leak class of bug becomes structurally impossible.

import { NULL_LOCATION_MEANS_REMOTE, PUBLISH_ONLY_NATIVE, isNativePost } from "./config";
import { authorIsHidden, isArchived, isArchivedOrDraft } from "./post-flags";
import { parsePost, type Post, type MediaSize } from "./schemas";
import { slugify } from "../seo/slug";
import type {
  WebPost,
  WebPostAuthor,
  WebPostLocation,
  WebPostSalary,
  WebPostImage,
} from "@/types/web-post";

/**
 * Every timestamp on this API is unix SECONDS (PLAN.md §0.3 / §5 rule 5).
 * This is the one place that multiplies by 1000 — nothing else should.
 */
function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000);
}

/**
 * `post.apply.questions` is typed `z.array(z.unknown())` on the read
 * side (lib/a1/schemas.ts) -- its exact item shape was never confirmed
 * live, only the WRITE side's `{ question, object: "apply-question-
 * input" }` was (PLAN.md §6.31/§6.32). Rather than guess the read shape
 * matches the write shape, this accepts either a bare string OR an
 * object with a string `question` field, and silently drops (logging
 * for the next live triage, PLAN.md §5 rule 6 style) anything else --
 * same "never throws, log and move on" posture as parsePost. MVP only:
 * 2026-08-30, Aleksandr, "Пока для MVP просто показывай их в посте и
 * всё, потом допилим полноценно".
 */
function mapApplyQuestions(apply: Post["apply"]): string[] {
  if (!apply) return [];
  const out: string[] = [];
  for (const raw of apply.questions) {
    if (typeof raw === "string" && raw.trim()) {
      out.push(raw.trim());
    } else if (raw && typeof raw === "object" && "question" in raw && typeof (raw as { question: unknown }).question === "string") {
      const text = (raw as { question: string }).question.trim();
      if (text) out.push(text);
    } else {
      console.error("[mappers] unrecognized apply.questions item shape", raw);
    }
  }
  return out;
}

function mapAuthor(author: Post["author"], flags: number): WebPostAuthor {
  if (authorIsHidden(flags) || author.object !== "user-preview") {
    // Covers the documented UserHidden variant and any shape our schema
    // couldn't match — PLAN.md §0.3: "must render as Anonymous, never crash."
    return { userId: null, name: "Anonymous", username: null, avatarUrl: null, isAnonymous: true };
  }
  // Deliberately NOT `author.photo` — confirmed live twice now (once on
  // 2026-08-26 against a raw response, and again via a screen recording
  // Aleksandr sent of a real posts.search call: `X-Amz-Expires=120` right
  // there in the URL) that it's always a pre-signed S3 link expiring in
  // ~2 minutes, whether or not the user has a "real" uploaded photo —
  // there's no separate stable default-avatar link hiding in this field.
  // Too short-lived to bake into an ISR-cached page (revalidate = 60 on
  // the feed pages alone can outlive it). `author.photos[0]` is a real
  // MediaDocument, so it goes through the same /api/media proxy as post
  // photos — resolved fresh at actual view time, never stale.
  const avatarDoc = author.photos[0];
  return {
    // Raw UserPreview._id, unprefixed-format-agnostic — this is the same
    // id string contacts.addContact/favorites.addFavorites expect (see
    // app/api/contacts/add/route.ts's own comment on that contract), so
    // it's passed straight through rather than reshaped.
    userId: author._id,
    name: author.fullName || "Anonymous",
    username: author.username ?? null,
    avatarUrl: avatarDoc ? buildMediaProxyUrl(avatarDoc) : null,
    isAnonymous: false,
  };
}

function mapLocation(post: Post): { location: WebPostLocation | null; isRemote: boolean } {
  if (!post.location) {
    return { location: null, isRemote: NULL_LOCATION_MEANS_REMOTE };
  }
  const loc = post.location;
  // Same Worldwide-sentinel (`_id === 0`) + finite-pair validation as
  // lib/a1/user-mappers.ts's mapLocation() — see that file's comment.
  // 2026-08-31, mirroring the profile map for the job post's own location
  // (Aleksandr's screenshot of the mobile app's job detail page).
  const coordinates =
    loc._id !== 0 && loc.coordinates.length === 2 && loc.coordinates.every((n) => Number.isFinite(n))
      ? (loc.coordinates as [number, number])
      : null;
  return {
    location: {
      city: loc.city,
      region: loc.adm_level_1,
      country: loc.country,
      display: loc.displayName,
      coordinates,
    },
    isRemote: false,
  };
}

function mapSalary(money: Post["money"]): WebPostSalary | null {
  if (!money) return null;
  switch (money.object) {
    case "post-money-single":
      return { min: money.unitAmount, max: money.unitAmount, currency: money.currency, period: "MONTH" };
    case "post-money-single-annual":
      return { min: money.unitAmount, max: money.unitAmount, currency: money.currency, period: "YEAR" };
    case "post-money-range":
      return {
        min: money.unitAmount[0] ?? null,
        max: money.unitAmount[1] ?? null,
        currency: money.currency,
        period: "MONTH",
      };
    case "post-money-range-annual":
      return {
        min: money.unitAmount[0] ?? null,
        max: money.unitAmount[1] ?? null,
        currency: money.currency,
        period: "YEAR",
      };
    default:
      return null;
  }
}

/**
 * "size-photo" is the real displayable image; "size-original" is a
 * fallback for the rare document missing it; "size-stripped" (an inline
 * base64 preview blob, not a fetchable size — see schemas.ts) is
 * deliberately never picked. Unconfirmed against docs: media.getUrl's
 * `size` param is assumed to accept these same `object` strings, by
 * naming-convention analogy with the Post union's own `object`
 * discriminator (PLAN.md §0.1's media.getUrl signature doesn't enumerate
 * valid values). Revisit if media.getUrl starts rejecting requests.
 */
function pickDisplaySize(sizes: MediaSize[]): MediaSize | undefined {
  return sizes.find((s) => s.object === "size-photo") ?? sizes.find((s) => s.object === "size-original") ?? sizes[0];
}

/** Shared by mapImages() and mapAuthor(): any MediaDocument (a post photo
 *  or an author's avatar doc) maps to the same /api/media proxy URL shape. */
export function buildMediaProxyUrl(doc: { _id: string; fileReference: string; sizes: MediaSize[] }): string {
  const size = pickDisplaySize(doc.sizes);
  const sizeParam = typeof size?.object === "string" ? size.object : "size-photo";
  return `/api/media/${doc._id}?ref=${encodeURIComponent(doc.fileReference)}&size=${encodeURIComponent(sizeParam)}`;
}

function mapImages(post: Post): WebPostImage[] {
  return post.media
    .filter((m) => m.mimetype.startsWith("image/"))
    .map((m) => {
      const size = pickDisplaySize(m.sizes);
      return {
        url: buildMediaProxyUrl(m),
        width: size?.w ?? 0,
        height: size?.h ?? 0,
      };
    });
}

/**
 * Minimal, dependency-free HTML for JSON-LD `description` (PLAN.md §3.3):
 * escape, then wrap blank-line-separated blocks in <p>. Revisit if post
 * content grows real formatting.
 */
function paragraphWrap(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/**
 * Raw Post -> our WebPost. Returns null only when PUBLISH_ONLY_NATIVE gates
 * it out (off by default — PLAN.md §0.5). Assumes `post` already passed
 * lib/a1/schemas.ts validation.
 */
export function mapPost(post: Post): WebPost | null {
  if (PUBLISH_ONLY_NATIVE && !isNativePost(post)) {
    return null;
  }
  // Defense-in-depth (lib/a1/post-flags.ts) — posts.search almost
  // certainly excludes these server-side already, but a draft or
  // archived post has no business on a public, indexed page either way.
  if (isArchivedOrDraft(post.flags)) {
    return null;
  }

  const { location, isRemote } = mapLocation(post);

  return {
    id: post._id,
    kind: post.object === "post-job-employing" ? "hiring" : "seeking",
    title: post.title,
    slug: slugify(post.title, post._id),
    contentText: post.content,
    contentHtml: paragraphWrap(post.content),
    publishedAt: fromUnixSeconds(post.published ?? post.created),
    updatedAt: post.updated ? fromUnixSeconds(post.updated) : null,
    author: mapAuthor(post.author, post.flags),
    location,
    isRemote,
    // Label lookup needs dataset.postCategories — lands with lib/a1/datasets.ts
    // in Phase 3. Placeholder label until then.
    categories: post.categories.map((id) => ({ id, label: String(id) })),
    tags: post.tags,
    salary: mapSalary(post.money),
    images: mapImages(post),
    links: post.links,
    viewCount: post.viewCount,
    hasApplyForm: post.apply != null,
    applyQuestions: mapApplyQuestions(post.apply),
  };
}

/**
 * Same field mapping as mapPost(), for the ONE place a draft or
 * scheduled-not-yet-published post is allowed to render as a WebPost
 * card: the visitor's own "Пости" tab (app/u/[username]/page.tsx via
 * components/profile-tabs.tsx) showing their own not-yet-live posts
 * with a status badge, per PLAN.md §6.50. Deliberately only excludes
 * ARCHIVED (soft-deleted) — not the DRAFT/SCHEDULED bits mapPost()'s
 * isArchivedOrDraft() gate also excludes — since a draft or scheduled
 * post is exactly what this is for. Safe only because the caller
 * (app/api/posts/mine/route.ts) already scopes posts.search to
 * `author: "me"`, i.e. always the signed-in visitor's own post; this
 * must never be used for any other author's posts.
 */
export function mapOwnPost(post: Post): WebPost | null {
  if (isArchived(post.flags)) {
    return null;
  }

  const { location, isRemote } = mapLocation(post);

  return {
    id: post._id,
    kind: post.object === "post-job-employing" ? "hiring" : "seeking",
    title: post.title,
    slug: slugify(post.title, post._id),
    contentText: post.content,
    contentHtml: paragraphWrap(post.content),
    publishedAt: fromUnixSeconds(post.published ?? post.created),
    updatedAt: post.updated ? fromUnixSeconds(post.updated) : null,
    author: mapAuthor(post.author, post.flags),
    location,
    isRemote,
    categories: post.categories.map((id) => ({ id, label: String(id) })),
    tags: post.tags,
    salary: mapSalary(post.money),
    images: mapImages(post),
    links: post.links,
    viewCount: post.viewCount,
    hasApplyForm: post.apply != null,
    applyQuestions: mapApplyQuestions(post.apply),
  };
}

/** Parse + map a raw batch (e.g. posts.search's `items`), dropping anything
 *  that fails schema validation or the publish gate. Never throws. */
export function mapPosts(rawItems: unknown[]): WebPost[] {
  const out: WebPost[] = [];
  for (const raw of rawItems) {
    const post = parsePost(raw);
    if (!post) continue;
    const mapped = mapPost(post);
    if (mapped) out.push(mapped);
  }
  return out;
}
