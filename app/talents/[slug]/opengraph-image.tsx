// app/talents/[slug]/opengraph-image.tsx — per-profile og:image (2026-08-28).
// Mirrors app/jobs/[slug]/opengraph-image.tsx; see that file's comment
// for the real-photo-vs-fallback and font-loading rationale.

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

  if (!post || post.kind !== "seeking") {
    return buildOgImage({ eyebrow: "A1 Talents", title: "A1 Talents", subtitle: "jobs.a1appp.com/talents" });
  }

  return buildOgImage(ogImageParamsForPost(post, "A1 Talents"));
}
