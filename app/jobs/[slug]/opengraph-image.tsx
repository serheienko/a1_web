// app/jobs/[slug]/opengraph-image.tsx — per-vacancy og:image (2026-08-28).
//
// Real post photo when there is one (post.images[0]), otherwise the same
// branded fallback card the feed pages use — see lib/seo/og-image.tsx
// for why (and for the Cyrillic-font-loading problem this solves: an
// earlier attempt with no explicit font drew Ukrainian/Russian titles as
// empty tofu boxes).

import { fetchPostById } from "@/lib/a1/posts";
import { parseSlugId } from "@/lib/seo/slug";
import { buildOgImage, ogImageParamsForPost, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const id = parseSlugId(slug);
  const post = id ? await fetchPostById(id) : null;

  if (!post || post.kind !== "hiring") {
    // Deleted/expired/wrong-kind post — a slug that no longer resolves
    // still needs *some* image (a share card can outlive the post it
    // pointed to), so this falls back to the same branded card as the
    // feed rather than a broken image or a 500.
    return buildOgImage({ eyebrow: "A1 Jobs", title: "A1 Jobs", subtitle: "jobs.a1appp.com" });
  }

  return buildOgImage(ogImageParamsForPost(post, "A1 Jobs"));
}
