// lib/a1/mappers.ts
//
// The only file that knows both the raw API shape (lib/a1/schemas.ts) and
// our own domain shape (types/web-post.ts). If a field isn't copied out
// explicitly below, it does not exist on the other side — see PLAN.md §2.4,
// the anti-corruption layer. This is where the prior `/v1/users.search`
// email-leak class of bug becomes structurally impossible.

import { NULL_LOCATION_MEANS_REMOTE, PUBLISH_ONLY_NATIVE, isNativePost } from "./config";
import { parsePost, type Post } from "./schemas";
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

function mapAuthor(author: Post["author"]): WebPostAuthor {
  if (author.object !== "user-preview") {
    // Covers the documented UserHidden variant and any shape our schema
    // couldn't match — PLAN.md §0.3: "must render as Anonymous, never crash."
    return { name: "Anonymous", username: null, avatarUrl: null, isAnonymous: true };
  }
  return {
    name: author.fullName || "Anonymous",
    username: author.username ?? null,
    avatarUrl: author.photo ?? null,
    isAnonymous: false,
  };
}

function mapLocation(post: Post): { location: WebPostLocation | null; isRemote: boolean } {
  if (!post.location) {
    return { location: null, isRemote: NULL_LOCATION_MEANS_REMOTE };
  }
  const loc = post.location;
  return {
    location: {
      city: loc.city,
      region: loc.adm_level_1,
      country: loc.country,
      display: loc.displayName,
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

function mapImages(post: Post): WebPostImage[] {
  return post.media
    .filter((m) => m.mimetype.startsWith("image/"))
    .map((m) => {
      const size = m.sizes[m.sizes.length - 1]; // largest captured size
      return {
        url: `/api/media/${m._id}?ref=${encodeURIComponent(m.fileReference)}`,
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
    author: mapAuthor(post.author),
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
